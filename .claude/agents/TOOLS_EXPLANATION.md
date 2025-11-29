# Ocean Data Specialist Agent - 工具清单

## 🔧 Agent 与工具的关系

### 重要概念

**Agent** (ocean-data-specialist) ≠ 工具本身

- **Agent**: 一个专门的 AI 助手，理解海洋数据处理任务
- **Tools**: Agent 可以调用的实际功能模块

`jaxa_cloud_mask_extraction.py` 是一个**独立的 Python 脚本**，不是 Agent 中定义的工具。

### Agent 的角色

Agent 就像一个**专家顾问**：
- 理解你的海洋数据需求
- 选择合适的工具
- 调用工具完成任务
- 解释结果

## 📋 Ocean Agent 可用的工具

根据 Agent 配置（第 4-16 行），Agent 可以使用以下工具：

### 🌊 专门的海洋数据工具（6 个）

#### 1. **OceanDataPreprocess** ⭐ 核心工具
**位置**: `C:\Users\chj\kode\src\tools\OceanDataPreprocessTool\`

**作用**:
- 海洋数据预处理（清洗、质量检查）
- **从 JAXA 数据生成云掩码** ⭐ 这是你关心的功能！
- 应用掩码到 OSTIA 数据
- 创建机器学习训练对
- 空间裁剪和网格对齐
- 缺失数据填充

**主要操作**:
- `generate_masks`: 从 JAXA 提取云掩码
- `apply_masks`: 应用掩码创建缺失数据
- `build_training_pairs`: 构建 input/ground_truth 训练对
- `spatial_subset`: 空间裁剪
- `fill_missing`: 填充缺失值
- `clean`: 数据清洗
- `quality_check`: 质量检查

**支持格式**: CSV, JSON, NetCDF (.nc), HDF5 (.h5)

**Python 集成**:
- 使用 `oceandata_processor.py` 作为后端
- 自动调用 xarray, h5py 处理 NetCDF/HDF5

---

#### 2. **OceanDatabaseQuery**
**位置**: `C:\Users\chj\kode\src\tools\OceanDatabaseQueryTool\`

**作用**:
- 查询海洋科学数据库
- 获取历史海洋观测数据

**支持的数据库**:
- **WOD** (World Ocean Database)
- **COPERNICUS** (Copernicus Marine Service)
- **ARGO** (全球剖面浮标)
- **GLODAP** (Global Ocean Data Analysis Project)

**查询参数**:
- 地理区域（经纬度范围）
- 深度范围
- 时间段
- 海洋参数（温度、盐度、压力等）

**输出格式**: CSV, JSON

---

#### 3. **OceanProfileAnalysis**
**位置**: `C:\Users\chj\kode\src\tools\OceanProfileAnalysisTool\`

**作用**:
- 分析垂直海洋剖面（CTD 数据）
- 计算海洋学参数

**计算功能**:
- **密度**: σt, σθ, 位势密度
- **混合层深度** (MLD)
- **温跃层/盐跃层/密度跃层** 深度
- **稳定性**: Brunt-Väisälä 频率 (N²)
- **声速**: 海水声速剖面
- **动力高度**: 地转流计算

**应用场景**:
- CTD 数据分析
- 水团识别
- 海洋分层研究
- T-S 图绘制

---

#### 4. **TimeSeriesAnalysis**
**位置**: `C:\Users\chj\kode\src\tools\TimeSeriesAnalysisTool\`

**作用**:
- 海洋时间序列分析
- 识别时间模式和趋势

**分析功能**:
- **分解**: 趋势、季节、残差
- **统计**: 均值、方差、自相关
- **异常检测**: 识别异常事件
- **预测**: 时间序列预测

**应用场景**:
- 浮标数据分析
- 潮汐分析
- 海温变化趋势
- 气候指数分析

---

#### 5. **GeoSpatialPlot**
**位置**: `C:\Users\chj\kode\src\tools\GeoSpatialPlotTool\`

**作用**:
- 创建地理空间可视化
- 绘制海洋数据地图

**绘图类型**:
- **等值线图**: 海温、盐度分布
- **散点图**: 站位分布
- **热力图**: 空间数据密度
- **向量场**: 海流方向和速度

**地图要素**:
- 海岸线
- 地形/水深
- 经纬网格
- 颜色标尺

**投影支持**: 多种地图投影（Mercator, Lambert 等）

---

#### 6. **StandardChart**
**位置**: `C:\Users\chj\kode\src\tools\StandardChartTool\`

**作用**:
- 创建标准科学图表
- 出版质量的图形

**图表类型**:
- **折线图**: 时间序列、剖面
- **散点图**: T-S 图、相关性
- **柱状图**: 统计分布
- **箱线图**: 数据对比
- **热图**: 相关矩阵

**应用**:
- T-S 图（温度-盐度）
- 垂直剖面图
- 对比分析
- 统计展示

---

### 🛠️ 通用工具（6 个）

#### 7. **FileRead**
**作用**: 读取文件内容
- 支持文本、图像、PDF、Jupyter Notebooks
- 可指定行数和偏移量

#### 8. **FileWrite**
**作用**: 写入文件
- 创建新文件
- 覆盖现有文件
- 自动创建目录

#### 9. **FileEdit**
**作用**: 编辑文件
- 精确的字符串替换
- 保留文件格式
- 支持正则表达式

#### 10. **Bash**
**作用**: 执行命令行命令
- 运行 Python 脚本
- 文件操作
- 系统命令
- 支持后台运行

#### 11. **Glob**
**作用**: 文件模式匹配
- 查找文件
- 支持通配符（*.nc, **/*.h5）
- 按修改时间排序

#### 12. **Grep**
**作用**: 搜索文件内容
- 正则表达式搜索
- 多文件搜索
- 显示匹配行

---

## 🎯 工具使用场景

### 场景 1: JAXA 云掩码提取（你关心的！）

**Agent 会使用**: OceanDataPreprocess

```
你说: 我需要从 JAXA 数据提取云掩码

Agent 选择: OceanDataPreprocess 工具
操作: generate_masks
参数:
  - file_path: JAXA NetCDF 文件
  - variable_name: 'sst'
  - missing_ratio_range: [0.1, 0.6]
  - mask_count: 360

后端执行: oceandata_processor.py
```

**注意**: Agent 不会直接执行 `jaxa_cloud_mask_extraction.py`，而是调用内置的 OceanDataPreprocess 工具，该工具有 Python 后端 `oceandata_processor.py`。

---

### 场景 2: CTD 剖面分析

**Agent 会使用**:
- OceanProfileAnalysis（分析）
- StandardChart（绘图）

```
你说: 分析这个 CTD 剖面

Agent 工作流:
1. FileRead - 读取 CTD 数据
2. OceanProfileAnalysis - 计算密度、MLD
3. StandardChart - 绘制 T-S 图和剖面图
```

---

### 场景 3: 数据库查询 + 可视化

**Agent 会使用**:
- OceanDatabaseQuery（查询）
- GeoSpatialPlot（地图）

```
你说: 查询南海 2020 年的温度数据并绘制地图

Agent 工作流:
1. OceanDatabaseQuery - 从 COPERNICUS 查询数据
2. GeoSpatialPlot - 创建温度分布地图
```

---

### 场景 4: 时间序列分析

**Agent 会使用**:
- TimeSeriesAnalysis（分析）
- StandardChart（绘图）

```
你说: 分析海温时间序列的趋势

Agent 工作流:
1. FileRead - 读取时间序列数据
2. TimeSeriesAnalysis - 分解趋势、季节、残差
3. StandardChart - 绘制分解图
```

---

## 🔄 工具之间的配合

Agent 可以**链式调用**多个工具：

### 示例：完整的 ML 数据准备流程

```
你说: 准备 JAXA/OSTIA 的机器学习训练数据

Agent 执行:
1. FileRead - 检查 JAXA 文件
2. OceanDataPreprocess (generate_masks) - 提取云掩码
3. FileRead - 检查 OSTIA 文件
4. OceanDataPreprocess (build_training_pairs) - 创建训练对
5. FileRead - 验证输出 HDF5
6. Bash - 运行测试脚本（可选）
```

---

## 📊 工具对比表

| 工具 | 主要功能 | 输入格式 | 输出格式 | Python 后端 |
|-----|---------|---------|---------|------------|
| **OceanDataPreprocess** | 预处理、掩码、训练对 | NC, HDF5, CSV | NC, HDF5, NPY | ✅ oceandata_processor.py |
| **OceanDatabaseQuery** | 数据库查询 | API 参数 | CSV, JSON | ✅ HTTP requests |
| **OceanProfileAnalysis** | 剖面分析 | CSV, JSON | JSON | ✅ 海洋学计算 |
| **TimeSeriesAnalysis** | 时间序列 | CSV, JSON | JSON | ✅ 统计分析 |
| **GeoSpatialPlot** | 地图绘制 | 数据 + 坐标 | PNG, SVG | ✅ 绘图库 |
| **StandardChart** | 图表绘制 | 数据 | PNG, SVG | ✅ 绘图库 |

---

## ❓ 关于 jaxa_cloud_mask_extraction.py

### 它是什么？

`jaxa_cloud_mask_extraction.py` 可能是：
1. **你自己写的脚本**：独立的 Python 脚本
2. **原始 README 中的脚本**：`jaxa_process.py` 的另一个版本
3. **独立工具**：不属于 Kode Agent 系统

### 与 Agent 的关系

- ❌ **不是** Agent 中定义的工具
- ❌ **不会** 被 Agent 直接调用
- ✅ **可以** 通过 Bash 工具运行：
  ```
  Agent 使用 Bash 工具:
  bash: python jaxa_cloud_mask_extraction.py --input data.nc
  ```

### OceanDataPreprocess vs jaxa_cloud_mask_extraction.py

| 特性 | OceanDataPreprocess | jaxa_cloud_mask_extraction.py |
|-----|-------------------|------------------------------|
| 集成到 Kode | ✅ 是 | ❌ 否 |
| Agent 直接调用 | ✅ 是 | ❌ 否（需通过 Bash） |
| 功能范围 | 广泛（15+ 操作） | 专注（掩码提取） |
| Python 后端 | oceandata_processor.py | 独立脚本 |
| 推荐使用 | ✅ Agent 场景 | ✅ 独立使用 |

---

## 🎯 你应该使用哪个？

### 在 Kode/Agent 中

使用 **OceanDataPreprocess** 工具：

```
我需要从 JAXA 提取云掩码
→ Agent 调用 OceanDataPreprocess
→ 操作: generate_masks
→ 后端: oceandata_processor.py
```

### 独立命令行

使用 **jaxa_cloud_mask_extraction.py**（如果你有这个脚本）：

```bash
python jaxa_cloud_mask_extraction.py --input jaxa.nc --output masks.npy
```

### 在 Agent 中运行独立脚本

也可以让 Agent 通过 Bash 工具运行：

```
运行 jaxa_cloud_mask_extraction.py 处理 JAXA 数据
→ Agent 使用 Bash 工具
→ 执行: python jaxa_cloud_mask_extraction.py ...
```

---

## 📚 工具详细文档位置

每个工具都有详细文档：

```
C:\Users\chj\kode\src\tools\
├── OceanDataPreprocessTool/
│   ├── README_ENHANCED.md      ⭐ 详细使用指南
│   ├── INSTALLATION.md         ⭐ 安装说明
│   ├── oceandata_processor.py  ⭐ Python 后端
│   └── OceanDataPreprocessTool.tsx  (工具实现)
├── OceanDatabaseQueryTool/
│   ├── README.md
│   └── OceanDatabaseQueryTool.tsx
├── OceanProfileAnalysisTool/
│   ├── README.md
│   └── OceanProfileAnalysisTool.tsx
└── ... (其他工具)
```

---

## 🎓 总结

### Agent 配置的 12 个工具

**海洋专用**（6 个）：
1. ⭐ OceanDataPreprocess - 核心预处理工具（包含掩码生成）
2. OceanDatabaseQuery - 数据库查询
3. OceanProfileAnalysis - 剖面分析
4. TimeSeriesAnalysis - 时间序列
5. GeoSpatialPlot - 地图绘制
6. StandardChart - 图表绘制

**通用工具**（6 个）：
7. FileRead - 读文件
8. FileWrite - 写文件
9. FileEdit - 编辑文件
10. Bash - 运行命令
11. Glob - 查找文件
12. Grep - 搜索内容

### 关键点

1. ✅ Agent **调用工具**，不是直接执行 Python 脚本
2. ✅ OceanDataPreprocess 工具**已包含**云掩码提取功能
3. ✅ `oceandata_processor.py` 是 OceanDataPreprocess 的 Python 后端
4. ❌ `jaxa_cloud_mask_extraction.py` **不是** Agent 工具
5. ✅ 可以通过 Bash 工具运行任何 Python 脚本

---

**需要更多帮助？**
- 查看 `README_ENHANCED.md` 了解 OceanDataPreprocess 工具的详细用法
- 查看 `OCEAN_AGENT_GUIDE.md` 了解 Agent 的使用方法
