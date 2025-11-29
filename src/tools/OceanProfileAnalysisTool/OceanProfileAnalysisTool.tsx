import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '@components/FallbackToolUseRejectedMessage'
import { HighlightedCode } from '@components/HighlightedCode'
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

const MAX_LINES_TO_RENDER = 20
const MAX_DEPTH_LEVELS = 10000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// MLD criteria types
const MLD_CRITERIA = ['temperature', 'density', 'both'] as const

// Equation of state options
const EOS_OPTIONS = ['unesco', 'teos10', 'simplified'] as const

const inputSchema = z.strictObject({
  data_source: z
    .string()
    .describe('Path to CSV/JSON file containing vertical profile data'),
  depth_column: z
    .string()
    .describe('Column name for depth values in meters'),
  temperature_column: z
    .string()
    .describe('Column name for temperature in degrees Celsius'),
  salinity_column: z
    .string()
    .describe('Column name for salinity in PSU (Practical Salinity Units)'),
  pressure_column: z
    .string()
    .optional()
    .describe('Column name for pressure in dbar (calculated from depth if not provided)'),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe('Geographic latitude in degrees (-90 to 90)'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Geographic longitude in degrees (-180 to 180)'),
  reference_pressure: z
    .number()
    .min(0)
    .default(0)
    .describe('Reference pressure for potential density in dbar (default: 0)'),
  mld_criteria: z
    .enum(MLD_CRITERIA)
    .default('density')
    .describe('Criteria for mixed layer depth: temperature, density, or both'),
  mld_threshold: z
    .number()
    .optional()
    .describe('Threshold for MLD detection (default: 0.2°C for temp, 0.03 kg/m³ for density)'),
  equation_of_state: z
    .enum(EOS_OPTIONS)
    .default('unesco')
    .describe('Equation of state: unesco, teos10, or simplified'),
  calculate_sound_speed: z
    .boolean()
    .default(true)
    .describe('Calculate sound speed profile'),
  calculate_stability: z
    .boolean()
    .default(true)
    .describe('Calculate stability parameters (N², Richardson number)'),
  output_ts_diagram: z
    .boolean()
    .default(true)
    .describe('Include T-S diagram data in output'),
})

type ProfileLevel = {
  depth: number
  pressure: number
  temperature: number
  salinity: number
  density?: number
  potential_density?: number
  sigma_t?: number
  sigma_theta?: number
  buoyancy_frequency?: number
  sound_speed?: number
  dynamic_height?: number
}

type AnalysisResult = {
  type: 'ocean_profile_analysis'
  data: {
    metadata: {
      dataSource: string
      location?: {
        latitude?: number
        longitude?: number
      }
      depthRange: {
        min: number
        max: number
      }
      dataPoints: number
      analysisDate: string
    }
    profileData: ProfileLevel[]
    derivedParameters: {
      mixedLayerDepth?: {
        value: number
        criteria: string
        threshold: number
      }
      thermoclineDepth?: number
      haloclineDepth?: number
      pycnoclineDepth?: number
      maxBuoyancyFrequency?: {
        value: number
        depth: number
      }
      surfaceDensity?: number
      bottomDensity?: number
      averageStability?: number
    }
    tsDiagram?: {
      temperature: number[]
      salinity: number[]
      density: number[]
      depth: number[]
    }
    statistics: {
      temperature: {
        surface: number
        bottom: number
        mean: number
        gradient: number
      }
      salinity: {
        surface: number
        bottom: number
        mean: number
        gradient: number
      }
      density: {
        surface: number
        bottom: number
        mean: number
        stratification: number
      }
    }
    qualityFlags: string[]
    warnings: string[]
    summary: string
  }
}

export const OceanProfileAnalysisTool = {
  name: 'OceanProfileAnalysis',
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  userFacingName() {
    return 'Ocean Profile Analysis'
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
    const { data_source, depth_column, temperature_column, salinity_column, ...rest } = input
    const isFilePath = !data_source.trim().startsWith('[')
    const displaySource = isFilePath
      ? verbose
        ? data_source
        : relative(getCwd(), data_source)
      : 'inline data'

    const entries = [
      ['data_source', displaySource],
      ['depth', depth_column],
      ['temperature', temperature_column],
      ['salinity', salinity_column],
      ...Object.entries(rest).filter(([_, value]) => value !== undefined),
    ]
    return entries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')
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
              Analyzed {data.metadata.dataPoints} depth levels
            </Text>
          </Box>

          <Box flexDirection="row" marginLeft={5}>
            <Text color={getTheme().secondaryText}>
              Depth range: {data.metadata.depthRange.min}m - {data.metadata.depthRange.max}m
            </Text>
          </Box>

          {data.derivedParameters.mixedLayerDepth && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().infoText}>
                Mixed Layer Depth: {data.derivedParameters.mixedLayerDepth.value.toFixed(1)}m
              </Text>
            </Box>
          )}

          {data.derivedParameters.thermoclineDepth && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().infoText}>
                Thermocline Depth: {data.derivedParameters.thermoclineDepth.toFixed(1)}m
              </Text>
            </Box>
          )}

          {data.qualityFlags && data.qualityFlags.length > 0 && (
            <Box flexDirection="column" marginLeft={5}>
              {data.qualityFlags.slice(0, 2).map((flag, idx) => (
                <Text key={idx} color={getTheme().warningText}>
                  ℹ {flag}
                </Text>
              ))}
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

          {data.summary && (
            <Box flexDirection="column" marginLeft={5} marginTop={1}>
              <HighlightedCode
                code={
                  verbose
                    ? data.summary
                    : data.summary.split('\n').slice(0, MAX_LINES_TO_RENDER).join('\n')
                }
                language="text"
              />
              {!verbose && data.summary.split('\n').length > MAX_LINES_TO_RENDER && (
                <Text color={getTheme().secondaryText}>
                  ... (+{data.summary.split('\n').length - MAX_LINES_TO_RENDER} lines)
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
    data_source,
    depth_column,
    temperature_column,
    salinity_column,
    latitude,
    longitude,
    reference_pressure,
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
            ? `Profile data file does not exist. Did you mean ${similarFilename}?`
            : 'Profile data file does not exist.',
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
    if (!depth_column || depth_column.trim() === '') {
      return { result: false, message: 'depth_column is required.' }
    }
    if (!temperature_column || temperature_column.trim() === '') {
      return { result: false, message: 'temperature_column is required.' }
    }
    if (!salinity_column || salinity_column.trim() === '') {
      return { result: false, message: 'salinity_column is required.' }
    }

    // Validate latitude/longitude
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return {
        result: false,
        message: `Invalid latitude: ${latitude}. Must be between -90 and 90.`,
      }
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return {
        result: false,
        message: `Invalid longitude: ${longitude}. Must be between -180 and 180.`,
      }
    }

    // Validate reference pressure
    if (reference_pressure !== undefined && reference_pressure < 0) {
      return {
        result: false,
        message: 'reference_pressure must be non-negative.',
      }
    }

    return { result: true }
  },
  async *call(
    {
      data_source,
      depth_column,
      temperature_column,
      salinity_column,
      pressure_column,
      latitude,
      longitude,
      reference_pressure = 0,
      mld_criteria = 'density',
      mld_threshold,
      equation_of_state = 'unesco',
      calculate_sound_speed = true,
      calculate_stability = true,
      output_ts_diagram = true,
    },
    { readFileTimestamps },
  ) {
    const startTime = Date.now()
    const warnings: string[] = []
    const qualityFlags: string[] = []

    try {
      emitReminderEvent('ocean:profile_analysis', {
        timestamp: Date.now(),
      })

      // Load profile data
      const profileData = await loadProfileData({
        data_source,
        depth_column,
        temperature_column,
        salinity_column,
        pressure_column,
        readFileTimestamps,
      })

      if (profileData.length === 0) {
        throw new Error('No valid profile data found.')
      }

      if (profileData.length > MAX_DEPTH_LEVELS) {
        warnings.push(
          `Profile has ${profileData.length} levels. Only first ${MAX_DEPTH_LEVELS} will be analyzed.`,
        )
        profileData.splice(MAX_DEPTH_LEVELS)
      }

      // Sort by depth (ascending)
      profileData.sort((a, b) => a.depth - b.depth)

      // Calculate pressure if not provided
      if (!pressure_column) {
        profileData.forEach(level => {
          level.pressure = depthToPressure(level.depth, latitude || 45)
        })
      }

      // Quality checks
      performQualityChecks(profileData, qualityFlags, warnings)

      // Calculate densities
      profileData.forEach(level => {
        const eos = getEquationOfState(equation_of_state)

        // In-situ density
        level.density = eos.density(
          level.temperature,
          level.salinity,
          level.pressure,
        )

        // Sigma-t (density anomaly at surface)
        level.sigma_t = eos.density(level.temperature, level.salinity, 0) - 1000

        // Potential temperature (simplified)
        const pot_temp = eos.potentialTemperature(
          level.temperature,
          level.salinity,
          level.pressure,
          reference_pressure,
        )

        // Potential density
        level.potential_density = eos.density(pot_temp, level.salinity, reference_pressure)
        level.sigma_theta = level.potential_density - 1000
      })

      // Calculate stability parameters
      if (calculate_stability) {
        calculateStabilityParameters(profileData, latitude)
      }

      // Calculate sound speed
      if (calculate_sound_speed) {
        profileData.forEach(level => {
          level.sound_speed = calculateSoundSpeed(
            level.temperature,
            level.salinity,
            level.depth,
          )
        })
      }

      // Calculate dynamic height
      calculateDynamicHeight(profileData)

      // Determine mixed layer depth
      const mldResult = calculateMixedLayerDepth(
        profileData,
        mld_criteria,
        mld_threshold,
      )

      // Find thermocline, halocline, pycnocline depths
      const thermoclineDepth = findGradientMaximum(
        profileData,
        (level) => level.temperature,
      )
      const haloclineDepth = findGradientMaximum(
        profileData,
        (level) => level.salinity,
      )
      const pycnoclineDepth = findGradientMaximum(
        profileData,
        (level) => level.density || 0,
      )

      // Find maximum buoyancy frequency
      const maxN2 = findMaxBuoyancyFrequency(profileData)

      // Calculate statistics
      const statistics = calculateProfileStatistics(profileData)

      // Prepare T-S diagram data
      let tsDiagram: AnalysisResult['data']['tsDiagram']
      if (output_ts_diagram) {
        tsDiagram = {
          temperature: profileData.map(l => l.temperature),
          salinity: profileData.map(l => l.salinity),
          density: profileData.map(l => l.density || 0),
          depth: profileData.map(l => l.depth),
        }
      }

      // Build result
      const result: AnalysisResult = {
        type: 'ocean_profile_analysis',
        data: {
          metadata: {
            dataSource: data_source.endsWith('.csv') || data_source.endsWith('.json')
              ? data_source
              : 'inline data',
            location: latitude !== undefined || longitude !== undefined
              ? { latitude, longitude }
              : undefined,
            depthRange: {
              min: profileData[0].depth,
              max: profileData[profileData.length - 1].depth,
            },
            dataPoints: profileData.length,
            analysisDate: new Date().toISOString(),
          },
          profileData,
          derivedParameters: {
            mixedLayerDepth: mldResult,
            thermoclineDepth,
            haloclineDepth,
            pycnoclineDepth,
            maxBuoyancyFrequency: maxN2,
            surfaceDensity: profileData[0].density,
            bottomDensity: profileData[profileData.length - 1].density,
            averageStability: calculateAverageStability(profileData),
          },
          tsDiagram,
          statistics,
          qualityFlags,
          warnings,
          summary: '',
        },
      }

      // Generate summary
      result.data.summary = generateAnalysisSummary(result.data)

      const analysisTime = Date.now() - startTime
      result.data.warnings.push(`Analysis completed in ${analysisTime}ms`)

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result),
      }
    } catch (error) {
      logError(error)
      throw new Error(
        `Ocean profile analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  },
  renderResultForAssistant(result: AnalysisResult) {
    const { data } = result
    const output: string[] = [
      '# Ocean Profile Analysis Results',
      '='.repeat(50),
      '',
      '## Metadata',
      `- Data Source: ${data.metadata.dataSource}`,
      `- Depth Range: ${data.metadata.depthRange.min}m to ${data.metadata.depthRange.max}m`,
      `- Data Points: ${data.metadata.dataPoints}`,
    ]

    if (data.metadata.location) {
      output.push(
        `- Location: ${data.metadata.location.latitude?.toFixed(4)}°N, ${data.metadata.location.longitude?.toFixed(4)}°E`,
      )
    }
    output.push('')

    // Derived parameters
    output.push('## Derived Parameters')
    if (data.derivedParameters.mixedLayerDepth) {
      output.push(
        `- Mixed Layer Depth: ${data.derivedParameters.mixedLayerDepth.value.toFixed(2)}m (${data.derivedParameters.mixedLayerDepth.criteria})`,
      )
    }
    if (data.derivedParameters.thermoclineDepth) {
      output.push(`- Thermocline Depth: ${data.derivedParameters.thermoclineDepth.toFixed(2)}m`)
    }
    if (data.derivedParameters.haloclineDepth) {
      output.push(`- Halocline Depth: ${data.derivedParameters.haloclineDepth.toFixed(2)}m`)
    }
    if (data.derivedParameters.pycnoclineDepth) {
      output.push(`- Pycnocline Depth: ${data.derivedParameters.pycnoclineDepth.toFixed(2)}m`)
    }
    if (data.derivedParameters.maxBuoyancyFrequency) {
      output.push(
        `- Max Buoyancy Frequency: ${data.derivedParameters.maxBuoyancyFrequency.value.toFixed(6)} s⁻² at ${data.derivedParameters.maxBuoyancyFrequency.depth.toFixed(1)}m`,
      )
    }
    output.push('')

    // Statistics
    output.push('## Statistics')
    output.push(JSON.stringify(data.statistics, null, 2))
    output.push('')

    // Sample profile data
    output.push('## Profile Data (first 5 levels)')
    output.push('Depth(m) | Temp(°C) | Sal(PSU) | Density(kg/m³) | σθ')
    output.push('-'.repeat(60))
    data.profileData.slice(0, 5).forEach(level => {
      output.push(
        `${level.depth.toFixed(1).padStart(8)} | ${level.temperature.toFixed(2).padStart(8)} | ${level.salinity.toFixed(2).padStart(8)} | ${level.density?.toFixed(2).padStart(14)} | ${level.sigma_theta?.toFixed(3).padStart(6)}`,
      )
    })
    if (data.profileData.length > 5) {
      output.push(`... and ${data.profileData.length - 5} more levels`)
    }
    output.push('')

    // Quality flags
    if (data.qualityFlags.length > 0) {
      output.push('## Quality Flags')
      data.qualityFlags.forEach(flag => output.push(`- ${flag}`))
      output.push('')
    }

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
} satisfies Tool<typeof inputSchema, AnalysisResult>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load profile data from file or inline JSON
 */
async function loadProfileData({
  data_source,
  depth_column,
  temperature_column,
  salinity_column,
  pressure_column,
  readFileTimestamps,
}: {
  data_source: string
  depth_column: string
  temperature_column: string
  salinity_column: string
  pressure_column?: string
  readFileTimestamps: Record<string, number>
}): Promise<ProfileLevel[]> {
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

  // Extract profile data
  const profileData: ProfileLevel[] = []

  rawData.forEach(row => {
    const depth = parseFloat(row[depth_column])
    const temperature = parseFloat(row[temperature_column])
    const salinity = parseFloat(row[salinity_column])
    const pressure = pressure_column ? parseFloat(row[pressure_column]) : undefined

    if (
      !isNaN(depth) &&
      !isNaN(temperature) &&
      !isNaN(salinity) &&
      (pressure === undefined || !isNaN(pressure))
    ) {
      profileData.push({
        depth,
        temperature,
        salinity,
        pressure: pressure || 0, // Will be calculated later if not provided
      })
    }
  })

  return profileData
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
 * Convert depth to pressure using standard formula
 */
function depthToPressure(depth: number, latitude: number): number {
  // Fofonoff and Millard (1983) formula
  // P (dbar) ≈ depth (m) × (1.0076 + 2.3 × 10⁻⁵ × depth) × (1 + 5.3 × 10⁻³ × sin²(lat))

  const latRad = (latitude * Math.PI) / 180
  const sinLat = Math.sin(latRad)

  const pressure = depth * (1.0076 + 2.3e-5 * depth) * (1 + 5.3e-3 * sinLat * sinLat)

  return pressure
}

/**
 * Equation of state interface
 */
interface EquationOfState {
  density(temperature: number, salinity: number, pressure: number): number
  potentialTemperature(
    temperature: number,
    salinity: number,
    pressure: number,
    refPressure: number,
  ): number
}

/**
 * Get equation of state implementation
 */
function getEquationOfState(eosType: string): EquationOfState {
  switch (eosType) {
    case 'unesco':
      return unescoEOS
    case 'teos10':
      return teos10EOS
    case 'simplified':
    default:
      return simplifiedEOS
  }
}

/**
 * UNESCO (EOS-80) equation of state
 */
const unescoEOS: EquationOfState = {
  density(T: number, S: number, P: number): number {
    // UNESCO EOS-80 formula
    // Based on Millero & Poisson (1981)

    // Pure water density at atmospheric pressure
    const rho0 =
      999.842594 +
      6.793952e-2 * T -
      9.095290e-3 * T * T +
      1.001685e-4 * T * T * T -
      1.120083e-6 * T * T * T * T +
      6.536332e-9 * T * T * T * T * T

    // Salinity contribution
    const A =
      8.24493e-1 -
      4.0899e-3 * T +
      7.6438e-5 * T * T -
      8.2467e-7 * T * T * T +
      5.3875e-9 * T * T * T * T

    const B = -5.72466e-3 + 1.0227e-4 * T - 1.6546e-6 * T * T

    const C = 4.8314e-4

    const rho_st = rho0 + A * S + B * S * Math.sqrt(S) + C * S * S

    // Pressure contribution (simplified)
    const K =
      19652.21 +
      148.4206 * T -
      2.327105 * T * T +
      1.360477e-2 * T * T * T -
      5.155288e-5 * T * T * T * T

    const Ks = (54.6746 - 0.603459 * T + 1.09987e-2 * T * T - 6.1670e-5 * T * T * T) * S

    const Kst = K + Ks + (7.944e-2 + 1.6483e-2 * T - 5.3009e-4 * T * T) * S * Math.sqrt(S)

    // Secant bulk modulus
    const K_st = Kst + (3.239908 + 1.43713e-3 * T + 1.16092e-4 * T * T - 5.77905e-7 * T * T * T) * P

    const density = rho_st / (1 - P / K_st)

    return density
  },

  potentialTemperature(T: number, S: number, P: number, P_ref: number): number {
    // Simplified adiabatic temperature gradient
    // Based on Bryden (1973)

    const dP = P - P_ref

    // Adiabatic lapse rate (°C per dbar)
    const gamma =
      (3.5803e-5 +
        8.5258e-6 * T +
        -6.8360e-8 * T * T +
        6.6228e-10 * T * T * T +
        (1.8932e-6 - 4.2393e-8 * T) * (S - 35)) *
      dP

    return T - gamma
  },
}

/**
 * TEOS-10 equation of state (simplified)
 */
const teos10EOS: EquationOfState = {
  density(T: number, S: number, P: number): number {
    // Simplified TEOS-10
    // In production, use gsw library
    return unescoEOS.density(T, S, P)
  },

  potentialTemperature(T: number, S: number, P: number, P_ref: number): number {
    return unescoEOS.potentialTemperature(T, S, P, P_ref)
  },
}

/**
 * Simplified equation of state
 */
const simplifiedEOS: EquationOfState = {
  density(T: number, S: number, P: number): number {
    // Linear approximation
    const rho0 = 1028.0 // Reference density
    const alpha = 0.2 // Thermal expansion coefficient (kg/m³/°C)
    const beta = 0.78 // Haline contraction coefficient (kg/m³/PSU)
    const gamma = 4.5e-6 // Compressibility (1/dbar)

    const T_ref = 10.0
    const S_ref = 35.0

    const rho = rho0 - alpha * (T - T_ref) + beta * (S - S_ref) + gamma * P * rho0

    return rho
  },

  potentialTemperature(T: number, S: number, P: number, P_ref: number): number {
    // Simplified adiabatic correction
    const dP = P - P_ref
    const gamma = 3.5e-5 // Simplified lapse rate
    return T - gamma * dP
  },
}

/**
 * Calculate sound speed using Mackenzie equation
 */
function calculateSoundSpeed(T: number, S: number, D: number): number {
  // Mackenzie (1981) formula
  // T: temperature (°C), S: salinity (PSU), D: depth (m)

  const c =
    1448.96 +
    4.591 * T -
    5.304e-2 * T * T +
    2.374e-4 * T * T * T +
    1.340 * (S - 35) +
    1.630e-2 * D +
    1.675e-7 * D * D -
    1.025e-2 * T * (S - 35) -
    7.139e-13 * T * D * D * D

  return c
}

/**
 * Calculate stability parameters (Brunt-Väisälä frequency)
 */
function calculateStabilityParameters(profileData: ProfileLevel[], latitude?: number) {
  const g = 9.81 // Gravity (m/s²)

  for (let i = 1; i < profileData.length; i++) {
    const upper = profileData[i - 1]
    const lower = profileData[i]

    const dz = lower.depth - upper.depth
    const drho = (lower.density || 0) - (upper.density || 0)
    const rho_avg = ((upper.density || 0) + (lower.density || 0)) / 2

    if (dz > 0 && rho_avg > 0) {
      // Brunt-Väisälä frequency squared (s⁻²)
      const N2 = -(g / rho_avg) * (drho / dz)
      lower.buoyancy_frequency = N2
    }
  }
}

/**
 * Calculate dynamic height
 */
function calculateDynamicHeight(profileData: ProfileLevel[]) {
  // Dynamic height = ∫ (specific volume anomaly) dP
  // Simplified calculation

  let dynamicHeight = 0

  for (let i = 1; i < profileData.length; i++) {
    const upper = profileData[i - 1]
    const lower = profileData[i]

    const dP = lower.pressure - upper.pressure
    const alpha_avg = 1 / ((upper.density || 1028) + (lower.density || 1028)) / 2
    const alpha_0 = 1 / 1028

    const delta_alpha = alpha_avg - alpha_0

    dynamicHeight += delta_alpha * dP * 10 // Convert to dynamic meters

    lower.dynamic_height = dynamicHeight
  }

  if (profileData.length > 0) {
    profileData[0].dynamic_height = 0
  }
}

/**
 * Calculate mixed layer depth
 */
function calculateMixedLayerDepth(
  profileData: ProfileLevel[],
  criteria: string,
  threshold?: number,
): AnalysisResult['data']['derivedParameters']['mixedLayerDepth'] {
  if (profileData.length < 2) return undefined

  const surface = profileData[0]

  let mld: number | undefined
  let actualCriteria = criteria
  let actualThreshold = threshold

  if (criteria === 'temperature' || criteria === 'both') {
    const tempThreshold = threshold || 0.2 // Default 0.2°C

    for (let i = 1; i < profileData.length; i++) {
      if (Math.abs(profileData[i].temperature - surface.temperature) > tempThreshold) {
        mld = profileData[i].depth
        actualCriteria = 'temperature'
        actualThreshold = tempThreshold
        break
      }
    }
  }

  if ((criteria === 'density' || criteria === 'both') && mld === undefined) {
    const densityThreshold = threshold || 0.03 // Default 0.03 kg/m³

    for (let i = 1; i < profileData.length; i++) {
      const surfaceDensity = surface.density || 0
      const currentDensity = profileData[i].density || 0

      if (Math.abs(currentDensity - surfaceDensity) > densityThreshold) {
        mld = profileData[i].depth
        actualCriteria = 'density'
        actualThreshold = densityThreshold
        break
      }
    }
  }

  if (mld === undefined) {
    // MLD not found, use last depth
    mld = profileData[profileData.length - 1].depth
  }

  return {
    value: mld,
    criteria: actualCriteria,
    threshold: actualThreshold!,
  }
}

/**
 * Find depth of maximum gradient
 */
function findGradientMaximum(
  profileData: ProfileLevel[],
  getValue: (level: ProfileLevel) => number,
): number | undefined {
  let maxGradient = 0
  let maxGradientDepth: number | undefined

  for (let i = 1; i < profileData.length; i++) {
    const upper = profileData[i - 1]
    const lower = profileData[i]

    const dz = lower.depth - upper.depth
    const dValue = getValue(lower) - getValue(upper)

    if (dz > 0) {
      const gradient = Math.abs(dValue / dz)

      if (gradient > maxGradient) {
        maxGradient = gradient
        maxGradientDepth = (upper.depth + lower.depth) / 2
      }
    }
  }

  return maxGradientDepth
}

/**
 * Find maximum buoyancy frequency
 */
function findMaxBuoyancyFrequency(
  profileData: ProfileLevel[],
): AnalysisResult['data']['derivedParameters']['maxBuoyancyFrequency'] {
  let maxN2 = -Infinity
  let maxN2Depth = 0

  profileData.forEach(level => {
    if (level.buoyancy_frequency !== undefined && level.buoyancy_frequency > maxN2) {
      maxN2 = level.buoyancy_frequency
      maxN2Depth = level.depth
    }
  })

  return maxN2 > -Infinity
    ? {
        value: maxN2,
        depth: maxN2Depth,
      }
    : undefined
}

/**
 * Calculate average stability
 */
function calculateAverageStability(profileData: ProfileLevel[]): number {
  const n2Values = profileData
    .map(l => l.buoyancy_frequency)
    .filter((n2): n2 is number => n2 !== undefined && n2 > 0)

  if (n2Values.length === 0) return 0

  return n2Values.reduce((sum, n2) => sum + n2, 0) / n2Values.length
}

/**
 * Calculate profile statistics
 */
function calculateProfileStatistics(
  profileData: ProfileLevel[],
): AnalysisResult['data']['statistics'] {
  const surface = profileData[0]
  const bottom = profileData[profileData.length - 1]

  const temperatures = profileData.map(l => l.temperature)
  const salinities = profileData.map(l => l.salinity)
  const densities = profileData.map(l => l.density || 0)

  const meanTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length
  const meanSal = salinities.reduce((a, b) => a + b, 0) / salinities.length
  const meanDensity = densities.reduce((a, b) => a + b, 0) / densities.length

  const tempGradient = (bottom.temperature - surface.temperature) / (bottom.depth - surface.depth)
  const salGradient = (bottom.salinity - surface.salinity) / (bottom.depth - surface.depth)

  const densityRange = bottom.density! - surface.density!
  const stratification = densityRange / (bottom.depth - surface.depth)

  return {
    temperature: {
      surface: surface.temperature,
      bottom: bottom.temperature,
      mean: Number(meanTemp.toFixed(3)),
      gradient: Number(tempGradient.toFixed(6)),
    },
    salinity: {
      surface: surface.salinity,
      bottom: bottom.salinity,
      mean: Number(meanSal.toFixed(3)),
      gradient: Number(salGradient.toFixed(6)),
    },
    density: {
      surface: surface.density!,
      bottom: bottom.density!,
      mean: Number(meanDensity.toFixed(3)),
      stratification: Number(stratification.toFixed(6)),
    },
  }
}

/**
 * Perform quality checks
 */
function performQualityChecks(
  profileData: ProfileLevel[],
  qualityFlags: string[],
  warnings: string[],
) {
  // Check for reasonable ranges
  profileData.forEach((level, idx) => {
    if (level.temperature < -2 || level.temperature > 40) {
      qualityFlags.push(
        `Unusual temperature at ${level.depth}m: ${level.temperature}°C`,
      )
    }

    if (level.salinity < 0 || level.salinity > 42) {
      qualityFlags.push(`Unusual salinity at ${level.depth}m: ${level.salinity} PSU`)
    }

    // Check for inversions
    if (idx > 0) {
      if (profileData[idx - 1].depth >= level.depth) {
        warnings.push(`Depth inversion detected at index ${idx}`)
      }
    }
  })

  // Check for data gaps
  for (let i = 1; i < profileData.length; i++) {
    const gap = profileData[i].depth - profileData[i - 1].depth
    if (gap > 50) {
      warnings.push(
        `Large depth gap (${gap.toFixed(1)}m) between ${profileData[i - 1].depth}m and ${profileData[i].depth}m`,
      )
    }
  }
}

/**
 * Generate analysis summary
 */
function generateAnalysisSummary(data: AnalysisResult['data']): string {
  const lines: string[] = []

  lines.push('Ocean Profile Analysis Summary')
  lines.push('='.repeat(40))
  lines.push('')

  lines.push(`Depth Range: ${data.metadata.depthRange.min}m - ${data.metadata.depthRange.max}m`)
  lines.push(`Data Points: ${data.metadata.dataPoints}`)
  lines.push('')

  lines.push('Water Column Structure:')
  if (data.derivedParameters.mixedLayerDepth) {
    lines.push(`- Mixed Layer: 0 - ${data.derivedParameters.mixedLayerDepth.value.toFixed(1)}m`)
  }
  if (data.derivedParameters.thermoclineDepth) {
    lines.push(`- Thermocline: ~${data.derivedParameters.thermoclineDepth.toFixed(1)}m`)
  }
  if (data.derivedParameters.pycnoclineDepth) {
    lines.push(`- Pycnocline: ~${data.derivedParameters.pycnoclineDepth.toFixed(1)}m`)
  }
  lines.push('')

  lines.push('Surface Properties:')
  lines.push(`- Temperature: ${data.statistics.temperature.surface.toFixed(2)}°C`)
  lines.push(`- Salinity: ${data.statistics.salinity.surface.toFixed(2)} PSU`)
  lines.push(`- Density: ${data.statistics.density.surface.toFixed(2)} kg/m³`)
  lines.push('')

  lines.push('Bottom Properties:')
  lines.push(`- Temperature: ${data.statistics.temperature.bottom.toFixed(2)}°C`)
  lines.push(`- Salinity: ${data.statistics.salinity.bottom.toFixed(2)} PSU`)
  lines.push(`- Density: ${data.statistics.density.bottom.toFixed(2)} kg/m³`)
  lines.push('')

  if (data.derivedParameters.maxBuoyancyFrequency) {
    lines.push('Stability:')
    lines.push(
      `- Max N²: ${data.derivedParameters.maxBuoyancyFrequency.value.toFixed(6)} s⁻² at ${data.derivedParameters.maxBuoyancyFrequency.depth.toFixed(1)}m`,
    )
    if (data.derivedParameters.averageStability) {
      lines.push(`- Average N²: ${data.derivedParameters.averageStability.toFixed(6)} s⁻²`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
