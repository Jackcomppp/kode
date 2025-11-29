export const DESCRIPTION = `Generates training datasets for machine learning from ocean data by creating input/ground_truth pairs with controlled missing data patterns.
Supports pair building, dataset splitting, and validation.`

export const PROMPT = `# Ocean Training Data Generator Tool

## Purpose
Generate machine learning training datasets from ocean data with paired (input with missing data, complete ground truth) samples.

## Operations

### 1. build_pairs
Creates training pairs by applying masks to ground truth data:
- **input**: Ground truth with masks applied (simulated missing data)
- **groundTruth**: Complete data without masks
- Each pair represents a training sample

### 2. split_dataset
Splits generated pairs into train/val/test sets:
- Configurable split ratios
- Optional shuffling
- Saves separate files for each split

### 3. validate_pairs
Validates training pairs to ensure data quality:
- Checks key consistency
- Verifies masked values exist
- Reports valid/invalid pair statistics

## Split Parameters
- **train_ratio** - Training set ratio (default: 0.7)
- **val_ratio** - Validation set ratio (default: 0.15)
- **test_ratio** - Test set ratio (default: 0.15)
- **shuffle** - Shuffle before splitting (default: true)

## Supported File Formats
- Input: CSV (.csv), JSON (.json)
- Output: CSV (.csv), JSON (.json)
- Masks: JSON (.json)

## Usage Examples

### Example 1: Build training pairs
\`\`\`
{
  "ground_truth_path": "/path/to/complete_sst.csv",
  "mask_file_path": "/path/to/cloud_masks.json",
  "operation": "build_pairs",
  "output_dir": "/path/to/training_data",
  "output_format": "json"
}
\`\`\`

### Example 2: Build and split dataset
\`\`\`
{
  "ground_truth_path": "/path/to/ground_truth.json",
  "mask_file_path": "/path/to/masks.json",
  "operation": "split_dataset",
  "split_params": {
    "train_ratio": 0.7,
    "val_ratio": 0.15,
    "test_ratio": 0.15,
    "shuffle": true
  },
  "output_dir": "/path/to/datasets",
  "output_format": "json"
}
\`\`\`

### Example 3: Custom split ratios
\`\`\`
{
  "ground_truth_path": "/path/to/sst_data.csv",
  "mask_file_path": "/path/to/masks.json",
  "operation": "split_dataset",
  "split_params": {
    "train_ratio": 0.8,
    "val_ratio": 0.1,
    "test_ratio": 0.1,
    "shuffle": true
  },
  "output_dir": "/path/to/ml_data"
}
\`\`\`

### Example 4: Validate training pairs
\`\`\`
{
  "ground_truth_path": "/path/to/ground_truth.json",
  "mask_file_path": "/path/to/masks.json",
  "operation": "validate_pairs",
  "output_dir": "/path/to/validation"
}
\`\`\`

## Complete Workflow
1. **Preprocess data** - Use OceanBasicPreprocess to clean and prepare data
2. **Generate masks** - Use OceanMaskProcess to create land/cloud masks
3. **Build pairs** - Use this tool with build_pairs operation
4. **Split dataset** - Use split_dataset to create train/val/test splits
5. **Train model** - Use generated pairs for training reconstruction models

## Output Structure
### build_pairs
- \`training_pairs.json\` - All pairs with input and groundTruth fields

### split_dataset
- \`train.json\` - Training set
- \`val.json\` - Validation set
- \`test.json\` - Test set

### Each pair contains:
\`\`\`json
{
  "input": { ...data with masked values as null... },
  "groundTruth": { ...complete data... },
  "maskIndex": 0,
  "missingRatio": 0.25
}
\`\`\`

## Notes
- Ground truth must be complete (no missing values) for best results
- Masks should be generated from representative data with natural missing patterns
- Use validate_pairs to check data quality before training
- JSON format recommended for complex data structures
- Split ratios must sum to 1.0
`
