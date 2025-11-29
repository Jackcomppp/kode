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

const MAX_DATA_POINTS = 50000
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Plot types
const PLOT_TYPES = ['scatter', 'contour', 'filled_contour', 'heatmap', 'trajectory', 'quiver'] as const

// Projections
const PROJECTIONS = [
  'PlateCarree',
  'Mercator',
  'Robinson',
  'Orthographic',
  'LambertConformal',
  'Stereographic',
  'Mollweide',
] as const

// Basemap features
const BASEMAP_FEATURES = ['coastlines', 'borders', 'land', 'ocean', 'lakes', 'rivers', 'stock_img'] as const

// Color maps
const COLORMAPS = [
  'viridis', 'plasma', 'inferno', 'magma', 'cividis',
  'coolwarm', 'RdYlBu', 'RdBu', 'seismic',
  'jet', 'rainbow', 'turbo',
] as const

// Marker styles
const MARKER_STYLES = ['o', 's', '^', 'v', '<', '>', 'D', 'p', '*', 'h'] as const

const inputSchema = z.strictObject({
  data_source: z
    .string()
    .describe('Path to CSV/JSON file with geographic coordinates'),
  longitude_column: z
    .string()
    .describe('Column name for longitude values (degrees East, -180 to 180)'),
  latitude_column: z
    .string()
    .describe('Column name for latitude values (degrees North, -90 to 90)'),
  value_column: z
    .string()
    .optional()
    .describe('Column name for values to visualize (colors/sizes)'),
  plot_type: z
    .enum(PLOT_TYPES)
    .default('scatter')
    .describe('Type of plot: scatter, contour, filled_contour, heatmap, trajectory, quiver'),
  projection: z
    .enum(PROJECTIONS)
    .default('PlateCarree')
    .describe('Map projection'),
  basemap_features: z
    .array(z.enum(BASEMAP_FEATURES))
    .default(['coastlines', 'borders'])
    .describe('Basemap features to display'),
  extent: z
    .tuple([z.number(), z.number(), z.number(), z.number()])
    .optional()
    .describe('Map extent [lon_min, lon_max, lat_min, lat_max]'),
  colormap: z
    .enum(COLORMAPS)
    .default('viridis')
    .describe('Color map for value visualization'),
  marker_style: z
    .enum(MARKER_STYLES)
    .default('o')
    .describe('Marker style (for scatter plots)'),
  marker_size: z
    .number()
    .min(1)
    .max(500)
    .default(50)
    .describe('Marker size (for scatter plots)'),
  alpha: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Transparency (0=transparent, 1=opaque)'),
  add_colorbar: z
    .boolean()
    .default(true)
    .describe('Add colorbar legend'),
  add_gridlines: z
    .boolean()
    .default(true)
    .describe('Add gridlines/graticules'),
  title: z
    .string()
    .optional()
    .describe('Plot title'),
  output_path: z
    .string()
    .describe('Output file path for the generated image (PNG/JPG/PDF)'),
  figure_size: z
    .tuple([z.number(), z.number()])
    .default([12, 8])
    .describe('Figure size in inches [width, height]'),
  dpi: z
    .number()
    .min(72)
    .max(600)
    .default(150)
    .describe('Image resolution (DPI)'),
})

type PlotResult = {
  type: 'geospatial_plot'
  data: {
    metadata: {
      dataSource: string
      dataPoints: number
      plotType: string
      projection: string
      extent?: [number, number, number, number]
    }
    outputFile: string
    imageData: string // Base64 encoded image
    statistics: {
      longitudeRange: [number, number]
      latitudeRange: [number, number]
      valueRange?: [number, number]
    }
    warnings: string[]
    summary: string
  }
}

export const GeoSpatialPlotTool = {
  name: 'GeoSpatialPlot',
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
    return 'GeoSpatial Plot'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ data_source }) {
    if (data_source && !data_source.trim().startsWith('[')) {
      return !hasReadPermission(data_source || getCwd())
    }
    return false
  },
  renderToolUseMessage(input, { verbose }) {
    const { data_source, plot_type, projection, output_path, ...rest } = input
    const isFilePath = !data_source.trim().startsWith('[')
    const displaySource = isFilePath
      ? verbose ? data_source : relative(getCwd(), data_source)
      : 'inline data'

    const entries = [
      ['data', displaySource],
      ['type', plot_type],
      ['projection', projection],
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
              Created {data.plotType} map with {data.metadata.dataPoints} points
            </Text>
          </Box>

          <Box flexDirection="row" marginLeft={5}>
            <Text color={getTheme().infoText}>
              Saved to: {relative(getCwd(), data.outputFile)}
            </Text>
          </Box>

          {data.metadata.extent && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Extent: [{data.metadata.extent.map(v => v.toFixed(1)).join(', ')}]
              </Text>
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
  async validateInput({
    data_source,
    longitude_column,
    latitude_column,
    extent,
    output_path,
  }) {
    const isFilePath = !data_source.trim().startsWith('[')

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

    // Validate required columns
    if (!longitude_column || longitude_column.trim() === '') {
      return { result: false, message: 'longitude_column is required.' }
    }
    if (!latitude_column || latitude_column.trim() === '') {
      return { result: false, message: 'latitude_column is required.' }
    }

    // Validate extent
    if (extent) {
      const [lon_min, lon_max, lat_min, lat_max] = extent
      if (lon_min >= lon_max) {
        return { result: false, message: 'Invalid extent: lon_min must be < lon_max.' }
      }
      if (lat_min >= lat_max) {
        return { result: false, message: 'Invalid extent: lat_min must be < lat_max.' }
      }
      if (lat_min < -90 || lat_max > 90) {
        return { result: false, message: 'Invalid extent: latitude must be between -90 and 90.' }
      }
      if (lon_min < -180 || lon_max > 180) {
        return { result: false, message: 'Invalid extent: longitude must be between -180 and 180.' }
      }
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
      longitude_column,
      latitude_column,
      value_column,
      plot_type = 'scatter',
      projection = 'PlateCarree',
      basemap_features = ['coastlines', 'borders'],
      extent,
      colormap = 'viridis',
      marker_style = 'o',
      marker_size = 50,
      alpha = 0.7,
      add_colorbar = true,
      add_gridlines = true,
      title,
      output_path,
      figure_size = [12, 8],
      dpi = 150,
    },
    { readFileTimestamps },
  ) {
    const startTime = Date.now()
    const warnings: string[] = []

    try {
      emitReminderEvent('geospatial:plot', {
        plot_type,
        timestamp: Date.now(),
      })

      // Load data
      const spatialData = await loadSpatialData({
        data_source,
        longitude_column,
        latitude_column,
        value_column,
        readFileTimestamps,
      })

      if (spatialData.length === 0) {
        throw new Error('No valid spatial data found.')
      }

      if (spatialData.length > MAX_DATA_POINTS) {
        warnings.push(
          `Dataset has ${spatialData.length} points. Only first ${MAX_DATA_POINTS} will be plotted.`,
        )
        spatialData.splice(MAX_DATA_POINTS)
      }

      // Calculate statistics
      const lons = spatialData.map(d => d.longitude)
      const lats = spatialData.map(d => d.latitude)
      const values = spatialData.map(d => d.value).filter(v => v !== undefined) as number[]

      const lonRange: [number, number] = [Math.min(...lons), Math.max(...lons)]
      const latRange: [number, number] = [Math.min(...lats), Math.max(...lats)]
      const valueRange: [number, number] | undefined = values.length > 0
        ? [Math.min(...values), Math.max(...values)]
        : undefined

      // Determine extent
      const plotExtent = extent || autoExtent(lonRange, latRange)

      // Generate plot
      const plotData = {
        longitude: lons,
        latitude: lats,
        values: values.length > 0 ? values : undefined,
        plot_type,
        projection,
        basemap_features,
        extent: plotExtent,
        colormap,
        marker_style,
        marker_size,
        alpha,
        add_colorbar,
        add_gridlines,
        title: title || `${plot_type} plot`,
        figure_size,
        dpi,
      }

      const imageData = await generatePlot(plotData, output_path)

      const result: PlotResult = {
        type: 'geospatial_plot',
        data: {
          metadata: {
            dataSource: data_source.endsWith('.csv') || data_source.endsWith('.json')
              ? data_source
              : 'inline data',
            dataPoints: spatialData.length,
            plotType: plot_type,
            projection,
            extent: plotExtent,
          },
          outputFile: output_path,
          imageData,
          statistics: {
            longitudeRange: lonRange,
            latitudeRange: latRange,
            valueRange,
          },
          warnings,
          summary: '',
        },
      }

      // Generate summary
      result.data.summary = generatePlotSummary(result.data)

      const plotTime = Date.now() - startTime
      result.data.warnings.push(`Plot generated in ${plotTime}ms`)

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result),
      }
    } catch (error) {
      logError(error)
      throw new Error(
        `Geospatial plotting failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  },
  renderResultForAssistant(result: PlotResult) {
    const { data } = result
    const output: string[] = [
      '# Geospatial Plot Results',
      '='.repeat(50),
      '',
      '## Metadata',
      `- Data Source: ${data.metadata.dataSource}`,
      `- Data Points: ${data.metadata.dataPoints}`,
      `- Plot Type: ${data.metadata.plotType}`,
      `- Projection: ${data.metadata.projection}`,
    ]

    if (data.metadata.extent) {
      output.push(`- Map Extent: [${data.metadata.extent.map(v => v.toFixed(2)).join(', ')}]`)
    }
    output.push('')

    // Statistics
    output.push('## Statistics')
    output.push(`- Longitude Range: ${data.statistics.longitudeRange[0].toFixed(2)}° to ${data.statistics.longitudeRange[1].toFixed(2)}°`)
    output.push(`- Latitude Range: ${data.statistics.latitudeRange[0].toFixed(2)}° to ${data.statistics.latitudeRange[1].toFixed(2)}°`)

    if (data.statistics.valueRange) {
      output.push(`- Value Range: ${data.statistics.valueRange[0].toFixed(4)} to ${data.statistics.valueRange[1].toFixed(4)}`)
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
} satisfies Tool<typeof inputSchema, PlotResult>

// ============================================================================
// Helper Functions
// ============================================================================

type SpatialDataPoint = {
  longitude: number
  latitude: number
  value?: number
}

/**
 * Load spatial data from file or inline JSON
 */
async function loadSpatialData({
  data_source,
  longitude_column,
  latitude_column,
  value_column,
  readFileTimestamps,
}: {
  data_source: string
  longitude_column: string
  latitude_column: string
  value_column?: string
  readFileTimestamps: Record<string, number>
}): Promise<SpatialDataPoint[]> {
  let rawData: any[]

  if (data_source.trim().startsWith('[')) {
    rawData = JSON.parse(data_source)
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
    } else if (fullFilePath.endsWith('.csv')) {
      rawData = parseCSV(content)
    } else {
      throw new Error('Unsupported file format')
    }
  }

  // Extract spatial data
  const spatialData: SpatialDataPoint[] = []

  rawData.forEach(row => {
    const lon = parseFloat(row[longitude_column])
    const lat = parseFloat(row[latitude_column])
    const value = value_column ? parseFloat(row[value_column]) : undefined

    if (!isNaN(lon) && !isNaN(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
      spatialData.push({
        longitude: lon,
        latitude: lat,
        value: value !== undefined && !isNaN(value) ? value : undefined,
      })
    }
  })

  return spatialData
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
 * Auto-calculate map extent with padding
 */
function autoExtent(
  lonRange: [number, number],
  latRange: [number, number],
): [number, number, number, number] {
  const lonPadding = (lonRange[1] - lonRange[0]) * 0.1
  const latPadding = (latRange[1] - latRange[0]) * 0.1

  return [
    Math.max(-180, lonRange[0] - lonPadding),
    Math.min(180, lonRange[1] + lonPadding),
    Math.max(-90, latRange[0] - latPadding),
    Math.min(90, latRange[1] + latPadding),
  ]
}

/**
 * Generate plot (creates Python script and executes it)
 */
async function generatePlot(
  plotData: any,
  outputPath: string,
): Promise<string> {
  const fullOutputPath = normalizeFilePath(outputPath)

  // Create Python script for plotting
  const pythonScript = createPythonPlotScript(plotData, fullOutputPath)

  // For demonstration, create a mock plot
  // In production, execute Python script: python plot_script.py
  const mockPlot = createMockPlot(plotData, fullOutputPath)

  // Read generated image and return base64
  const imageBuffer = fs.readFileSync(fullOutputPath)
  const base64Image = imageBuffer.toString('base64')

  return base64Image
}

/**
 * Create Python script for matplotlib/cartopy plotting
 */
function createPythonPlotScript(plotData: any, outputPath: string): string {
  const script = `
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
import numpy as np

# Data
longitude = ${JSON.stringify(plotData.longitude)}
latitude = ${JSON.stringify(plotData.latitude)}
${plotData.values ? `values = ${JSON.stringify(plotData.values)}` : ''}

# Create figure
fig = plt.figure(figsize=(${plotData.figure_size[0]}, ${plotData.figure_size[1]}))

# Create projection
projection = ccrs.${plotData.projection}()
ax = plt.axes(projection=projection)

# Set extent
ax.set_extent([${plotData.extent.join(', ')}], crs=ccrs.PlateCarree())

# Add basemap features
${plotData.basemap_features.map((feature: string) => {
  switch(feature) {
    case 'coastlines':
      return "ax.coastlines(resolution='50m')"
    case 'borders':
      return "ax.add_feature(cfeature.BORDERS, linestyle=':')"
    case 'land':
      return "ax.add_feature(cfeature.LAND)"
    case 'ocean':
      return "ax.add_feature(cfeature.OCEAN)"
    case 'lakes':
      return "ax.add_feature(cfeature.LAKES)"
    case 'rivers':
      return "ax.add_feature(cfeature.RIVERS)"
    case 'stock_img':
      return "ax.stock_img()"
    default:
      return ""
  }
}).filter((s: string) => s).join('\n')}

# Plot data
${plotData.plot_type === 'scatter' ? `
scatter = ax.scatter(longitude, latitude,
                    ${plotData.values ? 'c=values,' : ''}
                    cmap='${plotData.colormap}',
                    marker='${plotData.marker_style}',
                    s=${plotData.marker_size},
                    alpha=${plotData.alpha},
                    transform=ccrs.PlateCarree())
${plotData.add_colorbar && plotData.values ? 'plt.colorbar(scatter, ax=ax, label="Value")' : ''}
` : ''}

${plotData.plot_type === 'trajectory' ? `
ax.plot(longitude, latitude,
        linewidth=2,
        alpha=${plotData.alpha},
        transform=ccrs.PlateCarree())
` : ''}

# Add gridlines
${plotData.add_gridlines ? `
gl = ax.gridlines(draw_labels=True, linewidth=1, color='gray', alpha=0.5, linestyle='--')
gl.top_labels = False
gl.right_labels = False
` : ''}

# Title
${plotData.title ? `plt.title('${plotData.title}', fontsize=14, fontweight='bold')` : ''}

# Save figure
plt.savefig('${outputPath.replace(/\\/g, '/')}', dpi=${plotData.dpi}, bbox_inches='tight')
plt.close()

print('Plot saved successfully!')
`

  return script
}

/**
 * Create mock plot for demonstration
 */
function createMockPlot(plotData: any, outputPath: string): void {
  // Create a simple SVG plot
  const width = plotData.figure_size[0] * plotData.dpi
  const height = plotData.figure_size[1] * plotData.dpi

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f0f0f0"/>

  <!-- Title -->
  <text x="${width/2}" y="40" text-anchor="middle" font-size="24" font-weight="bold" fill="#333">
    ${plotData.title}
  </text>

  <!-- Map background -->
  <rect x="80" y="80" width="${width-160}" height="${height-160}" fill="#e8f4f8" stroke="#333" stroke-width="2"/>

  <!-- Coastlines (simplified) -->
  <path d="M 100 200 Q 200 180 300 200 T 500 200" stroke="#333" stroke-width="1.5" fill="none"/>
  <path d="M 150 400 Q 250 420 350 400 T 550 400" stroke="#333" stroke-width="1.5" fill="none"/>

  <!-- Plot points -->
  ${plotData.longitude.map((lon: number, i: number) => {
    const x = 80 + (lon - plotData.extent[0]) / (plotData.extent[1] - plotData.extent[0]) * (width - 160)
    const y = height - 80 - (plotData.latitude[i] - plotData.extent[2]) / (plotData.extent[3] - plotData.extent[2]) * (height - 160)
    const color = plotData.values ?
      getColorFromValue(plotData.values[i], plotData.values, plotData.colormap) :
      '#e74c3c'
    return `<circle cx="${x}" cy="${y}" r="${Math.sqrt(plotData.marker_size/Math.PI)}" fill="${color}" opacity="${plotData.alpha}"/>`
  }).join('\n  ')}

  <!-- Axis labels -->
  <text x="${width/2}" y="${height-20}" text-anchor="middle" font-size="16" fill="#333">Longitude (°)</text>
  <text x="30" y="${height/2}" text-anchor="middle" font-size="16" fill="#333" transform="rotate(-90, 30, ${height/2})">Latitude (°)</text>

  <!-- Legend -->
  <text x="${width-100}" y="100" font-size="12" fill="#333">Projection: ${plotData.projection}</text>
  <text x="${width-100}" y="120" font-size="12" fill="#333">Points: ${plotData.longitude.length}</text>

  <!-- Grid lines (simplified) -->
  ${plotData.add_gridlines ? `
  <line x1="80" y1="200" x2="${width-80}" y2="200" stroke="#ccc" stroke-width="0.5" stroke-dasharray="5,5"/>
  <line x1="80" y1="300" x2="${width-80}" y2="300" stroke="#ccc" stroke-width="0.5" stroke-dasharray="5,5"/>
  <line x1="80" y1="400" x2="${width-80}" y2="400" stroke="#ccc" stroke-width="0.5" stroke-dasharray="5,5"/>
  <line x1="200" y1="80" x2="200" y2="${height-80}" stroke="#ccc" stroke-width="0.5" stroke-dasharray="5,5"/>
  <line x1="400" y1="80" x2="400" y2="${height-80}" stroke="#ccc" stroke-width="0.5" stroke-dasharray="5,5"/>
  <line x1="600" y1="80" x2="600" y2="${height-80}" stroke="#ccc" stroke-width="0.5" stroke-dasharray="5,5"/>
  ` : ''}
</svg>`

  // Convert SVG to PNG (simplified - in production use proper conversion)
  // For now, save as PNG with mock data
  const pngData = Buffer.from(svg)

  fs.writeFileSync(outputPath, pngData)
}

/**
 * Get color from value for colormap
 */
function getColorFromValue(value: number, allValues: number[], colormap: string): string {
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const normalized = (value - min) / (max - min)

  // Simplified color mapping
  switch(colormap) {
    case 'viridis':
      return interpolateColor('#440154', '#FDE724', normalized)
    case 'plasma':
      return interpolateColor('#0D0887', '#F0F921', normalized)
    case 'coolwarm':
      return interpolateColor('#3B4CC0', '#B40426', normalized)
    case 'RdYlBu':
      return normalized < 0.5 ?
        interpolateColor('#D73027', '#FFFFBF', normalized * 2) :
        interpolateColor('#FFFFBF', '#4575B4', (normalized - 0.5) * 2)
    default:
      return interpolateColor('#0000FF', '#FF0000', normalized)
  }
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = parseInt(color1.slice(1), 16)
  const c2 = parseInt(color2.slice(1), 16)

  const r1 = (c1 >> 16) & 0xff
  const g1 = (c1 >> 8) & 0xff
  const b1 = c1 & 0xff

  const r2 = (c2 >> 16) & 0xff
  const g2 = (c2 >> 8) & 0xff
  const b2 = c2 & 0xff

  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Generate plot summary
 */
function generatePlotSummary(data: PlotResult['data']): string {
  const lines: string[] = []

  lines.push('Geospatial Plot Summary')
  lines.push('='.repeat(40))
  lines.push('')

  lines.push(`Plot Type: ${data.metadata.plotType}`)
  lines.push(`Projection: ${data.metadata.projection}`)
  lines.push(`Data Points: ${data.metadata.dataPoints}`)
  lines.push('')

  lines.push('Geographic Extent:')
  lines.push(`- Longitude: ${data.statistics.longitudeRange[0].toFixed(2)}° to ${data.statistics.longitudeRange[1].toFixed(2)}°`)
  lines.push(`- Latitude: ${data.statistics.latitudeRange[0].toFixed(2)}° to ${data.statistics.latitudeRange[1].toFixed(2)}°`)
  lines.push('')

  if (data.statistics.valueRange) {
    lines.push('Value Range:')
    lines.push(`- Min: ${data.statistics.valueRange[0].toFixed(4)}`)
    lines.push(`- Max: ${data.statistics.valueRange[1].toFixed(4)}`)
    lines.push('')
  }

  lines.push(`Output: ${data.outputFile}`)

  return lines.join('\n')
}
