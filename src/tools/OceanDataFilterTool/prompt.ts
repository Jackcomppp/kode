export const DESCRIPTION = `Filters ocean data based on various criteria including date ranges, depth, geographic coordinates, temperature, and salinity.
Supports multiple filter conditions simultaneously.`

export const PROMPT = `# Ocean Data Filter Tool

## Purpose
Filter ocean data based on specific criteria to extract subsets of interest for analysis.

## Filter Parameters
- **start_date / end_date** - Filter by date range (ISO format: YYYY-MM-DD)
- **min_depth / max_depth** - Filter by depth range (meters)
- **latitude_range** - Filter by latitude [min, max] (degrees, -90 to 90)
- **longitude_range** - Filter by longitude [min, max] (degrees, -180 to 180)
- **min_temperature / max_temperature** - Filter by temperature range (Celsius)
- **min_salinity / max_salinity** - Filter by salinity range (PSU)

## Supported File Formats
- CSV (.csv)
- JSON (.json)
- Text files (.txt)

## Usage Examples

### Example 1: Filter by geographic region
\`\`\`
{
  "file_path": "/path/to/ocean_data.csv",
  "filter_params": {
    "latitude_range": [20, 40],
    "longitude_range": [-80, -60]
  },
  "output_path": "/path/to/filtered_region.csv"
}
\`\`\`

### Example 2: Filter by depth and temperature
\`\`\`
{
  "file_path": "/path/to/temperature_profiles.csv",
  "filter_params": {
    "min_depth": 0,
    "max_depth": 100,
    "min_temperature": 15,
    "max_temperature": 25
  }
}
\`\`\`

### Example 3: Filter by date range
\`\`\`
{
  "file_path": "/path/to/timeseries_data.json",
  "filter_params": {
    "start_date": "2020-01-01",
    "end_date": "2020-12-31"
  },
  "output_path": "/path/to/2020_data.json"
}
\`\`\`

### Example 4: Combined filters
\`\`\`
{
  "file_path": "/path/to/argo_data.csv",
  "filter_params": {
    "latitude_range": [-10, 10],
    "min_depth": 0,
    "max_depth": 500,
    "min_salinity": 34,
    "max_salinity": 36
  },
  "output_path": "/path/to/tropical_surface.csv"
}
\`\`\`

## Notes
- At least one filter parameter must be specified
- Multiple filters are applied sequentially (AND logic)
- Missing values in filter columns are preserved (not filtered out)
- Output format is inferred from file extension if not specified
`
