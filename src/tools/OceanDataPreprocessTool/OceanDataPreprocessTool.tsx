import { statSync } from 'node:fs'
import { Box, Text } from 'ink'
import * as path from 'node:path'
import { extname, relative } from 'node:path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '@components/FallbackToolUseRejectedMessage'
import { HighlightedCode } from '@components/HighlightedCode'
import type { Tool } from '@tool'
import { getCwd } from '@utils/state'
import {
  findSimilarFile,
  normalizeFilePath,
} from '@utils/file'
import { logError } from '@utils/log'
import { getTheme } from '@utils/theme'
import { emitReminderEvent } from '@services/systemReminder'
import { DESCRIPTION, PROMPT } from './prompt'
import { hasReadPermission } from '@utils/permissions/filesystem'
import { secureFileService } from '@utils/secureFile'

const MAX_LINES_TO_RENDER = 10
const MAX_OUTPUT_SIZE = 50 * 1024 * 1024 // 50MB in bytes (increased for NetCDF/HDF5)
const MAX_DATA_ROWS = 100000 // Increased for large datasets

// Supported ocean data file extensions
const DATA_EXTENSIONS = new Set([
  '.csv',
  '.json',
  '.xlsx',
  '.xls',
  '.txt',
  '.nc',   // NetCDF format
  '.hdf5', // HDF5 format
  '.h5',   // HDF5 format (alternative extension)
])

// Valid preprocessing operations
const VALID_OPERATIONS = [
  'clean',                  // Remove missing values and duplicates
  'filter',                 // Filter data by conditions
  'normalize',              // Normalize numeric columns
  'standardize',            // Standardize numeric columns (z-score)
  'quality_check',          // Check ocean parameter quality
  'statistics',             // Calculate statistical summaries
  'interpolate',            // Interpolate missing values
  'generate_masks',         // Generate land/cloud masks from data
  'apply_masks',            // Apply masks to create missing data
  'build_training_pairs',   // Build input/ground_truth pairs for training
  'spatial_subset',         // Extract spatial subset by lat/lon
  'grid_align',             // Align grid to target resolution
  'fill_missing',           // Advanced missing data filling strategies
] as const

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the ocean data file to preprocess (supports CSV, JSON, NetCDF, HDF5)'),
  operations: z
    .array(z.enum(VALID_OPERATIONS))
    .optional()
    .describe(
      'List of preprocessing operations to apply: clean, filter, normalize, standardize, quality_check, statistics, interpolate, generate_masks, apply_masks, build_training_pairs, spatial_subset, grid_align, fill_missing',
    ),
  filter_params: z
    .object({
      start_date: z.string().optional().describe('Start date for filtering (ISO format)'),
      end_date: z.string().optional().describe('End date for filtering (ISO format)'),
      min_depth: z.number().optional().describe('Minimum depth in meters'),
      max_depth: z.number().optional().describe('Maximum depth in meters'),
      latitude_range: z.tuple([z.number(), z.number()]).optional().describe('Latitude range [min, max]'),
      longitude_range: z.tuple([z.number(), z.number()]).optional().describe('Longitude range [min, max]'),
    })
    .optional()
    .describe('Parameters for filtering operation'),
  quality_params: z
    .object({
      temp_range: z.tuple([z.number(), z.number()]).optional().describe('Valid temperature range in Celsius'),
      salinity_range: z.tuple([z.number(), z.number()]).optional().describe('Valid salinity range in PSU'),
      pressure_range: z.tuple([z.number(), z.number()]).optional().describe('Valid pressure range in dbar'),
    })
    .optional()
    .describe('Parameters for quality check operation'),
  mask_params: z
    .object({
      missing_ratio_range: z.tuple([z.number(), z.number()]).optional().describe('Valid missing ratio range [min, max], e.g., [0.1, 0.6]'),
      mask_count: z.number().optional().describe('Number of masks to generate'),
      land_threshold: z.number().optional().describe('Threshold for land mask (frames all NaN)'),
      variable_name: z.string().optional().describe('Variable name to process in NetCDF/HDF5'),
    })
    .optional()
    .describe('Parameters for mask generation and application'),
  spatial_params: z
    .object({
      latitude_range: z.tuple([z.number(), z.number()]).optional().describe('Latitude range [min, max] for spatial subset'),
      longitude_range: z.tuple([z.number(), z.number()]).optional().describe('Longitude range [min, max] for spatial subset'),
      target_grid: z.tuple([z.number(), z.number()]).optional().describe('Target grid size [height, width]'),
    })
    .optional()
    .describe('Parameters for spatial operations'),
  fill_params: z
    .object({
      method: z.enum(['linear', 'nearest', 'cubic', 'forward_fill', 'backward_fill', 'mean']).optional().describe('Filling method'),
      max_gap: z.number().optional().describe('Maximum gap size to fill'),
    })
    .optional()
    .describe('Parameters for advanced missing data filling'),
  mask_file_path: z
    .string()
    .optional()
    .describe('Path to mask file (.npy format) for apply_masks or build_training_pairs operations'),
  output_path: z
    .string()
    .optional()
    .describe('Optional output path to save preprocessed data (supports .csv, .json, .nc, .h5)'),
  output_format: z
    .enum(['csv', 'json', 'netcdf', 'hdf5'])
    .optional()
    .describe('Output format (inferred from output_path extension if not specified)'),
})

type PreprocessResult = {
  type: 'preprocessed'
  data: {
    originalFile: string
    processedRows: number
    operations: string[]
    statistics?: Record<string, any>
    qualityReport?: Record<string, any>
    maskReport?: {
      landMaskGenerated?: boolean
      cloudMasksGenerated?: number
      masksApplied?: number
      missingRatioRange?: [number, number]
    }
    spatialInfo?: {
      latitudeRange?: [number, number]
      longitudeRange?: [number, number]
      gridSize?: [number, number]
    }
    preview: string
    warnings: string[]
    outputPath?: string
    generatedFiles?: string[] // For mask files, training pairs, etc.
  }
}

export const OceanDataPreprocessTool = {
  name: 'OceanDataPreprocess',
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  isReadOnly() {
    return false // May write output file
  },
  isConcurrencySafe() {
    return true
  },
  userFacingName() {
    return 'Ocean Data Preprocess'
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
      ['operations', operations?.join(', ') || 'auto'],
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
  async validateInput({ file_path, operations, output_path }) {
    const fullFilePath = normalizeFilePath(file_path)

    // Use secure file service to check if file exists
    const fileCheck = secureFileService.safeGetFileInfo(fullFilePath)
    if (!fileCheck.success) {
      const similarFilename = findSimilarFile(fullFilePath)
      let message = 'Ocean data file does not exist.'

      if (similarFilename) {
        message += ` Did you mean ${similarFilename}?`
      }

      return {
        result: false,
        message,
      }
    }

    const stats = fileCheck.stats!
    const fileSize = stats.size
    const ext = path.extname(fullFilePath).toLowerCase()

    // Check if file extension is supported
    if (!DATA_EXTENSIONS.has(ext)) {
      return {
        result: false,
        message: `Unsupported file format: ${ext}. Supported formats: ${Array.from(DATA_EXTENSIONS).join(', ')}`,
      }
    }

    // Check file size
    if (fileSize > MAX_OUTPUT_SIZE) {
      return {
        result: false,
        message: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(MAX_OUTPUT_SIZE / 1024 / 1024)}MB). Please use a smaller file or split the data.`,
      }
    }

    // Validate operations
    if (operations) {
      const invalidOps = operations.filter(op => !VALID_OPERATIONS.includes(op))
      if (invalidOps.length > 0) {
        return {
          result: false,
          message: `Invalid operations: ${invalidOps.join(', ')}. Valid operations: ${VALID_OPERATIONS.join(', ')}`,
        }
      }
    }

    // Validate output path if provided
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
      filter_params,
      quality_params,
      mask_params,
      spatial_params,
      fill_params,
      mask_file_path,
      output_path,
      output_format
    },
    { readFileTimestamps },
  ) {
    const ext = path.extname(file_path).toLowerCase()
    const fullFilePath = normalizeFilePath(file_path)

    // Emit file read event for system reminders
    emitReminderEvent('file:read', {
      filePath: fullFilePath,
      extension: ext,
      timestamp: Date.now(),
    })

    // Update read timestamp
    readFileTimestamps[fullFilePath] = Date.now()

    try {
      // Read the data file
      const fileReadResult = secureFileService.safeReadFile(fullFilePath, {
        encoding: ext === '.nc' || ext === '.h5' || ext === '.hdf5' ? undefined : 'utf8',
        maxFileSize: MAX_OUTPUT_SIZE,
      })

      if (!fileReadResult.success) {
        throw new Error(`Failed to read data file: ${fileReadResult.error}`)
      }

      const rawData = fileReadResult.content

      // Parse data based on file type
      const parsedData = await parseDataFile(rawData, ext, mask_params?.variable_name)

      // Initialize result
      const warnings: string[] = []
      let processedData = parsedData
      let statistics: Record<string, any> | undefined
      let qualityReport: Record<string, any> | undefined
      let maskReport: Record<string, any> = {}
      let spatialInfo: Record<string, any> = {}
      const generatedFiles: string[] = []

      // Apply preprocessing operations
      for (const operation of operations) {
        switch (operation) {
          case 'clean':
            const cleanResult = cleanData(processedData)
            processedData = cleanResult.data
            warnings.push(...cleanResult.warnings)
            break

          case 'filter':
            if (filter_params) {
              const filterResult = filterData(processedData, filter_params)
              processedData = filterResult.data
              warnings.push(...filterResult.warnings)
            }
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

          case 'quality_check':
            qualityReport = performQualityCheck(processedData, quality_params)
            warnings.push(...(qualityReport.warnings || []))
            break

          case 'statistics':
            statistics = calculateStatistics(processedData)
            break

          case 'interpolate':
            const interpolateResult = interpolateMissingValues(processedData)
            processedData = interpolateResult.data
            warnings.push(...interpolateResult.warnings)
            break

          case 'generate_masks':
            const maskGenResult = generateMasks(processedData, mask_params)
            maskReport = {
              ...maskReport,
              landMaskGenerated: maskGenResult.landMask !== undefined,
              cloudMasksGenerated: maskGenResult.cloudMasks?.length || 0,
              missingRatioRange: mask_params?.missing_ratio_range,
            }
            warnings.push(...maskGenResult.warnings)
            // Save masks if output_path is specified
            if (output_path && maskGenResult.cloudMasks) {
              const maskOutputPath = output_path.replace(/\.(csv|json|nc|h5|hdf5)$/, '_masks.npy')
              const maskSaveResult = saveMasksToNpy(maskGenResult, maskOutputPath)
              if (maskSaveResult.success) {
                generatedFiles.push(maskOutputPath)
                warnings.push(`Masks saved to: ${maskOutputPath}`)
              } else {
                warnings.push(`Failed to save masks: ${maskSaveResult.error}`)
              }
            }
            break

          case 'apply_masks':
            if (!mask_file_path) {
              warnings.push('apply_masks requires mask_file_path parameter')
              break
            }
            const applyMaskResult = applyMasksToData(processedData, mask_file_path, mask_params)
            processedData = applyMaskResult.data
            maskReport = {
              ...maskReport,
              masksApplied: applyMaskResult.masksApplied,
            }
            warnings.push(...applyMaskResult.warnings)
            break

          case 'build_training_pairs':
            if (!mask_file_path) {
              warnings.push('build_training_pairs requires mask_file_path parameter')
              break
            }
            const pairsResult = buildTrainingPairs(processedData, mask_file_path, mask_params)
            processedData = pairsResult.data
            warnings.push(...pairsResult.warnings)
            // Save training pairs if output_path is specified
            if (output_path) {
              const pairsSaveResult = saveTrainingPairs(pairsResult, output_path, output_format)
              if (pairsSaveResult.success) {
                generatedFiles.push(...pairsSaveResult.files)
                warnings.push(`Training pairs saved: ${pairsSaveResult.files.join(', ')}`)
              } else {
                warnings.push(`Failed to save training pairs: ${pairsSaveResult.error}`)
              }
            }
            break

          case 'spatial_subset':
            if (!spatial_params) {
              warnings.push('spatial_subset requires spatial_params parameter')
              break
            }
            const subsetResult = extractSpatialSubset(processedData, spatial_params)
            processedData = subsetResult.data
            spatialInfo = {
              latitudeRange: spatial_params.latitude_range,
              longitudeRange: spatial_params.longitude_range,
            }
            warnings.push(...subsetResult.warnings)
            break

          case 'grid_align':
            if (!spatial_params?.target_grid) {
              warnings.push('grid_align requires spatial_params.target_grid parameter')
              break
            }
            const alignResult = alignGrid(processedData, spatial_params.target_grid)
            processedData = alignResult.data
            spatialInfo = {
              ...spatialInfo,
              gridSize: spatial_params.target_grid,
            }
            warnings.push(...alignResult.warnings)
            break

          case 'fill_missing':
            const fillResult = fillMissingData(processedData, fill_params)
            processedData = fillResult.data
            warnings.push(...fillResult.warnings)
            break
        }
      }

      // Generate preview
      const preview = generatePreview(processedData)

      // Save output if requested
      let savedOutputPath: string | undefined
      if (output_path && !operations.includes('build_training_pairs')) {
        const fullOutputPath = normalizeFilePath(output_path)
        const outputExt = path.extname(fullOutputPath).toLowerCase()
        const format = output_format || inferOutputFormat(outputExt)
        const outputData = serializeData(processedData, format)

        const writeResult = secureFileService.safeWriteFile(fullOutputPath, outputData, {
          encoding: format === 'netcdf' || format === 'hdf5' ? undefined : 'utf8',
        })

        if (writeResult.success) {
          savedOutputPath = fullOutputPath
          generatedFiles.push(fullOutputPath)
        } else {
          warnings.push(`Failed to write output file: ${writeResult.error}`)
        }
      }

      const result: PreprocessResult = {
        type: 'preprocessed',
        data: {
          originalFile: file_path,
          processedRows: Array.isArray(processedData) ? processedData.length : (processedData.shape?.[0] || 0),
          operations,
          statistics,
          qualityReport,
          maskReport: Object.keys(maskReport).length > 0 ? maskReport : undefined,
          spatialInfo: Object.keys(spatialInfo).length > 0 ? spatialInfo : undefined,
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
      throw new Error(`Failed to preprocess ocean data: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
  renderResultForAssistant(data: PreprocessResult) {
    const { data: result } = data
    const output = [
      `Ocean Data Preprocessing Results`,
      `================================`,
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

    if (result.qualityReport) {
      output.push(`Quality Check Report:`)
      output.push(JSON.stringify(result.qualityReport, null, 2))
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

// Helper functions for data processing

/**
 * Parse data file based on extension
 * Note: For NetCDF and HDF5, this is a placeholder that returns instructions for Python processing
 */
async function parseDataFile(content: any, ext: string, variableName?: string): Promise<any> {
  if (ext === '.csv' || ext === '.txt') {
    return parseCSV(content as string)
  } else if (ext === '.json') {
    return JSON.parse(content as string)
  } else if (ext === '.nc' || ext === '.h5' || ext === '.hdf5') {
    // For NetCDF and HDF5 files, we need to use Python libraries (netCDF4, h5py, xarray)
    // Return a placeholder with instructions
    return {
      _format: ext,
      _variableName: variableName,
      _note: 'NetCDF/HDF5 files require Python processing. Use Python scripts with netCDF4, h5py, or xarray libraries.',
      _pythonExample: ext === '.nc'
        ? `import xarray as xr\nds = xr.open_dataset('${variableName || 'file.nc'}')\ndata = ds['${variableName || 'sst'}'].values`
        : `import h5py\nwith h5py.File('file.h5', 'r') as f:\n    data = f['${variableName || 'input_sst'}'][:]`,
      _instructions: [
        '1. Use Python with xarray (for NetCDF) or h5py (for HDF5)',
        '2. Extract data arrays and convert to appropriate format',
        '3. For this tool, prepare data as CSV or JSON first',
      ],
    }
  }
  // For Excel files, would need additional library
  throw new Error(`Parsing for ${ext} not yet implemented. Use CSV, JSON format, or process NetCDF/HDF5 with Python first.`)
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data: any[] = []

  for (let i = 1; i < Math.min(lines.length, MAX_DATA_ROWS + 1); i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: any = {}

    headers.forEach((header, idx) => {
      const value = values[idx]
      // Try to parse as number
      const numValue = parseFloat(value)
      row[header] = isNaN(numValue) ? value : numValue
    })

    data.push(row)
  }

  return data
}

function cleanData(data: any[]): { data: any[]; warnings: string[] } {
  const warnings: string[] = []
  let removedRows = 0

  // Remove rows with too many missing values (>50% of columns)
  const cleaned = data.filter(row => {
    const keys = Object.keys(row)
    const missingCount = keys.filter(key =>
      row[key] === null || row[key] === undefined || row[key] === ''
    ).length

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

function filterData(
  data: any[],
  params: any,
): { data: any[]; warnings: string[] } {
  const warnings: string[] = []
  let filtered = [...data]

  // Filter by depth
  if (params.min_depth !== undefined || params.max_depth !== undefined) {
    const originalCount = filtered.length
    filtered = filtered.filter(row => {
      const depth = row.depth || row.Depth
      if (depth === undefined) return true

      if (params.min_depth !== undefined && depth < params.min_depth) return false
      if (params.max_depth !== undefined && depth > params.max_depth) return false
      return true
    })
    warnings.push(`Filtered by depth: ${originalCount - filtered.length} rows removed`)
  }

  // Filter by latitude/longitude
  if (params.latitude_range || params.longitude_range) {
    const originalCount = filtered.length
    filtered = filtered.filter(row => {
      if (params.latitude_range) {
        const lat = row.latitude || row.Latitude || row.lat
        if (lat !== undefined && (lat < params.latitude_range[0] || lat > params.latitude_range[1])) {
          return false
        }
      }
      if (params.longitude_range) {
        const lon = row.longitude || row.Longitude || row.lon
        if (lon !== undefined && (lon < params.longitude_range[0] || lon > params.longitude_range[1])) {
          return false
        }
      }
      return true
    })
    warnings.push(`Filtered by coordinates: ${originalCount - filtered.length} rows removed`)
  }

  return { data: filtered, warnings }
}

function normalizeData(data: any[]): { data: any[]; warnings: string[] } {
  const warnings: string[] = []

  // Find numeric columns
  const numericColumns = findNumericColumns(data)

  if (numericColumns.length === 0) {
    warnings.push('No numeric columns found for normalization')
    return { data, warnings }
  }

  // Normalize each numeric column to [0, 1]
  const normalized = data.map(row => {
    const newRow = { ...row }
    numericColumns.forEach(col => {
      const values = data.map(r => r[col]).filter(v => typeof v === 'number')
      const min = Math.min(...values)
      const max = Math.max(...values)

      if (max - min !== 0) {
        newRow[col] = (row[col] - min) / (max - min)
      }
    })
    return newRow
  })

  warnings.push(`Normalized ${numericColumns.length} numeric columns`)
  return { data: normalized, warnings }
}

function standardizeData(data: any[]): { data: any[]; warnings: string[] } {
  const warnings: string[] = []

  const numericColumns = findNumericColumns(data)

  if (numericColumns.length === 0) {
    warnings.push('No numeric columns found for standardization')
    return { data, warnings }
  }

  // Standardize each numeric column (z-score)
  const standardized = data.map(row => {
    const newRow = { ...row }
    numericColumns.forEach(col => {
      const values = data.map(r => r[col]).filter(v => typeof v === 'number')
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(
        values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
      )

      if (std !== 0) {
        newRow[col] = (row[col] - mean) / std
      }
    })
    return newRow
  })

  warnings.push(`Standardized ${numericColumns.length} numeric columns`)
  return { data: standardized, warnings }
}

function performQualityCheck(
  data: any[],
  params?: any,
): Record<string, any> {
  const report: Record<string, any> = { warnings: [] }

  // Default quality ranges
  const tempRange = params?.temp_range || [-2, 40]  // Celsius
  const salinityRange = params?.salinity_range || [0, 42]  // PSU
  const pressureRange = params?.pressure_range || [0, 12000]  // dbar

  let tempOutliers = 0
  let salinityOutliers = 0
  let pressureOutliers = 0

  data.forEach(row => {
    const temp = row.temperature || row.Temperature || row.temp
    if (temp !== undefined && (temp < tempRange[0] || temp > tempRange[1])) {
      tempOutliers++
    }

    const salinity = row.salinity || row.Salinity
    if (salinity !== undefined && (salinity < salinityRange[0] || salinity > salinityRange[1])) {
      salinityOutliers++
    }

    const pressure = row.pressure || row.Pressure
    if (pressure !== undefined && (pressure < pressureRange[0] || pressure > pressureRange[1])) {
      pressureOutliers++
    }
  })

  report.temperatureOutliers = tempOutliers
  report.salinityOutliers = salinityOutliers
  report.pressureOutliers = pressureOutliers
  report.totalRows = data.length

  if (tempOutliers > 0) {
    report.warnings.push(`Found ${tempOutliers} temperature outliers outside range ${tempRange}`)
  }
  if (salinityOutliers > 0) {
    report.warnings.push(`Found ${salinityOutliers} salinity outliers outside range ${salinityRange}`)
  }
  if (pressureOutliers > 0) {
    report.warnings.push(`Found ${pressureOutliers} pressure outliers outside range ${pressureRange}`)
  }

  return report
}

function calculateStatistics(data: any[]): Record<string, any> {
  const stats: Record<string, any> = {}
  const numericColumns = findNumericColumns(data)

  numericColumns.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'number')

    if (values.length > 0) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const sorted = [...values].sort((a, b) => a - b)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const median = sorted[Math.floor(sorted.length / 2)]
      const std = Math.sqrt(
        values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
      )

      stats[col] = {
        count: values.length,
        mean: Number(mean.toFixed(4)),
        std: Number(std.toFixed(4)),
        min: Number(min.toFixed(4)),
        max: Number(max.toFixed(4)),
        median: Number(median.toFixed(4)),
      }
    }
  })

  return stats
}

function interpolateMissingValues(data: any[]): { data: any[]; warnings: string[] } {
  const warnings: string[] = []
  const numericColumns = findNumericColumns(data)

  let interpolatedCount = 0

  const interpolated = data.map((row, idx) => {
    const newRow = { ...row }

    numericColumns.forEach(col => {
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        // Simple linear interpolation
        let prevValue: number | null = null
        let nextValue: number | null = null

        // Find previous valid value
        for (let i = idx - 1; i >= 0; i--) {
          if (typeof data[i][col] === 'number') {
            prevValue = data[i][col]
            break
          }
        }

        // Find next valid value
        for (let i = idx + 1; i < data.length; i++) {
          if (typeof data[i][col] === 'number') {
            nextValue = data[i][col]
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

function findNumericColumns(data: any[]): string[] {
  if (data.length === 0) return []

  const firstRow = data[0]
  return Object.keys(firstRow).filter(key => {
    // Check if at least 80% of values in this column are numeric
    const numericCount = data.filter(row => typeof row[key] === 'number').length
    return numericCount / data.length > 0.8
  })
}

function generatePreview(data: any[], maxRows: number = 10): string {
  if (data.length === 0) return 'No data'

  const headers = Object.keys(data[0])
  const preview = [headers.join(',')]

  data.slice(0, maxRows).forEach(row => {
    const values = headers.map(h => {
      const val = row[h]
      return typeof val === 'number' ? val.toFixed(4) : String(val)
    })
    preview.push(values.join(','))
  })

  return preview.join('\n')
}

function serializeData(data: any, format: string): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2)
  } else if (format === 'hdf5' || format === 'netcdf') {
    // For binary formats, return instructions
    return JSON.stringify({
      _note: `${format.toUpperCase()} output requires Python libraries`,
      _instructions: [
        `Use Python with ${format === 'hdf5' ? 'h5py' : 'netCDF4/xarray'} to write binary format`,
        'Convert this JSON data and write with appropriate library',
      ],
      data: data,
    }, null, 2)
  } else {
    // Default to CSV
    if (!Array.isArray(data) || data.length === 0) return ''
    const headers = Object.keys(data[0])
    const lines = [headers.join(',')]

    data.forEach(row => {
      const values = headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
          return ''
        }
        return typeof val === 'number' ? val.toFixed(4) : String(val)
      })
      lines.push(values.join(','))
    })

    return lines.join('\n')
  }
}

function inferOutputFormat(ext: string): string {
  if (ext === '.json') return 'json'
  if (ext === '.nc') return 'netcdf'
  if (ext === '.h5' || ext === '.hdf5') return 'hdf5'
  return 'csv' // default
}

/**
 * Generate land and cloud masks from data
 * Land mask: pixels that are always NaN across all time frames
 * Cloud masks: frames with missing ratios within specified range
 */
function generateMasks(
  data: any,
  params?: any,
): { landMask?: any; cloudMasks?: any[]; warnings: string[] } {
  const warnings: string[] = []

  // Check if data is in the expected format
  if (!Array.isArray(data) || data.length === 0) {
    warnings.push('Data format not suitable for mask generation. Expected array of observations.')
    return { warnings }
  }

  const missingRatioRange = params?.missing_ratio_range || [0.1, 0.6]
  const maskCount = params?.mask_count || 360

  // Step 1: Generate land mask (pixels always NaN)
  const firstRow = data[0]
  const keys = Object.keys(firstRow)
  const landMask: Record<string, boolean> = {}

  keys.forEach(key => {
    const allNaN = data.every(row => {
      const val = row[key]
      return val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))
    })
    landMask[key] = allNaN
  })

  const landPixelCount = Object.values(landMask).filter(v => v).length
  warnings.push(`Generated land mask: ${landPixelCount} land pixels identified`)

  // Step 2: Generate cloud masks (frames with valid missing ratios)
  const cloudMasks: any[] = []
  const seaKeys = keys.filter(key => !landMask[key])

  if (seaKeys.length === 0) {
    warnings.push('No valid sea pixels found for cloud mask generation')
    return { landMask, warnings }
  }

  for (let i = 0; i < data.length && cloudMasks.length < maskCount; i++) {
    const row = data[i]
    const missingCount = seaKeys.filter(key => {
      const val = row[key]
      return val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))
    }).length

    const missingRatio = missingCount / seaKeys.length

    if (missingRatio >= missingRatioRange[0] && missingRatio <= missingRatioRange[1]) {
      const mask: Record<string, boolean> = {}
      keys.forEach(key => {
        const val = row[key]
        mask[key] = val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))
      })
      cloudMasks.push({
        index: i,
        missingRatio: Number(missingRatio.toFixed(4)),
        mask: mask,
      })
    }
  }

  warnings.push(`Generated ${cloudMasks.length} cloud masks with missing ratio in [${missingRatioRange[0]}, ${missingRatioRange[1]}]`)

  return { landMask, cloudMasks, warnings }
}

/**
 * Apply masks to data to create artificial missing values
 */
function applyMasksToData(
  data: any,
  maskFilePath: string,
  params?: any,
): { data: any; masksApplied: number; warnings: string[] } {
  const warnings: string[] = []

  // Placeholder: In real implementation, would read .npy file with Python
  warnings.push(`NOTE: Applying masks from ${maskFilePath} requires Python integration`)
  warnings.push('Use Python script to:')
  warnings.push('1. Load masks from .npy file')
  warnings.push('2. Apply masks to data array')
  warnings.push('3. Set masked positions to NaN')

  // For now, return data unchanged with instructions
  return {
    data: data,
    masksApplied: 0,
    warnings,
  }
}

/**
 * Build training pairs (input with missing + ground truth complete)
 */
function buildTrainingPairs(
  data: any,
  maskFilePath: string,
  params?: any,
): { data: any; warnings: string[] } {
  const warnings: string[] = []

  warnings.push(`NOTE: Building training pairs from ${maskFilePath} requires Python integration`)
  warnings.push('Use Python script to:')
  warnings.push('1. Load complete SST data (ground truth)')
  warnings.push('2. Load cloud masks from .npy file')
  warnings.push('3. Generate input_sst by applying masks')
  warnings.push('4. Create HDF5 with: input_sst, ground_truth_sst, effective_cloud_mask, land_mask')
  warnings.push('')
  warnings.push('Python example:')
  warnings.push('```python')
  warnings.push('import h5py')
  warnings.push('import numpy as np')
  warnings.push('')
  warnings.push('# Load data and masks')
  warnings.push(`masks = np.load('${maskFilePath}')`)
  warnings.push('ground_truth = # load your complete SST data')
  warnings.push('')
  warnings.push('# Apply masks')
  warnings.push('input_sst = ground_truth.copy()')
  warnings.push('for i, mask in enumerate(masks):')
  warnings.push('    input_sst[i][mask] = np.nan')
  warnings.push('')
  warnings.push('# Save to HDF5')
  warnings.push("with h5py.File('output.h5', 'w') as f:")
  warnings.push("    f.create_dataset('input_sst', data=input_sst)")
  warnings.push("    f.create_dataset('ground_truth_sst', data=ground_truth)")
  warnings.push("    f.create_dataset('effective_cloud_mask', data=masks)")
  warnings.push('```')

  return { data, warnings }
}

/**
 * Extract spatial subset by lat/lon range
 */
function extractSpatialSubset(
  data: any,
  params: any,
): { data: any; warnings: string[] } {
  const warnings: string[] = []

  if (!Array.isArray(data) || data.length === 0) {
    warnings.push('Data format not suitable for spatial subsetting')
    return { data, warnings }
  }

  const latRange = params.latitude_range
  const lonRange = params.longitude_range

  if (!latRange && !lonRange) {
    warnings.push('No spatial range specified')
    return { data, warnings }
  }

  let filtered = data
  let removedCount = 0

  if (latRange || lonRange) {
    const originalCount = filtered.length
    filtered = filtered.filter(row => {
      const lat = row.latitude || row.Latitude || row.lat
      const lon = row.longitude || row.Longitude || row.lon

      if (latRange && lat !== undefined) {
        if (lat < latRange[0] || lat > latRange[1]) return false
      }

      if (lonRange && lon !== undefined) {
        if (lon < lonRange[0] || lon > lonRange[1]) return false
      }

      return true
    })
    removedCount = originalCount - filtered.length
  }

  warnings.push(`Spatial subset: removed ${removedCount} rows outside specified range`)
  if (latRange) warnings.push(`  Latitude: [${latRange[0]}, ${latRange[1]}]`)
  if (lonRange) warnings.push(`  Longitude: [${lonRange[0]}, ${lonRange[1]}]`)

  return { data: filtered, warnings }
}

/**
 * Align grid to target resolution
 */
function alignGrid(
  data: any,
  targetGrid: [number, number],
): { data: any; warnings: string[] } {
  const warnings: string[] = []

  warnings.push(`NOTE: Grid alignment to [${targetGrid[0]}, ${targetGrid[1]}] requires spatial interpolation`)
  warnings.push('For gridded data (NetCDF/HDF5), use Python with xarray:')
  warnings.push('```python')
  warnings.push('import xarray as xr')
  warnings.push('')
  warnings.push("ds = xr.open_dataset('input.nc')")
  warnings.push(`target_lat = np.linspace(lat_min, lat_max, ${targetGrid[0]})`)
  warnings.push(`target_lon = np.linspace(lon_min, lon_max, ${targetGrid[1]})`)
  warnings.push('')
  warnings.push('# Interpolate to target grid')
  warnings.push("ds_interp = ds.interp(latitude=target_lat, longitude=target_lon, method='linear')")
  warnings.push('```')

  return { data, warnings }
}

/**
 * Advanced missing data filling with multiple strategies
 */
function fillMissingData(
  data: any,
  params?: any,
): { data: any; warnings: string[] } {
  const warnings: string[] = []
  const method = params?.method || 'linear'
  const maxGap = params?.max_gap

  if (!Array.isArray(data) || data.length === 0) {
    warnings.push('Data format not suitable for filling')
    return { data, warnings }
  }

  const numericColumns = findNumericColumns(data)
  let fillCount = 0

  const filled = data.map((row, idx) => {
    const newRow = { ...row }

    numericColumns.forEach(col => {
      if (row[col] === null || row[col] === undefined || row[col] === '' ||
          (typeof row[col] === 'number' && isNaN(row[col]))) {

        let fillValue: number | null = null

        switch (method) {
          case 'linear':
          case 'nearest':
          case 'cubic':
            // Linear interpolation (simplified)
            let prevValue: number | null = null
            let nextValue: number | null = null
            let prevIdx = -1
            let nextIdx = -1

            // Find previous valid value
            for (let i = idx - 1; i >= 0; i--) {
              if (typeof data[i][col] === 'number' && !isNaN(data[i][col])) {
                prevValue = data[i][col]
                prevIdx = i
                break
              }
            }

            // Find next valid value
            for (let i = idx + 1; i < data.length; i++) {
              if (typeof data[i][col] === 'number' && !isNaN(data[i][col])) {
                nextValue = data[i][col]
                nextIdx = i
                break
              }
            }

            // Check gap size
            if (maxGap && prevIdx >= 0 && nextIdx >= 0) {
              const gapSize = nextIdx - prevIdx - 1
              if (gapSize > maxGap) {
                break // Don't fill gaps larger than maxGap
              }
            }

            if (prevValue !== null && nextValue !== null) {
              if (method === 'nearest') {
                fillValue = (idx - prevIdx) < (nextIdx - idx) ? prevValue : nextValue
              } else {
                // Linear interpolation
                fillValue = (prevValue + nextValue) / 2
              }
            } else if (prevValue !== null) {
              fillValue = prevValue
            } else if (nextValue !== null) {
              fillValue = nextValue
            }
            break

          case 'forward_fill':
            for (let i = idx - 1; i >= 0; i--) {
              if (typeof data[i][col] === 'number' && !isNaN(data[i][col])) {
                fillValue = data[i][col]
                break
              }
            }
            break

          case 'backward_fill':
            for (let i = idx + 1; i < data.length; i++) {
              if (typeof data[i][col] === 'number' && !isNaN(data[i][col])) {
                fillValue = data[i][col]
                break
              }
            }
            break

          case 'mean':
            const values = data.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v))
            if (values.length > 0) {
              fillValue = values.reduce((a, b) => a + b, 0) / values.length
            }
            break
        }

        if (fillValue !== null) {
          newRow[col] = fillValue
          fillCount++
        }
      }
    })

    return newRow
  })

  warnings.push(`Filled ${fillCount} missing values using ${method} method`)
  if (maxGap) warnings.push(`  Maximum gap size: ${maxGap}`)

  return { data: filled, warnings }
}

/**
 * Save masks to .npy format (requires Python)
 */
function saveMasksToNpy(
  maskData: any,
  outputPath: string,
): { success: boolean; error?: string } {
  // Placeholder: actual implementation requires Python integration
  return {
    success: false,
    error: 'Saving to .npy format requires Python with numpy. Use Python script to save masks.',
  }
}

/**
 * Save training pairs to HDF5 (requires Python)
 */
function saveTrainingPairs(
  pairsData: any,
  outputPath: string,
  format?: string,
): { success: boolean; files: string[]; error?: string } {
  // Placeholder: actual implementation requires Python integration
  return {
    success: false,
    files: [],
    error: 'Saving training pairs to HDF5 requires Python with h5py. Use Python script to create HDF5 files.',
  }
}

