/**
 * Extended Operations for Ocean Data Preprocessing Tool
 * These operations complement the base tool with Python-powered features
 */

export const EXTENDED_OPERATIONS = [
  'merge_files',            // Merge multiple NetCDF files along time dimension
  'download_data',          // Download ocean data from online sources
  'visualize_masks',        // Generate mask visualization images
  'check_quality_detailed', // Detailed quality check with NaN statistics
  'export_metadata',        // Export file metadata as JSON
  'split_dataset',          // Split dataset into train/valid/test
  'generate_report',        // Generate comprehensive processing report
] as const

/**
 * Operation descriptions for documentation
 */
export const OPERATION_DESCRIPTIONS = {
  // Basic operations
  clean: 'Remove rows with excessive missing values (>50%) and duplicates',
  filter: 'Filter data by date range, depth, or geographic bounds',
  normalize: 'Scale numeric columns to [0, 1] range',
  standardize: 'Apply z-score standardization (mean=0, std=1)',
  quality_check: 'Check ocean parameters against valid ranges',
  statistics: 'Calculate mean, std, min, max, median for numeric columns',
  interpolate: 'Simple linear interpolation for missing values',

  // Mask operations (for ML training)
  generate_masks: 'Extract land mask and cloud masks from satellite observations (JAXA-style)',
  apply_masks: 'Apply pre-generated masks to complete data to create artificial missing patterns',
  build_training_pairs: 'Construct ML training pairs (input_sst, ground_truth_sst, masks) in HDF5 format',

  // Spatial operations
  spatial_subset: 'Extract data for specific geographic region (lat/lon bounds)',
  grid_align: 'Interpolate data to target grid resolution',

  // Missing data handling
  fill_missing: 'Advanced missing data filling (linear, nearest, forward_fill, backward_fill, mean)',

  // Extended operations
  merge_files: 'Merge multiple NetCDF files along time dimension',
  download_data: 'Download OSTIA or other ocean data from online sources',
  visualize_masks: 'Generate PNG visualizations of masks and data samples',
  check_quality_detailed: 'Comprehensive quality check with NaN statistics and completeness analysis',
  export_metadata: 'Export NetCDF/HDF5 file metadata to JSON',
  split_dataset: 'Split HDF5 dataset into train/validation/test sets',
  generate_report: 'Generate comprehensive HTML/PDF processing report',
}

/**
 * Required parameters for each operation
 */
export const OPERATION_REQUIREMENTS = {
  generate_masks: {
    required: ['file_path', 'mask_params.variable_name'],
    optional: ['mask_params.missing_ratio_range', 'mask_params.mask_count'],
    fileFormats: ['.nc'],
    description: 'Requires NetCDF file with satellite observations (e.g., JAXA)',
  },
  apply_masks: {
    required: ['file_path', 'mask_file_path', 'mask_params.variable_name'],
    optional: ['spatial_params', 'output_path'],
    fileFormats: ['.nc'],
    description: 'Requires NetCDF file (e.g., OSTIA) and .npy mask file',
  },
  build_training_pairs: {
    required: ['file_path', 'mask_file_path', 'output_path'],
    optional: ['spatial_params', 'mask_params.variable_name'],
    fileFormats: ['.nc'],
    outputFormat: '.h5',
    description: 'Creates HDF5 training pairs from NetCDF data and masks',
  },
  merge_files: {
    required: ['merge_params.file_paths', 'output_path'],
    optional: ['merge_params.time_dim'],
    fileFormats: ['.nc'],
    outputFormat: '.nc',
    description: 'Merges multiple monthly NetCDF files into single file',
  },
  spatial_subset: {
    required: ['file_path', 'spatial_params.latitude_range', 'spatial_params.longitude_range'],
    optional: ['output_path'],
    fileFormats: ['.nc', '.csv'],
    description: 'Extracts spatial subset (e.g., Pearl River Delta region)',
  },
  grid_align: {
    required: ['file_path', 'spatial_params.target_grid'],
    optional: ['output_path'],
    fileFormats: ['.nc'],
    description: 'Aligns grid to target resolution (e.g., [451, 351])',
  },
}

/**
 * Example configurations for common workflows
 */
export const WORKFLOW_EXAMPLES = {
  extract_jaxa_masks: {
    description: 'Extract cloud masks from JAXA satellite observations',
    operations: ['generate_masks'],
    params: {
      file_path: '/path/to/jaxa_data.nc',
      operations: ['generate_masks'],
      mask_params: {
        variable_name: 'sst',
        missing_ratio_range: [0.1, 0.6],
        mask_count: 360,
      },
      output_path: '/path/to/jaxa_masks.npy',
    },
  },

  create_training_pairs: {
    description: 'Create ML training pairs from OSTIA data + JAXA masks',
    operations: ['spatial_subset', 'build_training_pairs'],
    params: {
      file_path: '/path/to/ostia_monthly.nc',
      operations: ['spatial_subset', 'build_training_pairs'],
      spatial_params: {
        latitude_range: [15.0, 24.0],
        longitude_range: [111.0, 118.0],
        target_grid: [451, 351],
      },
      mask_file_path: '/path/to/jaxa_masks.npy',
      mask_params: {
        variable_name: 'analysed_sst',
      },
      output_path: '/path/to/training_pairs.h5',
    },
  },

  merge_monthly_data: {
    description: 'Merge multiple monthly OSTIA files',
    operations: ['merge_files'],
    params: {
      merge_params: {
        file_paths: [
          '/path/to/ostia_2015_01.nc',
          '/path/to/ostia_2015_02.nc',
          // ... more files
        ],
        time_dim: 'time',
      },
      output_path: '/path/to/ostia_merged.nc',
    },
  },

  quality_control: {
    description: 'Clean and quality check ocean profile data',
    operations: ['clean', 'quality_check', 'statistics'],
    params: {
      file_path: '/path/to/ocean_profiles.csv',
      operations: ['clean', 'quality_check', 'statistics'],
      quality_params: {
        temp_range: [-2, 40],
        salinity_range: [0, 42],
        pressure_range: [0, 12000],
      },
      output_path: '/path/to/cleaned_profiles.csv',
    },
  },

  fill_missing_data: {
    description: 'Fill missing values in observation data',
    operations: ['fill_missing', 'statistics'],
    params: {
      file_path: '/path/to/data_with_gaps.csv',
      operations: ['fill_missing', 'statistics'],
      fill_params: {
        method: 'linear',
        max_gap: 5,
      },
      output_path: '/path/to/filled_data.csv',
    },
  },
}

/**
 * Data format specifications
 */
export const FORMAT_SPECIFICATIONS = {
  JAXA_NetCDF: {
    description: 'JAXA satellite SST observations with cloud cover',
    expectedVariables: ['sst', 'latitude', 'longitude', 'time'],
    expectedShape: '(time, lat, lon)',
    missingValueEncoding: 'NaN for cloud-covered pixels',
    typicalUse: 'Source for realistic cloud masks',
  },

  OSTIA_NetCDF: {
    description: 'OSTIA reanalysis SST (gap-filled, complete coverage)',
    expectedVariables: ['analysed_sst', 'lat', 'lon', 'time'],
    expectedShape: '(time, lat, lon)',
    units: 'Kelvin',
    typicalUse: 'Ground truth for ML training',
  },

  TrainingPairs_HDF5: {
    description: 'ML training pairs for SST reconstruction',
    expectedDatasets: [
      'input_sst',           // SST with artificial missing data
      'ground_truth_sst',    // Complete SST field
      'effective_cloud_mask', // Binary mask (1=missing, 0=valid)
      'land_mask',            // Static land/sea mask
      'latitude',             // Geographic coordinates
      'longitude',
      'time',                 // Temporal coordinates
    ],
    shape: {
      input_sst: '(N, H, W)',
      ground_truth_sst: '(N, H, W)',
      effective_cloud_mask: '(N, H, W)',
      land_mask: '(H, W)',
    },
    typicalSplit: {
      train: '70%',
      valid: '15%',
      test: '15%',
    },
  },

  Masks_NPY: {
    description: 'Numpy array of cloud masks',
    shape: '(N, H, W) where N=number of masks',
    dtype: 'bool (True=missing/cloud, False=valid)',
    typicalCount: '360 masks',
    typicalMissingRatio: '10-60%',
  },
}

/**
 * Typical parameter values for Pearl River Delta (珠三角) region
 */
export const PEARL_RIVER_DELTA_PARAMS = {
  latitude_range: [15.0, 24.0] as [number, number],
  longitude_range: [111.0, 118.0] as [number, number],
  target_grid: [451, 351] as [number, number],
  description: 'Pearl River Delta near-shore region',
}

/**
 * Validation functions for operation parameters
 */
export function validateOperationParams(
  operation: string,
  params: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const requirements = OPERATION_REQUIREMENTS[operation]

  if (!requirements) {
    return { valid: true, errors: [] }
  }

  // Check required parameters
  if (requirements.required) {
    for (const reqPath of requirements.required) {
      const keys = reqPath.split('.')
      let current = params
      let found = true

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key]
        } else {
          found = false
          break
        }
      }

      if (!found || current === undefined || current === null) {
        errors.push(`Missing required parameter: ${reqPath}`)
      }
    }
  }

  // Check file format if specified
  if (requirements.fileFormats && params.file_path) {
    const ext = params.file_path.substring(params.file_path.lastIndexOf('.')).toLowerCase()
    if (!requirements.fileFormats.includes(ext)) {
      errors.push(
        `Invalid file format: ${ext}. Expected: ${requirements.fileFormats.join(', ')}`
      )
    }
  }

  return { valid: errors.length === 0, errors }
}
