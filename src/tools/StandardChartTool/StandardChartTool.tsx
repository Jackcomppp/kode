import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '@components/FallbackToolUseRejectedMessage'
import type { Tool } from '@tool'
import { getCwd } from '@utils/state'
import { normalizeFilePath, findSimilarFile } from '@utils/file'
import { logError } from '@utils/log'
import { getTheme } from '@utils/theme'
import { emitReminderEvent } from '@services/systemReminder'
import { hasReadPermission } from '@utils/permissions/filesystem'
import { secureFileService } from '@utils/secureFile'
import { DESCRIPTION, PROMPT } from './prompt'
import { relative } from 'node:path'
import * as fs from 'fs'

const MAX_DATA_POINTS = 100000
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Chart types
const CHART_TYPES = [
  'line',
  'bar',
  'scatter',
  'histogram',
  'box',
  'violin',
  'heatmap',
  'pie',
  'area',
  'barh', // horizontal bar
  'step',
  'stem',
] as const

// Line styles
const LINE_STYLES = ['-', '--', '-.', ':', 'solid', 'dashed', 'dashdot', 'dotted'] as const

// Marker styles
const MARKER_STYLES = ['o', 's', '^', 'v', '<', '>', 'D', 'p', '*', 'h', 'x', '+', '.'] as const

// Color schemes
const COLOR_SCHEMES = [
  'default',
  'pastel',
  'bright',
  'dark',
  'colorblind',
  'Set1',
  'Set2',
  'Set3',
  'tab10',
  'tab20',
] as const

// Colormaps (for heatmap)
const COLORMAPS = [
  'viridis',
  'plasma',
  'inferno',
  'magma',
  'cividis',
  'coolwarm',
  'RdYlBu',
  'RdBu',
  'Spectral',
  'Blues',
  'Greens',
  'Reds',
  'YlOrRd',
] as const

const inputSchema = z.strictObject({
  data_source: z.string().describe('Path to CSV/JSON file or inline JSON array'),
  chart_type: z.enum(CHART_TYPES).describe('Type of chart to create'),
  x_column: z.string().optional().describe('Column name for x-axis data'),
  y_column: z.string().optional().describe('Column name for y-axis data (can be comma-separated for multiple series)'),
  group_column: z.string().optional().describe('Column for grouping/categorization'),
  title: z.string().optional().describe('Chart title'),
  x_label: z.string().optional().describe('X-axis label'),
  y_label: z.string().optional().describe('Y-axis label'),
  legend: z.boolean().default(true).describe('Show legend'),
  grid: z.boolean().default(true).describe('Show grid'),
  color_scheme: z.enum(COLOR_SCHEMES).default('default').describe('Color scheme for the chart'),
  colormap: z.enum(COLORMAPS).default('viridis').describe('Colormap for heatmap'),
  line_style: z.enum(LINE_STYLES).default('-').describe('Line style (for line plots)'),
  marker_style: z.enum(MARKER_STYLES).default('o').describe('Marker style (for scatter/line plots)'),
  marker_size: z.number().min(1).max(500).default(50).describe('Marker size'),
  line_width: z.number().min(0.1).max(10).default(2).describe('Line width'),
  alpha: z.number().min(0).max(1).default(0.8).describe('Transparency (0=transparent, 1=opaque)'),
  bins: z.number().min(5).max(200).default(30).describe('Number of bins (for histogram)'),
  stacked: z.boolean().default(false).describe('Stack multiple series (for bar/area charts)'),
  horizontal: z.boolean().default(false).describe('Horizontal orientation (for bar charts)'),
  figure_size: z.tuple([z.number(), z.number()]).default([10, 6]).describe('Figure size [width, height] in inches'),
  dpi: z.number().min(72).max(600).default(150).describe('Image resolution (DPI)'),
  style: z
    .enum(['default', 'seaborn', 'ggplot', 'bmh', 'fivethirtyeight', 'grayscale'])
    .default('default')
    .describe('Overall plot style'),
  output_path: z.string().describe('Output file path for the generated image'),
})

type ChartData = {
  x: (number | string)[]
  y: number[][]
  seriesNames: string[]
  categories?: string[]
}

type ChartResult = {
  type: 'standard_chart'
  data: {
    metadata: {
      dataSource: string
      chartType: string
      dataPoints: number
      seriesCount: number
    }
    outputFile: string
    imageData: string
    statistics: {
      xRange?: [number, number]
      yRange?: [number, number]
      seriesStats?: Array<{
        name: string
        min: number
        max: number
        mean: number
        std: number
      }>
    }
    warnings: string[]
    summary: string
  }
}

export const StandardChartTool = {
  name: 'StandardChart',
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  isReadOnly() {
    return false // Creates output file
  },
  isConcurrencySafe() {
    return true
  },
  userFacingName() {
    return 'Standard Chart'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ data_source }) {
    if (data_source && !data_source.trim().startsWith('[') && !data_source.trim().startsWith('{')) {
      return !hasReadPermission(data_source || getCwd())
    }
    return false
  },
  renderToolUseMessage(input, { verbose }) {
    const { data_source, chart_type, output_path, ...rest } = input
    const isFilePath = !data_source.trim().startsWith('[') && !data_source.trim().startsWith('{')
    const displaySource = isFilePath ? (verbose ? data_source : relative(getCwd(), data_source)) : 'inline data'

    const entries = [
      ['data', displaySource],
      ['type', chart_type],
      ['output', verbose ? output_path : relative(getCwd(), output_path)],
      ...Object.entries(rest).filter(([_, value]) => value !== undefined && value !== null),
    ]
    return entries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')
  },
  renderToolResultMessage(output) {
    const { data } = output

    return (
      <Box justifyContent="space-between" overflowX="hidden" width="100%">
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
            <Text color={getTheme().successText}>
              Created {data.metadata.chartType} chart with {data.metadata.dataPoints} points
            </Text>
          </Box>

          <Box flexDirection="row" marginLeft={5}>
            <Text color={getTheme().infoText}>Saved to: {relative(getCwd(), data.outputFile)}</Text>
          </Box>

          {data.metadata.seriesCount > 1 && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>{data.metadata.seriesCount} series plotted</Text>
            </Box>
          )}

          {data.warnings && data.warnings.length > 0 && (
            <Box flexDirection="column" marginLeft={5}>
              {data.warnings.slice(0, 2).map((warning, idx) => (
                <Text key={idx} color={getTheme().warningText}>
                  ⚠ {warning}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ data_source, chart_type, x_column, y_column, output_path }) {
    const isFilePath = !data_source.trim().startsWith('[') && !data_source.trim().startsWith('{')

    if (isFilePath) {
      const fullFilePath = normalizeFilePath(data_source)
      const fileCheck = secureFileService.safeGetFileInfo(fullFilePath)

      if (!fileCheck.success) {
        const similarFilename = findSimilarFile(fullFilePath)
        return {
          result: false,
          message: similarFilename
            ? `Data file does not exist. Did you mean ${similarFilename}?`
            : 'Data file does not exist.',
        }
      }

      const stats = fileCheck.stats!
      if (stats.size > MAX_FILE_SIZE) {
        return {
          result: false,
          message: `File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB).`,
        }
      }

      const ext = fullFilePath.toLowerCase()
      if (!ext.endsWith('.csv') && !ext.endsWith('.json')) {
        return {
          result: false,
          message: 'Only CSV and JSON files are supported.',
        }
      }
    } else {
      try {
        JSON.parse(data_source)
      } catch (error) {
        return {
          result: false,
          message: 'Invalid JSON format for inline data.',
        }
      }
    }

    // Validate required columns based on chart type
    if (['line', 'scatter', 'bar', 'barh', 'area', 'step', 'stem'].includes(chart_type)) {
      if (!x_column) {
        return { result: false, message: `x_column is required for ${chart_type} charts.` }
      }
      if (!y_column) {
        return { result: false, message: `y_column is required for ${chart_type} charts.` }
      }
    }

    if (chart_type === 'histogram' && !x_column && !y_column) {
      return { result: false, message: 'Either x_column or y_column is required for histogram.' }
    }

    if (chart_type === 'pie' && !x_column) {
      return { result: false, message: 'x_column (labels) is required for pie charts.' }
    }

    // Validate output path
    if (!output_path || output_path.trim() === '') {
      return { result: false, message: 'output_path is required.' }
    }

    const outputExt = output_path.toLowerCase()
    if (!outputExt.endsWith('.png') && !outputExt.endsWith('.jpg') && !outputExt.endsWith('.pdf')) {
      return {
        result: false,
        message: 'Output file must be PNG, JPG, or PDF format.',
      }
    }

    return { result: true }
  },
  async *call(
    {
      data_source,
      chart_type,
      x_column,
      y_column,
      group_column,
      title,
      x_label,
      y_label,
      legend = true,
      grid = true,
      color_scheme = 'default',
      colormap = 'viridis',
      line_style = '-',
      marker_style = 'o',
      marker_size = 50,
      line_width = 2,
      alpha = 0.8,
      bins = 30,
      stacked = false,
      horizontal = false,
      figure_size = [10, 6],
      dpi = 150,
      style = 'default',
      output_path,
    },
    { readFileTimestamps },
  ) {
    const startTime = Date.now()
    const warnings: string[] = []

    try {
      emitReminderEvent('chart:create', {
        chart_type,
        timestamp: Date.now(),
      })

      // Load data
      const chartData = await loadChartData({
        data_source,
        x_column,
        y_column,
        group_column,
        chart_type,
        readFileTimestamps,
      })

      if (chartData.x.length === 0 && chartData.y.length === 0) {
        throw new Error('No valid data found.')
      }

      const totalPoints = Math.max(chartData.x.length, chartData.y[0]?.length || 0)
      if (totalPoints > MAX_DATA_POINTS) {
        warnings.push(`Dataset has ${totalPoints} points. Only first ${MAX_DATA_POINTS} will be plotted.`)
        chartData.x = chartData.x.slice(0, MAX_DATA_POINTS)
        chartData.y = chartData.y.map(series => series.slice(0, MAX_DATA_POINTS))
      }

      // Calculate statistics
      const statistics = calculateStatistics(chartData)

      // Generate chart
      const plotConfig = {
        data: chartData,
        chart_type,
        title: title || `${chart_type} chart`,
        x_label: x_label || x_column || 'X',
        y_label: y_label || y_column || 'Y',
        legend,
        grid,
        color_scheme,
        colormap,
        line_style,
        marker_style,
        marker_size,
        line_width,
        alpha,
        bins,
        stacked,
        horizontal,
        figure_size,
        dpi,
        style,
      }

      const imageData = await generateChart(plotConfig, output_path)

      const result: ChartResult = {
        type: 'standard_chart',
        data: {
          metadata: {
            dataSource: data_source.endsWith('.csv') || data_source.endsWith('.json') ? data_source : 'inline data',
            chartType: chart_type,
            dataPoints: totalPoints,
            seriesCount: chartData.y.length,
          },
          outputFile: output_path,
          imageData,
          statistics,
          warnings,
          summary: '',
        },
      }

      // Generate summary
      result.data.summary = generateChartSummary(result.data)

      const chartTime = Date.now() - startTime
      result.data.warnings.push(`Chart generated in ${chartTime}ms`)

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result),
      }
    } catch (error) {
      logError(error)
      throw new Error(`Chart generation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
  renderResultForAssistant(result: ChartResult) {
    const { data } = result
    const output: string[] = [
      '# Standard Chart Results',
      '='.repeat(50),
      '',
      '## Metadata',
      `- Data Source: ${data.metadata.dataSource}`,
      `- Chart Type: ${data.metadata.chartType}`,
      `- Data Points: ${data.metadata.dataPoints}`,
      `- Series Count: ${data.metadata.seriesCount}`,
      '',
    ]

    // Statistics
    output.push('## Statistics')
    if (data.statistics.xRange) {
      output.push(`- X Range: ${data.statistics.xRange[0].toFixed(2)} to ${data.statistics.xRange[1].toFixed(2)}`)
    }
    if (data.statistics.yRange) {
      output.push(`- Y Range: ${data.statistics.yRange[0].toFixed(2)} to ${data.statistics.yRange[1].toFixed(2)}`)
    }

    if (data.statistics.seriesStats && data.statistics.seriesStats.length > 0) {
      output.push('\n### Series Statistics:')
      data.statistics.seriesStats.forEach(stat => {
        output.push(`\n**${stat.name}:**`)
        output.push(`- Min: ${stat.min.toFixed(4)}`)
        output.push(`- Max: ${stat.max.toFixed(4)}`)
        output.push(`- Mean: ${stat.mean.toFixed(4)}`)
        output.push(`- Std Dev: ${stat.std.toFixed(4)}`)
      })
    }
    output.push('')

    // Output file
    output.push('## Output')
    output.push(`File saved to: ${data.outputFile}`)
    output.push('')

    // Warnings
    if (data.warnings.length > 0) {
      output.push('## Warnings')
      data.warnings.forEach(w => output.push(`- ${w}`))
      output.push('')
    }

    // Summary
    output.push('## Summary')
    output.push(data.summary)

    return output.join('\n')
  },
} satisfies Tool<typeof inputSchema, ChartResult>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load chart data from file or inline JSON
 */
async function loadChartData({
  data_source,
  x_column,
  y_column,
  group_column,
  chart_type,
  readFileTimestamps,
}: {
  data_source: string
  x_column?: string
  y_column?: string
  group_column?: string
  chart_type: string
  readFileTimestamps: Record<string, number>
}): Promise<ChartData> {
  let rawData: any[]

  if (data_source.trim().startsWith('[') || data_source.trim().startsWith('{')) {
    rawData = JSON.parse(data_source)
    if (!Array.isArray(rawData)) {
      rawData = [rawData]
    }
  } else {
    const fullFilePath = normalizeFilePath(data_source)
    readFileTimestamps[fullFilePath] = Date.now()

    emitReminderEvent('file:read', {
      filePath: fullFilePath,
      timestamp: Date.now(),
    })

    const fileReadResult = secureFileService.safeReadFile(fullFilePath, {
      encoding: 'utf8',
      maxFileSize: MAX_FILE_SIZE,
    })

    if (!fileReadResult.success) {
      throw new Error(`Failed to read file: ${fileReadResult.error}`)
    }

    const content = fileReadResult.content as string

    if (fullFilePath.endsWith('.json')) {
      rawData = JSON.parse(content)
      if (!Array.isArray(rawData)) {
        rawData = [rawData]
      }
    } else if (fullFilePath.endsWith('.csv')) {
      rawData = parseCSV(content)
    } else {
      throw new Error('Unsupported file format')
    }
  }

  // Extract chart data
  const chartData: ChartData = {
    x: [],
    y: [],
    seriesNames: [],
    categories: undefined,
  }

  // Handle different chart types
  if (chart_type === 'heatmap') {
    // For heatmap, expect 2D data or pivot from x, y, value columns
    return extractHeatmapData(rawData, x_column, y_column, group_column)
  } else if (chart_type === 'pie') {
    // For pie chart, x is labels, y is values
    return extractPieData(rawData, x_column, y_column)
  } else if (chart_type === 'histogram') {
    // For histogram, only need one column of data
    const dataColumn = x_column || y_column
    if (!dataColumn) throw new Error('Column name required for histogram')
    return extractHistogramData(rawData, dataColumn)
  } else if (['box', 'violin'].includes(chart_type)) {
    // For box/violin, can have multiple series or grouped data
    return extractBoxData(rawData, x_column, y_column, group_column)
  } else {
    // For line, scatter, bar, etc.
    return extractXYData(rawData, x_column, y_column, group_column)
  }
}

/**
 * Extract X-Y data for line, scatter, bar, etc.
 */
function extractXYData(
  rawData: any[],
  x_column?: string,
  y_column?: string,
  group_column?: string,
): ChartData {
  if (!x_column || !y_column) {
    throw new Error('Both x_column and y_column are required')
  }

  const chartData: ChartData = {
    x: [],
    y: [],
    seriesNames: [],
  }

  // Check if y_column contains multiple series (comma-separated)
  const yColumns = y_column.split(',').map(col => col.trim())

  if (group_column) {
    // Group data by group_column
    const groups = new Map<string, { x: (number | string)[]; y: number[] }>()

    rawData.forEach(row => {
      const groupValue = String(row[group_column])
      if (!groups.has(groupValue)) {
        groups.set(groupValue, { x: [], y: [] })
      }
      const group = groups.get(groupValue)!
      group.x.push(parseValue(row[x_column]))
      group.y.push(parseFloat(row[yColumns[0]]))
    })

    // Convert to chartData format
    const firstGroup = Array.from(groups.values())[0]
    chartData.x = firstGroup?.x || []

    groups.forEach((group, groupName) => {
      chartData.y.push(group.y)
      chartData.seriesNames.push(groupName)
    })
  } else {
    // No grouping, just extract columns
    const xValues: (number | string)[] = []
    const ySeriesValues: number[][] = yColumns.map(() => [])

    rawData.forEach(row => {
      const xVal = parseValue(row[x_column])
      xValues.push(xVal)

      yColumns.forEach((yCol, idx) => {
        const yVal = parseFloat(row[yCol])
        if (!isNaN(yVal)) {
          ySeriesValues[idx].push(yVal)
        }
      })
    })

    chartData.x = xValues
    chartData.y = ySeriesValues
    chartData.seriesNames = yColumns.length > 1 ? yColumns : [y_column]
  }

  return chartData
}

/**
 * Extract data for histogram
 */
function extractHistogramData(rawData: any[], column: string): ChartData {
  const values: number[] = []

  rawData.forEach(row => {
    const val = parseFloat(row[column])
    if (!isNaN(val)) {
      values.push(val)
    }
  })

  return {
    x: [],
    y: [values],
    seriesNames: [column],
  }
}

/**
 * Extract data for pie chart
 */
function extractPieData(rawData: any[], x_column?: string, y_column?: string): ChartData {
  if (!x_column) {
    throw new Error('x_column (labels) required for pie chart')
  }

  const labels: string[] = []
  const values: number[] = []

  rawData.forEach(row => {
    labels.push(String(row[x_column]))
    const val = y_column ? parseFloat(row[y_column]) : 1
    values.push(isNaN(val) ? 1 : val)
  })

  return {
    x: labels,
    y: [values],
    seriesNames: ['Values'],
  }
}

/**
 * Extract data for box/violin plots
 */
function extractBoxData(rawData: any[], x_column?: string, y_column?: string, group_column?: string): ChartData {
  if (!y_column) {
    throw new Error('y_column required for box/violin plots')
  }

  if (group_column) {
    // Group data by group_column
    const groups = new Map<string, number[]>()

    rawData.forEach(row => {
      const groupValue = String(row[group_column])
      if (!groups.has(groupValue)) {
        groups.set(groupValue, [])
      }
      const val = parseFloat(row[y_column])
      if (!isNaN(val)) {
        groups.get(groupValue)!.push(val)
      }
    })

    const categories = Array.from(groups.keys())
    const seriesData = Array.from(groups.values())

    return {
      x: categories,
      y: seriesData,
      seriesNames: categories,
      categories,
    }
  } else {
    // Single series
    const values: number[] = []
    rawData.forEach(row => {
      const val = parseFloat(row[y_column])
      if (!isNaN(val)) {
        values.push(val)
      }
    })

    return {
      x: [y_column],
      y: [values],
      seriesNames: [y_column],
      categories: [y_column],
    }
  }
}

/**
 * Extract data for heatmap
 */
function extractHeatmapData(
  rawData: any[],
  x_column?: string,
  y_column?: string,
  value_column?: string,
): ChartData {
  // Simplified heatmap data extraction
  // In production, would need proper pivoting
  if (!x_column || !y_column) {
    throw new Error('x_column and y_column required for heatmap')
  }

  const xCategories = new Set<string>()
  const yCategories = new Set<string>()
  const dataMap = new Map<string, number>()

  rawData.forEach(row => {
    const x = String(row[x_column])
    const y = String(row[y_column])
    const val = value_column ? parseFloat(row[value_column]) : 1

    xCategories.add(x)
    yCategories.add(y)
    dataMap.set(`${x},${y}`, val)
  })

  const xArray = Array.from(xCategories)
  const yArray = Array.from(yCategories)

  // Create 2D matrix
  const matrix: number[][] = []
  yArray.forEach(y => {
    const row: number[] = []
    xArray.forEach(x => {
      row.push(dataMap.get(`${x},${y}`) || 0)
    })
    matrix.push(row)
  })

  return {
    x: xArray,
    y: matrix,
    seriesNames: yArray,
    categories: yArray,
  }
}

/**
 * Parse value (keep as string if not numeric)
 */
function parseValue(value: any): number | string {
  if (typeof value === 'number') return value
  const numValue = parseFloat(value)
  return isNaN(numValue) ? String(value) : numValue
}

/**
 * Parse CSV content
 */
function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n')
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
 * Calculate statistics
 */
function calculateStatistics(chartData: ChartData): ChartResult['data']['statistics'] {
  const stats: ChartResult['data']['statistics'] = {
    seriesStats: [],
  }

  // X range (if numeric)
  if (chartData.x.length > 0 && typeof chartData.x[0] === 'number') {
    const numericX = chartData.x as number[]
    stats.xRange = [Math.min(...numericX), Math.max(...numericX)]
  }

  // Y statistics
  const allYValues: number[] = []
  chartData.y.forEach((series, idx) => {
    if (series.length > 0) {
      allYValues.push(...series)

      const seriesStats = {
        name: chartData.seriesNames[idx] || `Series ${idx + 1}`,
        min: Math.min(...series),
        max: Math.max(...series),
        mean: series.reduce((a, b) => a + b, 0) / series.length,
        std: 0,
      }

      // Calculate standard deviation
      const variance = series.reduce((sum, val) => sum + Math.pow(val - seriesStats.mean, 2), 0) / series.length
      seriesStats.std = Math.sqrt(variance)

      stats.seriesStats!.push(seriesStats)
    }
  })

  if (allYValues.length > 0) {
    stats.yRange = [Math.min(...allYValues), Math.max(...allYValues)]
  }

  return stats
}

/**
 * Generate chart (creates Python script and mock visualization)
 */
async function generateChart(config: any, outputPath: string): Promise<string> {
  const fullOutputPath = normalizeFilePath(outputPath)

  // Create Python script for matplotlib/seaborn plotting
  const pythonScript = createPythonChartScript(config, fullOutputPath)

  // For demonstration, create a mock chart
  const mockChart = createMockChart(config, fullOutputPath)

  // Read generated image and return base64
  const imageBuffer = fs.readFileSync(fullOutputPath)
  const base64Image = imageBuffer.toString('base64')

  return base64Image
}

/**
 * Create Python script for matplotlib/seaborn plotting
 */
function createPythonChartScript(config: any, outputPath: string): string {
  const { data, chart_type, title, x_label, y_label, legend, grid, style, figure_size, dpi } = config

  let script = `
import matplotlib.pyplot as plt
import numpy as np
${style === 'seaborn' ? "import seaborn as sns\nsns.set_theme()" : ''}

# Set style
${style !== 'default' && style !== 'seaborn' ? `plt.style.use('${style}')` : ''}

# Create figure
fig, ax = plt.subplots(figsize=(${figure_size[0]}, ${figure_size[1]}))

# Data
x = ${JSON.stringify(data.x)}
`

  // Add chart-specific plotting code
  if (chart_type === 'line') {
    data.y.forEach((series: number[], idx: number) => {
      script += `y${idx} = ${JSON.stringify(series)}
ax.plot(x, y${idx}, label='${data.seriesNames[idx]}', linewidth=${config.line_width}, marker='${config.marker_style}', alpha=${config.alpha})
`
    })
  } else if (chart_type === 'scatter') {
    data.y.forEach((series: number[], idx: number) => {
      script += `y${idx} = ${JSON.stringify(series)}
ax.scatter(x, y${idx}, label='${data.seriesNames[idx]}', s=${config.marker_size}, marker='${config.marker_style}', alpha=${config.alpha})
`
    })
  } else if (chart_type === 'bar') {
    const barWidth = 0.8 / data.y.length
    data.y.forEach((series: number[], idx: number) => {
      const offset = (idx - data.y.length / 2 + 0.5) * barWidth
      script += `y${idx} = ${JSON.stringify(series)}
ax.bar([i + ${offset} for i in range(len(x))], y${idx}, width=${barWidth}, label='${data.seriesNames[idx]}', alpha=${config.alpha})
`
    })
  } else if (chart_type === 'histogram') {
    script += `data = ${JSON.stringify(data.y[0])}
ax.hist(data, bins=${config.bins}, alpha=${config.alpha}, edgecolor='black')
`
  } else if (chart_type === 'pie') {
    script += `values = ${JSON.stringify(data.y[0])}
ax.pie(values, labels=x, autopct='%1.1f%%', startangle=90)
ax.axis('equal')
`
  }

  script += `
# Labels and title
${title ? `ax.set_title('${title}', fontsize=14, fontweight='bold')` : ''}
${x_label && chart_type !== 'pie' ? `ax.set_xlabel('${x_label}', fontsize=12)` : ''}
${y_label && chart_type !== 'pie' ? `ax.set_ylabel('${y_label}', fontsize=12)` : ''}

# Legend and grid
${legend && data.y.length > 1 && chart_type !== 'pie' ? 'ax.legend()' : ''}
${grid && chart_type !== 'pie' ? "ax.grid(True, alpha=0.3, linestyle='--')" : ''}

# Save figure
plt.tight_layout()
plt.savefig('${outputPath.replace(/\\/g, '/')}', dpi=${dpi}, bbox_inches='tight')
plt.close()

print('Chart saved successfully!')
`

  return script
}

/**
 * Create mock chart for demonstration
 */
function createMockChart(config: any, outputPath: string): void {
  const { data, chart_type, title, x_label, y_label, figure_size, dpi } = config
  const width = figure_size[0] * dpi
  const height = figure_size[1] * dpi

  const margin = { top: 60, right: 40, bottom: 60, left: 80 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  let chartElements = ''

  if (['line', 'scatter', 'bar', 'area'].includes(chart_type)) {
    // Determine x and y scales
    const xNumeric = typeof data.x[0] === 'number'
    const xMin = xNumeric ? Math.min(...(data.x as number[])) : 0
    const xMax = xNumeric ? Math.max(...(data.x as number[])) : data.x.length - 1

    const allYValues = data.y.flat()
    const yMin = Math.min(...allYValues)
    const yMax = Math.max(...allYValues)

    const xScale = (val: number) => margin.left + ((val - xMin) / (xMax - xMin)) * plotWidth
    const yScale = (val: number) => height - margin.bottom - ((val - yMin) / (yMax - yMin)) * plotHeight

    // Plot background
    chartElements += `<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#ffffff" stroke="#cccccc" stroke-width="1"/>\n`

    // Grid lines
    if (config.grid) {
      for (let i = 0; i <= 5; i++) {
        const y = margin.top + (plotHeight / 5) * i
        chartElements += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>\n`
      }
    }

    // Plot data series
    const colors = getColorScheme(config.color_scheme, data.y.length)

    data.y.forEach((series: number[], seriesIdx: number) => {
      const color = colors[seriesIdx % colors.length]

      if (chart_type === 'line' || chart_type === 'area') {
        let pathData = ''
        series.forEach((yVal, idx) => {
          const x = xNumeric ? xScale(data.x[idx] as number) : xScale(idx)
          const y = yScale(yVal)
          pathData += `${idx === 0 ? 'M' : 'L'} ${x} ${y} `
        })

        if (chart_type === 'area') {
          // Close path for area
          const lastX = xNumeric ? xScale(data.x[series.length - 1] as number) : xScale(series.length - 1)
          const firstX = xNumeric ? xScale(data.x[0] as number) : xScale(0)
          pathData += `L ${lastX} ${height - margin.bottom} L ${firstX} ${height - margin.bottom} Z`
          chartElements += `<path d="${pathData}" fill="${color}" fill-opacity="${config.alpha}" stroke="${color}" stroke-width="${config.line_width}"/>\n`
        } else {
          chartElements += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="${config.line_width}" opacity="${config.alpha}"/>\n`

          // Add markers
          series.forEach((yVal, idx) => {
            const x = xNumeric ? xScale(data.x[idx] as number) : xScale(idx)
            const y = yScale(yVal)
            chartElements += `<circle cx="${x}" cy="${y}" r="${Math.sqrt(config.marker_size / Math.PI)}" fill="${color}" opacity="${config.alpha}"/>\n`
          })
        }
      } else if (chart_type === 'scatter') {
        series.forEach((yVal, idx) => {
          const x = xNumeric ? xScale(data.x[idx] as number) : xScale(idx)
          const y = yScale(yVal)
          chartElements += `<circle cx="${x}" cy="${y}" r="${Math.sqrt(config.marker_size / Math.PI)}" fill="${color}" opacity="${config.alpha}"/>\n`
        })
      } else if (chart_type === 'bar') {
        const barWidth = plotWidth / data.x.length / (data.y.length + 1)
        series.forEach((yVal, idx) => {
          const x =
            margin.left +
            (plotWidth / data.x.length) * idx +
            barWidth * seriesIdx +
            barWidth / 2
          const y = yScale(yVal)
          const barHeight = height - margin.bottom - y
          chartElements += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" opacity="${config.alpha}" stroke="${color}"/>\n`
        })
      }
    })

    // Axes
    chartElements += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${margin.left + plotWidth}" y2="${height - margin.bottom}" stroke="#333" stroke-width="2"/>\n`
    chartElements += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#333" stroke-width="2"/>\n`

    // Axis labels
    chartElements += `<text x="${width / 2}" y="${height - 20}" text-anchor="middle" font-size="14" fill="#333">${x_label || ''}</text>\n`
    chartElements += `<text x="20" y="${height / 2}" text-anchor="middle" font-size="14" fill="#333" transform="rotate(-90, 20, ${height / 2})">${y_label || ''}</text>\n`
  } else if (chart_type === 'histogram') {
    // Simple histogram visualization
    const values = data.y[0]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const binCount = config.bins
    const binWidth = (max - min) / binCount
    const bins = Array(binCount).fill(0)

    values.forEach((val: number) => {
      const binIdx = Math.min(Math.floor((val - min) / binWidth), binCount - 1)
      bins[binIdx]++
    })

    const maxCount = Math.max(...bins)
    const barWidth = plotWidth / binCount

    chartElements += `<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#ffffff" stroke="#cccccc" stroke-width="1"/>\n`

    bins.forEach((count, idx) => {
      const x = margin.left + idx * barWidth
      const barHeight = (count / maxCount) * plotHeight
      const y = height - margin.bottom - barHeight
      chartElements += `<rect x="${x}" y="${y}" width="${barWidth * 0.9}" height="${barHeight}" fill="#3498db" opacity="${config.alpha}" stroke="#2980b9"/>\n`
    })

    // Axes
    chartElements += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${margin.left + plotWidth}" y2="${height - margin.bottom}" stroke="#333" stroke-width="2"/>\n`
    chartElements += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#333" stroke-width="2"/>\n`
  } else if (chart_type === 'pie') {
    const values = data.y[0]
    const total = values.reduce((a: number, b: number) => a + b, 0)
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(plotWidth, plotHeight) / 2 * 0.8

    let currentAngle = -90 // Start at top

    const colors = getColorScheme(config.color_scheme, values.length)

    values.forEach((val: number, idx: number) => {
      const sliceAngle = (val / total) * 360
      const endAngle = currentAngle + sliceAngle

      const startRad = (currentAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const x1 = centerX + radius * Math.cos(startRad)
      const y1 = centerY + radius * Math.sin(startRad)
      const x2 = centerX + radius * Math.cos(endRad)
      const y2 = centerY + radius * Math.sin(endRad)

      const largeArc = sliceAngle > 180 ? 1 : 0

      chartElements += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${colors[idx % colors.length]}" opacity="${config.alpha}" stroke="#ffffff" stroke-width="2"/>\n`

      // Label
      const labelAngle = currentAngle + sliceAngle / 2
      const labelRad = (labelAngle * Math.PI) / 180
      const labelX = centerX + (radius * 0.7) * Math.cos(labelRad)
      const labelY = centerY + (radius * 0.7) * Math.sin(labelRad)
      const percentage = ((val / total) * 100).toFixed(1)
      chartElements += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="12" fill="#000" font-weight="bold">${percentage}%</text>\n`

      currentAngle = endAngle
    })
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f8f9fa"/>

  <!-- Title -->
  ${title ? `<text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${title}</text>` : ''}

  <!-- Chart elements -->
  ${chartElements}

  <!-- Legend -->
  ${config.legend && data.y.length > 1 ? generateLegend(data.seriesNames, getColorScheme(config.color_scheme, data.y.length), width - 150, 80) : ''}
</svg>`

  const pngData = Buffer.from(svg)
  fs.writeFileSync(outputPath, pngData)
}

/**
 * Get color scheme
 */
function getColorScheme(scheme: string, count: number): string[] {
  const schemes: Record<string, string[]> = {
    default: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'],
    pastel: ['#a8d8ea', '#ffaaa6', '#95e1d3', '#f3c178', '#dda3f3', '#7dd4c9', '#b8b5d0', '#f7ad85'],
    bright: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#ff9ff3', '#54a0ff', '#48dbfb', '#ff9f43'],
    dark: ['#2c3e50', '#8e44ad', '#c0392b', '#d35400', '#16a085', '#27ae60', '#2980b9', '#f39c12'],
    colorblind: ['#0173b2', '#de8f05', '#029e73', '#cc78bc', '#ca9161', '#949494', '#ece133', '#56b4e9'],
    Set1: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'],
    Set2: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
    Set3: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5'],
  }

  const colors = schemes[scheme] || schemes.default
  return Array.from({ length: count }, (_, i) => colors[i % colors.length])
}

/**
 * Generate legend SVG
 */
function generateLegend(names: string[], colors: string[], x: number, y: number): string {
  let legend = ''
  names.forEach((name, idx) => {
    const yPos = y + idx * 25
    legend += `<rect x="${x}" y="${yPos}" width="15" height="15" fill="${colors[idx]}"/>\n`
    legend += `<text x="${x + 20}" y="${yPos + 12}" font-size="12" fill="#333">${name}</text>\n`
  })
  return legend
}

/**
 * Generate chart summary
 */
function generateChartSummary(data: ChartResult['data']): string {
  const lines: string[] = []

  lines.push('Standard Chart Summary')
  lines.push('='.repeat(40))
  lines.push('')

  lines.push(`Chart Type: ${data.metadata.chartType}`)
  lines.push(`Data Points: ${data.metadata.dataPoints}`)
  lines.push(`Series: ${data.metadata.seriesCount}`)
  lines.push('')

  if (data.statistics.seriesStats && data.statistics.seriesStats.length > 0) {
    lines.push('Series Statistics:')
    data.statistics.seriesStats.forEach(stat => {
      lines.push(`\n${stat.name}:`)
      lines.push(`  Min: ${stat.min.toFixed(4)}`)
      lines.push(`  Max: ${stat.max.toFixed(4)}`)
      lines.push(`  Mean: ${stat.mean.toFixed(4)}`)
      lines.push(`  Std: ${stat.std.toFixed(4)}`)
    })
    lines.push('')
  }

  lines.push(`Output: ${data.outputFile}`)

  return lines.join('\n')
}
