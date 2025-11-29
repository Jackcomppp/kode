# OceanDataPreprocessTool - 文件索引

## 📁 文件结构总览

```
OceanDataPreprocessTool/
├── 📄 核心代码文件
│   ├── oceandata_processor.py         (16K)  - Python 后端处理器
│   ├── pythonIntegration.ts           (7.6K) - TypeScript-Python 桥接
│   ├── operationsConfig.ts            (9.7K) - 操作配置和验证
│   ├── OceanDataPreprocessTool.tsx    (46K)  - 主工具文件 (原有)
│   └── prompt.ts                      (5.7K) - 工具提示 (原有)
│
├── 📚 文档文件
│   ├── README_ENHANCED.md             (11K)  - ⭐ 使用指南 (从这里开始!)
│   ├── INSTALLATION.md                (7.4K) - 安装指南
│   ├── SUMMARY.md                     (11K)  - 功能总结
│   ├── prompt_enhanced.ts             (12K)  - 增强版工具说明
│   └── INDEX.md                       (本文件) - 文件索引
│
├── 🧪 测试和脚本
│   ├── test_processor.py              (12K)  - 测试套件
│   ├── quick_start.sh                 (4.6K) - Linux/Mac 快速开始
│   └── quick_start.bat                (4.3K) - Windows 快速开始
│
└── 📦 备份文件
    └── prompt.ts.backup               (5.7K) - 原始 prompt 备份
```

## 🚀 快速导航

### 新用户入门

1. **首次使用**: 从这里开始 👇
   - 📖 [README_ENHANCED.md](README_ENHANCED.md) - 完整使用指南
   - 📋 [INSTALLATION.md](INSTALLATION.md) - 安装 Python 依赖
   - 🎬 运行快速开始脚本:
     - Linux/Mac: `bash quick_start.sh`
     - Windows: `quick_start.bat`

2. **快速测试**: 验证安装
   ```bash
   python3 test_processor.py
   ```

3. **查看功能**: 了解新功能
   - 📊 [SUMMARY.md](SUMMARY.md) - 功能总结和技术细节

### 开发者参考

- **Python API**: [oceandata_processor.py](oceandata_processor.py)
  - 主要函数: `generate_masks_from_netcdf()`, `apply_masks_to_netcdf()`, etc.
  - 命令行接口: `python3 oceandata_processor.py --help`

- **TypeScript API**: [pythonIntegration.ts](pythonIntegration.ts)
  - 导出函数: `executePythonProcessor()`, `checkPythonDependencies()`, etc.

- **操作配置**: [operationsConfig.ts](operationsConfig.ts)
  - 操作定义、参数验证、工作流示例

## 📖 文档详解

### README_ENHANCED.md (⭐ 推荐从这里开始)
**内容**:
- 新增功能概述
- 4 个核心工作流程详解
- 完整参数说明
- 文件结构建议
- Python 独立使用方法
- 典型使用场景

**适合人群**: 所有用户，特别是首次使用者

**关键章节**:
- § 核心工作流程 - 了解如何使用
- § 参数说明 - 理解各参数含义
- § 典型使用场景 - 具体应用示例

---

### INSTALLATION.md
**内容**:
- 系统要求 (Python 3.7+, Node.js 14+)
- 安装步骤 (pip/conda)
- 验证方法
- 9 个常见问题及解决方案
- 性能优化建议

**适合人群**: 需要安装环境的用户

**关键章节**:
- § 安装步骤 - pip 或 conda 安装
- § 常见问题 - 遇到错误时查看

---

### SUMMARY.md
**内容**:
- 任务概述和完成工作清单
- 7 个新增文件详解 (约 2,750 行代码)
- 与原 README 的对应关系
- 核心功能对比 (原工具 vs 增强版)
- 典型工作流和数据流图
- 技术特点、性能考虑、已知限制

**适合人群**: 想深入了解技术实现的开发者

**关键章节**:
- § 已完成的工作 - 了解所有新功能
- § 核心功能对比 - 看增强了什么
- § 技术特点 - 理解实现细节

---

### prompt_enhanced.ts
**内容**:
- 工具完整说明 (用于 AI 提示)
- 15+ 种操作的详细说明
- 5 个工作流示例
- 数据格式规范
- Python 依赖说明
- 重要注意事项

**适合人群**: 开发者、需要参考所有操作的用户

**关键章节**:
- § Core Operations - 所有操作列表
- § Typical Workflows - 工作流示例
- § Data Format Specifications - 格式说明

## 🔧 代码文件说明

### oceandata_processor.py (16K, 500+ 行)
**功能**: Python 后端处理器，核心数据处理逻辑

**主要函数**:
```python
check_dependencies()                    # 检查依赖
load_netcdf_metadata(file_path)        # 加载 NetCDF 元数据
load_hdf5_metadata(file_path)          # 加载 HDF5 元数据
generate_masks_from_netcdf(...)        # 生成 JAXA 风格掩码
apply_masks_to_netcdf(...)             # 应用掩码创建训练对
merge_netcdf_files(...)                # 合并多个 NetCDF 文件
calculate_statistics_netcdf(...)       # 计算统计量
```

**命令行用法**:
```bash
python3 oceandata_processor.py <command> [options]

Commands:
  check_deps          检查依赖
  load_metadata       加载元数据
  generate_masks      生成掩码
  apply_masks         应用掩码
  merge_files         合并文件
  calculate_stats     计算统计
```

**依赖**:
- xarray, netCDF4, h5py, numpy, scipy

---

### pythonIntegration.ts (7.6K, 300+ 行)
**功能**: TypeScript 到 Python 的桥接层

**主要导出**:
```typescript
executePythonProcessor(command, params)    // 执行 Python 命令
checkPythonDependencies()                  // 检查 Python 依赖
loadFileMetadata(filePath)                 // 加载文件元数据
generateMasksFromNetCDF(...)               // 生成掩码
applyMasksToNetCDF(...)                    // 应用掩码
mergeNetCDFFiles(...)                      // 合并文件
calculateStatisticsNetCDF(...)             // 计算统计
```

**类型定义**:
- `PythonProcessorParams` - Python 参数接口
- `MaskGenerationResult` - 掩码生成结果
- `ApplyMasksResult` - 应用掩码结果
- `MergeFilesResult` - 合并文件结果
- `StatisticsResult` - 统计结果

---

### operationsConfig.ts (9.7K, 400+ 行)
**功能**: 操作定义、配置和验证

**主要导出**:
```typescript
EXTENDED_OPERATIONS            // 扩展操作列表
OPERATION_DESCRIPTIONS         // 操作描述
OPERATION_REQUIREMENTS         // 参数要求
WORKFLOW_EXAMPLES              // 工作流示例
FORMAT_SPECIFICATIONS          // 格式规范
PEARL_RIVER_DELTA_PARAMS       // 珠三角参数预设
validateOperationParams(...)   // 参数验证函数
```

**包含内容**:
- 5 个完整工作流示例
- 4 种数据格式规范 (JAXA, OSTIA, HDF5, NPY)
- 珠三角区域标准参数

## 🧪 测试文件说明

### test_processor.py (12K, 350+ 行)
**功能**: 完整测试套件

**测试内容**:
1. ✅ 依赖检查
2. ✅ 创建示例 NetCDF 数据
3. ✅ 加载元数据
4. ✅ 生成掩码
5. ✅ 计算统计
6. ✅ 应用掩码创建训练对

**运行方式**:
```bash
python3 test_processor.py
```

**预期输出**: 每个测试的 ✅ 或 ❌ 标记

---

### quick_start.sh / quick_start.bat
**功能**: 自动安装和测试脚本

**包含步骤**:
1. 检查 Python 安装
2. 检查 Python 依赖
3. 自动安装缺失依赖 (可选)
4. 运行测试套件 (可选)
5. 显示下一步说明

**运行方式**:
```bash
# Linux/Mac
bash quick_start.sh

# Windows
quick_start.bat
```

## 📊 使用流程图

```
开始
  ↓
[选择路径]
  ├─→ 首次使用？
  │     ↓
  │   📖 README_ENHANCED.md
  │     ↓
  │   📋 INSTALLATION.md
  │     ↓
  │   🎬 quick_start.sh/bat
  │     ↓
  │   🧪 test_processor.py
  │     ↓
  │   开始使用工具
  │
  ├─→ 遇到问题？
  │     ↓
  │   📋 INSTALLATION.md § 常见问题
  │     ↓
  │   🧪 test_processor.py (诊断)
  │
  ├─→ 查找功能？
  │     ↓
  │   📊 SUMMARY.md § 核心功能
  │     ↓
  │   📄 operationsConfig.ts
  │
  └─→ 开发集成？
        ↓
      📄 pythonIntegration.ts API
        ↓
      📄 oceandata_processor.py 源码
```

## 🎯 典型任务快速查找

| 任务 | 参考文件 | 章节 |
|-----|---------|-----|
| 安装 Python 依赖 | INSTALLATION.md | § 安装步骤 |
| 生成 JAXA 掩码 | README_ENHANCED.md | § 流程 1 |
| 处理 OSTIA 数据 | README_ENHANCED.md | § 流程 2 |
| 合并月度文件 | README_ENHANCED.md | § 流程 3 |
| 质量检查 | README_ENHANCED.md | § 流程 4 |
| 查看所有参数 | README_ENHANCED.md | § 参数说明 |
| 理解数据格式 | operationsConfig.ts | FORMAT_SPECIFICATIONS |
| 查看工作流示例 | operationsConfig.ts | WORKFLOW_EXAMPLES |
| Python API 文档 | oceandata_processor.py | 函数注释 |
| TypeScript API | pythonIntegration.ts | 类型定义 |
| 遇到错误 | INSTALLATION.md | § 常见问题 |
| 性能优化 | INSTALLATION.md | § 性能优化 |

## 💡 使用建议

### 建议阅读顺序

**第一次使用** (15-30 分钟):
1. README_ENHANCED.md (前半部分) - 10 分钟
2. INSTALLATION.md - 5 分钟
3. 运行 quick_start.sh/bat - 5 分钟
4. 运行 test_processor.py - 5-10 分钟

**深入理解** (30-60 分钟):
1. SUMMARY.md - 15 分钟
2. README_ENHANCED.md (完整) - 20 分钟
3. operationsConfig.ts (浏览) - 10 分钟
4. 尝试真实数据 - 15-30 分钟

**开发集成** (1-2 小时):
1. pythonIntegration.ts (API) - 30 分钟
2. oceandata_processor.py (实现) - 30 分钟
3. operationsConfig.ts (配置) - 30 分钟

### 文件优先级

⭐⭐⭐ **必读**:
- README_ENHANCED.md
- INSTALLATION.md

⭐⭐ **推荐**:
- SUMMARY.md
- test_processor.py

⭐ **参考**:
- operationsConfig.ts
- pythonIntegration.ts
- oceandata_processor.py
- prompt_enhanced.ts

## 🔗 相关资源

### 外部文档
- **原始需求**: `D:\data_for_agent\data_for_agent\README.md`
- **xarray 文档**: https://docs.xarray.dev/
- **h5py 文档**: https://docs.h5py.org/
- **netCDF4-python**: https://unidata.github.io/netcdf4-python/
- **CMEMS 产品手册**: `/data_new/sst_data/CMEMS-SST-PUM-010-011.pdf`

### 数据路径
- **JAXA 示例**: `/data_new/sst_data/data_for_agent/scripts/raw_data/JAXA/`
- **OSTIA 示例**: `/data_new/sst_data/data_for_agent/scripts/raw_data/OSTIA/`
- **JAXA 完整**: `/data_new/sst_data/jaxa_extract/`
- **OSTIA 完整**: `/data_new/sst_data/250922_jaxa_processing/copernicus_data/`

## 📞 获取帮助

遇到问题时:

1. **查看文档**:
   - INSTALLATION.md § 常见问题
   - README_ENHANCED.md § 错误处理

2. **运行诊断**:
   ```bash
   python3 test_processor.py
   python3 oceandata_processor.py check_deps
   ```

3. **检查依赖**:
   ```bash
   pip list | grep -E "xarray|netCDF4|h5py|numpy|scipy"
   ```

4. **查看详细错误**:
   使用 `--verbose` 或检查 Python traceback

## 🎉 开始使用

准备好了吗？从这里开始：

```bash
# 1. 快速开始
bash quick_start.sh        # Linux/Mac
# 或
quick_start.bat            # Windows

# 2. 阅读文档
cat README_ENHANCED.md     # 或在编辑器中打开

# 3. 运行测试
python3 test_processor.py

# 4. 尝试真实数据
python3 oceandata_processor.py generate_masks \
  --file /path/to/your/jaxa_data.nc \
  --variable sst \
  --params '{"missing_ratio_range": [0.1, 0.6], "mask_count": 360}'
```

祝使用愉快！🌊

---

**文件版本**: v1.0
**创建日期**: 2024-10-29
**工具版本**: OceanDataPreprocessTool Enhanced v1.0
