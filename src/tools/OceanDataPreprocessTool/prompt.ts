const MAX_DATA_ROWS = 100000
const MAX_COLUMN_COUNT = 100

export const DESCRIPTION = 'Advanced ocean data preprocessing tool with support for missing data filling, mask generation, and training pair construction for machine learning.'

export const PROMPT = `Preprocesses ocean data from the local filesystem with comprehensive support for various formats and operations. This tool is designed to handle missing data scenarios commonly encountered in satellite observations and numerical models.

**Supported File Formats:**
- CSV (.csv, .txt): Tabular data
- JSON (.json): Structured data
- NetCDF (.nc): Gridded scientific data (requires Python integration)
- HDF5 (.h5, .hdf5): Hierarchical data format (requires Python integration)

**Core Operations:**

1. **Basic Preprocessing:**
   - \`clean\`: Remove rows with excessive missing values (>50%) and duplicates
   - \`filter\`: Filter by date range, depth, lat/lon bounds
   - \`normalize\`: Scale numeric columns to [0, 1]
   - \`standardize\`: Z-score standardization (mean=0, std=1)
   - \`statistics\`: Calculate mean, std, min, max, median for all numeric columns
   - \`quality_check\`: Check ocean parameters (temperature, salinity, pressure) against valid ranges

2. **Missing Data Handling:**
   - \`interpolate\`: Simple linear interpolation for missing values
   - \`fill_missing\`: Advanced filling with multiple strategies:
     * linear: Linear interpolation between valid values
     * nearest: Nearest neighbor filling
     * forward_fill: Propagate last valid value forward
     * backward_fill: Propagate next valid value backward
     * mean: Fill with column mean
     * Supports max_gap parameter to limit filling range

3. **Mask Operations (for ML Training):**
   - \`generate_masks\`: Generate land and cloud masks from satellite data
     * Land mask: Pixels that are always NaN (permanent land)
     * Cloud masks: Frames with missing ratios in specified range (e.g., 10%-60%)
     * Useful for extracting realistic missing patterns from JAXA or similar satellite data

   - \`apply_masks\`: Apply pre-generated masks to create artificial missing data
     * Takes complete data (e.g., OSTIA SST) and applies cloud masks
     * Creates input data with realistic missing patterns

   - \`build_training_pairs\`: Construct ML training pairs
     * input_sst: Data with missing values (cloud-masked)
     * ground_truth_sst: Complete data
     * effective_cloud_mask: Binary mask (1=missing, 0=valid)
     * land_mask: Static land/sea mask
     * Outputs HDF5 format suitable for training

4. **Spatial Operations:**
   - \`spatial_subset\`: Extract spatial subset by lat/lon range
     * Useful for focusing on specific geographic regions

   - \`grid_align\`: Align data to target grid resolution
     * Interpolates to specified grid size (e.g., [451, 351])
     * Maintains spatial consistency between datasets

**Typical Use Cases:**

**Case 1: Extract Cloud Masks from JAXA Satellite Data**
\`\`\`
operations: ['generate_masks']
mask_params: {
  missing_ratio_range: [0.1, 0.6],  // 10%-60% missing
  mask_count: 360,                   // Generate 360 masks
  variable_name: 'sst'               // NetCDF variable name
}
output_path: '/path/to/masks.npy'
\`\`\`

**Case 2: Create Training Pairs from OSTIA + JAXA Masks**
\`\`\`
operations: ['spatial_subset', 'build_training_pairs']
spatial_params: {
  latitude_range: [15.0, 24.0],     // Pearl River Delta region
  longitude_range: [111.0, 118.0],
  target_grid: [451, 351]            // Match JAXA grid
}
mask_file_path: '/path/to/jaxa_masks.npy'
output_path: '/path/to/training_pairs.h5'
\`\`\`

**Case 3: Fill Missing Data in Observations**
\`\`\`
operations: ['fill_missing', 'statistics']
fill_params: {
  method: 'linear',       // or 'nearest', 'forward_fill', etc.
  max_gap: 5              // Don't fill gaps larger than 5 pixels
}
output_path: '/path/to/filled_data.csv'
\`\`\`

**Case 4: Quality Control and Cleaning**
\`\`\`
operations: ['clean', 'quality_check', 'statistics']
quality_params: {
  temp_range: [-2, 40],      // Valid SST range (Celsius)
  salinity_range: [0, 42],    // Valid salinity range (PSU)
}
\`\`\`

**Important Notes:**

- **NetCDF/HDF5**: Binary formats require Python integration. The tool provides instructions and code examples for processing with Python libraries (xarray, h5py, netCDF4).

- **Mask Operations**: For realistic ML training scenarios (e.g., satellite SST reconstruction):
  1. Use \`generate_masks\` on real satellite observations (JAXA) to extract cloud patterns
  2. Use \`apply_masks\` or \`build_training_pairs\` to apply these patterns to complete data (OSTIA)
  3. Result: Training pairs with realistic missing patterns

- **Data Limits**: Processes up to ${MAX_DATA_ROWS} rows and ${MAX_COLUMN_COUNT} columns. For larger datasets, consider splitting or using Python scripts directly.

- **Units**: Maintains original data units (e.g., Kelvin for SST). Convert during visualization if needed.

- **Missing Values**: Represents missing data as NaN (for numeric) or empty string (for text).

**Common Ocean Data Variables:**
temperature, salinity, depth, pressure, dissolved_oxygen, pH, latitude, longitude, time/timestamp, sst (sea surface temperature), u/v (currents), chlorophyll, etc.

**Output Formats:**
- CSV: For tabular data, easy to inspect
- JSON: For structured data with metadata
- NetCDF: For gridded scientific data (Python required)
- HDF5: For ML training datasets (Python required)

The tool automatically handles different data structures and provides detailed warnings about any issues encountered during processing.`
