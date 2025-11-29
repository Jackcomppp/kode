export const DESCRIPTION = `Performs basic preprocessing operations on ocean data files (CSV, JSON).
Operations include: clean (remove missing/duplicates), normalize, standardize, interpolate, and statistics calculation.`

export const PROMPT = `# Ocean Basic Preprocess Tool

## Purpose
Perform fundamental preprocessing operations on ocean data files to prepare them for further analysis.

## Supported Operations
1. **clean** - Remove rows with excessive missing values (>50%) and duplicates
2. **normalize** - Scale numeric columns to [0, 1] range
3. **standardize** - Apply z-score standardization (mean=0, std=1)
4. **interpolate** - Fill missing values using linear interpolation
5. **statistics** - Calculate mean, std, min, max, median for numeric columns

## Supported File Formats
- CSV (.csv)
- JSON (.json)
- Text files (.txt)

## Usage Examples

### Example 1: Basic cleaning and statistics
\`\`\`
{
  "file_path": "/path/to/ocean_data.csv",
  "operations": ["clean", "statistics"]
}
\`\`\`

### Example 2: Full preprocessing with normalization
\`\`\`
{
  "file_path": "/path/to/temperature_data.csv",
  "operations": ["clean", "interpolate", "normalize", "statistics"],
  "output_path": "/path/to/preprocessed_data.csv"
}
\`\`\`

### Example 3: Standardization for machine learning
\`\`\`
{
  "file_path": "/path/to/salinity_data.json",
  "operations": ["clean", "standardize"],
  "output_path": "/path/to/standardized_data.json",
  "output_format": "json"
}
\`\`\`

## Notes
- Default operations: ["clean", "statistics"]
- Operations are applied in the order specified
- Output format is inferred from file extension if not specified
- Missing values are handled appropriately for each operation
`
