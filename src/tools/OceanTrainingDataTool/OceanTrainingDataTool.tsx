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
  serializeData,
  inferOutputFormat,
  DATA_EXTENSIONS,
  MAX_OUTPUT_SIZE,
  type OceanData,
} from '@utils/oceanData'
import { DESCRIPTION, PROMPT } from './prompt'

const MAX_LINES_TO_RENDER = 10

const inputSchema = z.strictObject({
  ground_truth_path: z.string().describe('Path to complete ground truth data (CSV/JSON)'),
  mask_file_path: z.string().describe('Path to mask file (JSON format)'),
  operation: z
    .enum(['build_pairs', 'split_dataset', 'validate_pairs'])
    .describe('Operation: build_pairs, split_dataset, or validate_pairs'),
  split_params: z
    .object({
      train_ratio: z.number().optional().describe('Training set ratio (default: 0.7)'),
      val_ratio: z.number().optional().describe('Validation set ratio (default: 0.15)'),
      test_ratio: z.number().optional().describe('Test set ratio (default: 0.15)'),
      shuffle: z.boolean().optional().describe('Shuffle data before splitting (default: true)'),
    })
    .optional()
    .describe('Dataset split parameters'),
  output_dir: z
    .string()
    .describe('Output directory for training data files'),
  output_format: z
    .enum(['csv', 'json'])
    .optional()
    .describe('Output format (default: json)'),
})

type TrainingDataResult = {
  type: 'training_data_generated'
  data: {
    groundTruthFile: string
    maskFile: string
    operation: string
    pairsGenerated?: number
    splitInfo?: {
      trainSamples: number
      valSamples: number
      testSamples: number
    }
    validationReport?: {
      totalPairs: number
      validPairs: number
      invalidPairs: number
    }
    preview: string
    warnings: string[]
    generatedFiles: string[]
  }
}

export const OceanTrainingDataTool = {
  name: 'OceanTrainingData',
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
    return 'Ocean Training Data Generator'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ ground_truth_path }) {
    return !hasReadPermission(ground_truth_path || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { ground_truth_path, operation, ...rest } = input
    const entries = [
      ['ground_truth_path', verbose ? ground_truth_path : relative(getCwd(), ground_truth_path)],
      ['operation', operation],
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
              {data.operation}: {data.pairsGenerated || 'completed'}
            </Text>
          </Box>
          {data.splitInfo && (
            <Box flexDirection="column" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Train: {data.splitInfo.trainSamples}, Val: {data.splitInfo.valSamples}, Test: {data.splitInfo.testSamples}
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
            <Box flexDirection="column" marginLeft={5}>
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
  async validateInput({ ground_truth_path, mask_file_path, output_dir }) {
    const fullFilePath = normalizeFilePath(ground_truth_path)

    const fileCheck = secureFileService.safeGetFileInfo(fullFilePath)
    if (!fileCheck.success) {
      return { result: false, message: 'Ground truth file does not exist.' }
    }

    const maskCheck = secureFileService.safeGetFileInfo(normalizeFilePath(mask_file_path))
    if (!maskCheck.success) {
      return { result: false, message: 'Mask file does not exist.' }
    }

    const outputDirCheck = secureFileService.safeGetFileInfo(normalizeFilePath(output_dir))
    if (!outputDirCheck.success) {
      return { result: false, message: `Output directory does not exist: ${output_dir}` }
    }

    return { result: true }
  },
  async *call(
    {
      ground_truth_path,
      mask_file_path,
      operation,
      split_params,
      output_dir,
      output_format = 'json'
    },
    { readFileTimestamps },
  ) {
    const ext = path.extname(ground_truth_path).toLowerCase()
    const fullFilePath = normalizeFilePath(ground_truth_path)
    const fullMaskPath = normalizeFilePath(mask_file_path)
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
      let preview = ''
      let pairsGenerated: number | undefined
      let splitInfo: any | undefined
      let validationReport: any | undefined

      // Read ground truth data
      const gtReadResult = secureFileService.safeReadFile(fullFilePath, {
        encoding: 'utf8',
        maxFileSize: MAX_OUTPUT_SIZE,
      })

      if (!gtReadResult.success) {
        throw new Error(`Failed to read ground truth file: ${gtReadResult.error}`)
      }

      const groundTruthData = await parseDataFile(gtReadResult.content, ext)

      // Read mask file
      const maskReadResult = secureFileService.safeReadFile(fullMaskPath, {
        encoding: 'utf8',
      })

      if (!maskReadResult.success) {
        throw new Error(`Failed to read mask file: ${maskReadResult.error}`)
      }

      const masks = JSON.parse(maskReadResult.content as string)

      if (operation === 'build_pairs') {
        // Build training pairs
        const pairsResult = buildTrainingPairs(groundTruthData, masks)
        pairsGenerated = pairsResult.pairs.length
        warnings.push(...pairsResult.warnings)

        // Save pairs
        const pairsPath = path.join(fullOutputDir, `training_pairs.${output_format}`)
        const pairsData = serializeData(pairsResult.pairs, output_format)
        
        const writeResult = secureFileService.safeWriteFile(pairsPath, pairsData, {
          encoding: 'utf8',
        })

        if (writeResult.success) {
          generatedFiles.push(pairsPath)
          warnings.push(`Saved ${pairsGenerated} training pairs to ${pairsPath}`)
        } else {
          warnings.push(`Failed to write pairs file: ${writeResult.error}`)
        }

        preview = `Generated ${pairsGenerated} training pairs (input with masks + ground truth)`

      } else if (operation === 'split_dataset') {
        // Build pairs first
        const pairsResult = buildTrainingPairs(groundTruthData, masks)
        const pairs = pairsResult.pairs
        warnings.push(...pairsResult.warnings)

        // Split dataset
        const splitResult = splitDataset(pairs, split_params)
        splitInfo = splitResult.splitInfo
        warnings.push(...splitResult.warnings)

        // Save split datasets
        const trainPath = path.join(fullOutputDir, `train.${output_format}`)
        const valPath = path.join(fullOutputDir, `val.${output_format}`)
        const testPath = path.join(fullOutputDir, `test.${output_format}`)

        const trainData = serializeData(splitResult.train, output_format)
        const valData = serializeData(splitResult.val, output_format)
        const testData = serializeData(splitResult.test, output_format)

        const trainWrite = secureFileService.safeWriteFile(trainPath, trainData, { encoding: 'utf8' })
        const valWrite = secureFileService.safeWriteFile(valPath, valData, { encoding: 'utf8' })
        const testWrite = secureFileService.safeWriteFile(testPath, testData, { encoding: 'utf8' })

        if (trainWrite.success) generatedFiles.push(trainPath)
        if (valWrite.success) generatedFiles.push(valPath)
        if (testWrite.success) generatedFiles.push(testPath)

        preview = `Split dataset: ${splitInfo.trainSamples} train, ${splitInfo.valSamples} val, ${splitInfo.testSamples} test`

      } else if (operation === 'validate_pairs') {
        // Build pairs
        const pairsResult = buildTrainingPairs(groundTruthData, masks)
        warnings.push(...pairsResult.warnings)

        // Validate pairs
        const validateResult = validatePairs(pairsResult.pairs)
        validationReport = validateResult.report
        warnings.push(...validateResult.warnings)

        preview = JSON.stringify(validationReport, null, 2)
      }

      const result: TrainingDataResult = {
        type: 'training_data_generated',
        data: {
          groundTruthFile: ground_truth_path,
          maskFile: mask_file_path,
          operation,
          pairsGenerated,
          splitInfo,
          validationReport,
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
      throw new Error(`Failed to generate training data: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
  renderResultForAssistant(data: TrainingDataResult) {
    const { data: result } = data
    const output = [
      `Ocean Training Data Generation Results`,
      `=====================================`,
      `Ground Truth: ${result.groundTruthFile}`,
      `Mask File: ${result.maskFile}`,
      `Operation: ${result.operation}`,
      '',
    ]

    if (result.pairsGenerated) {
      output.push(`Pairs Generated: ${result.pairsGenerated}`)
    }

    if (result.splitInfo) {
      output.push(`Dataset Split:`)
      output.push(`  Train: ${result.splitInfo.trainSamples}`)
      output.push(`  Val: ${result.splitInfo.valSamples}`)
      output.push(`  Test: ${result.splitInfo.testSamples}`)
    }

    if (result.validationReport) {
      output.push(`Validation Report:`)
      output.push(JSON.stringify(result.validationReport, null, 2))
    }

    output.push('')

    if (result.warnings.length > 0) {
      output.push(`Warnings:`)
      result.warnings.forEach(w => output.push(`- ${w}`))
      output.push('')
    }

    if (result.generatedFiles.length > 0) {
      output.push(`Generated Files:`)
      result.generatedFiles.forEach(f => output.push(`  - ${f}`))
    }

    output.push('')
    output.push(result.preview)

    return output.join('\n')
  },
} satisfies Tool<typeof inputSchema, TrainingDataResult>

// Helper functions

function buildTrainingPairs(
  groundTruth: OceanData,
  masks: any,
): { pairs: any[]; warnings: string[] } {
  const warnings: string[] = []
  const { cloudMasks, landMask } = masks

  if (!cloudMasks || cloudMasks.length === 0) {
    warnings.push('No cloud masks available for pair generation')
    return { pairs: [], warnings }
  }

  const pairs: any[] = []

  // Create pairs by applying each cloud mask to ground truth
  for (let i = 0; i < Math.min(cloudMasks.length, groundTruth.length); i++) {
    const gtRow = groundTruth[i]
    const cloudMask = cloudMasks[i].mask

    // Create input by applying mask
    const inputRow: any = {}
    Object.keys(gtRow).forEach(key => {
      if (cloudMask[key] || (landMask && landMask[key])) {
        inputRow[key] = null // Masked value
      } else {
        inputRow[key] = gtRow[key]
      }
    })

    pairs.push({
      input: inputRow,
      groundTruth: gtRow,
      maskIndex: i,
      missingRatio: cloudMasks[i].missingRatio,
    })
  }

  warnings.push(`Built ${pairs.length} training pairs (input/ground_truth)`)

  return { pairs, warnings }
}

function splitDataset(
  pairs: any[],
  params?: any,
): { train: any[]; val: any[]; test: any[]; splitInfo: any; warnings: string[] } {
  const warnings: string[] = []
  
  const trainRatio = params?.train_ratio || 0.7
  const valRatio = params?.val_ratio || 0.15
  const testRatio = params?.test_ratio || 0.15
  const shuffle = params?.shuffle !== false

  // Validate ratios
  if (Math.abs(trainRatio + valRatio + testRatio - 1.0) > 0.001) {
    warnings.push(`Warning: Split ratios sum to ${trainRatio + valRatio + testRatio}, adjusting to 1.0`)
  }

  let data = [...pairs]
  
  // Shuffle if requested
  if (shuffle) {
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]]
    }
    warnings.push('Shuffled dataset before splitting')
  }

  const totalSamples = data.length
  const trainSize = Math.floor(totalSamples * trainRatio)
  const valSize = Math.floor(totalSamples * valRatio)

  const train = data.slice(0, trainSize)
  const val = data.slice(trainSize, trainSize + valSize)
  const test = data.slice(trainSize + valSize)

  const splitInfo = {
    trainSamples: train.length,
    valSamples: val.length,
    testSamples: test.length,
  }

  warnings.push(`Split dataset: ${train.length} train, ${val.length} val, ${test.length} test`)

  return { train, val, test, splitInfo, warnings }
}

function validatePairs(pairs: any[]): { report: any; warnings: string[] } {
  const warnings: string[] = []
  
  let validPairs = 0
  let invalidPairs = 0

  pairs.forEach((pair, idx) => {
    const { input, groundTruth } = pair
    
    // Check if input and ground truth have same keys
    const inputKeys = Object.keys(input)
    const gtKeys = Object.keys(groundTruth)
    
    if (inputKeys.length !== gtKeys.length) {
      invalidPairs++
      warnings.push(`Pair ${idx}: Key count mismatch`)
      return
    }

    // Check if some values are masked in input
    let hasMaskedValues = false
    inputKeys.forEach(key => {
      if (input[key] === null && groundTruth[key] !== null) {
        hasMaskedValues = true
      }
    })

    if (hasMaskedValues) {
      validPairs++
    } else {
      invalidPairs++
      warnings.push(`Pair ${idx}: No masked values found`)
    }
  })

  const report = {
    totalPairs: pairs.length,
    validPairs,
    invalidPairs,
    validPercentage: Number(((validPairs / pairs.length) * 100).toFixed(2)),
  }

  warnings.push(`Validated ${pairs.length} pairs: ${validPairs} valid, ${invalidPairs} invalid`)

  return { report, warnings }
}
