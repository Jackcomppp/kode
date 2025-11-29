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
  isMissing,
  DATA_EXTENSIONS,
  MAX_OUTPUT_SIZE,
  type OceanData,
} from '@utils/oceanData'
import { DESCRIPTION, PROMPT } from './prompt'

const MAX_LINES_TO_RENDER = 10

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the ocean data file'),
  operation: z
    .enum(['generate_masks', 'apply_masks', 'analyze_masks'])
    .describe('Mask operation: generate_masks, apply_masks, or analyze_masks'),
  mask_params: z
    .object({
      missing_ratio_range: z.tuple([z.number(), z.number()]).optional().describe('Valid missing ratio range [min, max], e.g., [0.1, 0.6]'),
      mask_count: z.number().optional().describe('Number of masks to generate (default: 360)'),
      land_threshold: z.number().optional().describe('Threshold for land mask detection (frames all NaN)'),
    })
    .optional()
    .describe('Parameters for mask generation'),
  mask_file_path: z
    .string()
    .optional()
    .describe('Path to existing mask file (JSON format) for apply_masks or analyze_masks operations'),
  output_path: z
    .string()
    .optional()
    .describe('Output path to save masks (JSON) or masked data'),
})

type MaskProcessResult = {
  type: 'mask_processed'
  data: {
    originalFile: string
    operation: string
    maskReport: {
      landMaskGenerated?: boolean
      landPixelCount?: number
      cloudMasksGenerated?: number
      missingRatioRange?: [number, number]
      masksApplied?: number
      averageMissingRatio?: number
    }
    preview?: string
    warnings: string[]
    outputPath?: string
    generatedFiles?: string[]
  }
}

export const OceanMaskProcessTool = {
  name: 'OceanMaskProcess',
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
    return 'Ocean Mask Process'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ file_path }) {
    return !hasReadPermission(file_path || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { file_path, operation, ...rest } = input
    const entries = [
      ['file_path', verbose ? file_path : relative(getCwd(), file_path)],
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
              {data.operation}: {data.maskReport.cloudMasksGenerated || data.maskReport.masksApplied || 'completed'}
            </Text>
          </Box>
          {data.maskReport.landMaskGenerated && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Land pixels: {data.maskReport.landPixelCount}
              </Text>
            </Box>
          )}
          {data.maskReport.cloudMasksGenerated && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Cloud masks: {data.maskReport.cloudMasksGenerated}
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
          {data.preview && (
            <Box flexDirection="column" marginLeft={5} marginTop={1}>
              <HighlightedCode
                code={
                  verbose
                    ? data.preview
                    : data.preview
                        .split('\n')
                        .slice(0, MAX_LINES_TO_RENDER)
                        .join('\n')
                }
                language="json"
              />
            </Box>
          )}
        </Box>
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ file_path, operation, mask_file_path, output_path }) {
    const fullFilePath = normalizeFilePath(file_path)

    const fileCheck = secureFileService.safeGetFileInfo(fullFilePath)
    if (!fileCheck.success) {
      const similarFilename = findSimilarFile(fullFilePath)
      let message = 'Ocean data file does not exist.'
      if (similarFilename) {
        message += ` Did you mean ${similarFilename}?`
      }
      return { result: false, message }
    }

    const ext = path.extname(fullFilePath).toLowerCase()
    if (!DATA_EXTENSIONS.has(ext)) {
      return {
        result: false,
        message: `Unsupported file format: ${ext}`,
      }
    }

    if ((operation === 'apply_masks' || operation === 'analyze_masks') && !mask_file_path) {
      return {
        result: false,
        message: `${operation} requires mask_file_path parameter`,
      }
    }

    if (mask_file_path) {
      const maskCheck = secureFileService.safeGetFileInfo(normalizeFilePath(mask_file_path))
      if (!maskCheck.success) {
        return {
          result: false,
          message: `Mask file does not exist: ${mask_file_path}`,
        }
      }
    }

    return { result: true }
  },
  async *call(
    {
      file_path,
      operation,
      mask_params,
      mask_file_path,
      output_path,
    },
    { readFileTimestamps },
  ) {
    const ext = path.extname(file_path).toLowerCase()
    const fullFilePath = normalizeFilePath(file_path)

    emitReminderEvent('file:read', {
      filePath: fullFilePath,
      extension: ext,
      timestamp: Date.now(),
    })

    readFileTimestamps[fullFilePath] = Date.now()

    try {
      const warnings: string[] = []
      let maskReport: any = {}
      let preview: string | undefined
      let savedOutputPath: string | undefined
      const generatedFiles: string[] = []

      if (operation === 'generate_masks') {
        // Read data file
        const fileReadResult = secureFileService.safeReadFile(fullFilePath, {
          encoding: 'utf8',
          maxFileSize: MAX_OUTPUT_SIZE,
        })

        if (!fileReadResult.success) {
          throw new Error(`Failed to read data file: ${fileReadResult.error}`)
        }

        const rawData = fileReadResult.content
        const parsedData = await parseDataFile(rawData, ext)

        // Generate masks
        const maskGenResult = generateMasks(parsedData, mask_params)
        maskReport = maskGenResult.report
        warnings.push(...maskGenResult.warnings)

        // Save masks if output path provided
        if (output_path) {
          const fullOutputPath = normalizeFilePath(output_path)
          const maskData = JSON.stringify(maskGenResult.masks, null, 2)
          
          const writeResult = secureFileService.safeWriteFile(fullOutputPath, maskData, {
            encoding: 'utf8',
          })

          if (writeResult.success) {
            savedOutputPath = fullOutputPath
            generatedFiles.push(fullOutputPath)
          } else {
            warnings.push(`Failed to write mask file: ${writeResult.error}`)
          }
        }

        preview = JSON.stringify(maskReport, null, 2)

      } else if (operation === 'apply_masks') {
        // Read data file
        const fileReadResult = secureFileService.safeReadFile(fullFilePath, {
          encoding: 'utf8',
          maxFileSize: MAX_OUTPUT_SIZE,
        })

        if (!fileReadResult.success) {
          throw new Error(`Failed to read data file: ${fileReadResult.error}`)
        }

        const rawData = fileReadResult.content
        const parsedData = await parseDataFile(rawData, ext)

        // Read mask file
        const maskReadResult = secureFileService.safeReadFile(normalizeFilePath(mask_file_path!), {
          encoding: 'utf8',
        })

        if (!maskReadResult.success) {
          throw new Error(`Failed to read mask file: ${maskReadResult.error}`)
        }

        const masks = JSON.parse(maskReadResult.content as string)
        
        // Apply masks
        const applyResult = applyMasksToData(parsedData, masks)
        maskReport = applyResult.report
        warnings.push(...applyResult.warnings)

        // Save masked data if output path provided
        if (output_path) {
          const fullOutputPath = normalizeFilePath(output_path)
          const outputData = JSON.stringify(applyResult.data, null, 2)
          
          const writeResult = secureFileService.safeWriteFile(fullOutputPath, outputData, {
            encoding: 'utf8',
          })

          if (writeResult.success) {
            savedOutputPath = fullOutputPath
            generatedFiles.push(fullOutputPath)
          } else {
            warnings.push(`Failed to write output file: ${writeResult.error}`)
          }
        }

        preview = generatePreview(applyResult.data)

      } else if (operation === 'analyze_masks') {
        // Read mask file
        const maskReadResult = secureFileService.safeReadFile(normalizeFilePath(mask_file_path!), {
          encoding: 'utf8',
        })

        if (!maskReadResult.success) {
          throw new Error(`Failed to read mask file: ${maskReadResult.error}`)
        }

        const masks = JSON.parse(maskReadResult.content as string)
        
        // Analyze masks
        const analyzeResult = analyzeMasks(masks)
        maskReport = analyzeResult.report
        warnings.push(...analyzeResult.warnings)

        preview = JSON.stringify(maskReport, null, 2)
      }

      const result: MaskProcessResult = {
        type: 'mask_processed',
        data: {
          originalFile: file_path,
          operation,
          maskReport,
          preview,
          warnings,
          outputPath: savedOutputPath,
          generatedFiles: generatedFiles.length > 0 ? generatedFiles : undefined,
        },
      }

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result),
      }
    } catch (e) {
      logError(e)
      throw new Error(`Failed to process masks: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
  renderResultForAssistant(data: MaskProcessResult) {
    const { data: result } = data
    const output = [
      `Ocean Mask Processing Results`,
      `============================`,
      `Original File: ${result.originalFile}`,
      `Operation: ${result.operation}`,
      '',
      `Mask Report:`,
      JSON.stringify(result.maskReport, null, 2),
      '',
    ]

    if (result.warnings.length > 0) {
      output.push(`Warnings:`)
      result.warnings.forEach(w => output.push(`- ${w}`))
      output.push('')
    }

    if (result.preview) {
      output.push(`Preview:`)
      output.push(result.preview)
    }

    if (result.outputPath) {
      output.push(``)
      output.push(`Output saved to: ${result.outputPath}`)
    }

    if (result.generatedFiles && result.generatedFiles.length > 0) {
      output.push(``)
      output.push(`Generated files:`)
      result.generatedFiles.forEach(f => output.push(`  - ${f}`))
    }

    return output.join('\n')
  },
} satisfies Tool<typeof inputSchema, MaskProcessResult>

// Helper functions

function generateMasks(
  data: OceanData,
  params?: any,
): { masks: any; report: any; warnings: string[] } {
  const warnings: string[] = []
  
  if (data.length === 0) {
    warnings.push('Data format not suitable for mask generation')
    return { masks: {}, report: {}, warnings }
  }

  const missingRatioRange = params?.missing_ratio_range || [0.1, 0.6]
  const maskCount = params?.mask_count || 360

  // Generate land mask (columns that are always missing)
  const firstRow = data[0]
  const keys = Object.keys(firstRow)
  const landMask: Record<string, boolean> = {}

  keys.forEach(key => {
    const allMissing = data.every(row => isMissing(row[key]))
    landMask[key] = allMissing
  })

  const landPixelCount = Object.values(landMask).filter(v => v).length
  warnings.push(`Generated land mask: ${landPixelCount} land pixels identified`)

  // Generate cloud masks (rows with valid missing ratios)
  const cloudMasks: any[] = []
  const seaKeys = keys.filter(key => !landMask[key])

  if (seaKeys.length === 0) {
    warnings.push('No valid sea pixels found for cloud mask generation')
    return { 
      masks: { landMask, cloudMasks: [] }, 
      report: { landMaskGenerated: true, landPixelCount, cloudMasksGenerated: 0 },
      warnings 
    }
  }

  for (let i = 0; i < data.length && cloudMasks.length < maskCount; i++) {
    const row = data[i]
    const missingCount = seaKeys.filter(key => isMissing(row[key])).length
    const missingRatio = missingCount / seaKeys.length

    if (missingRatio >= missingRatioRange[0] && missingRatio <= missingRatioRange[1]) {
      const mask: Record<string, boolean> = {}
      keys.forEach(key => {
        mask[key] = isMissing(row[key])
      })
      cloudMasks.push({
        index: i,
        missingRatio: Number(missingRatio.toFixed(4)),
        mask: mask,
      })
    }
  }

  warnings.push(`Generated ${cloudMasks.length} cloud masks with missing ratio in [${missingRatioRange[0]}, ${missingRatioRange[1]}]`)

  const report = {
    landMaskGenerated: true,
    landPixelCount,
    cloudMasksGenerated: cloudMasks.length,
    missingRatioRange,
  }

  return { masks: { landMask, cloudMasks }, report, warnings }
}

function applyMasksToData(
  data: OceanData,
  masks: any,
): { data: OceanData; report: any; warnings: string[] } {
  const warnings: string[] = []
  
  const { cloudMasks } = masks
  
  if (!cloudMasks || cloudMasks.length === 0) {
    warnings.push('No cloud masks found to apply')
    return { data, report: { masksApplied: 0 }, warnings }
  }

  // Apply random cloud masks to data
  const maskedData = data.map((row, idx) => {
    if (idx < cloudMasks.length && cloudMasks[idx]) {
      const mask = cloudMasks[idx].mask
      const newRow = { ...row }
      Object.keys(mask).forEach(key => {
        if (mask[key]) {
          newRow[key] = null // Apply mask by setting to null
        }
      })
      return newRow
    }
    return row
  })

  warnings.push(`Applied ${Math.min(cloudMasks.length, data.length)} cloud masks to data`)

  const report = {
    masksApplied: Math.min(cloudMasks.length, data.length),
  }

  return { data: maskedData, report, warnings }
}

function analyzeMasks(masks: any): { report: any; warnings: string[] } {
  const warnings: string[] = []
  
  const { landMask, cloudMasks } = masks

  const landPixelCount = landMask ? Object.values(landMask).filter((v: any) => v).length : 0
  
  let averageMissingRatio = 0
  if (cloudMasks && cloudMasks.length > 0) {
    const totalRatio = cloudMasks.reduce((sum: number, cm: any) => sum + cm.missingRatio, 0)
    averageMissingRatio = totalRatio / cloudMasks.length
  }

  warnings.push(`Analyzed ${cloudMasks?.length || 0} cloud masks`)
  warnings.push(`Average missing ratio: ${averageMissingRatio.toFixed(4)}`)

  const report = {
    landMaskGenerated: !!landMask,
    landPixelCount,
    cloudMasksGenerated: cloudMasks?.length || 0,
    averageMissingRatio: Number(averageMissingRatio.toFixed(4)),
  }

  return { report, warnings }
}
