/**
 * Shared utilities for ocean data processing
 * Common functions used across all ocean data tools
 */

export const MAX_DATA_ROWS = 100000
export const MAX_OUTPUT_SIZE = 50 * 1024 * 1024 // 50MB

export const DATA_EXTENSIONS = new Set([
  '.csv',
  '.json',
  '.xlsx',
  '.xls',
  '.txt',
  '.nc',   // NetCDF format
  '.hdf5', // HDF5 format
  '.h5',   // HDF5 format (alternative extension)
])

/**
 * Standardized ocean data format
 */
export interface OceanDataRow {
  [key: string]: number | string | null | undefined
}

export type OceanData = OceanDataRow[]

/**
 * Standardized result format for all ocean data tools
 */
export interface OceanDataResult {
  data: OceanData
  warnings: string[]
  metadata?: {
    rowCount: number
    columnCount: number
    [key: string]: any
  }
}

/**
 * Parse CSV content into OceanData format
 */
export function parseCSV(content: string, maxRows: number = MAX_DATA_ROWS): OceanData {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data: OceanData = []

  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: OceanDataRow = {}

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

/**
 * Parse JSON content into OceanData format
 */
export function parseJSON(content: string): OceanData {
  const parsed = JSON.parse(content)
  if (Array.isArray(parsed)) {
    return parsed
  }
  throw new Error('JSON must contain an array of objects')
}

/**
 * Parse data file based on extension
 */
export async function parseDataFile(
  content: any,
  ext: string,
  variableName?: string
): Promise<OceanData> {
  if (ext === '.csv' || ext === '.txt') {
    return parseCSV(content as string)
  } else if (ext === '.json') {
    return parseJSON(content as string)
  } else if (ext === '.nc' || ext === '.h5' || ext === '.hdf5') {
    // For NetCDF and HDF5 files, return placeholder with instructions
    throw new Error(
      `${ext} files require Python processing. Use xarray (NetCDF) or h5py (HDF5) to extract data, then save as CSV/JSON.`
    )
  }
  throw new Error(`Unsupported file format: ${ext}`)
}

/**
 * Generate preview of data (first N rows as CSV)
 */
export function generatePreview(data: OceanData, maxRows: number = 10): string {
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

/**
 * Serialize data to specified format
 */
export function serializeData(data: OceanData, format: string): string {
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

/**
 * Infer output format from file extension
 */
export function inferOutputFormat(ext: string): string {
  if (ext === '.json') return 'json'
  if (ext === '.nc') return 'netcdf'
  if (ext === '.h5' || ext === '.hdf5') return 'hdf5'
  return 'csv' // default
}

/**
 * Find numeric columns in data
 */
export function findNumericColumns(data: OceanData): string[] {
  if (data.length === 0) return []

  const firstRow = data[0]
  return Object.keys(firstRow).filter(key => {
    // Check if at least 80% of values in this column are numeric
    const numericCount = data.filter(row => typeof row[key] === 'number').length
    return numericCount / data.length > 0.8
  })
}

/**
 * Check if value is missing
 */
export function isMissing(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && isNaN(value))
  )
}

/**
 * Get metadata from data
 */
export function getMetadata(data: OceanData): {
  rowCount: number
  columnCount: number
  columns: string[]
  numericColumns: string[]
} {
  if (data.length === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      columns: [],
      numericColumns: [],
    }
  }

  const columns = Object.keys(data[0])
  const numericColumns = findNumericColumns(data)

  return {
    rowCount: data.length,
    columnCount: columns.length,
    columns,
    numericColumns,
  }
}

/**
 * Statistics calculation utilities
 */
export interface ColumnStatistics {
  count: number
  mean: number
  std: number
  min: number
  max: number
  median: number
}

export function calculateColumnStatistics(data: OceanData, column: string): ColumnStatistics | null {
  const values = data.map(r => r[column]).filter(v => typeof v === 'number' && !isNaN(v)) as number[]

  if (values.length === 0) {
    return null
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const median = sorted[Math.floor(sorted.length / 2)]
  const std = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  )

  return {
    count: values.length,
    mean: Number(mean.toFixed(4)),
    std: Number(std.toFixed(4)),
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    median: Number(median.toFixed(4)),
  }
}

export function calculateStatistics(data: OceanData): Record<string, ColumnStatistics> {
  const stats: Record<string, ColumnStatistics> = {}
  const numericColumns = findNumericColumns(data)

  numericColumns.forEach(col => {
    const colStats = calculateColumnStatistics(data, col)
    if (colStats) {
      stats[col] = colStats
    }
  })

  return stats
}

/**
 * File I/O helpers
 */
export interface FileReadOptions {
  encoding?: BufferEncoding
  maxFileSize?: number
}

export interface FileWriteOptions {
  encoding?: BufferEncoding
}
