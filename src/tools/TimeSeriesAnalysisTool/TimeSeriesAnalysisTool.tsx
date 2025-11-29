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
const MAX_DATA_POINTS = 100000 // Maximum data points to analyze
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Analysis types
const ANALYSIS_TYPES = [
  'all',
  'descriptive',
  'trend',
  'decomposition',
  'stationarity',
  'autocorrelation',
  'forecast',
  'anomaly',
  'changepoint',
] as const

// Frequency options
const FREQUENCIES = ['D', 'W', 'M', 'Q', 'Y', 'H', 'T', 'S'] as const

// Forecast methods
const FORECAST_METHODS = ['arima', 'exponential', 'linear', 'seasonal'] as const

const inputSchema = z.strictObject({
  data_source: z
    .string()
    .describe('Path to CSV file or inline JSON array string containing time series data'),
  time_column: z
    .string()
    .optional()
    .describe('Name of the time/date column (if not using index)'),
  value_column: z
    .string()
    .describe('Name of the value column to analyze'),
  date_format: z
    .string()
    .optional()
    .describe('Date format string (e.g., "%Y-%m-%d", "%Y/%m/%d %H:%M:%S")'),
  analysis_type: z
    .enum(ANALYSIS_TYPES)
    .default('all')
    .describe('Type of analysis: all, descriptive, trend, decomposition, stationarity, autocorrelation, forecast, anomaly, changepoint'),
  frequency: z
    .enum(FREQUENCIES)
    .optional()
    .describe('Data frequency: D=daily, W=weekly, M=monthly, Q=quarterly, Y=yearly, H=hourly, T=minute, S=second'),
  forecast_periods: z
    .number()
    .min(1)
    .max(365)
    .default(10)
    .describe('Number of periods to forecast (1-365)'),
  seasonal_periods: z
    .number()
    .min(2)
    .optional()
    .describe('Length of seasonal cycle (auto-detect if not specified)'),
  confidence_level: z
    .number()
    .min(0.5)
    .max(0.99)
    .default(0.95)
    .describe('Confidence level for intervals (0.5-0.99)'),
  forecast_method: z
    .enum(FORECAST_METHODS)
    .default('arima')
    .describe('Forecasting method: arima, exponential, linear, seasonal'),
  detect_anomalies: z
    .boolean()
    .default(true)
    .describe('Whether to detect anomalies in the data'),
  detrend: z
    .boolean()
    .default(false)
    .describe('Whether to detrend the data before analysis'),
})

type AnalysisResult = {
  type: 'time_series_analysis'
  data: {
    dataInfo: {
      sourceFile?: string
      dataPoints: number
      timeRange: {
        start: string
        end: string
      }
      frequency?: string
      missingValues: number
    }
    descriptiveStats?: {
      mean: number
      std: number
      min: number
      max: number
      median: number
      q25: number
      q75: number
      skewness: number
      kurtosis: number
    }
    trendAnalysis?: {
      hasTrend: boolean
      trendType: string
      trendStrength: number
      trendEquation?: string
    }
    decomposition?: {
      method: string
      seasonal_strength: number
      trend_strength: number
      has_seasonality: boolean
      seasonal_period?: number
    }
    stationarityTest?: {
      isStationary: boolean
      adfStatistic: number
      pValue: number
      criticalValues: Record<string, number>
      conclusion: string
    }
    autocorrelation?: {
      acf: number[]
      pacf: number[]
      significantLags: number[]
      bestLag?: number
    }
    forecast?: {
      method: string
      periods: number
      values: Array<{
        timestamp: string
        forecast: number
        lower: number
        upper: number
      }>
      metrics: {
        method: string
        mape?: number
        rmse?: number
      }
    }
    anomalies?: {
      count: number
      indices: number[]
      timestamps: string[]
      values: number[]
      method: string
    }
    changepoints?: {
      count: number
      indices: number[]
      timestamps: string[]
    }
    warnings: string[]
    summary: string
  }
}

export const TimeSeriesAnalysisTool = {
  name: 'TimeSeriesAnalysis',
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  isReadOnly() {
    return true // Analysis only, no modifications
  },
  isConcurrencySafe() {
    return true
  },
  userFacingName() {
    return 'Time Series Analysis'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ data_source }) {
    // Check if data_source is a file path
    if (data_source && !data_source.trim().startsWith('[')) {
      return !hasReadPermission(data_source || getCwd())
    }
    return false
  },
  renderToolUseMessage(input, { verbose }) {
    const { data_source, value_column, analysis_type, forecast_periods, ...rest } = input
    const isFilePath = !data_source.trim().startsWith('[')
    const displaySource = isFilePath
      ? verbose
        ? data_source
        : relative(getCwd(), data_source)
      : 'inline data'

    const entries = [
      ['data_source', displaySource],
      ['value_column', value_column],
      ['analysis_type', analysis_type],
      ['forecast_periods', forecast_periods],
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
              Analyzed {data.dataInfo.dataPoints} data points
            </Text>
          </Box>

          {data.dataInfo.timeRange && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().secondaryText}>
                Time range: {data.dataInfo.timeRange.start} to {data.dataInfo.timeRange.end}
              </Text>
            </Box>
          )}

          {data.stationarityTest && (
            <Box flexDirection="row" marginLeft={5}>
              <Text
                color={
                  data.stationarityTest.isStationary
                    ? getTheme().successText
                    : getTheme().warningText
                }
              >
                {data.stationarityTest.conclusion}
              </Text>
            </Box>
          )}

          {data.forecast && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().infoText}>
                Forecast: {data.forecast.periods} periods using {data.forecast.method}
              </Text>
            </Box>
          )}

          {data.anomalies && data.anomalies.count > 0 && (
            <Box flexDirection="row" marginLeft={5}>
              <Text color={getTheme().warningText}>
                ⚠ Detected {data.anomalies.count} anomalies
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
  async validateInput({ data_source, value_column, forecast_periods, seasonal_periods }) {
    // Check if data_source is a file path or inline data
    const isFilePath = !data_source.trim().startsWith('[')

    if (isFilePath) {
      const fullFilePath = normalizeFilePath(data_source)

      // Check if file exists
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

      // Check file extension
      const ext = fullFilePath.toLowerCase()
      if (!ext.endsWith('.csv') && !ext.endsWith('.json')) {
        return {
          result: false,
          message: 'Only CSV and JSON files are supported.',
        }
      }
    } else {
      // Validate inline JSON
      try {
        JSON.parse(data_source)
      } catch (error) {
        return {
          result: false,
          message: 'Invalid JSON format for inline data.',
        }
      }
    }

    // Validate value_column is provided
    if (!value_column || value_column.trim() === '') {
      return {
        result: false,
        message: 'value_column is required.',
      }
    }

    // Validate forecast_periods
    if (forecast_periods && (forecast_periods < 1 || forecast_periods > 365)) {
      return {
        result: false,
        message: 'forecast_periods must be between 1 and 365.',
      }
    }

    // Validate seasonal_periods
    if (seasonal_periods && seasonal_periods < 2) {
      return {
        result: false,
        message: 'seasonal_periods must be at least 2.',
      }
    }

    return { result: true }
  },
  async *call(
    {
      data_source,
      time_column,
      value_column,
      date_format,
      analysis_type = 'all',
      frequency,
      forecast_periods = 10,
      seasonal_periods,
      confidence_level = 0.95,
      forecast_method = 'arima',
      detect_anomalies = true,
      detrend = false,
    },
    { readFileTimestamps },
  ) {
    const startTime = Date.now()
    const warnings: string[] = []

    try {
      emitReminderEvent('timeseries:analysis', {
        analysis_type,
        timestamp: Date.now(),
      })

      // Load data
      const { data, timestamps } = await loadTimeSeriesData({
        data_source,
        time_column,
        value_column,
        date_format,
        readFileTimestamps,
      })

      if (data.length === 0) {
        throw new Error('No data points found in the dataset.')
      }

      if (data.length > MAX_DATA_POINTS) {
        warnings.push(
          `Dataset has ${data.length} points. Only the first ${MAX_DATA_POINTS} will be analyzed.`,
        )
        data.splice(MAX_DATA_POINTS)
        timestamps.splice(MAX_DATA_POINTS)
      }

      // Initialize result
      const result: AnalysisResult = {
        type: 'time_series_analysis',
        data: {
          dataInfo: {
            sourceFile: data_source.endsWith('.csv') || data_source.endsWith('.json') ? data_source : undefined,
            dataPoints: data.length,
            timeRange: {
              start: timestamps[0],
              end: timestamps[timestamps.length - 1],
            },
            frequency,
            missingValues: data.filter(v => v === null || isNaN(v)).length,
          },
          warnings,
          summary: '',
        },
      }

      // Perform analyses based on type
      const shouldRun = (type: string) => analysis_type === 'all' || analysis_type === type

      // Descriptive statistics
      if (shouldRun('descriptive') || shouldRun('all')) {
        result.data.descriptiveStats = calculateDescriptiveStats(data)
      }

      // Trend analysis
      if (shouldRun('trend') || shouldRun('all')) {
        result.data.trendAnalysis = analyzeTrend(data)
      }

      // Stationarity test
      if (shouldRun('stationarity') || shouldRun('all')) {
        result.data.stationarityTest = performStationarityTest(data)
      }

      // Decomposition
      if (shouldRun('decomposition') || shouldRun('all')) {
        const period = seasonal_periods || detectSeasonalPeriod(data)
        if (data.length >= period * 2) {
          result.data.decomposition = performDecomposition(data, period)
        } else {
          warnings.push(
            `Not enough data points for seasonal decomposition. Need at least ${period * 2} points.`,
          )
        }
      }

      // Autocorrelation
      if (shouldRun('autocorrelation') || shouldRun('all')) {
        result.data.autocorrelation = calculateAutocorrelation(data)
      }

      // Forecast
      if (shouldRun('forecast') || shouldRun('all')) {
        result.data.forecast = generateForecast({
          data,
          timestamps,
          periods: forecast_periods,
          method: forecast_method,
          confidence: confidence_level,
          frequency,
        })
      }

      // Anomaly detection
      if ((shouldRun('anomaly') || shouldRun('all')) && detect_anomalies) {
        result.data.anomalies = detectAnomalies(data, timestamps)
      }

      // Change point detection
      if (shouldRun('changepoint') || shouldRun('all')) {
        result.data.changepoints = detectChangePoints(data, timestamps)
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
        `Time series analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  },
  renderResultForAssistant(result: AnalysisResult) {
    const { data } = result
    const output: string[] = [
      '# Time Series Analysis Results',
      '=' .repeat(50),
      '',
      '## Data Information',
      `- Data Points: ${data.dataInfo.dataPoints}`,
      `- Time Range: ${data.dataInfo.timeRange.start} to ${data.dataInfo.timeRange.end}`,
    ]

    if (data.dataInfo.frequency) {
      output.push(`- Frequency: ${data.dataInfo.frequency}`)
    }
    if (data.dataInfo.missingValues > 0) {
      output.push(`- Missing Values: ${data.dataInfo.missingValues}`)
    }
    output.push('')

    // Descriptive statistics
    if (data.descriptiveStats) {
      output.push('## Descriptive Statistics')
      output.push(JSON.stringify(data.descriptiveStats, null, 2))
      output.push('')
    }

    // Trend analysis
    if (data.trendAnalysis) {
      output.push('## Trend Analysis')
      output.push(JSON.stringify(data.trendAnalysis, null, 2))
      output.push('')
    }

    // Stationarity test
    if (data.stationarityTest) {
      output.push('## Stationarity Test (ADF)')
      output.push(JSON.stringify(data.stationarityTest, null, 2))
      output.push('')
    }

    // Decomposition
    if (data.decomposition) {
      output.push('## Seasonal Decomposition')
      output.push(JSON.stringify(data.decomposition, null, 2))
      output.push('')
    }

    // Autocorrelation
    if (data.autocorrelation) {
      output.push('## Autocorrelation Analysis')
      output.push(`Significant lags: ${data.autocorrelation.significantLags.join(', ')}`)
      if (data.autocorrelation.bestLag) {
        output.push(`Best lag: ${data.autocorrelation.bestLag}`)
      }
      output.push('')
    }

    // Forecast
    if (data.forecast) {
      output.push('## Forecast Results')
      output.push(`Method: ${data.forecast.method}`)
      output.push(`Periods: ${data.forecast.periods}`)
      output.push('Forecast values:')
      data.forecast.values.slice(0, 5).forEach(f => {
        output.push(
          `  ${f.timestamp}: ${f.forecast.toFixed(2)} [${f.lower.toFixed(2)}, ${f.upper.toFixed(2)}]`,
        )
      })
      if (data.forecast.values.length > 5) {
        output.push(`  ... and ${data.forecast.values.length - 5} more`)
      }
      output.push('')
    }

    // Anomalies
    if (data.anomalies && data.anomalies.count > 0) {
      output.push('## Detected Anomalies')
      output.push(`Count: ${data.anomalies.count}`)
      output.push(`Method: ${data.anomalies.method}`)
      output.push('Sample anomalies:')
      for (let i = 0; i < Math.min(5, data.anomalies.count); i++) {
        output.push(
          `  ${data.anomalies.timestamps[i]}: ${data.anomalies.values[i].toFixed(2)}`,
        )
      }
      if (data.anomalies.count > 5) {
        output.push(`  ... and ${data.anomalies.count - 5} more`)
      }
      output.push('')
    }

    // Change points
    if (data.changepoints && data.changepoints.count > 0) {
      output.push('## Detected Change Points')
      output.push(`Count: ${data.changepoints.count}`)
      data.changepoints.timestamps.forEach((ts, idx) => {
        output.push(`  ${idx + 1}. ${ts}`)
      })
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
 * Load time series data from file or inline JSON
 */
async function loadTimeSeriesData({
  data_source,
  time_column,
  value_column,
  date_format,
  readFileTimestamps,
}: {
  data_source: string
  time_column?: string
  value_column: string
  date_format?: string
  readFileTimestamps: Record<string, number>
}): Promise<{ data: number[]; timestamps: string[] }> {
  let rawData: any[]

  // Check if inline JSON or file path
  if (data_source.trim().startsWith('[')) {
    rawData = JSON.parse(data_source)
  } else {
    const fullFilePath = normalizeFilePath(data_source)

    // Update read timestamp
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

  // Extract values and timestamps
  const data: number[] = []
  const timestamps: string[] = []

  rawData.forEach((row, index) => {
    const value = row[value_column]
    if (value !== null && value !== undefined && value !== '') {
      const numValue = typeof value === 'number' ? value : parseFloat(value)
      if (!isNaN(numValue)) {
        data.push(numValue)

        // Extract timestamp
        let timestamp: string
        if (time_column && row[time_column]) {
          timestamp = String(row[time_column])
        } else if (row.timestamp) {
          timestamp = String(row.timestamp)
        } else if (row.date) {
          timestamp = String(row.date)
        } else if (row.time) {
          timestamp = String(row.time)
        } else {
          timestamp = String(index)
        }
        timestamps.push(timestamp)
      }
    }
  })

  return { data, timestamps }
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
 * Calculate descriptive statistics
 */
function calculateDescriptiveStats(data: number[]): AnalysisResult['data']['descriptiveStats'] {
  const sorted = [...data].sort((a, b) => a - b)
  const n = data.length
  const mean = data.reduce((a, b) => a + b, 0) / n
  const variance = data.reduce((sq, v) => sq + Math.pow(v - mean, 2), 0) / n
  const std = Math.sqrt(variance)

  const median = sorted[Math.floor(n / 2)]
  const q25 = sorted[Math.floor(n * 0.25)]
  const q75 = sorted[Math.floor(n * 0.75)]

  // Skewness
  const skewness =
    data.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0) / n

  // Kurtosis
  const kurtosis =
    data.reduce((sum, v) => sum + Math.pow((v - mean) / std, 4), 0) / n - 3

  return {
    mean: Number(mean.toFixed(4)),
    std: Number(std.toFixed(4)),
    min: Number(sorted[0].toFixed(4)),
    max: Number(sorted[n - 1].toFixed(4)),
    median: Number(median.toFixed(4)),
    q25: Number(q25.toFixed(4)),
    q75: Number(q75.toFixed(4)),
    skewness: Number(skewness.toFixed(4)),
    kurtosis: Number(kurtosis.toFixed(4)),
  }
}

/**
 * Analyze trend in data
 */
function analyzeTrend(data: number[]): AnalysisResult['data']['trendAnalysis'] {
  const n = data.length
  const x = Array.from({ length: n }, (_, i) => i)

  // Calculate linear regression
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = data.reduce((a, b) => a + b, 0) / n

  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (data[i] - meanY), 0)
  const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0)

  const slope = numerator / denominator
  const intercept = meanY - slope * meanX

  // Calculate R-squared
  const yPred = x.map(xi => slope * xi + intercept)
  const ssRes = data.reduce((sum, yi, i) => sum + Math.pow(yi - yPred[i], 2), 0)
  const ssTot = data.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
  const rSquared = 1 - ssRes / ssTot

  const trendStrength = Math.abs(rSquared)
  const hasTrend = trendStrength > 0.3 // Threshold for significant trend

  let trendType = 'no trend'
  if (hasTrend) {
    trendType = slope > 0 ? 'upward' : 'downward'
  }

  return {
    hasTrend,
    trendType,
    trendStrength: Number(trendStrength.toFixed(4)),
    trendEquation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
  }
}

/**
 * Perform stationarity test (Augmented Dickey-Fuller)
 * Simplified implementation - for production use statsmodels
 */
function performStationarityTest(
  data: number[],
): AnalysisResult['data']['stationarityTest'] {
  // Calculate first differences
  const diffs = data.slice(1).map((v, i) => v - data[i])

  // Calculate mean and std of differences
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length
  const std = Math.sqrt(
    diffs.reduce((sq, v) => sq + Math.pow(v - mean, 2), 0) / diffs.length,
  )

  // Simplified ADF-like statistic
  const adfStatistic = mean / (std / Math.sqrt(diffs.length))

  // Approximation of p-value (simplified)
  const pValue = Math.abs(adfStatistic) > 3 ? 0.01 : Math.abs(adfStatistic) > 2 ? 0.05 : 0.1

  const isStationary = pValue < 0.05

  return {
    isStationary,
    adfStatistic: Number(adfStatistic.toFixed(4)),
    pValue: Number(pValue.toFixed(4)),
    criticalValues: {
      '1%': -3.43,
      '5%': -2.86,
      '10%': -2.57,
    },
    conclusion: isStationary
      ? 'Data appears stationary (reject null hypothesis)'
      : 'Data appears non-stationary (fail to reject null hypothesis)',
  }
}

/**
 * Perform seasonal decomposition
 */
function performDecomposition(
  data: number[],
  period: number,
): AnalysisResult['data']['decomposition'] {
  // Simple moving average for trend
  const trend = movingAverage(data, period)

  // Detrended data
  const detrended = data.map((v, i) => v - (trend[i] || v))

  // Calculate seasonal component (average for each period position)
  const seasonal = Array(period).fill(0)
  const counts = Array(period).fill(0)

  detrended.forEach((v, i) => {
    const pos = i % period
    seasonal[pos] += v
    counts[pos]++
  })

  seasonal.forEach((v, i) => {
    seasonal[i] = counts[i] > 0 ? v / counts[i] : 0
  })

  // Calculate strengths
  const seasonalVariance = calculateVariance(seasonal)
  const residualVariance = calculateVariance(detrended)

  const seasonal_strength = seasonalVariance / (seasonalVariance + residualVariance)
  const trend_strength = 1 - residualVariance / calculateVariance(data)

  return {
    method: 'additive',
    seasonal_strength: Number(seasonal_strength.toFixed(4)),
    trend_strength: Number(trend_strength.toFixed(4)),
    has_seasonality: seasonal_strength > 0.3,
    seasonal_period: period,
  }
}

/**
 * Calculate autocorrelation
 */
function calculateAutocorrelation(
  data: number[],
): AnalysisResult['data']['autocorrelation'] {
  const n = data.length
  const mean = data.reduce((a, b) => a + b, 0) / n
  const c0 = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n

  const maxLag = Math.min(40, Math.floor(n / 4))
  const acf: number[] = []
  const pacf: number[] = []

  // Calculate ACF
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < n - lag; i++) {
      sum += (data[i] - mean) * (data[i + lag] - mean)
    }
    acf.push(sum / (n * c0))
  }

  // Simplified PACF (using Durbin-Levinson recursion would be more accurate)
  pacf.push(acf[1])
  for (let lag = 2; lag <= maxLag; lag++) {
    pacf.push(acf[lag]) // Simplified
  }

  // Find significant lags (beyond confidence interval)
  const confidenceBound = 1.96 / Math.sqrt(n)
  const significantLags = acf
    .map((v, i) => (Math.abs(v) > confidenceBound && i > 0 ? i : -1))
    .filter(i => i > 0)

  const bestLag = significantLags.length > 0 ? significantLags[0] : undefined

  return {
    acf: acf.map(v => Number(v.toFixed(4))),
    pacf: pacf.map(v => Number(v.toFixed(4))),
    significantLags,
    bestLag,
  }
}

/**
 * Generate forecast
 */
function generateForecast({
  data,
  timestamps,
  periods,
  method,
  confidence,
  frequency,
}: {
  data: number[]
  timestamps: string[]
  periods: number
  method: string
  confidence: number
  frequency?: string
}): AnalysisResult['data']['forecast'] {
  const n = data.length
  let forecastValues: number[]

  // Simple forecasting methods
  switch (method) {
    case 'linear': {
      // Linear extrapolation
      const { slope, intercept } = linearRegression(data)
      forecastValues = Array.from(
        { length: periods },
        (_, i) => slope * (n + i) + intercept,
      )
      break
    }

    case 'exponential': {
      // Simple exponential smoothing
      const alpha = 0.3
      let lastSmoothed = data[0]
      data.forEach(v => {
        lastSmoothed = alpha * v + (1 - alpha) * lastSmoothed
      })
      forecastValues = Array(periods).fill(lastSmoothed)
      break
    }

    case 'seasonal': {
      // Seasonal naive (repeat last season)
      const period = detectSeasonalPeriod(data)
      forecastValues = Array.from({ length: periods }, (_, i) => {
        const idx = n - period + (i % period)
        return data[Math.max(0, Math.min(idx, n - 1))]
      })
      break
    }

    case 'arima':
    default: {
      // Simplified ARIMA (just use mean of last values with trend)
      const lastN = Math.min(10, n)
      const recent = data.slice(-lastN)
      const mean = recent.reduce((a, b) => a + b, 0) / lastN
      const { slope } = linearRegression(recent)

      forecastValues = Array.from({ length: periods }, (_, i) => mean + slope * i)
      break
    }
  }

  // Calculate confidence intervals
  const std = Math.sqrt(calculateVariance(data))
  const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645

  const forecastWithIntervals = forecastValues.map((forecast, i) => {
    const margin = zScore * std * Math.sqrt(i + 1) // Widening interval
    return {
      timestamp: generateFutureTimestamp(timestamps[n - 1], i + 1, frequency),
      forecast: Number(forecast.toFixed(4)),
      lower: Number((forecast - margin).toFixed(4)),
      upper: Number((forecast + margin).toFixed(4)),
    }
  })

  return {
    method,
    periods,
    values: forecastWithIntervals,
    metrics: {
      method,
    },
  }
}

/**
 * Detect anomalies using statistical methods
 */
function detectAnomalies(
  data: number[],
  timestamps: string[],
): AnalysisResult['data']['anomalies'] {
  const mean = data.reduce((a, b) => a + b, 0) / data.length
  const std = Math.sqrt(calculateVariance(data))

  // Z-score method (3-sigma rule)
  const threshold = 3
  const anomalyIndices: number[] = []
  const anomalyTimestamps: string[] = []
  const anomalyValues: number[] = []

  data.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / std)
    if (zScore > threshold) {
      anomalyIndices.push(index)
      anomalyTimestamps.push(timestamps[index])
      anomalyValues.push(value)
    }
  })

  return {
    count: anomalyIndices.length,
    indices: anomalyIndices,
    timestamps: anomalyTimestamps,
    values: anomalyValues,
    method: 'Z-score (3-sigma)',
  }
}

/**
 * Detect change points
 */
function detectChangePoints(
  data: number[],
  timestamps: string[],
): AnalysisResult['data']['changepoints'] {
  // Simple change point detection using cumulative sum
  const n = data.length
  const mean = data.reduce((a, b) => a + b, 0) / n
  const cumsum = [0]

  data.forEach(v => {
    cumsum.push(cumsum[cumsum.length - 1] + (v - mean))
  })

  // Find local extrema in cumsum
  const changepoints: number[] = []
  const windowSize = Math.floor(n / 10)

  for (let i = windowSize; i < n - windowSize; i++) {
    const localMax =
      cumsum[i] > cumsum[i - windowSize] && cumsum[i] > cumsum[i + windowSize]
    const localMin =
      cumsum[i] < cumsum[i - windowSize] && cumsum[i] < cumsum[i + windowSize]

    if (localMax || localMin) {
      changepoints.push(i)
    }
  }

  return {
    count: changepoints.length,
    indices: changepoints,
    timestamps: changepoints.map(i => timestamps[i]),
  }
}

/**
 * Generate analysis summary
 */
function generateAnalysisSummary(data: AnalysisResult['data']): string {
  const lines: string[] = []

  lines.push(`Time Series Analysis Summary`)
  lines.push(`${'='.repeat(40)}`)
  lines.push(``)

  if (data.descriptiveStats) {
    lines.push(`Mean: ${data.descriptiveStats.mean}`)
    lines.push(`Std Dev: ${data.descriptiveStats.std}`)
    lines.push(`Range: [${data.descriptiveStats.min}, ${data.descriptiveStats.max}]`)
    lines.push(``)
  }

  if (data.trendAnalysis) {
    lines.push(`Trend: ${data.trendAnalysis.trendType}`)
    lines.push(`Trend Strength: ${data.trendAnalysis.trendStrength}`)
    lines.push(``)
  }

  if (data.stationarityTest) {
    lines.push(`Stationarity: ${data.stationarityTest.isStationary ? 'Yes' : 'No'}`)
    lines.push(`ADF p-value: ${data.stationarityTest.pValue}`)
    lines.push(``)
  }

  if (data.decomposition) {
    lines.push(`Seasonality: ${data.decomposition.has_seasonality ? 'Detected' : 'Not detected'}`)
    if (data.decomposition.seasonal_period) {
      lines.push(`Seasonal Period: ${data.decomposition.seasonal_period}`)
    }
    lines.push(``)
  }

  if (data.anomalies) {
    lines.push(`Anomalies Detected: ${data.anomalies.count}`)
    lines.push(``)
  }

  if (data.forecast) {
    lines.push(`Forecast Method: ${data.forecast.method}`)
    lines.push(`Forecast Periods: ${data.forecast.periods}`)
    lines.push(``)
  }

  return lines.join('\n')
}

// Utility functions

function movingAverage(data: number[], window: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2))
    const end = Math.min(data.length, i + Math.floor(window / 2) + 1)
    const slice = data.slice(start, end)
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length)
  }
  return result
}

function calculateVariance(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length
  return data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length
}

function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length
  const x = Array.from({ length: n }, (_, i) => i)
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = data.reduce((a, b) => a + b, 0) / n

  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (data[i] - meanY), 0)
  const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0)

  const slope = numerator / denominator
  const intercept = meanY - slope * meanX

  return { slope, intercept }
}

function detectSeasonalPeriod(data: number[]): number {
  // Simple heuristic based on data length
  const n = data.length
  if (n >= 365) return 365 // Daily data, yearly seasonality
  if (n >= 52) return 52 // Weekly data, yearly seasonality
  if (n >= 12) return 12 // Monthly data, yearly seasonality
  if (n >= 7) return 7 // Daily data, weekly seasonality
  return 4 // Quarterly
}

function generateFutureTimestamp(
  lastTimestamp: string,
  offset: number,
  frequency?: string,
): string {
  // Try to parse as date
  const date = new Date(lastTimestamp)
  if (!isNaN(date.getTime())) {
    const newDate = new Date(date)
    switch (frequency) {
      case 'D':
        newDate.setDate(date.getDate() + offset)
        break
      case 'W':
        newDate.setDate(date.getDate() + offset * 7)
        break
      case 'M':
        newDate.setMonth(date.getMonth() + offset)
        break
      case 'Q':
        newDate.setMonth(date.getMonth() + offset * 3)
        break
      case 'Y':
        newDate.setFullYear(date.getFullYear() + offset)
        break
      case 'H':
        newDate.setHours(date.getHours() + offset)
        break
      default:
        newDate.setDate(date.getDate() + offset)
    }
    return newDate.toISOString().split('T')[0]
  }

  // If not a date, just increment
  const num = parseFloat(lastTimestamp)
  if (!isNaN(num)) {
    return String(num + offset)
  }

  return `T+${offset}`
}
