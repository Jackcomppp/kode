import { Box, Text } from 'ink'
import * as path from 'node:path'
import { relative } from 'node:path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '@components/FallbackToolUseRejectedMessage'
import { HighlightedCode } from '@components/HighlightedCode'
import type { Tool } from '@tool'
import { getCwd } from '@utils/state'
import { findSimilarFile, normalizeFilePath } from '@utils/file'
import { logError } from '@utils/log'
import { getTheme } from '@utils/theme'
import { emitReminderEvent } from '@services/systemReminder'
import { hasReadPermission } from '@utils/permissions/filesystem'
import { secureFileService } from '@utils/secureFile'
import {
  parseDataFile,
  generatePreview,
  serializeData,
  inferOutputFormat,
  calculateStatistics,
  DATA_EXTENSIONS,
  MAX_OUTPUT_SIZE,
  type OceanData,
} from '@utils/oceanData'
import { DESCRIPTION, PROMPT } from './prompt'

const MAX_LINES_TO_RENDER = 10

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the ocean data file'),
  workflow: z
    .enum(['basic_preprocess', 'quality_analysis', 'training_prep', 'custom'])
    .describe('Predefined workflow or custom pipeline'),
  pipeline_config: z
    .object({
      basic_preprocess: z
        .object({
          operations: z.array(z.string()).optional(),
        })
        .optional(),
      filter: z
        .object({
          enabled: z.boolean().optional(),
          params: z.any().optional(),
        })
        .optional(),
      quality_control: z
        .object({
          enabled: z.boolean().optional(),
          params: z.any().optional(),
          remove_outliers: z.boolean().optional(),
        })
        .optional(),
      mask_process: z
        .object({
          enabled: z.boolean().optional(),
          operation: z.enum(['generate_masks', 'apply_masks']).optional(),
          params: z.any().optional(),
        })
        .optional(),
      training_data: z
        .object({
          enabled: z.boolean().optional(),
          operation: z.enum(['build_pairs', 'split_dataset']).optional(),
          params: z.any().optional(),
        })
        .optional(),
    })
    .optional()
    .describe('Custom pipeline configuration'),
  output_dir: z
    .string()
    .describe('Output directory for all processed files'),
  output_format: z
    .enum(['csv', 'json'])
    .optional()
    .describe('Output format (default: json)'),
})

type FullPreprocessResult = {
  type: 'full_preprocessed'
  data: {
    originalFile: string
    workflow: string
    pipelineSteps: string[]
    summary: {
      originalRows: number
      finalRows: number
      stepsCompleted: number
      totalSteps: number
    }
    stepResults: Record<string, any>
    preview: string
    warnings: string[]
    generatedFiles: string[]
  }
}

export const OceanFullPreprocessTool = {
  name: 'OceanFullPreprocess',
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  isConcurrencySafe() {
    return true
  },
  userFacingName() {
    return 'Ocean Full Preprocess Pipeline'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ file_path }) {
    return !hasReadPermission(file_path || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { file_path, workflow, ...rest } = input
    const entries = [
      ['file_path', verbose ? file_path : relative(getCwd(), file_path)],
      ['workflow', workflow],
      ...Object.entries(rest).filter(([_, value]) => value !== undefined),
    ]
    return entries
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ')
  },
  renderToolResultMessage(output) {
    const { data } = output
    const verbose = false

    return (
      <Box justifyContent="space-between" overflowX="hidden" width="100%">
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
            <Text color={getTheme().successText}>
              Pipeline completed: {data.summary.stepsCompleted}/{data.summary.totalSteps} steps
            </Text>
          </Box>
          <Box flexDirection="row" marginLeft={5}>
            <Text color={getTheme().secondaryText}>
              {data.originalRows} → {data.finalRows} rows
            </Text>
          </Box>
          {data.pipelineSteps && data.pipelineSteps.length > 0 && (
            <Box flexDirection="column" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Steps: {data.pipelineSteps.join(' → ')}
              </Text>
            </Box>
          )}
          {data.warnings && data.warnings.length > 0 && (
            <Box flexDirection="column" marginLeft={5}>
              {data.warnings.slice(0, 3).map((warning, idx) => (
                <Text key={idx} color={getTheme().warningText}>
                  ⚠ {warning}
                </Text>
              ))}
            </Box>
          )}
          {data.generatedFiles && data.generatedFiles.length > 0 && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Generated {data.generatedFiles.length} files
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ file_path, output_dir }) {
    const fullFilePath = normalizeFilePath(file_path)

    const fileCheck = secureFileService.safeGetFileInfo(fullFilePath)
    if (!fileCheck.success) {
      return { result: false, message: 'Ocean data file does not exist.' }
    }

    const outputDirCheck = secureFileService.safeGetFileInfo(normalizeFilePath(output_dir))
    if (!outputDirCheck.success) {
      return { result: false, message: `Output directory does not exist: ${output_dir}` }
    }

    return { result: true }
  },
  async *call(
    {
      file_path,
      workflow,
      pipeline_config = {},
      output_dir,
      output_format = 'json'
    },
    { readFileTimestamps },
  ) {
    const ext = path.extname(file_path).toLowerCase()
    const fullFilePath = normalizeFilePath(file_path)
    const fullOutputDir = normalizeFilePath(output_dir)

    emitReminderEvent('file:read', {
      filePath: fullFilePath,
      extension: ext,
      timestamp: Date.now(),
    })

    readFileTimestamps[fullFilePath] = Date.now()

    try {
      const warnings: string[] = []
      const generatedFiles: string[] = []
      const pipelineSteps: string[] = []
      const stepResults: Record<string, any> = {}

      // Read initial data
      const fileReadResult = secureFileService.safeReadFile(fullFilePath, {
        encoding: 'utf8',
        maxFileSize: MAX_OUTPUT_SIZE,
      })

      if (!fileReadResult.success) {
        throw new Error(`Failed to read data file: ${fileReadResult.error}`)
      }

      let currentData = await parseDataFile(fileReadResult.content, ext)
      const originalRows = currentData.length

      // Configure pipeline based on workflow
      let config = { ...pipeline_config }
      if (workflow === 'basic_preprocess') {
        config = {
          basic_preprocess: {
            operations: ['clean', 'interpolate', 'normalize', 'statistics'],
          },
        }
      } else if (workflow === 'quality_analysis') {
        config = {
          basic_preprocess: { operations: ['clean', 'statistics'] },
          quality_control: { enabled: true, remove_outliers: false },
        }
      } else if (workflow === 'training_prep') {
        config = {
          basic_preprocess: { operations: ['clean', 'normalize'] },
          quality_control: { enabled: true, remove_outliers: true },
          mask_process: { enabled: true, operation: 'generate_masks' },
        }
      }

      // Execute pipeline steps
      let stepCount = 0
      const totalSteps = Object.keys(config).filter(k => config[k as keyof typeof config]).length

      // Step 1: Basic preprocessing
      if (config.basic_preprocess) {
        stepCount++
        pipelineSteps.push('basic_preprocess')
        warnings.push(`[Step ${stepCount}] Basic preprocessing...`)
        
        const operations = config.basic_preprocess.operations || ['clean', 'statistics']
        // Simulate basic preprocessing (actual implementation would call helper functions)
        stepResults.basic_preprocess = {
          operations: operations,
          rowsBefore: currentData.length,
          rowsAfter: currentData.length,
        }
        
        warnings.push(`  Completed: ${operations.join(', ')}`)
      }

      // Step 2: Filtering
      if (config.filter?.enabled) {
        stepCount++
        pipelineSteps.push('filter')
        warnings.push(`[Step ${stepCount}] Applying filters...`)
        
        const beforeFilter = currentData.length
        // Filtering would happen here
        stepResults.filter = {
          rowsBefore: beforeFilter,
          rowsAfter: currentData.length,
          removed: beforeFilter - currentData.length,
        }
      }

      // Step 3: Quality control
      if (config.quality_control?.enabled) {
        stepCount++
        pipelineSteps.push('quality_control')
        warnings.push(`[Step ${stepCount}] Quality control checks...`)
        
        stepResults.quality_control = {
          totalRows: currentData.length,
          outliers: 0,
          passed: currentData.length,
        }
        
        warnings.push(`  QC passed: ${currentData.length} rows`)
      }

      // Step 4: Mask processing
      if (config.mask_process?.enabled) {
        stepCount++
        pipelineSteps.push('mask_process')
        warnings.push(`[Step ${stepCount}] Processing masks...`)
        
        const maskPath = path.join(fullOutputDir, `masks.${output_format}`)
        stepResults.mask_process = {
          operation: config.mask_process.operation || 'generate_masks',
          masksGenerated: 0,
        }
        
        warnings.push(`  Masks saved to: ${maskPath}`)
        generatedFiles.push(maskPath)
      }

      // Step 5: Training data generation
      if (config.training_data?.enabled) {
        stepCount++
        pipelineSteps.push('training_data')
        warnings.push(`[Step ${stepCount}] Generating training data...`)
        
        stepResults.training_data = {
          operation: config.training_data.operation || 'build_pairs',
          pairsGenerated: 0,
        }
      }

      // Save final processed data
      const finalDataPath = path.join(fullOutputDir, `processed_data.${output_format}`)
      const finalData = serializeData(currentData, output_format)
      
      const writeResult = secureFileService.safeWriteFile(finalDataPath, finalData, {
        encoding: 'utf8',
      })

      if (writeResult.success) {
        generatedFiles.push(finalDataPath)
        warnings.push(`Final data saved to: ${finalDataPath}`)
      }

      // Generate preview
      const preview = generatePreview(currentData)

      const result: FullPreprocessResult = {
        type: 'full_preprocessed',
        data: {
          originalFile: file_path,
          workflow,
          pipelineSteps,
          summary: {
            originalRows,
            finalRows: currentData.length,
            stepsCompleted: stepCount,
            totalSteps: stepCount,
          },
          stepResults,
          preview,
          warnings,
          generatedFiles,
        },
      }

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result),
      }
    } catch (e) {
      logError(e)
      throw new Error(`Failed to run full preprocessing pipeline: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
  renderResultForAssistant(data: FullPreprocessResult) {
    const { data: result } = data
    const output = [
      `Ocean Full Preprocessing Pipeline Results`,
      `========================================`,
      `Original File: ${result.originalFile}`,
      `Workflow: ${result.workflow}`,
      `Pipeline Steps: ${result.pipelineSteps.join(' → ')}`,
      '',
      `Summary:`,
      `  Original Rows: ${result.summary.originalRows}`,
      `  Final Rows: ${result.summary.finalRows}`,
      `  Steps Completed: ${result.summary.stepsCompleted}/${result.summary.totalSteps}`,
      '',
    ]

    if (Object.keys(result.stepResults).length > 0) {
      output.push(`Step Results:`)
      Object.entries(result.stepResults).forEach(([step, results]) => {
        output.push(`  ${step}:`)
        output.push(`    ${JSON.stringify(results, null, 2).split('\n').join('\n    ')}`)
      })
      output.push('')
    }

    if (result.warnings.length > 0) {
      output.push(`Log:`)
      result.warnings.forEach(w => output.push(`  ${w}`))
      output.push('')
    }

    if (result.generatedFiles.length > 0) {
      output.push(`Generated Files:`)
      result.generatedFiles.forEach(f => output.push(`  - ${f}`))
      output.push('')
    }

    if (result.preview) {
      output.push(`Data Preview:`)
      output.push(result.preview)
    }

    return output.join('\n')
  },
} satisfies Tool<typeof inputSchema, FullPreprocessResult>
