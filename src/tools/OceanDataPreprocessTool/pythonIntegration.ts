/**
 * Python Integration Module
 * Handles calling Python subprocess for NetCDF/HDF5 processing
 */

import { spawn } from 'node:child_process'
import * as path from 'node:path'
import { normalizeFilePath } from '@utils/file'

export interface PythonProcessorParams {
  file?: string
  output?: string
  variable?: string
  maskFile?: string
  files?: string[]
  params?: Record<string, any>
}

export interface PythonDependencies {
  available: boolean
  missing: string[]
  details?: Record<string, boolean>
}

export interface MaskGenerationResult {
  land_mask?: number[][]
  cloud_masks_count: number
  valid_frames: number[]
  statistics: {
    total_frames: number
    valid_frames_count: number
    land_pixel_count: number
    ocean_pixel_count: number
    grid_shape: [number, number]
    missing_ratios: number[]
  }
  error?: string
}

export interface ApplyMasksResult {
  success?: boolean
  output_path?: string
  n_frames?: number
  grid_shape?: number[]
  input_nan_ratio?: number
  error?: string
  traceback?: string
}

export interface MergeFilesResult {
  success?: boolean
  output_path?: string
  n_files_merged?: number
  time_range?: [string, string]
  error?: string
}

export interface StatisticsResult {
  mean?: number
  std?: number
  min?: number
  max?: number
  median?: number
  nan_count?: number
  nan_ratio?: number
  total_count?: number
  shape?: number[]
  error?: string
}

export interface MetadataResult {
  variables?: string[]
  coordinates?: string[]
  dimensions?: Record<string, number>
  attributes?: Record<string, any>
  shape?: Record<string, number[]>
  dtypes?: Record<string, string>
  datasets?: Array<{ name: string; shape: number[]; dtype: string }>
  groups?: string[]
  error?: string
}

/**
 * Execute Python processor script with given command and parameters
 */
export async function executePythonProcessor(
  command: string,
  params: PythonProcessorParams
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Get the directory of this file
    const toolDir = path.dirname(require.resolve('./oceandata_processor.py'))
    const pythonScript = path.join(toolDir, 'oceandata_processor.py')

    // Build arguments
    const args = [pythonScript, command]

    if (params.file) {
      args.push('--file', normalizeFilePath(params.file))
    }
    if (params.output) {
      args.push('--output', normalizeFilePath(params.output))
    }
    if (params.variable) {
      args.push('--variable', params.variable)
    }
    if (params.maskFile) {
      args.push('--mask-file', normalizeFilePath(params.maskFile))
    }
    if (params.files) {
      args.push('--files', ...params.files.map(f => normalizeFilePath(f)))
    }
    if (params.params) {
      args.push('--params', JSON.stringify(params.params))
    }

    // Spawn Python process
    const python = spawn('python3', args, {
      cwd: toolDir,
    })

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}\nStderr: ${stderr}`))
        return
      }

      try {
        const result = JSON.parse(stdout)
        resolve(result)
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${stdout}\nError: ${e}`))
      }
    })

    python.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`))
    })
  })
}

/**
 * Check if Python dependencies are installed
 */
export async function checkPythonDependencies(): Promise<PythonDependencies> {
  try {
    const result = await executePythonProcessor('check_deps', {})

    if (result.error) {
      return { available: false, missing: ['Python processor failed'], details: result }
    }

    const missing: string[] = []
    if (!result.netcdf4) missing.push('netCDF4/xarray')
    if (!result.h5py) missing.push('h5py')

    return {
      available: missing.length === 0,
      missing,
      details: result
    }
  } catch (e) {
    return {
      available: false,
      missing: ['Python3 not found or script error'],
    }
  }
}

/**
 * Load metadata from NetCDF or HDF5 file
 */
export async function loadFileMetadata(filePath: string): Promise<MetadataResult> {
  try {
    const result = await executePythonProcessor('load_metadata', {
      file: filePath,
    })
    return result
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Generate masks from NetCDF file (JAXA-style processing)
 */
export async function generateMasksFromNetCDF(
  filePath: string,
  variableName: string,
  options: {
    missingRatioRange?: [number, number]
    maskCount?: number
    landThreshold?: number
  } = {}
): Promise<MaskGenerationResult> {
  try {
    const result = await executePythonProcessor('generate_masks', {
      file: filePath,
      variable: variableName,
      params: {
        missing_ratio_range: options.missingRatioRange || [0.1, 0.6],
        mask_count: options.maskCount || 360,
        land_threshold: options.landThreshold,
      },
    })
    return result
  } catch (e) {
    return {
      cloud_masks_count: 0,
      valid_frames: [],
      statistics: {
        total_frames: 0,
        valid_frames_count: 0,
        land_pixel_count: 0,
        ocean_pixel_count: 0,
        grid_shape: [0, 0],
        missing_ratios: [],
      },
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Apply masks to NetCDF data and create training pairs
 */
export async function applyMasksToNetCDF(
  filePath: string,
  variableName: string,
  maskFilePath: string,
  outputPath: string,
  options: {
    latitudeRange?: [number, number]
    longitudeRange?: [number, number]
    targetGrid?: [number, number]
  } = {}
): Promise<ApplyMasksResult> {
  try {
    const result = await executePythonProcessor('apply_masks', {
      file: filePath,
      variable: variableName,
      maskFile: maskFilePath,
      output: outputPath,
      params: {
        latitude_range: options.latitudeRange,
        longitude_range: options.longitudeRange,
        target_grid: options.targetGrid,
      },
    })
    return result
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Merge multiple NetCDF files along time dimension
 */
export async function mergeNetCDFFiles(
  filePaths: string[],
  outputPath: string,
  options: {
    timeDim?: string
  } = {}
): Promise<MergeFilesResult> {
  try {
    const result = await executePythonProcessor('merge_files', {
      files: filePaths,
      output: outputPath,
      params: {
        time_dim: options.timeDim || 'time',
      },
    })
    return result
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Calculate statistics for NetCDF variable
 */
export async function calculateStatisticsNetCDF(
  filePath: string,
  variableName: string
): Promise<StatisticsResult> {
  try {
    const result = await executePythonProcessor('calculate_stats', {
      file: filePath,
      variable: variableName,
    })
    return result
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
