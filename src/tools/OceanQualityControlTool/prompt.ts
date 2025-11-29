export const DESCRIPTION = `Performs quality control checks on ocean data to identify and optionally remove outliers.
Checks temperature, salinity, pressure, oxygen ranges and detects spike anomalies.`

export const PROMPT = `# Ocean Quality Control Tool

## Purpose
Perform quality control (QC) checks on ocean data to identify outliers and anomalies based on oceanographic standards.

## Quality Control Parameters
- **temp_range** - Valid temperature range in Celsius (default: [-2, 40])
- **salinity_range** - Valid salinity range in PSU (default: [0, 42])
- **pressure_range** - Valid pressure range in dbar (default: [0, 12000])
- **oxygen_range** - Valid oxygen range in μmol/kg (optional)
- **check_spikes** - Enable spike anomaly detection (default: true)
- **spike_threshold** - Spike detection threshold in std deviations (default: 3)

## Supported File Formats
- CSV (.csv)
- JSON (.json)
- Text files (.txt)

## Usage Examples

### Example 1: Basic quality check (report only)
\`\`\`
{
  "file_path": "/path/to/ocean_data.csv",
  "quality_params": {
    "temp_range": [-2, 35],
    "salinity_range": [30, 40]
  }
}
\`\`\`

### Example 2: Quality check and remove outliers
\`\`\`
{
  "file_path": "/path/to/argo_profile.csv",
  "quality_params": {
    "temp_range": [-2, 40],
    "salinity_range": [0, 42],
    "pressure_range": [0, 2000]
  },
  "remove_outliers": true,
  "output_path": "/path/to/qc_cleaned.csv"
}
\`\`\`

### Example 3: Comprehensive QC with spike detection
\`\`\`
{
  "file_path": "/path/to/ctd_data.json",
  "quality_params": {
    "temp_range": [0, 30],
    "salinity_range": [32, 38],
    "oxygen_range": [150, 300],
    "check_spikes": true,
    "spike_threshold": 2.5
  },
  "remove_outliers": true,
  "output_path": "/path/to/qc_data.json"
}
\`\`\`

### Example 4: Custom ranges for tropical data
\`\`\`
{
  "file_path": "/path/to/tropical_mooring.csv",
  "quality_params": {
    "temp_range": [20, 32],
    "salinity_range": [33, 37],
    "check_spikes": true
  },
  "output_path": "/path/to/qc_tropical.csv"
}
\`\`\`

## Notes
- By default, outliers are only reported, not removed
- Set remove_outliers=true to filter out failed QC records
- Spike detection compares each value with neighboring values
- Output includes detailed QC report with counts for each parameter
- Missing values in checked columns are preserved (not marked as outliers)
`
