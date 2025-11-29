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
} from '@utils/oceanData'
import { DESCRIPTION, PROMPT } from './prompt'

const MAX_LINES_TO_RENDER = 10

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the ocean data file to check'),
  quality_params: z
    .object({
      temp_range: z.tuple([z.number(), z.number()]).optional().describe('Valid temperature range in Celsius, e.g., [-2, 40]'),
      salinity_range: z.tuple([z.number(), z.number()]).optional().describe('Valid salinity range in PSU, e.g., [0, 42]'),
      pressure_range: z.tuple([z.number(), z.number()]).optional().describe('Valid pressure range in dbar, e.g., [0, 12000]'),
      oxygen_range: z.tuple([z.number(), z.number()]).optional().describe('Valid oxygen range in μmol/kg'),
      check_spikes: z.boolean().optional().describe('Check for spike anomalies (default: true)'),
      spike_threshold: z.number().optional().describe('Spike detection threshold (default: 3 std deviations)'),
    })
    .optional()
    .describe('Quality control parameters'),
  remove_outliers: z
    .boolean()
    .optional()
    .describe('Whether to remove outliers from data (default: false, only report)'),
  output_path: z
    .string()
    .optional()
    .describe('Optional output path to save quality-controlled data'),
  output_format: z
    .enum(['csv', 'json'])
    .optional()
    .describe('Output format (inferred from output_path if not specified)'),
})

type QualityControlResult = {
  type: 'quality_checked'
  data: {
    originalFile: string
    totalRows: number
    passedRows: number
    failedRows: number
    qualityReport: {
      temperatureOutliers?: number
      salinityOutliers?: number
      pressureOutliers?: number
      oxygenOutliers?: number
      spikesDetected?: number
      outlierPercentage: number
    }
    preview: string
    warnings: string[]
    outputPath?: string
  }
}

export const OceanQualityControlTool = {
  name: 'OceanQualityControl',
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
    return 'Ocean Quality Control'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ file_path }) {
    return !hasReadPermission(file_path || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { file_path, quality_params, remove_outliers, ...rest } = input
    const entries = [
      ['file_path', verbose ? file_path : relative(getCwd(), file_path)],
      ['quality_params', JSON.stringify(quality_params || 'default')],
      ['remove_outliers', remove_outliers || false],
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
              QC: {data.passedRows} passed, {data.failedRows} failed ({data.qualityReport.outlierPercentage.toFixed(2)}% outliers)
            </Text>
          </Box>
          <Box flexDirection="column" marginLeft={5}>
            <Text color={getTheme().secondaryText}>
              Temperature outliers: {data.qualityReport.temperatureOutliers || 0}
            </Text>
            <Text color={getTheme().secondaryText}>
              Salinity outliers: {data.qualityReport.salinityOutliers || 0}
            </Text>
            {data.qualityReport.spikesDetected !== undefined && (
              <Text color={getTheme().secondaryText}>
                Spikes detected: {data.qualityReport.spikesDetected}
              </Text>
            )}
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
      quality_params = {},
      remove_outliers = false,
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
      const totalRows = parsedData.length

      // Perform quality control
      const qcResult = performQualityControl(parsedData, quality_params, remove_outliers)
      const processedData = qcResult.data
      const qualityReport = qcResult.report
      const warnings = qcResult.warnings

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

      const result: QualityControlResult = {
        type: 'quality_checked',
        data: {
          originalFile: file_path,
          totalRows,
          passedRows: processedData.length,
          failedRows: totalRows - processedData.length,
          qualityReport,
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
      throw new Error(`Failed to perform quality control: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
  renderResultForAssistant(data: QualityControlResult) {
    const { data: result } = data
    const output = [
      `Ocean Quality Control Results`,
      `============================`,
      `Original File: ${result.originalFile}`,
      `Total Rows: ${result.totalRows}`,
      `Passed QC: ${result.passedRows}`,
      `Failed QC: ${result.failedRows}`,
      `Outlier Percentage: ${result.qualityReport.outlierPercentage.toFixed(2)}%`,
      '',
      `Quality Report:`,
    ]

    if (result.qualityReport.temperatureOutliers !== undefined) {
      output.push(`  Temperature outliers: ${result.qualityReport.temperatureOutliers}`)
    }
    if (result.qualityReport.salinityOutliers !== undefined) {
      output.push(`  Salinity outliers: ${result.qualityReport.salinityOutliers}`)
    }
    if (result.qualityReport.pressureOutliers !== undefined) {
      output.push(`  Pressure outliers: ${result.qualityReport.pressureOutliers}`)
    }
    if (result.qualityReport.oxygenOutliers !== undefined) {
      output.push(`  Oxygen outliers: ${result.qualityReport.oxygenOutliers}`)
    }
    if (result.qualityReport.spikesDetected !== undefined) {
      output.push(`  Spikes detected: ${result.qualityReport.spikesDetected}`)
    }

    output.push('')

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
} satisfies Tool<typeof inputSchema, QualityControlResult>

// Helper function

function performQualityControl(
  data: OceanData,
  params: any,
  removeOutliers: boolean
): {
  data: OceanData
  report: any
  warnings: string[]
} {
  const warnings: string[] = []
  
  // Default quality ranges
  const tempRange = params.temp_range || [-2, 40]  // Celsius
  const salinityRange = params.salinity_range || [0, 42]  // PSU
  const pressureRange = params.pressure_range || [0, 12000]  // dbar
  const oxygenRange = params.oxygen_range
  const checkSpikes = params.check_spikes !== false
  const spikeThreshold = params.spike_threshold || 3

  let tempOutliers = 0
  let salinityOutliers = 0
  let pressureOutliers = 0
  let oxygenOutliers = 0
  let spikesDetected = 0

  // Mark outliers
  const markedData = data.map((row, idx) => {
    let isOutlier = false

    const temp = row.temperature || row.Temperature || row.temp
    if (temp !== undefined && typeof temp === 'number') {
      if (temp < tempRange[0] || temp > tempRange[1]) {
        tempOutliers++
        isOutlier = true
      }
    }

    const salinity = row.salinity || row.Salinity
    if (salinity !== undefined && typeof salinity === 'number') {
      if (salinity < salinityRange[0] || salinity > salinityRange[1]) {
        salinityOutliers++
        isOutlier = true
      }
    }

    const pressure = row.pressure || row.Pressure
    if (pressure !== undefined && typeof pressure === 'number') {
      if (pressure < pressureRange[0] || pressure > pressureRange[1]) {
        pressureOutliers++
        isOutlier = true
      }
    }

    if (oxygenRange) {
      const oxygen = row.oxygen || row.Oxygen
      if (oxygen !== undefined && typeof oxygen === 'number') {
        if (oxygen < oxygenRange[0] || oxygen > oxygenRange[1]) {
          oxygenOutliers++
          isOutlier = true
        }
      }
    }

    return { ...row, _qc_outlier: isOutlier }
  })

  // Check for spikes if enabled
  if (checkSpikes) {
    // Simple spike detection for temperature
    const tempKey = 'temperature' || 'Temperature' || 'temp'
    for (let i = 1; i < markedData.length - 1; i++) {
      const prev = markedData[i - 1][tempKey]
      const curr = markedData[i][tempKey]
      const next = markedData[i + 1][tempKey]

      if (typeof prev === 'number' && typeof curr === 'number' && typeof next === 'number') {
        const avgNeighbor = (prev + next) / 2
        const diff = Math.abs(curr - avgNeighbor)
        const stdWindow = Math.sqrt(((prev - avgNeighbor) ** 2 + (next - avgNeighbor) ** 2) / 2)
        
        if (stdWindow > 0 && diff > spikeThreshold * stdWindow) {
          markedData[i]._qc_outlier = true
          spikesDetected++
        }
      }
    }
  }

  // Filter or keep data based on remove_outliers flag
  const processedData = removeOutliers
    ? markedData.filter(row => !row._qc_outlier).map(row => {
        const { _qc_outlier, ...cleanRow } = row
        return cleanRow
      })
    : markedData.map(row => {
        const { _qc_outlier, ...cleanRow } = row
        return cleanRow
      })

  const totalOutliers = tempOutliers + salinityOutliers + pressureOutliers + oxygenOutliers
  const outlierPercentage = (totalOutliers / data.length) * 100

  if (tempOutliers > 0) {
    warnings.push(`Found ${tempOutliers} temperature outliers outside range ${tempRange}`)
  }
  if (salinityOutliers > 0) {
    warnings.push(`Found ${salinityOutliers} salinity outliers outside range ${salinityRange}`)
  }
  if (pressureOutliers > 0) {
    warnings.push(`Found ${pressureOutliers} pressure outliers outside range ${pressureRange}`)
  }
  if (oxygenOutliers > 0) {
    warnings.push(`Found ${oxygenOutliers} oxygen outliers outside range ${oxygenRange}`)
  }
  if (spikesDetected > 0) {
    warnings.push(`Detected ${spikesDetected} spike anomalies`)
  }

  if (removeOutliers) {
    warnings.push(`Removed ${data.length - processedData.length} outlier rows`)
  } else {
    warnings.push(`Outliers detected but not removed. Set remove_outliers=true to remove them.`)
  }

  const report = {
    temperatureOutliers: tempOutliers,
    salinityOutliers: salinityOutliers,
    pressureOutliers: pressureOutliers,
    oxygenOutliers: oxygenOutliers > 0 ? oxygenOutliers : undefined,
    spikesDetected: checkSpikes ? spikesDetected : undefined,
    outlierPercentage,
  }

  return { data: processedData, report, warnings }
}
