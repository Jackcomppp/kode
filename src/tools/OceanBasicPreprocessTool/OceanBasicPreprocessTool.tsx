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
  findNumericColumns,
  isMissing,
  calculateStatistics,
  DATA_EXTENSIONS,
  MAX_OUTPUT_SIZE,
  type OceanData,
  type OceanDataResult,
} from '@utils/oceanData'
import { DESCRIPTION, PROMPT } from './prompt'

const MAX_LINES_TO_RENDER = 10

// Valid basic preprocessing operations
const VALID_OPERATIONS = [
  'clean',         // Remove missing values and duplicates
  'normalize',     // Normalize numeric columns to [0, 1]
  'standardize',   // Standardize numeric columns (z-score)
  'interpolate',   // Interpolate missing values
  'statistics',    // Calculate statistical summaries
] as const

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the ocean data file (CSV, JSON)'),
  operations: z
    .array(z.enum(VALID_OPERATIONS))
    .optional()
    .describe('List of basic preprocessing operations: clean, normalize, standardize, interpolate, statistics'),
  output_path: z
    .string()
    .optional()
    .describe('Optional output path to save preprocessed data'),
  output_format: z
    .enum(['csv', 'json'])
    .optional()
    .describe('Output format (inferred from output_path if not specified)'),
})

type PreprocessResult = {
  type: 'preprocessed'
  data: {
    originalFile: string
    processedRows: number
    operations: string[]
    statistics?: Record<string, any>
    preview: string
    warnings: string[]
    outputPath?: string
  }
}

export const OceanBasicPreprocessTool = {
  name: 'OceanBasicPreprocess',
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
    return 'Ocean Basic Preprocess'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ file_path }) {
    return !hasReadPermission(file_path || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { file_path, operations, ...rest } = input
    const entries = [
      ['file_path', verbose ? file_path : relative(getCwd(), file_path)],
      ['operations', operations?.join(', ') || 'clean, statistics'],
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
              Preprocessed {data.processedRows} rows
            </Text>
          </Box>
          {data.operations && data.operations.length > 0 && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Operations: {data.operations.join(', ')}
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
                language="csv"
              />
              {!verbose && data.preview.split('\n').length > MAX_LINES_TO_RENDER && (
                <Text color={getTheme().secondaryText}>
                  ... (+{data.preview.split('\n').length - MAX_LINES_TO_RENDER} lines)
                </Text>
              )}
            </Box>
          )}
        </Box>
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ file_path, output_path }) {
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

    const stats = fileCheck.stats!
    const fileSize = stats.size
    const ext = path.extname(fullFilePath).toLowerCase()

    if (!DATA_EXTENSIONS.has(ext)) {
      return {
        result: false,
        message: `Unsupported file format: ${ext}. Supported: ${Array.from(DATA_EXTENSIONS).join(', ')}`,
      }
    }

    if (fileSize > MAX_OUTPUT_SIZE) {
      return {
        result: false,
        message: `File size exceeds maximum (${Math.round(MAX_OUTPUT_SIZE / 1024 / 1024)}MB)`,
      }
    }

    if (output_path) {
      const outputDir = path.dirname(normalizeFilePath(output_path))
      const outputDirCheck = secureFileService.safeGetFileInfo(outputDir)
      if (!outputDirCheck.success) {
        return {
          result: false,
          message: `Output directory does not exist: ${outputDir}`,
        }
      }
    }

    return { result: true }
  },
  async *call(
    {
      file_path,
      operations = ['clean', 'statistics'],
      output_path,
      output_format
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
      // Read the data file
      const fileReadResult = secureFileService.safeReadFile(fullFilePath, {
        encoding: 'utf8',
        maxFileSize: MAX_OUTPUT_SIZE,
      })

      if (!fileReadResult.success) {
        throw new Error(`Failed to read data file: ${fileReadResult.error}`)
      }

      const rawData = fileReadResult.content
      const parsedData = await parseDataFile(rawData, ext)

      const warnings: string[] = []
      let processedData = parsedData
      let statistics: Record<string, any> | undefined

      // Apply preprocessing operations
      for (const operation of operations) {
        switch (operation) {
          case 'clean':
            const cleanResult = cleanData(processedData)
            processedData = cleanResult.data
            warnings.push(...cleanResult.warnings)
            break

          case 'normalize':
            const normalizeResult = normalizeData(processedData)
            processedData = normalizeResult.data
            warnings.push(...normalizeResult.warnings)
            break

          case 'standardize':
            const standardizeResult = standardizeData(processedData)
            processedData = standardizeResult.data
            warnings.push(...standardizeResult.warnings)
            break

          case 'interpolate':
            const interpolateResult = interpolateMissingValues(processedData)
            processedData = interpolateResult.data
            warnings.push(...interpolateResult.warnings)
            break

          case 'statistics':
            statistics = calculateStatistics(processedData)
            break
        }
      }

      // Generate preview
      const preview = generatePreview(processedData)

      // Save output if requested
      let savedOutputPath: string | undefined
      if (output_path) {
        const fullOutputPath = normalizeFilePath(output_path)
        const outputExt = path.extname(fullOutputPath).toLowerCase()
        const format = output_format || inferOutputFormat(outputExt)
        const outputData = serializeData(processedData, format)

        const writeResult = secureFileService.safeWriteFile(fullOutputPath, outputData, {
          encoding: 'utf8',
        })

        if (writeResult.success) {
          savedOutputPath = fullOutputPath
        } else {
          warnings.push(`Failed to write output file: ${writeResult.error}`)
        }
      }

      const result: PreprocessResult = {
        type: 'preprocessed',
        data: {
          originalFile: file_path,
          processedRows: processedData.length,
          operations,
          statistics,
          preview,
          warnings,
          outputPath: savedOutputPath,
        },
      }

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result),
      }
    } catch (e) {
      logError(e)
      throw new Error(`Failed to preprocess ocean data: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
  renderResultForAssistant(data: PreprocessResult) {
    const { data: result } = data
    const output = [
      `Ocean Basic Preprocessing Results`,
      `=================================`,
      `Original File: ${result.originalFile}`,
      `Processed Rows: ${result.processedRows}`,
      `Operations Applied: ${result.operations.join(', ')}`,
      '',
    ]

    if (result.statistics) {
      output.push(`Statistical Summary:`)
      output.push(JSON.stringify(result.statistics, null, 2))
      output.push('')
    }

    if (result.warnings.length > 0) {
      output.push(`Warnings:`)
      result.warnings.forEach(w => output.push(`- ${w}`))
      output.push('')
    }

    if (result.preview) {
      output.push(`Data Preview:`)
      output.push(result.preview)
    }

    if (result.outputPath) {
      output.push(``)
      output.push(`Output saved to: ${result.outputPath}`)
    }

    return output.join('\n')
  },
} satisfies Tool<typeof inputSchema, PreprocessResult>

// Helper functions

function cleanData(data: OceanData): OceanDataResult {
  const warnings: string[] = []
  let removedRows = 0

  // Remove rows with too many missing values (>50% of columns)
  const cleaned = data.filter(row => {
    const keys = Object.keys(row)
    const missingCount = keys.filter(key => isMissing(row[key])).length

    if (missingCount / keys.length > 0.5) {
      removedRows++
      return false
    }
    return true
  })

  // Remove duplicates
  const unique = Array.from(
    new Map(cleaned.map(row => [JSON.stringify(row), row])).values()
  )

  const duplicates = cleaned.length - unique.length

  if (removedRows > 0) {
    warnings.push(`Removed ${removedRows} rows with excessive missing values`)
  }
  if (duplicates > 0) {
    warnings.push(`Removed ${duplicates} duplicate rows`)
  }

  return { data: unique, warnings }
}

function normalizeData(data: OceanData): OceanDataResult {
  const warnings: string[] = []
  const numericColumns = findNumericColumns(data)

  if (numericColumns.length === 0) {
    warnings.push('No numeric columns found for normalization')
    return { data, warnings }
  }

  // Calculate min/max for each column
  const ranges: Record<string, { min: number; max: number }> = {}
  numericColumns.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[]
    ranges[col] = {
      min: Math.min(...values),
      max: Math.max(...values),
    }
  })

  // Normalize each numeric column to [0, 1]
  const normalized = data.map(row => {
    const newRow = { ...row }
    numericColumns.forEach(col => {
      if (typeof row[col] === 'number') {
        const { min, max } = ranges[col]
        if (max - min !== 0) {
          newRow[col] = (row[col] as number - min) / (max - min)
        }
      }
    })
    return newRow
  })

  warnings.push(`Normalized ${numericColumns.length} numeric columns`)
  return { data: normalized, warnings }
}

function standardizeData(data: OceanData): OceanDataResult {
  const warnings: string[] = []
  const numericColumns = findNumericColumns(data)

  if (numericColumns.length === 0) {
    warnings.push('No numeric columns found for standardization')
    return { data, warnings }
  }

  // Calculate mean/std for each column
  const stats: Record<string, { mean: number; std: number }> = {}
  numericColumns.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[]
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(
      values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
    )
    stats[col] = { mean, std }
  })

  // Standardize each numeric column (z-score)
  const standardized = data.map(row => {
    const newRow = { ...row }
    numericColumns.forEach(col => {
      if (typeof row[col] === 'number') {
        const { mean, std } = stats[col]
        if (std !== 0) {
          newRow[col] = ((row[col] as number) - mean) / std
        }
      }
    })
    return newRow
  })

  warnings.push(`Standardized ${numericColumns.length} numeric columns`)
  return { data: standardized, warnings }
}

function interpolateMissingValues(data: OceanData): OceanDataResult {
  const warnings: string[] = []
  const numericColumns = findNumericColumns(data)

  let interpolatedCount = 0

  const interpolated = data.map((row, idx) => {
    const newRow = { ...row }

    numericColumns.forEach(col => {
      if (isMissing(row[col])) {
        // Simple linear interpolation
        let prevValue: number | null = null
        let nextValue: number | null = null

        // Find previous valid value
        for (let i = idx - 1; i >= 0; i--) {
          if (typeof data[i][col] === 'number') {
            prevValue = data[i][col] as number
            break
          }
        }

        // Find next valid value
        for (let i = idx + 1; i < data.length; i++) {
          if (typeof data[i][col] === 'number') {
            nextValue = data[i][col] as number
            break
          }
        }

        if (prevValue !== null && nextValue !== null) {
          newRow[col] = (prevValue + nextValue) / 2
          interpolatedCount++
        } else if (prevValue !== null) {
          newRow[col] = prevValue
          interpolatedCount++
        } else if (nextValue !== null) {
          newRow[col] = nextValue
          interpolatedCount++
        }
      }
    })

    return newRow
  })

  if (interpolatedCount > 0) {
    warnings.push(`Interpolated ${interpolatedCount} missing values`)
  }

  return { data: interpolated, warnings }
}
