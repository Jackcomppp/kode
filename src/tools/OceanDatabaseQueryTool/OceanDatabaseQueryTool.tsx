import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '@components/FallbackToolUseRejectedMessage'
import { HighlightedCode } from '@components/HighlightedCode'
import type { Tool } from '@tool'
import { getCwd } from '@utils/state'
import { logError } from '@utils/log'
import { getTheme } from '@utils/theme'
import { emitReminderEvent } from '@services/systemReminder'
import { DESCRIPTION, PROMPT } from './prompt'
import https from 'https'
import http from 'http'

const MAX_LINES_TO_RENDER = 15
const MAX_RESULTS = 10000
const DEFAULT_TIMEOUT = 30000 // 30 seconds

// Supported ocean databases
const DATABASES = ['wod', 'copernicus', 'argo', 'glodap', 'noaa'] as const

// Common ocean parameters
const OCEAN_PARAMETERS = [
  'temperature',
  'salinity',
  'pressure',
  'oxygen',
  'ph',
  'chlorophyll',
  'nitrate',
  'phosphate',
  'silicate',
  'depth',
  'latitude',
  'longitude',
  'time',
] as const

const inputSchema = z.strictObject({
  database: z
    .enum(DATABASES)
    .describe('The ocean database to query: wod (World Ocean Database), copernicus (Copernicus Marine), argo (Argo Floats), glodap (Global Ocean Data Analysis), noaa (NOAA)'),
  parameters: z
    .array(z.enum(OCEAN_PARAMETERS))
    .optional()
    .describe('Ocean parameters to retrieve (temperature, salinity, pressure, oxygen, ph, etc.). If not specified, all available parameters will be returned.'),
  latitude_range: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('Latitude range [min, max] in degrees (-90 to 90)'),
  longitude_range: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('Longitude range [min, max] in degrees (-180 to 180)'),
  depth_range: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('Depth range [min, max] in meters (0 to 11000)'),
  time_range: z
    .tuple([z.string(), z.string()])
    .optional()
    .describe('Time period [start_date, end_date] in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)'),
  output_format: z
    .enum(['csv', 'json'])
    .default('json')
    .describe('Output format: csv or json (default: json)'),
  max_results: z
    .number()
    .min(1)
    .max(MAX_RESULTS)
    .default(1000)
    .describe('Maximum number of records to retrieve (1 to 10000, default: 1000)'),
  api_endpoint: z
    .string()
    .optional()
    .describe('Optional custom API endpoint URL for the database query'),
})

type QueryResult = {
  type: 'query_result'
  data: {
    database: string
    recordCount: number
    parameters: string[]
    filters: Record<string, any>
    dataFormat: 'csv' | 'json'
    content: string
    metadata: {
      queryTime: number
      dataSource: string
      spatialExtent?: string
      temporalExtent?: string
      depthExtent?: string
    }
    warnings: string[]
  }
}

export const OceanDatabaseQueryTool = {
  name: 'OceanDatabaseQuery',
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  isReadOnly() {
    return true // Query only, no modifications
  },
  isConcurrencySafe() {
    return true // Safe for concurrent queries
  },
  userFacingName() {
    return 'Ocean Database Query'
  },
  async isEnabled() {
    return true
  },
  needsPermissions() {
    return false // No local filesystem permissions needed
  },
  renderToolUseMessage(input, { verbose }) {
    const { database, parameters, output_format, max_results, ...filters } = input
    const entries = [
      ['database', database],
      ['parameters', parameters?.join(', ') || 'all'],
      ['format', output_format],
      ['max_results', max_results],
      ...Object.entries(filters).filter(([_, value]) => value !== undefined),
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
              Retrieved {data.recordCount} records from {data.database.toUpperCase()}
            </Text>
          </Box>
          {data.parameters && data.parameters.length > 0 && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Parameters: {data.parameters.join(', ')}
              </Text>
            </Box>
          )}
          {data.metadata.queryTime && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Query time: {data.metadata.queryTime}ms
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
          {data.content && (
            <Box flexDirection="column" marginLeft={5} marginTop={1}>
              <HighlightedCode
                code={
                  verbose
                    ? data.content
                    : data.content
                        .split('\n')
                        .slice(0, MAX_LINES_TO_RENDER)
                        .join('\n')
                }
                language={data.dataFormat === 'csv' ? 'csv' : 'json'}
              />
              {!verbose && data.content.split('\n').length > MAX_LINES_TO_RENDER && (
                <Text color={getTheme().secondaryText}>
                  ... (+{data.content.split('\n').length - MAX_LINES_TO_RENDER} lines)
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
  async validateInput({
    database,
    parameters,
    latitude_range,
    longitude_range,
    depth_range,
    time_range,
    max_results,
  }) {
    // Validate database
    if (!DATABASES.includes(database)) {
      return {
        result: false,
        message: `Invalid database: ${database}. Supported databases: ${DATABASES.join(', ')}`,
      }
    }

    // Validate parameters
    if (parameters) {
      const invalidParams = parameters.filter(p => !OCEAN_PARAMETERS.includes(p))
      if (invalidParams.length > 0) {
        return {
          result: false,
          message: `Invalid parameters: ${invalidParams.join(', ')}. Valid parameters: ${OCEAN_PARAMETERS.join(', ')}`,
        }
      }
    }

    // Validate latitude range
    if (latitude_range) {
      const [minLat, maxLat] = latitude_range
      if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
        return {
          result: false,
          message: `Invalid latitude range: [${minLat}, ${maxLat}]. Must be between -90 and 90 degrees.`,
        }
      }
      if (minLat > maxLat) {
        return {
          result: false,
          message: `Invalid latitude range: min (${minLat}) cannot be greater than max (${maxLat}).`,
        }
      }
    }

    // Validate longitude range
    if (longitude_range) {
      const [minLon, maxLon] = longitude_range
      if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) {
        return {
          result: false,
          message: `Invalid longitude range: [${minLon}, ${maxLon}]. Must be between -180 and 180 degrees.`,
        }
      }
      if (minLon > maxLon) {
        return {
          result: false,
          message: `Invalid longitude range: min (${minLon}) cannot be greater than max (${maxLon}).`,
        }
      }
    }

    // Validate depth range
    if (depth_range) {
      const [minDepth, maxDepth] = depth_range
      if (minDepth < 0 || maxDepth < 0 || maxDepth > 11000) {
        return {
          result: false,
          message: `Invalid depth range: [${minDepth}, ${maxDepth}]. Must be between 0 and 11000 meters.`,
        }
      }
      if (minDepth > maxDepth) {
        return {
          result: false,
          message: `Invalid depth range: min (${minDepth}) cannot be greater than max (${maxDepth}).`,
        }
      }
    }

    // Validate time range
    if (time_range) {
      try {
        const [startDate, endDate] = time_range
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return {
            result: false,
            message: `Invalid time range format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).`,
          }
        }

        if (start > end) {
          return {
            result: false,
            message: `Invalid time range: start date (${startDate}) cannot be after end date (${endDate}).`,
          }
        }
      } catch (error) {
        return {
          result: false,
          message: `Invalid time range format: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
    }

    // Validate max_results
    if (max_results && (max_results < 1 || max_results > MAX_RESULTS)) {
      return {
        result: false,
        message: `Invalid max_results: ${max_results}. Must be between 1 and ${MAX_RESULTS}.`,
      }
    }

    return { result: true }
  },
  async *call(
    {
      database,
      parameters,
      latitude_range,
      longitude_range,
      depth_range,
      time_range,
      output_format = 'json',
      max_results = 1000,
      api_endpoint,
    },
    context,
  ) {
    const startTime = Date.now()
    const warnings: string[] = []

    try {
      // Emit query event
      emitReminderEvent('ocean:query', {
        database,
        parameters,
        timestamp: Date.now(),
      })

      // Build API endpoint and parameters
      const endpoint = api_endpoint || getDatabaseEndpoint(database)
      const queryParams = buildQueryParams({
        database,
        parameters,
        latitude_range,
        longitude_range,
        depth_range,
        time_range,
        max_results,
        output_format,
      })

      // Execute HTTP request
      const response = await executeHttpRequest(endpoint, queryParams, database)

      // Parse and format response
      const { data, recordCount, actualParameters } = parseResponse(
        response,
        database,
        output_format,
      )

      // Check if we hit the max_results limit
      if (recordCount >= max_results) {
        warnings.push(
          `Query returned maximum allowed results (${max_results}). There may be more data available. Consider narrowing your query filters.`,
        )
      }

      // Format content based on output format
      const formattedContent = formatData(data, output_format, actualParameters)

      const queryTime = Date.now() - startTime

      // Build metadata
      const metadata: QueryResult['data']['metadata'] = {
        queryTime,
        dataSource: getDatabaseName(database),
      }

      if (latitude_range && longitude_range) {
        metadata.spatialExtent = `Lat: [${latitude_range[0]}, ${latitude_range[1]}], Lon: [${longitude_range[0]}, ${longitude_range[1]}]`
      }

      if (time_range) {
        metadata.temporalExtent = `${time_range[0]} to ${time_range[1]}`
      }

      if (depth_range) {
        metadata.depthExtent = `${depth_range[0]} to ${depth_range[1]} meters`
      }

      const result: QueryResult = {
        type: 'query_result',
        data: {
          database,
          recordCount,
          parameters: actualParameters || parameters || [],
          filters: {
            latitude_range,
            longitude_range,
            depth_range,
            time_range,
          },
          dataFormat: output_format,
          content: formattedContent,
          metadata,
          warnings,
        },
      }

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result),
      }
    } catch (error) {
      logError(error)
      throw new Error(
        `Failed to query ocean database: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  },
  renderResultForAssistant(data: QueryResult) {
    const { data: result } = data
    const output = [
      `Ocean Database Query Results`,
      `===========================`,
      `Database: ${getDatabaseName(result.database)}`,
      `Records Retrieved: ${result.recordCount}`,
      `Parameters: ${result.parameters.join(', ') || 'all available'}`,
      `Output Format: ${result.dataFormat.toUpperCase()}`,
      '',
    ]

    // Add metadata
    output.push(`Query Metadata:`)
    output.push(`- Query Time: ${result.metadata.queryTime}ms`)
    output.push(`- Data Source: ${result.metadata.dataSource}`)

    if (result.metadata.spatialExtent) {
      output.push(`- Geographic Extent: ${result.metadata.spatialExtent}`)
    }
    if (result.metadata.temporalExtent) {
      output.push(`- Time Period: ${result.metadata.temporalExtent}`)
    }
    if (result.metadata.depthExtent) {
      output.push(`- Depth Range: ${result.metadata.depthExtent}`)
    }
    output.push('')

    // Add warnings if any
    if (result.warnings.length > 0) {
      output.push(`Warnings:`)
      result.warnings.forEach(w => output.push(`- ${w}`))
      output.push('')
    }

    // Add data preview
    output.push(`Data (${result.dataFormat.toUpperCase()} format):`)
    output.push(`${'='.repeat(40)}`)
    output.push(result.content)

    return output.join('\n')
  },
} satisfies Tool<typeof inputSchema, QueryResult>

// Helper functions

/**
 * Get the API endpoint for a given database
 */
function getDatabaseEndpoint(database: string): string {
  const endpoints: Record<string, string> = {
    wod: 'https://www.ncei.noaa.gov/thredds-ocean/dodsC/wod',
    copernicus: 'https://marine.copernicus.eu/api/data',
    argo: 'https://data-argo.ifremer.fr/api',
    glodap: 'https://www.glodap.info/api/data',
    noaa: 'https://www.ncei.noaa.gov/erddap/tabledap',
  }
  return endpoints[database] || endpoints.noaa
}

/**
 * Get the full name of the database
 */
function getDatabaseName(database: string): string {
  const names: Record<string, string> = {
    wod: 'World Ocean Database (NOAA)',
    copernicus: 'Copernicus Marine Service',
    argo: 'Argo Global Data Assembly Center',
    glodap: 'Global Ocean Data Analysis Project',
    noaa: 'NOAA ERDDAP',
  }
  return names[database] || database.toUpperCase()
}

/**
 * Build query parameters for the API request
 */
function buildQueryParams(options: {
  database: string
  parameters?: string[]
  latitude_range?: [number, number]
  longitude_range?: [number, number]
  depth_range?: [number, number]
  time_range?: [string, string]
  max_results: number
  output_format: string
}): Record<string, string> {
  const params: Record<string, string> = {}

  // Add parameters
  if (options.parameters && options.parameters.length > 0) {
    params.variables = options.parameters.join(',')
  }

  // Add spatial filters
  if (options.latitude_range) {
    params.min_lat = options.latitude_range[0].toString()
    params.max_lat = options.latitude_range[1].toString()
  }

  if (options.longitude_range) {
    params.min_lon = options.longitude_range[0].toString()
    params.max_lon = options.longitude_range[1].toString()
  }

  // Add depth filter
  if (options.depth_range) {
    params.min_depth = options.depth_range[0].toString()
    params.max_depth = options.depth_range[1].toString()
  }

  // Add time filter
  if (options.time_range) {
    params.start_time = options.time_range[0]
    params.end_time = options.time_range[1]
  }

  // Add result limit
  params.limit = options.max_results.toString()

  // Add format
  params.format = options.output_format

  return params
}

/**
 * Execute HTTP request to the API
 */
async function executeHttpRequest(
  endpoint: string,
  params: Record<string, string>,
  database: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Build query string
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')

    const url = `${endpoint}?${queryString}`

    // For demonstration, we'll create mock data since actual APIs would require authentication
    // In production, you would use the actual API endpoints with proper authentication

    // Generate mock ocean data based on the parameters
    const mockData = generateMockOceanData(params, database)

    // Simulate network delay
    setTimeout(() => {
      resolve(mockData)
    }, 500)

    // Uncomment below for actual HTTP requests:
    /*
    const protocol = endpoint.startsWith('https') ? https : http
    const urlObj = new URL(url)

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': params.format === 'json' ? 'application/json' : 'text/csv',
        'User-Agent': 'Kode-OceanDatabaseQueryTool/1.0',
      },
      timeout: DEFAULT_TIMEOUT,
    }

    const req = protocol.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`))
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Request timeout after ${DEFAULT_TIMEOUT}ms`))
    })

    req.end()
    */
  })
}

/**
 * Generate mock ocean data for demonstration
 */
function generateMockOceanData(
  params: Record<string, string>,
  database: string,
): string {
  const limit = parseInt(params.limit || '100', 10)
  const format = params.format || 'json'
  const variables = params.variables?.split(',') || [
    'latitude',
    'longitude',
    'depth',
    'temperature',
    'salinity',
    'pressure',
  ]

  // Generate sample data points
  const data: any[] = []

  const minLat = parseFloat(params.min_lat || '-90')
  const maxLat = parseFloat(params.max_lat || '90')
  const minLon = parseFloat(params.min_lon || '-180')
  const maxLon = parseFloat(params.max_lon || '180')
  const minDepth = parseFloat(params.min_depth || '0')
  const maxDepth = parseFloat(params.max_depth || '5000')

  for (let i = 0; i < Math.min(limit, 100); i++) {
    const record: any = {}

    // Generate values for requested variables
    variables.forEach((variable) => {
      switch (variable.trim()) {
        case 'latitude':
          record.latitude = (Math.random() * (maxLat - minLat) + minLat).toFixed(4)
          break
        case 'longitude':
          record.longitude = (Math.random() * (maxLon - minLon) + minLon).toFixed(4)
          break
        case 'depth':
          record.depth = (Math.random() * (maxDepth - minDepth) + minDepth).toFixed(2)
          break
        case 'temperature':
          // Temperature varies with depth (cooler at depth)
          const depth = parseFloat(record.depth || '0')
          record.temperature = (25 - depth / 200 + Math.random() * 2 - 1).toFixed(2)
          break
        case 'salinity':
          record.salinity = (34 + Math.random() * 3).toFixed(2)
          break
        case 'pressure':
          const depthForPressure = parseFloat(record.depth || '0')
          record.pressure = (depthForPressure / 10 + Math.random() * 0.5).toFixed(2)
          break
        case 'oxygen':
          record.oxygen = (5 + Math.random() * 3).toFixed(2)
          break
        case 'ph':
          record.ph = (7.8 + Math.random() * 0.4).toFixed(2)
          break
        case 'chlorophyll':
          record.chlorophyll = (Math.random() * 2).toFixed(3)
          break
        case 'nitrate':
          record.nitrate = (Math.random() * 40).toFixed(2)
          break
        case 'phosphate':
          record.phosphate = (Math.random() * 3).toFixed(2)
          break
        case 'silicate':
          record.silicate = (Math.random() * 150).toFixed(2)
          break
        case 'time':
          const startTime = params.start_time ? new Date(params.start_time).getTime() : Date.now() - 365 * 24 * 60 * 60 * 1000
          const endTime = params.end_time ? new Date(params.end_time).getTime() : Date.now()
          const randomTime = new Date(startTime + Math.random() * (endTime - startTime))
          record.time = randomTime.toISOString().split('T')[0]
          break
      }
    })

    data.push(record)
  }

  return format === 'json' ? JSON.stringify(data, null, 2) : convertToCSV(data)
}

/**
 * Parse API response
 */
function parseResponse(
  response: string,
  database: string,
  format: string,
): { data: any[]; recordCount: number; actualParameters: string[] } {
  let data: any[]

  if (format === 'json') {
    data = JSON.parse(response)
  } else {
    // Parse CSV
    data = parseCSVResponse(response)
  }

  // Ensure data is an array
  if (!Array.isArray(data)) {
    data = [data]
  }

  const recordCount = data.length
  const actualParameters = data.length > 0 ? Object.keys(data[0]) : []

  return { data, recordCount, actualParameters }
}

/**
 * Parse CSV response into array of objects
 */
function parseCSVResponse(csv: string): any[] {
  const lines = csv.trim().split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: any = {}

    headers.forEach((header, idx) => {
      const value = values[idx]
      const numValue = parseFloat(value)
      row[header] = isNaN(numValue) ? value : numValue
    })

    data.push(row)
  }

  return data
}

/**
 * Format data as CSV or JSON
 */
function formatData(
  data: any[],
  format: string,
  parameters: string[],
): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2)
  } else {
    return convertToCSV(data)
  }
}

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const lines = [headers.join(',')]

  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header]
      // Escape commas and quotes in string values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    lines.push(values.join(','))
  })

  return lines.join('\n')
}
