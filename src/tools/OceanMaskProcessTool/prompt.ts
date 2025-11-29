export const DESCRIPTION = `Processes masks for ocean data: generate land/cloud masks, apply masks to create missing data, or analyze existing masks.
Useful for creating training datasets with controlled missing data patterns.`

export const PROMPT = `# Ocean Mask Process Tool

## Purpose
Generate, apply, and analyze masks for ocean data to simulate missing data patterns (land, clouds) for training data generation.

## Operations

### 1. generate_masks
Generate land masks (permanently missing pixels) and cloud masks (temporally missing data).
- **Land mask**: Identifies pixels that are always NaN across all time frames
- **Cloud mask**: Identifies frames with missing ratios within specified range

### 2. apply_masks
Apply existing masks to data to create artificial missing values.

### 3. analyze_masks
Analyze existing mask files to get statistics.

## Mask Parameters
- **missing_ratio_range** - Valid missing ratio range for cloud masks [min, max], e.g., [0.1, 0.6]
- **mask_count** - Number of cloud masks to generate (default: 360)
- **land_threshold** - Threshold for land mask detection

## Supported File Formats
- Data files: CSV (.csv), JSON (.json)
- Mask files: JSON (.json)

## Usage Examples

### Example 1: Generate masks from data
\`\`\`
{
  "file_path": "/path/to/sst_data.csv",
  "operation": "generate_masks",
  "mask_params": {
    "missing_ratio_range": [0.1, 0.6],
    "mask_count": 360
  },
  "output_path": "/path/to/masks.json"
}
\`\`\`

### Example 2: Apply masks to create training input
\`\`\`
{
  "file_path": "/path/to/complete_sst.csv",
  "operation": "apply_masks",
  "mask_file_path": "/path/to/masks.json",
  "output_path": "/path/to/masked_sst.json"
}
\`\`\`

### Example 3: Analyze existing masks
\`\`\`
{
  "file_path": "/path/to/data.csv",
  "operation": "analyze_masks",
  "mask_file_path": "/path/to/masks.json"
}
\`\`\`

### Example 4: Generate masks with custom parameters
\`\`\`
{
  "file_path": "/path/to/gridded_sst.json",
  "operation": "generate_masks",
  "mask_params": {
    "missing_ratio_range": [0.2, 0.5],
    "mask_count": 500
  },
  "output_path": "/path/to/custom_masks.json"
}
\`\`\`

## Workflow for Training Data Generation
1. **Generate masks** from representative data with natural missing patterns
2. **Apply masks** to complete ground truth data to create input with controlled missing data
3. Use paired (masked input, complete ground truth) for training reconstruction models

## Notes
- Masks are saved in JSON format for portability
- Land mask identifies pixels that are always missing
- Cloud masks capture temporal missing patterns
- Missing ratio range controls the sparsity of cloud masks
- For machine learning: use generate_masks → apply_masks workflow
`
