export const DESCRIPTION = `Executes complete preprocessing pipelines for ocean data by orchestrating multiple specialized tools.
Supports predefined workflows (basic_preprocess, quality_analysis, training_prep) and custom pipelines.`

export const PROMPT = `# Ocean Full Preprocess Pipeline Tool

## Purpose
Execute complete end-to-end preprocessing workflows by combining multiple specialized ocean data tools in a single pipeline.

## Predefined Workflows

### 1. basic_preprocess
Standard data cleaning and preparation:
- Clean (remove missing/duplicates)
- Interpolate missing values
- Normalize data
- Calculate statistics

### 2. quality_analysis
Focus on data quality assessment:
- Basic cleaning
- Statistical analysis
- Quality control checks
- Outlier detection (report only)

### 3. training_prep
Prepare data for machine learning:
- Clean and normalize data
- Quality control with outlier removal
- Generate masks for training data

### 4. custom
Define your own pipeline configuration

## Pipeline Components

### basic_preprocess
\`\`\`
operations: ['clean', 'normalize', 'standardize', 'interpolate', 'statistics']
\`\`\`

### filter
\`\`\`
enabled: true/false
params: { latitude_range, longitude_range, depth_range, etc. }
\`\`\`

### quality_control
\`\`\`
enabled: true/false
params: { temp_range, salinity_range, pressure_range }
remove_outliers: true/false
\`\`\`

### mask_process
\`\`\`
enabled: true/false
operation: 'generate_masks' | 'apply_masks'
params: { missing_ratio_range, mask_count }
\`\`\`

### training_data
\`\`\`
enabled: true/false
operation: 'build_pairs' | 'split_dataset'
params: { train_ratio, val_ratio, test_ratio }
\`\`\`

## Usage Examples

### Example 1: Basic preprocessing workflow
\`\`\`
{
  "file_path": "/path/to/ocean_data.csv",
  "workflow": "basic_preprocess",
  "output_dir": "/path/to/output",
  "output_format": "json"
}
\`\`\`

### Example 2: Quality analysis workflow
\`\`\`
{
  "file_path": "/path/to/argo_profiles.csv",
  "workflow": "quality_analysis",
  "output_dir": "/path/to/qc_results"
}
\`\`\`

### Example 3: Training data preparation
\`\`\`
{
  "file_path": "/path/to/sst_complete.json",
  "workflow": "training_prep",
  "output_dir": "/path/to/training_data",
  "output_format": "json"
}
\`\`\`

### Example 4: Custom pipeline
\`\`\`
{
  "file_path": "/path/to/data.csv",
  "workflow": "custom",
  "pipeline_config": {
    "basic_preprocess": {
      "operations": ["clean", "normalize"]
    },
    "filter": {
      "enabled": true,
      "params": {
        "latitude_range": [20, 40],
        "min_depth": 0,
        "max_depth": 100
      }
    },
    "quality_control": {
      "enabled": true,
      "params": {
        "temp_range": [10, 30],
        "salinity_range": [30, 38]
      },
      "remove_outliers": true
    }
  },
  "output_dir": "/path/to/custom_output"
}
\`\`\`

### Example 5: Complete ML pipeline
\`\`\`
{
  "file_path": "/path/to/complete_sst.csv",
  "workflow": "custom",
  "pipeline_config": {
    "basic_preprocess": {
      "operations": ["clean", "normalize", "statistics"]
    },
    "quality_control": {
      "enabled": true,
      "remove_outliers": true
    },
    "mask_process": {
      "enabled": true,
      "operation": "generate_masks",
      "params": {
        "missing_ratio_range": [0.1, 0.6],
        "mask_count": 360
      }
    },
    "training_data": {
      "enabled": true,
      "operation": "split_dataset",
      "params": {
        "train_ratio": 0.7,
        "val_ratio": 0.15,
        "test_ratio": 0.15
      }
    }
  },
  "output_dir": "/path/to/ml_ready_data",
  "output_format": "json"
}
\`\`\`

## Benefits of Full Pipeline
- **Convenience**: Run entire workflow with single tool call
- **Consistency**: Ensures data flows correctly between steps
- **Reproducibility**: Predefined workflows guarantee consistent results
- **Flexibility**: Custom pipelines for specific needs

## Output Files
Depending on pipeline configuration, generates:
- \`processed_data.json/csv\` - Final processed data
- \`masks.json\` - Generated masks (if mask_process enabled)
- \`train.json\`, \`val.json\`, \`test.json\` - Dataset splits (if training_data enabled)
- Step-by-step results and statistics

## When to Use
- **Use Full Pipeline** when you need multiple preprocessing steps
- **Use Individual Tools** when you need fine-grained control or only one operation

## Notes
- Predefined workflows cover common use cases
- Custom workflow allows any combination of tools
- Steps execute in order: preprocess → filter → QC → masks → training
- Each step's output feeds into the next step
- All intermediate results are logged
- Failed steps don't stop the pipeline (warnings issued)
`
