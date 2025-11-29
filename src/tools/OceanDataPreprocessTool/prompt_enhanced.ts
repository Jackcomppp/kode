const MAX_DATA_ROWS = 100000
const MAX_COLUMN_COUNT = 100

export const DESCRIPTION = 'Advanced ocean data preprocessing tool with Python integration for NetCDF/HDF5 processing, supporting missing data filling, JAXA-style mask generation, OSTIA data handling, and ML training pair construction. Specifically designed for satellite SST reconstruction tasks.'

export const PROMPT = `Preprocesses ocean data from the local filesystem with comprehensive Python integration for NetCDF/HDF5 formats. This tool is designed to handle the complete workflow from JAXA satellite observations to OSTIA reanalysis data, supporting realistic missing data scenarios for machine learning training.

**Key Features:**
- **Python Integration**: Automatic subprocess calls to Python for NetCDF/HDF5 processing using xarray and h5py
- **JAXA Mask Generation**: Extract realistic cloud cover patterns from satellite observations
- **OSTIA Processing**: Handle complete SST fields from reanalysis data
- **Training Pair Construction**: Create ML-ready HDF5 datasets with input/ground_truth/masks
- **Multi-file Operations**: Merge monthly data files, batch processing
- **Quality Control**: Comprehensive NaN analysis, data completeness checks

**Supported File Formats:**
- CSV (.csv, .txt): Tabular data
- JSON (.json): Structured data
- **NetCDF (.nc)**: Gridded scientific data [Python: xarray, netCDF4]
- **HDF5 (.h5, .hdf5)**: Hierarchical data format [Python: h5py]

**Core Operations:**

1. **Basic Preprocessing:**
   - \`clean\`: Remove rows with excessive missing values (>50%) and duplicates
   - \`filter\`: Filter by date range, depth, lat/lon bounds
   - \`normalize\`: Scale numeric columns to [0, 1]
   - \`standardize\`: Z-score standardization (mean=0, std=1)
   - \`statistics\`: Calculate comprehensive statistics with NaN handling
   - \`quality_check\`: Check ocean parameters (temperature, salinity, pressure) against valid ranges

2. **Missing Data Handling:**
   - \`interpolate\`: Simple linear interpolation for missing values
   - \`fill_missing\`: Advanced filling with multiple strategies:
     * \`linear\`: Linear interpolation between valid values
     * \`nearest\`: Nearest neighbor filling
     * \`forward_fill\`: Propagate last valid value forward
     * \`backward_fill\`: Propagate next valid value backward
     * \`mean\`: Fill with column mean
     * Supports \`max_gap\` parameter to limit filling range

3. **Mask Operations (for ML Training) - Python Required:**
   - \`generate_masks\`: Generate land and cloud masks from satellite data (JAXA-style)
     * **Land mask**: Pixels that are ALWAYS NaN across all time frames (permanent land)
     * **Cloud masks**: Frames with missing ratios in specified range (e.g., 10%-60%)
     * Filters ocean pixels only (excludes land from missing ratio calculation)
     * Typical usage: Extract realistic cloud patterns from JAXA observations
     * Output: .npy file containing masks array + statistics
     * **Requirements**:
       - NetCDF file with 3D data (time, lat, lon)
       - \`mask_params.variable_name\`: Variable to process (e.g., 'sst')
       - \`mask_params.missing_ratio_range\`: Valid range like [0.1, 0.6]
       - \`mask_params.mask_count\`: Number of masks to generate (e.g., 360)

   - \`apply_masks\`: Apply pre-generated masks to create artificial missing data
     * Takes complete data (e.g., OSTIA SST) and applies cloud masks
     * Creates input data with realistic missing patterns
     * **Requirements**:
       - NetCDF file with complete data (OSTIA)
       - \`mask_file_path\`: Path to .npy mask file
       - \`mask_params.variable_name\`: Variable name

   - \`build_training_pairs\`: Construct ML training pairs in HDF5 format
     * **Datasets created**:
       - \`input_sst\`: Data with missing values (cloud-masked)
       - \`ground_truth_sst\`: Complete data
       - \`effective_cloud_mask\`: Binary mask (1=missing, 0=valid)
       - \`land_mask\`: Static land/sea mask
       - \`latitude\`, \`longitude\`, \`time\`: Coordinate arrays
     * **Requirements**:
       - NetCDF file (OSTIA)
       - \`mask_file_path\`: Mask file from generate_masks
       - \`output_path\`: Output HDF5 file path (.h5)
     * **Optional**: \`spatial_params\` for subsetting and grid alignment

4. **Spatial Operations:**
   - \`spatial_subset\`: Extract spatial subset by lat/lon range
     * Example: Pearl River Delta region [15°N-24°N, 111°E-118°E]
     * \`spatial_params.latitude_range\`: [min, max]
     * \`spatial_params.longitude_range\`: [min, max]

   - \`grid_align\`: Align data to target grid resolution
     * Interpolates to specified grid size (e.g., [451, 351])
     * Maintains spatial consistency between datasets
     * \`spatial_params.target_grid\`: [height, width]

5. **Multi-File Operations - Python Required:**
   - \`merge_files\`: Merge multiple NetCDF files along time dimension
     * Concatenates monthly files into single dataset
     * Automatically sorts by time
     * **Requirements**:
       - \`merge_params.file_paths\`: Array of file paths
       - \`output_path\`: Output merged NetCDF file
     * **Optional**: \`merge_params.time_dim\` (default: 'time')

**Typical Workflows:**

**Workflow 1: Extract Cloud Masks from JAXA Observations**
\`\`\`json
{
  "file_path": "/data/jaxa_sst_2015.nc",
  "operations": ["generate_masks"],
  "mask_params": {
    "variable_name": "sst",
    "missing_ratio_range": [0.1, 0.6],
    "mask_count": 360
  },
  "output_path": "/data/jaxa_masks_360.npy"
}
\`\`\`

**Workflow 2: Create Training Pairs (OSTIA + JAXA Masks)**
\`\`\`json
{
  "file_path": "/data/ostia_monthly_2015.nc",
  "operations": ["spatial_subset", "build_training_pairs"],
  "spatial_params": {
    "latitude_range": [15.0, 24.0],
    "longitude_range": [111.0, 118.0],
    "target_grid": [451, 351]
  },
  "mask_file_path": "/data/jaxa_masks_360.npy",
  "mask_params": {
    "variable_name": "analysed_sst"
  },
  "output_path": "/data/training_pairs.h5"
}
\`\`\`

**Workflow 3: Merge Monthly OSTIA Files**
\`\`\`json
{
  "operations": ["merge_files"],
  "merge_params": {
    "file_paths": [
      "/data/ostia_2015_01.nc",
      "/data/ostia_2015_02.nc",
      "/data/ostia_2015_03.nc"
    ]
  },
  "output_path": "/data/ostia_2015_merged.nc"
}
\`\`\`

**Workflow 4: Quality Control for Ocean Profiles**
\`\`\`json
{
  "file_path": "/data/ocean_profiles.csv",
  "operations": ["clean", "quality_check", "statistics"],
  "quality_params": {
    "temp_range": [-2, 40],
    "salinity_range": [0, 42],
    "pressure_range": [0, 12000]
  },
  "output_path": "/data/cleaned_profiles.csv"
}
\`\`\`

**Workflow 5: Fill Missing Data in Observations**
\`\`\`json
{
  "file_path": "/data/satellite_obs.csv",
  "operations": ["fill_missing", "statistics"],
  "fill_params": {
    "method": "linear",
    "max_gap": 5
  },
  "output_path": "/data/filled_obs.csv"
}
\`\`\`

**Python Dependencies:**

To use NetCDF/HDF5 operations, ensure Python 3 is installed with:
- \`xarray\`: NetCDF handling, spatial subsetting, interpolation
- \`netCDF4\`: NetCDF file I/O
- \`h5py\`: HDF5 file I/O
- \`numpy\`: Array operations

Install with: \`pip install xarray netCDF4 h5py numpy scipy\`

The tool will automatically check dependencies and provide clear error messages if libraries are missing.

**Data Format Specifications:**

**JAXA NetCDF** (Satellite Observations):
- Variables: \`sst\`, \`latitude\`, \`longitude\`, \`time\`
- Shape: \`(time, lat, lon)\`
- Missing: NaN for cloud-covered pixels
- Use: Source for realistic cloud masks

**OSTIA NetCDF** (Reanalysis):
- Variables: \`analysed_sst\`, \`lat\`, \`lon\`, \`time\`
- Shape: \`(time, lat, lon)\`
- Units: Kelvin
- Missing: Minimal (gap-filled reanalysis)
- Use: Ground truth for ML training

**Training Pairs HDF5**:
- Datasets: \`input_sst\`, \`ground_truth_sst\`, \`effective_cloud_mask\`, \`land_mask\`, \`latitude\`, \`longitude\`, \`time\`
- Shapes:
  - \`input_sst\`, \`ground_truth_sst\`, \`effective_cloud_mask\`: \`(N, H, W)\`
  - \`land_mask\`: \`(H, W)\`
- Use: Direct loading in PyTorch/TensorFlow

**Masks NPY**:
- Shape: \`(N, H, W)\` where N = number of masks
- Dtype: bool (True=missing/cloud, False=valid)
- Typical: 360 masks with 10-60% missing ratio

**Pearl River Delta (珠三角) Region Parameters:**
- Latitude: [15.0°N, 24.0°N]
- Longitude: [111.0°E, 118.0°E]
- Grid: [451, 351] (matches JAXA resolution)

**Important Notes:**

1. **Units**: Tool maintains original data units (e.g., Kelvin for SST). Convert during visualization if needed.

2. **Missing Values**: Represented as NaN for numeric data. Tool properly handles NaN in all operations.

3. **Memory**: Large NetCDF/HDF5 files are processed in chunks when possible. Current limits:
   - Max file size: 50MB for in-memory operations
   - Max data rows (CSV/JSON): ${MAX_DATA_ROWS}
   - For larger files, use Python scripts directly or split data

4. **Mask Generation Logic**:
   - First pass: Find pixels that are NaN in ALL time frames → land_mask
   - Second pass: For ocean pixels only (land_mask=False), find frames with missing ratio in valid range
   - This ensures land pixels don't affect cloud mask statistics

5. **Grid Alignment**: When applying masks to OSTIA data with different resolution than JAXA, use \`target_grid\` to interpolate OSTIA to match JAXA resolution (typically [451, 351]).

6. **Output Formats**:
   - CSV: Tabular data, easy inspection
   - JSON: Structured data with metadata
   - NetCDF: Gridded scientific data (Python)
   - HDF5: ML training datasets (Python)

7. **Quality Checks**: Default valid ranges:
   - Temperature: [-2, 40] °C
   - Salinity: [0, 42] PSU
   - Pressure: [0, 12000] dbar

8. **File Organization**: Recommended structure:
   \`\`\`
   /data_for_agent/
     ├─ raw_data/
     │   ├─ JAXA/          # Satellite observations
     │   └─ OSTIA/         # Reanalysis data
     ├─ jaxa_missing_masks/ # Generated masks
     └─ processed_split/    # Training/validation/test HDF5 files
   \`\`\`

**Common Ocean Data Variables:**
- \`temperature\`, \`temp\`, \`sst\`: Sea surface or water temperature
- \`salinity\`: Water salinity (PSU)
- \`depth\`, \`pressure\`: Vertical position
- \`dissolved_oxygen\`, \`pH\`: Chemical properties
- \`latitude\`, \`longitude\`: Geographic coordinates
- \`time\`, \`timestamp\`: Temporal coordinates
- \`u\`, \`v\`: Current velocities
- \`chlorophyll\`: Biological indicator

The tool automatically handles different data structures and naming conventions, providing detailed warnings about any issues encountered during processing.

**Error Handling:**

The tool provides comprehensive error messages including:
- Missing Python dependencies with installation instructions
- File format mismatches with suggestions
- Parameter validation errors with required fields
- Processing warnings (e.g., removed outliers, interpolation gaps)
- Python subprocess errors with full traceback

All operations are designed to be safe and reversible - original data is never modified unless explicitly writing to output_path.`
