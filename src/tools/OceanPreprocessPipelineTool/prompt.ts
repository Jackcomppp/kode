export const DESCRIPTION = `
🌊 海洋数据预处理完整流程（推荐使用）

这是处理海洋数据的主要工具，提供完整的预处理 + CNN质量验证流程。

核心功能：
1. 批量处理多个NC/HDF5文件
2. 自动数据清洗、合并、标准化
3. 使用轻量级CNN验证数据收敛性
4. 自动生成详细的验证报告

适用场景：
✓ 预处理JAXA/OSTIA等海洋SST数据
✓ 准备超分辨率训练数据
✓ 准备预测模型训练数据
✓ 需要验证数据质量和收敛性

输出内容：
- preprocessed_{variable}.nc - 处理后的数据文件
- validation_report.md - Markdown格式详细报告
- validation_results.json - JSON格式验证结果

⚡ 推荐：这是处理海洋数据的首选工具，除非你需要非常细粒度的控制。
`

export const PROMPT = `
You are using the OceanPreprocessPipelineTool - the PRIMARY and RECOMMENDED tool for ocean data preprocessing.

WHEN TO USE THIS TOOL:
- User wants to preprocess ocean data (NC/HDF5 files)
- User mentions "data preprocessing", "prepare training data", "process SST data"
- User needs to validate data quality
- This should be your FIRST CHOICE for any data preprocessing task

WORKFLOW:
1. Ask user for input_dir (where raw data files are) if not provided
2. Ask user for output_dir (where to save results) if not provided
3. Optional: Ask about file_pattern (default: *.nc) and variable_name (default: sst)
4. Call this tool with the parameters
5. Monitor the output and inform user of progress
6. After completion, tell user:
   - Location of processed file
   - Key quality metrics (convergence, quality score)
   - Location of validation report

IMPORTANT:
- This tool includes CNN-based convergence validation (if PyTorch is available)
- If PyTorch is not available, it falls back to statistical validation
- The tool is designed to work out-of-the-box with minimal configuration
- Don't use OceanDataPreprocessTool or OceanFullPreprocessTool unless user specifically requests fine-grained control

EXAMPLE CONVERSATION:
User: "I need to preprocess my JAXA SST data"
Assistant: "I'll use OceanPreprocessPipelineTool to process your data with quality validation.
Where are your raw JAXA files located? And where should I save the processed output?"

User: "Raw data is in /data/jaxa, output to /data/processed"
Assistant: *calls OceanPreprocessPipelineTool with input_dir=/data/jaxa, output_dir=/data/processed*

After tool completes:
Assistant: "✅ Preprocessing complete!
- Processed 92 files successfully
- Data shape: (92, 500, 400)
- Convergence score: 0.85 (good)
- Quality score: 0.79
- Output: /data/processed/preprocessed_sst.nc
- Detailed report: /data/processed/validation_report.md"
`

