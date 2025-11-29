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
  DATA_EXTENSIONS,
  MAX_OUTPUT_SIZE,
  type OceanData,
  type OceanDataResult,
} from '@utils/oceanData'
import { DESCRIPTION, PROMPT } from './prompt'

const MAX_LINES_TO_RENDER = 10

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the ocean data file to filter'),
  filter_params: z
    .object({
      start_date: z.string().optional().describe('Start date for filtering (ISO format)'),
      end_date: z.string().optional().describe('End date for filtering (ISO format)'),
      min_depth: z.number().optional().describe('Minimum depth in meters'),
      max_depth: z.number().optional().describe('Maximum depth in meters'),
      latitude_range: z.tuple([z.number(), z.number()]).optional().describe('Latitude range [min, max]'),
      longitude_range: z.tuple([z.number(), z.number()]).optional().describe('Longitude range [min, max]'),
      min_temperature: z.number().optional().describe('Minimum temperature in Celsius'),
      max_temperature: z.number().optional().describe('Maximum temperature in Celsius'),
      min_salinity: z.number().optional().describe('Minimum salinity in PSU'),
      max_salinity: z.number().optional().describe('Maximum salinity in PSU'),
    })
    .describe('Filter parameters for data selection'),
  output_path: z
    .string()
    .optional()
    .describe('Optional output path to save filtered data'),
  output_format: z
    .enum(['csv', 'json'])
    .optional()
    .describe('Output format (inferred from output_path if not specified)'),
})

type FilterResult = {
  type: 'filtered'
  data: {
    originalFile: string
    originalRows: number
    filteredRows: number
    removedRows: number
    filterParams: Record<string, any>
    preview: string
    warnings: string[]
    outputPath?: string
  }
}

export const OceanDataFilterTool = {
  name: 'OceanDataFilter',
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
    return 'Ocean Data Filter'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ file_path }) {
    return !hasReadPermission(file_path || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { file_path, filter_params, ...rest } = input
    const entries = [
      ['file_path', verbose ? file_path : relative(getCwd(), file_path)],
      ['filter_params', JSON.stringify(filter_params)],
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
              Filtered {data.originalRows} → {data.filteredRows} rows ({data.removedRows} removed)
            </Text>
          </Box>
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
  async validateInput({ file_path, filter_params, output_path }) {
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

    if (!filter_params || Object.keys(filter_params).length === 0) {
      return {
        result: false,
        message: 'At least one filter parameter must be specified',
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
      filter_params,
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
      const originalRows = parsedData.length

      // Apply filters
      const filterResult = filterData(parsedData, filter_params)
      const filteredData = filterResult.data
      const warnings = filterResult.warnings

      // Generate preview
      const preview = generatePreview(filteredData)

      // Save output if requested
      let savedOutputPath: string | undefined
      if (output_path) {
        const fullOutputPath = normalizeFilePath(output_path)
        const outputExt = path.extname(fullOutputPath).toLowerCase()
        const format = output_format || inferOutputFormat(outputExt)
        const outputData = serializeData(filteredData, format)

        const writeResult = secureFileService.safeWriteFile(fullOutputPath, outputData, {
          encoding: 'utf8',
        })

        if (writeResult.success) {
          savedOutputPath = fullOutputPath
        } else {
          warnings.push(`Failed to write output file: ${writeResult.error}`)
        }
      }

      const result: FilterResult = {
        type: 'filtered',
        data: {
          originalFile: file_path,
          originalRows,
          filteredRows: filteredData.length,
          removedRows: originalRows - filteredData.length,
          filterParams: filter_params,
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
      throw new Error(`Failed to filter ocean data: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
  renderResultForAssistant(data: FilterResult) {
    const { data: result } = data
    const output = [
      `Ocean Data Filter Results`,
      `========================`,
      `Original File: ${result.originalFile}`,
      `Original Rows: ${result.originalRows}`,
      `Filtered Rows: ${result.filteredRows}`,
      `Removed Rows: ${result.removedRows}`,
      '',
      `Filter Parameters:`,
      JSON.stringify(result.filterParams, null, 2),
      '',
    ]

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
} satisfies Tool<typeof inputSchema, FilterResult>

// Helper function

function filterData(
  data: OceanData,
  params: any,
): OceanDataResult {
  const warnings: string[] = []
  let filtered = [...data]
  const originalCount = data.length

  // Filter by date range
  if (params.start_date || params.end_date) {
    const beforeCount = filtered.length
    filtered = filtered.filter(row => {
      const dateStr = row.date || row.Date || row.datetime || row.time
      if (!dateStr) return true

      const date = new Date(dateStr as string)
      if (isNaN(date.getTime())) return true

      if (params.start_date) {
        const startDate = new Date(params.start_date)
        if (date < startDate) return false
      }

      if (params.end_date) {
        const endDate = new Date(params.end_date)
        if (date > endDate) return false
      }

      return true
    })
    warnings.push(`Date filter: removed ${beforeCount - filtered.length} rows`)
  }

  // Filter by depth
  if (params.min_depth !== undefined || params.max_depth !== undefined) {
    const beforeCount = filtered.length
    filtered = filtered.filter(row => {
      const depth = row.depth || row.Depth
      if (depth === undefined) return true

      if (params.min_depth !== undefined && (depth as number) < params.min_depth) return false
      if (params.max_depth !== undefined && (depth as number) > params.max_depth) return false
      return true
    })
    warnings.push(`Depth filter: removed ${beforeCount - filtered.length} rows`)
  }

  // Filter by latitude/longitude
  if (params.latitude_range || params.longitude_range) {
    const beforeCount = filtered.length
    filtered = filtered.filter(row => {
      if (params.latitude_range) {
        const lat = row.latitude || row.Latitude || row.lat
        if (lat !== undefined && ((lat as number) < params.latitude_range[0] || (lat as number) > params.latitude_range[1])) {
          return false
        }
      }
      if (params.longitude_range) {
        const lon = row.longitude || row.Longitude || row.lon
        if (lon !== undefined && ((lon as number) < params.longitude_range[0] || (lon as number) > params.longitude_range[1])) {
          return false
        }
      }
      return true
    })
    warnings.push(`Coordinate filter: removed ${beforeCount - filtered.length} rows`)
  }

  // Filter by temperature
  if (params.min_temperature !== undefined || params.max_temperature !== undefined) {
    const beforeCount = filtered.length
    filtered = filtered.filter(row => {
      const temp = row.temperature || row.Temperature || row.temp
      if (temp === undefined) return true

      if (params.min_temperature !== undefined && (temp as number) < params.min_temperature) return false
      if (params.max_temperature !== undefined && (temp as number) > params.max_temperature) return false
      return true
    })
    warnings.push(`Temperature filter: removed ${beforeCount - filtered.length} rows`)
  }

  // Filter by salinity
  if (params.min_salinity !== undefined || params.max_salinity !== undefined) {
    const beforeCount = filtered.length
    filtered = filtered.filter(row => {
      const salinity = row.salinity || row.Salinity
      if (salinity === undefined) return true

      if (params.min_salinity !== undefined && (salinity as number) < params.min_salinity) return false
      if (params.max_salinity !== undefined && (salinity as number) > params.max_salinity) return false
      return true
    })
    warnings.push(`Salinity filter: removed ${beforeCount - filtered.length} rows`)
  }

  warnings.push(`Total filtered: ${originalCount} → ${filtered.length} rows (${originalCount - filtered.length} removed)`)

  return { data: filtered, warnings }
}
