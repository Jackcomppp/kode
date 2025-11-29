# Ocean Data Specialist Agent - 使用指南

## 🌊 简介

Ocean Data Specialist Agent 是一个专门为海洋数据处理任务设计的 Kode AI Agent。当你需要处理任何海洋相关的数据时，这个 agent 会自动调用相应的海洋数据处理工具。

## ✨ 功能特点

### 自动工具调用
Agent 可以自动使用以下海洋数据工具：
- **OceanDataPreprocess**: 数据预处理、掩码生成、训练对构建
- **OceanDatabaseQuery**: 查询海洋科学数据库
- **OceanProfileAnalysis**: 垂直剖面分析（CTD 数据）
- **TimeSeriesAnalysis**: 时间序列分析
- **GeoSpatialPlot**: 地理空间可视化
- **StandardChart**: 标准图表绘制

### 领域专业知识
- 理解海洋学术语和参数（SST, CTD, MLD, 盐度, 密度等）
- 熟悉海洋数据格式（NetCDF, HDF5, CSV）
- 了解卫星观测数据（JAXA, OSTIA, MODIS）
- 掌握海洋数据库（WOD, COPERNICUS, ARGO）

## 🚀 使用方法

### 方法 1: 在 Kode 中直接使用（推荐）

只需一个命令，让 Kode 自动选择 Ocean Agent：

```bash
# 启动 Kode
kode

# 在 Kode 中输入任何海洋数据处理请求
# Agent 会自动被选择！
```

**示例对话**:

```
你: 我需要处理 JAXA 卫星数据，提取云掩码
Kode: [自动加载 ocean-data-specialist agent]
      好的！我会帮你从 JAXA 数据中提取云掩码...
      [自动调用 OceanDataPreprocess 工具]
```

### 方法 2: 显式指定 Agent

如果你想明确使用 Ocean Agent：

```bash
# 在 Kode 中
/agent ocean-data-specialist

# 然后开始你的任务
我有一个 CTD 剖面需要分析
```

### 方法 3: 一条命令完成

```bash
# 在终端中直接执行
kode --agent ocean-data-specialist "分析这个 CTD 文件: /path/to/ctd_data.csv"
```

## 📋 典型使用场景

### 场景 1: 卫星数据预处理（JAXA + OSTIA）

```bash
kode

# 在 Kode 中输入：
我需要从 JAXA 卫星数据生成云掩码，然后应用到 OSTIA 数据上创建训练对。

JAXA 文件: D:/data/jaxa_sst_2015.nc
OSTIA 文件: D:/data/ostia_monthly_2015.nc
区域: 珠三角 (15-24°N, 111-118°E)
```

**Agent 会自动**:
1. 理解你的需求
2. 使用 OceanDataPreprocess 的 `generate_masks` 操作
3. 生成云掩码
4. 使用 `build_training_pairs` 创建 HDF5 训练数据
5. 验证输出并提供总结

---

### 场景 2: CTD 剖面分析

```bash
kode

# 在 Kode 中输入：
分析这个 CTD 剖面，计算混合层深度和密度

文件: D:/data/cruise_station_01.csv
纬度: 22.5°N
经度: 115.0°E
```

**Agent 会自动**:
1. 读取 CTD 数据
2. 使用 OceanProfileAnalysis 计算密度、稳定性、MLD
3. 生成 T-S 图和垂直剖面图
4. 识别水团特征

---

### 场景 3: 海洋数据库查询

```bash
kode

# 在 Kode 中输入：
查询珠三角区域 2020 年的海表温度数据

数据库: COPERNICUS
参数: 温度
区域: 15-24°N, 111-118°E
时间: 2020-01-01 到 2020-12-31
```

**Agent 会自动**:
1. 使用 OceanDatabaseQuery 工具
2. 构建正确的查询参数
3. 获取数据
4. 可选：创建地图可视化

---

### 场景 4: 时间序列分析

```bash
kode

# 在 Kode 中输入：
分析这个海温时间序列，填补缺失值并识别趋势

文件: D:/data/sst_timeseries.csv
填补方法: 线性插值
```

**Agent 会自动**:
1. 检查数据质量
2. 使用 OceanDataPreprocess 填补缺失值
3. 使用 TimeSeriesAnalysis 分解趋势
4. 生成对比图表

---

### 场景 5: 空间数据可视化

```bash
kode

# 在 Kode 中输入：
创建海表温度分布地图

数据: D:/data/sst_field.nc
变量: analysed_sst
区域: 南海北部
投影: Mercator
```

**Agent 会自动**:
1. 读取 NetCDF 数据
2. 使用 GeoSpatialPlot 创建地图
3. 添加海岸线和标签
4. 保存高质量图片

## 🎯 Agent 工作原理

### 自动触发条件

Agent 会在以下情况下被自动选择：

1. **关键词匹配**:
   - 海洋、ocean、marine
   - SST, CTD, ARGO, JAXA, OSTIA
   - NetCDF, HDF5（在海洋上下文中）
   - 盐度、温度、密度、剖面

2. **任务类型**:
   - 卫星数据处理
   - 海洋剖面分析
   - 海洋数据库查询
   - 海洋时间序列
   - 海洋空间数据

3. **文件特征**:
   - NetCDF 文件（.nc）包含海洋变量
   - HDF5 文件（.h5）包含海洋数据
   - CSV 文件包含 lat/lon/depth/salinity 等列

### 工具选择逻辑

Agent 会根据任务自动选择合适的工具：

```
任务: "生成掩码"
→ OceanDataPreprocess

任务: "分析 CTD"
→ OceanProfileAnalysis

任务: "查询数据库"
→ OceanDatabaseQuery

任务: "时间序列趋势"
→ TimeSeriesAnalysis

任务: "创建地图"
→ GeoSpatialPlot

任务: "绘制剖面"
→ StandardChart
```

## 📚 Agent 配置详情

### 工具访问权限

Agent 可以使用的工具：
- ✅ OceanDataPreprocess（海洋数据预处理）
- ✅ OceanDatabaseQuery（数据库查询）
- ✅ OceanProfileAnalysis（剖面分析）
- ✅ TimeSeriesAnalysis（时间序列）
- ✅ GeoSpatialPlot（地理绘图）
- ✅ StandardChart（图表）
- ✅ FileRead, FileWrite, FileEdit（文件操作）
- ✅ Bash（命令执行）
- ✅ Glob, Grep（文件搜索）

### 模型配置

- **模型**: claude-3-5-sonnet-20241022
- **颜色**: 蓝色（在 Kode UI 中显示）
- **专业领域**: 海洋科学、数据处理

## 💡 使用技巧

### 1. 清晰描述你的需求

**好的示例**:
```
我需要：
1. 从 JAXA 数据提取云掩码（缺失比例 10-60%）
2. 应用到 OSTIA 数据
3. 生成 HDF5 训练对
4. 区域：珠三角
5. 网格：451×351
```

**需要改进的示例**:
```
处理数据
```

### 2. 提供文件路径

始终提供完整的文件路径：
```
文件: D:/data/ocean/jaxa_sst.nc
```

而不是：
```
文件在 data 文件夹里
```

### 3. 指定输出格式

明确你想要的输出：
```
输出格式: HDF5
保存到: D:/output/training_pairs.h5
```

### 4. 利用 Agent 的专业知识

你可以问：
- "什么是混合层深度？"
- "JAXA 和 OSTIA 数据有什么区别？"
- "如何识别水团？"
- "这个盐度值正常吗？"

### 5. 验证结果

Agent 会自动验证：
- 数据范围（温度、盐度是否合理）
- 单位一致性
- 地理边界
- 文件完整性

## 🔍 查看可用 Agents

在 Kode 中查看所有 agents：

```bash
# 在 Kode REPL 中
/agents

# 你会看到：
# - ocean-data-specialist (蓝色)
# - test-agent
# - dao-qi-harmony-designer
# - ... 其他 agents
```

## 🛠️ 高级用法

### 链式任务

你可以请求多步骤任务，Agent 会自动规划：

```
请帮我完成以下任务：
1. 从 WOD 数据库查询 2020 年南海的 CTD 数据
2. 对每个剖面计算混合层深度
3. 分析 MLD 的季节变化
4. 创建时间序列图和空间分布图
```

Agent 会：
1. 使用 OceanDatabaseQuery 获取数据
2. 使用 OceanProfileAnalysis 计算 MLD
3. 使用 TimeSeriesAnalysis 分析趋势
4. 使用 GeoSpatialPlot 和 StandardChart 可视化

### 批处理

处理多个文件：

```
我有 12 个月的 OSTIA 数据需要合并处理：
D:/data/ostia_2020_01.nc
D:/data/ostia_2020_02.nc
...
D:/data/ostia_2020_12.nc

请合并它们并提取珠三角区域的数据
```

### Python 集成

Agent 了解 Python 集成，会在需要时使用：

```
处理这个 NetCDF 文件，使用 Python 的 xarray 库

文件: D:/data/large_dataset.nc
操作: 生成掩码、空间裁剪、保存为 HDF5
```

## ⚠️ 注意事项

### 数据大小限制

- CSV/JSON: 最多 100,000 行
- NetCDF/HDF5: 建议 < 50MB（内存操作）
- 大文件会使用 Python 子进程处理

### 单位

Agent 保持原始单位：
- 温度：如果是 Kelvin 就保持 Kelvin
- 深度：通常是米
- 盐度：PSU
- 压力：dbar

如需转换，明确要求。

### 文件路径

在 Windows 上使用：
- `D:/data/file.nc`（推荐）
- 或 `D:\\data\\file.nc`
- 避免：`D:\data\file.nc`（转义问题）

## 🐛 故障排除

### Agent 没有被自动选择？

手动指定：
```bash
/agent ocean-data-specialist
```

### 工具调用失败？

检查：
1. 文件路径是否正确
2. 文件是否存在
3. 格式是否支持
4. Python 依赖是否安装（对于 NetCDF/HDF5）

### 需要安装 Python 依赖？

参考之前的安装指南：
```bash
pip install xarray netCDF4 h5py numpy scipy matplotlib
```

## 📖 相关文档

- **Agent 文件**: `C:\Users\chj\kode\.claude\agents\ocean-data-specialist.md`
- **工具文档**:
  - `C:\Users\chj\kode\src\tools\OceanDataPreprocessTool\README_ENHANCED.md`
  - `C:\Users\chj\kode\src\tools\OceanDataPreprocessTool\INSTALLATION.md`
- **Kode 文档**: `C:\Users\chj\kode\CLAUDE.md`

## 🎉 快速开始

现在你可以开始了！只需：

```bash
# 1. 启动 Kode
kode

# 2. 描述你的海洋数据任务
我需要处理海温卫星数据

# 3. Agent 会自动接管，调用合适的工具

# 4. 享受自动化的海洋数据处理！
```

## 💬 示例对话

```
用户: 你好，我需要分析一些海洋数据

Kode: [加载 ocean-data-specialist agent]
      你好！我是海洋数据专家。我可以帮你处理各种海洋数据：
      - 卫星观测数据（JAXA, OSTIA）
      - CTD 剖面分析
      - 海洋数据库查询
      - 时间序列分析
      - 空间可视化

      请告诉我你的数据类型和处理需求！

用户: 我有 JAXA 卫星 SST 数据，需要提取云掩码

Agent: 明白了！JAXA 数据包含真实的云覆盖，很适合提取掩码。
       让我帮你：

       1. 文件路径是什么？
       2. 需要多少个掩码？（通常 360 个）
       3. 缺失比例范围？（推荐 10%-60%）

       [然后自动调用 OceanDataPreprocess 工具]
```

## 🌟 总结

**一句话使用**:
```bash
kode
# 然后输入任何海洋数据处理需求，Agent 会自动处理！
```

Ocean Data Specialist Agent 让海洋数据处理变得简单。不需要记住复杂的工具调用，只需用自然语言描述你的需求，Agent 会自动选择合适的工具并执行！

祝你数据处理愉快！🌊
