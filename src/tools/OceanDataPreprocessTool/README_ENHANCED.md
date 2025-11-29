# Ocean Data Preprocess Tool - Enhanced Version

## 概述

这是一个增强版的海洋数据预处理工具，专门针对 README.md 中描述的海温缺失数据填充任务进行了优化。工具支持从 JAXA 卫星观测中提取真实云掩码，并应用到 OSTIA 模式数据上，构造成对的机器学习训练样本。

## 新增功能

### 1. Python 集成
- **文件**: `oceandata_processor.py`
- **功能**: 通过 Python 子进程处理 NetCDF 和 HDF5 文件
- **依赖**: xarray, netCDF4, h5py, numpy, scipy
- **安装**: `pip install xarray netCDF4 h5py numpy scipy`

### 2. Python 集成模块
- **文件**: `pythonIntegration.ts`
- **功能**: TypeScript 到 Python 的桥接接口
- **主要函数**:
  - `checkPythonDependencies()`: 检查 Python 依赖
  - `loadFileMetadata()`: 加载 NetCDF/HDF5 元数据
  - `generateMasksFromNetCDF()`: 从 JAXA 数据生成掩码
  - `applyMasksToNetCDF()`: 应用掩码到 OSTIA 数据
  - `mergeNetCDFFiles()`: 合并多个月度文件
  - `calculateStatisticsNetCDF()`: 计算 NetCDF 变量统计

### 3. 操作配置模块
- **文件**: `operationsConfig.ts`
- **功能**: 扩展操作定义、参数验证、工作流示例
- **包含**:
  - 操作说明和要求
  - 典型工作流配置
  - 数据格式规范
  - 珠三角区域参数预设

### 4. 增强文档
- **文件**: `prompt_enhanced.ts`
- **功能**: 详细的工具使用说明
- **包含**: 完整的工作流示例和错误处理说明

## 核心工作流程

### 流程 1: JAXA 云掩码生成

从 JAXA 卫星观测数据中提取真实云掩码：

```typescript
{
  file_path: "/data_new/sst_data/data_for_agent/scripts/raw_data/JAXA/jaxa_sst_2015.nc",
  operations: ["generate_masks"],
  mask_params: {
    variable_name: "sst",
    missing_ratio_range: [0.1, 0.6],  // 10%-60% 缺失比例
    mask_count: 360                    // 生成 360 个掩码
  },
  output_path: "/data_new/sst_data/data_for_agent/scripts/jaxa_missing_masks/missing_masks_360.npy"
}
```

**处理逻辑**:
1. 第一遍扫描: 找出在所有时间帧都是 NaN 的像素 → `land_mask`
2. 第二遍扫描: 对海洋像素提取缺失掩码，筛选缺失占比在 10%-60% 的帧
3. 输出: `.npy` 文件包含布尔数组和统计信息

### 流程 2: OSTIA 数据处理与训练对构建

从 OSTIA 数据和 JAXA 掩码构建训练样本对：

```typescript
{
  file_path: "/data_new/sst_data/250922_jaxa_processing/copernicus_data/copernicus_sst_monthly_1991_2021.nc",
  operations: ["spatial_subset", "build_training_pairs"],
  spatial_params: {
    latitude_range: [15.0, 24.0],      // 珠三角区域
    longitude_range: [111.0, 118.0],
    target_grid: [451, 351]             // 与 JAXA 网格对齐
  },
  mask_file_path: "/data_new/sst_data/data_for_agent/scripts/jaxa_missing_masks/missing_masks_360.npy",
  mask_params: {
    variable_name: "analysed_sst"       // OSTIA 变量名
  },
  output_path: "/data_new/sst_data/data_for_agent/processed_split/processed_sst_train.h5"
}
```

**输出 HDF5 结构**:
```
/input_sst              # 含缺失的输入海温 (N, 451, 351)
/ground_truth_sst       # 完整目标海温 (N, 451, 351)
/effective_cloud_mask   # 缺失位置标记 (N, 451, 351)
/land_mask             # 陆地静态掩码 (451, 351)
/latitude              # 纬度坐标
/longitude             # 经度坐标
/time                  # 时间坐标
```

### 流程 3: 合并月度数据文件

将多个 OSTIA 月度文件合并为单个文件：

```typescript
{
  operations: ["merge_files"],
  merge_params: {
    file_paths: [
      "/data_new/sst_data/data_for_agent/scripts/raw_data/OSTIA/Ostia_monthly_data/2015_01.nc",
      "/data_new/sst_data/data_for_agent/scripts/raw_data/OSTIA/Ostia_monthly_data/2015_02.nc",
      // ... 更多文件
    ],
    time_dim: "time"
  },
  output_path: "/data_new/sst_data/data_for_agent/scripts/raw_data/OSTIA/Ostia_sst_monthly_2015.nc"
}
```

### 流程 4: 数据质量检查

检查数据质量和统计信息：

```typescript
{
  file_path: "/data_new/sst_data/data_for_agent/scripts/raw_data/OSTIA/Ostia_sst_monthly_2015.nc",
  operations: ["statistics", "quality_check"],
  mask_params: {
    variable_name: "analysed_sst"
  },
  quality_params: {
    temp_range: [-2, 40]  // 开尔文转摄氏度后的有效范围
  }
}
```

## 参数说明

### mask_params (掩码参数)

```typescript
{
  variable_name: string,           // NetCDF 中的变量名 (必需)
  missing_ratio_range: [number, number],  // 缺失比例范围，如 [0.1, 0.6]
  mask_count: number,              // 生成的掩码数量，如 360
  land_threshold: number           // 陆地判定阈值 (可选)
}
```

### spatial_params (空间参数)

```typescript
{
  latitude_range: [number, number],   // 纬度范围 [最小, 最大]
  longitude_range: [number, number],  // 经度范围 [最小, 最大]
  target_grid: [number, number]       // 目标网格尺寸 [高度, 宽度]
}
```

### merge_params (合并参数)

```typescript
{
  file_paths: string[],   // 要合并的文件路径列表
  time_dim: string        // 时间维度名称，默认 "time"
}
```

### fill_params (填充参数)

```typescript
{
  method: 'linear' | 'nearest' | 'cubic' | 'forward_fill' | 'backward_fill' | 'mean',
  max_gap: number         // 最大填充间隙
}
```

## 文件结构

推荐的目录组织：

```
/data_new/sst_data/
  ├─ data_for_agent/
  │   ├─ scripts/
  │   │   ├─ raw_data/
  │   │   │   ├─ JAXA/                    # JAXA 示例数据
  │   │   │   └─ OSTIA/                   # OSTIA 示例数据
  │   │   └─ jaxa_missing_masks/          # 生成的掩码
  │   │       └─ missing_masks_360.npy
  │   └─ processed_split/                 # 训练/验证/测试数据
  │       ├─ processed_sst_train.h5
  │       ├─ processed_sst_valid.h5
  │       └─ processed_sst_test.h5
  ├─ 250922_jaxa_processing/
  │   ├─ copernicus_data/                 # OSTIA 完整数据
  │   │   └─ copernicus_sst_monthly_1991_2021.nc
  │   └─ processed_data/                  # 完整处理结果
  └─ jaxa_extract/                        # JAXA 完整数据集
```

## Python 依赖检查

在使用 NetCDF/HDF5 功能前，请确保 Python 环境正确配置：

```bash
# 检查 Python 版本
python3 --version

# 安装依赖
pip install xarray netCDF4 h5py numpy scipy

# 验证安装
python3 -c "import xarray, netCDF4, h5py, numpy; print('All dependencies OK')"
```

## 使用 oceandata_processor.py 独立运行

Python 脚本也可以独立使用：

```bash
# 检查依赖
python3 oceandata_processor.py check_deps

# 加载元数据
python3 oceandata_processor.py load_metadata --file data.nc

# 生成掩码
python3 oceandata_processor.py generate_masks \
  --file jaxa_data.nc \
  --variable sst \
  --params '{"missing_ratio_range": [0.1, 0.6], "mask_count": 360}'

# 应用掩码
python3 oceandata_processor.py apply_masks \
  --file ostia_data.nc \
  --variable analysed_sst \
  --mask-file masks.npy \
  --output training_pairs.h5 \
  --params '{"latitude_range": [15.0, 24.0], "longitude_range": [111.0, 118.0], "target_grid": [451, 351]}'

# 合并文件
python3 oceandata_processor.py merge_files \
  --files file1.nc file2.nc file3.nc \
  --output merged.nc

# 计算统计
python3 oceandata_processor.py calculate_stats \
  --file data.nc \
  --variable sst
```

## 错误处理

工具提供详细的错误信息：

1. **缺少 Python 依赖**: 会提示需要安装的包
2. **文件格式错误**: 会建议支持的格式
3. **参数验证错误**: 会列出缺失或无效的参数
4. **处理警告**: 会显示移除的异常值、插值间隙等

## 与原 README 的对应关系

| README 中的脚本 | 工具中的操作 | 说明 |
|----------------|-------------|------|
| `jaxa_process.py` | `generate_masks` | 从 JAXA 提取掩码 |
| `OSTIA_hdf5.py` | `build_training_pairs` | 构建训练对 |
| `datadownload.py` | (待实现) | 数据下载功能 |
| `merge_data.py` | `merge_files` | 合并月度文件 |
| `Ostia_check.ipynb` | `statistics` + `quality_check` | 质量验证 |

## 注意事项

1. **单位保持**: 工具保持原始数据单位（如 Kelvin），可视化时再转换
2. **内存限制**: 大文件可能需要分块处理，当前限制 50MB
3. **掩码复用**: 掩码数量不足时可循环使用
4. **网格对齐**: 确保 OSTIA 插值到与 JAXA 相同的网格尺寸
5. **缺失表示**: 使用 NaN 表示缺失值
6. **原始数据保护**: 除非指定 output_path，否则不修改原始文件

## 典型使用场景

### 场景 1: 首次处理 JAXA 数据

```typescript
// 1. 检查文件信息
{ file_path: "jaxa.nc", operations: ["statistics"] }

// 2. 生成掩码
{
  file_path: "jaxa.nc",
  operations: ["generate_masks"],
  mask_params: { variable_name: "sst", missing_ratio_range: [0.1, 0.6], mask_count: 360 },
  output_path: "masks.npy"
}
```

### 场景 2: 处理 OSTIA 并生成训练数据

```typescript
// 1. 合并月度文件（如果需要）
{
  operations: ["merge_files"],
  merge_params: { file_paths: ["2015_01.nc", "2015_02.nc", ...] },
  output_path: "ostia_2015.nc"
}

// 2. 生成训练对
{
  file_path: "ostia_2015.nc",
  operations: ["spatial_subset", "build_training_pairs"],
  spatial_params: {
    latitude_range: [15.0, 24.0],
    longitude_range: [111.0, 118.0],
    target_grid: [451, 351]
  },
  mask_file_path: "masks.npy",
  output_path: "training.h5"
}
```

### 场景 3: 数据质量控制

```typescript
{
  file_path: "ocean_data.csv",
  operations: ["clean", "quality_check", "fill_missing", "statistics"],
  quality_params: { temp_range: [-2, 40], salinity_range: [0, 42] },
  fill_params: { method: "linear", max_gap: 5 },
  output_path: "cleaned_data.csv"
}
```

## 贡献与扩展

新增功能包括：
- ✅ Python 集成框架
- ✅ JAXA 掩码生成
- ✅ OSTIA 训练对构建
- ✅ 文件合并
- ✅ 增强统计和质量检查
- 🔄 数据下载 (待实现)
- 🔄 可视化工具 (待实现)

## 参考文档

- 原始需求: `D:\data_for_agent\data_for_agent\README.md`
- 工具主文件: `OceanDataPreprocessTool.tsx`
- Python 处理器: `oceandata_processor.py`
- Python 集成: `pythonIntegration.ts`
- 操作配置: `operationsConfig.ts`
- 增强文档: `prompt_enhanced.ts`

## 联系与支持

如有问题或需要新功能，请参考：
- CMEMS 产品手册: `/data_new/sst_data/CMEMS-SST-PUM-010-011.pdf`
- xarray 文档: https://docs.xarray.dev/
- h5py 文档: https://docs.h5py.org/
