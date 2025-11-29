# Ocean Data Specialist - 工具使用 Demo

这个文件包含 ocean-data-specialist Agent 中所有 12 个工具的详细使用方法和实际示例。

---

## 📋 目录

### 海洋专用工具
1. [OceanDataPreprocess](#1-oceandatapreprocess-) - 核心预处理工具
2. [OceanDatabaseQuery](#2-oceandatabasequery) - 数据库查询
3. [OceanProfileAnalysis](#3-oceanprofileanalysis) - 剖面分析
4. [TimeSeriesAnalysis](#4-timeseriesanalysis) - 时间序列
5. [GeoSpatialPlot](#5-geospatialplot) - 地图绘制
6. [StandardChart](#6-standardchart) - 科学图表

### 通用工具
7. [FileRead](#7-fileread) - 读取文件
8. [FileWrite](#8-filewrite) - 写入文件
9. [FileEdit](#9-fileedit) - 编辑文件
10. [Bash](#10-bash) - 命令执行
11. [Glob](#11-glob) - 文件搜索
12. [Grep](#12-grep) - 内容搜索

---

## 🌊 海洋专用工具

## 1. OceanDataPreprocess ⭐

**作用**：海洋数据预处理、掩码生成、ML 训练数据准备

### 1.1 从 JAXA 提取云掩码

**场景**：从 JAXA 卫星数据中提取真实的云覆盖模式

**使用方法**：
```
请求：从 JAXA 数据提取云掩码

参数说明：
- file_path: JAXA NetCDF 文件路径
- variable_name: 变量名（通常是 'sst' 或 'analysed_sst'）
- missing_ratio_range: 缺失比例范围 [最小, 最大]，如 [0.1, 0.6] 表示 10%-60%
- mask_count: 生成多少个掩码（用于数据增强）
- output_path: 输出 .npy 文件路径
```

**实际示例**：
```
用户：从 D:/ocean_data/jaxa_2020_sst.nc 中提取云掩码，生成 360 个掩码，缺失率 10-60%

Agent 执行：
OceanDataPreprocess {
  operation: "generate_masks",
  file_path: "D:/ocean_data/jaxa_2020_sst.nc",
  variable_name: "sst",
  missing_ratio_range: [0.1, 0.6],
  mask_count: 360,
  output_path: "D:/ocean_data/jaxa_masks.npy"
}

输出结果：
✅ 已生成 360 个云掩码
- 数据网格: 451×351
- 时间步数: 365 天
- 缺失比例: 10.2% - 59.8%
- 保存到: D:/ocean_data/jaxa_masks.npy
- 文件大小: 45.2 MB
```

---

### 1.2 构建 ML 训练对

**场景**：使用云掩码创建机器学习的输入/标签数据对

**使用方法**：
```
请求：使用 OSTIA 数据和云掩码构建训练数据

参数说明：
- ground_truth_file: OSTIA 完整数据文件（作为真值）
- masks_file: 之前生成的云掩码文件
- variable_name: 变量名（'sst' 或 'analysed_sst'）
- output_hdf5: 输出 HDF5 文件路径
- region: 可选，空间裁剪 [lat_min, lat_max, lon_min, lon_max]
```

**实际示例**：
```
用户：用 OSTIA 数据和刚才的掩码创建训练对，裁剪珠三角区域

Agent 执行：
OceanDataPreprocess {
  operation: "build_training_pairs",
  ground_truth_file: "D:/ocean_data/ostia_2020_sst.nc",
  masks_file: "D:/ocean_data/jaxa_masks.npy",
  variable_name: "analysed_sst",
  region: [15, 24, 111, 118],  // 珠三角
  output_hdf5: "D:/ocean_data/training_data.h5"
}

输出结果：
✅ 训练数据已创建
- 样本数量: 360 × 365 = 131,400 个
- 数据结构:
  • input_sst: (131400, 451, 351) - 有缺失的输入
  • ground_truth_sst: (131400, 451, 351) - 完整的真值
  • masks: (131400, 451, 351) - 布尔掩码
- 保存到: D:/ocean_data/training_data.h5
- 文件大小: 2.3 GB
```

---

### 1.3 空间裁剪

**场景**：提取特定地理区域的数据

**实际示例**：
```
用户：裁剪南海区域（5-25°N, 105-120°E）的 SST 数据

Agent 执行：
OceanDataPreprocess {
  operation: "spatial_subset",
  file_path: "D:/ocean_data/global_sst.nc",
  variable_name: "sst",
  region: [5, 25, 105, 120],
  output_path: "D:/ocean_data/south_china_sea_sst.nc"
}

输出结果：
✅ 空间裁剪完成
- 原始网格: 1440×720 (全球 0.25°)
- 裁剪后: 60×80
- 数据减少: 99.7% (2.1 GB → 6.3 MB)
```

---

### 1.4 填充缺失值

**场景**：插值填充数据中的空缺

**实际示例**：
```
用户：用线性插值填充温度时间序列的缺失值

Agent 执行：
OceanDataPreprocess {
  operation: "fill_missing",
  file_path: "D:/ocean_data/buoy_temp.csv",
  method: "linear",
  max_gap: 5,  // 最大填充 5 天
  output_path: "D:/ocean_data/buoy_temp_filled.csv"
}

输出结果：
✅ 缺失值填充完成
- 原始缺失: 234 个点 (6.4%)
- 填充成功: 198 个点
- 保持空白: 36 个点 (间隔 > 5 天)
- 填充方法: 线性插值
```

---

### 1.5 数据质量检查

**场景**：检查数据有效性和异常值

**实际示例**：
```
用户：检查 CTD 数据的质量

Agent 执行：
OceanDataPreprocess {
  operation: "quality_check",
  file_path: "D:/ocean_data/ctd_station01.csv",
  parameters: {
    temperature: {range: [-2, 40], unit: "°C"},
    salinity: {range: [0, 42], unit: "PSU"},
    pressure: {range: [0, 12000], unit: "dbar"}
  }
}

输出结果：
⚠️ 质量检查发现问题：
- Temperature: ✅ 所有值在有效范围内
- Salinity: ⚠️ 3 个值超出范围
  • 行 45: 45.2 PSU (应 < 42)
  • 行 67: -1.5 PSU (应 > 0)
  • 行 89: 43.1 PSU (应 < 42)
- Pressure: ✅ 所有值在有效范围内
- 建议: 检查原始数据或仪器校准
```

---

## 2. OceanDatabaseQuery

**作用**：查询权威海洋数据库

### 2.1 查询 ARGO 浮标数据

**实际示例**：
```
用户：查询 2020 年南海的 ARGO 浮标温度剖面

Agent 执行：
OceanDatabaseQuery {
  database: "ARGO",
  parameters: ["temperature", "salinity", "pressure"],
  region: {
    lat: [5, 25],
    lon: [105, 120]
  },
  time_range: ["2020-01-01", "2020-12-31"],
  depth_range: [0, 2000],
  output_format: "csv",
  output_path: "D:/ocean_data/argo_scs_2020.csv"
}

输出结果：
✅ 查询完成
- 找到 156 个 ARGO 浮标剖面
- 数据点: 23,451 个
- 深度范围: 0-1987 米
- 时间跨度: 2020-01-03 至 2020-12-28
- 参数: 温度、盐度、压力
- 保存到: D:/ocean_data/argo_scs_2020.csv

数据预览：
| float_id | date       | lat   | lon    | depth | temp  | salt  |
|----------|------------|-------|--------|-------|-------|-------|
| 2902123  | 2020-01-03 | 18.5  | 115.2  | 5     | 24.3  | 34.2  |
| 2902123  | 2020-01-03 | 18.5  | 115.2  | 10    | 24.1  | 34.3  |
| ...      | ...        | ...   | ...    | ...   | ...   | ...   |
```

---

### 2.2 查询 COPERNICUS 再分析数据

**实际示例**：
```
用户：查询珠江口 2019-2021 年的月平均 SST

Agent 执行：
OceanDatabaseQuery {
  database: "COPERNICUS",
  parameters: ["sea_surface_temperature"],
  region: {
    lat: [21, 23],
    lon: [113, 115]
  },
  time_range: ["2019-01-01", "2021-12-31"],
  temporal_resolution: "monthly",
  output_format: "json",
  output_path: "D:/ocean_data/prd_sst_monthly.json"
}

输出结果：
✅ 查询完成
- 时间点: 36 个月
- 网格大小: 8×8 (0.25°分辨率)
- 数据来源: COPERNICUS GLOBAL_REANALYSIS_PHY_001_030
- 保存到: D:/ocean_data/prd_sst_monthly.json

统计摘要：
- 平均 SST: 24.6°C
- 最高: 29.8°C (2019-08)
- 最低: 18.2°C (2021-01)
- 季节变化: 11.6°C
```

---

## 3. OceanProfileAnalysis

**作用**：分析垂直海洋剖面（CTD 数据）

### 3.1 计算密度和混合层深度

**实际示例**：
```
用户：分析 CTD 剖面，计算密度和 MLD

Agent 执行：
OceanProfileAnalysis {
  operation: "calculate_density_and_mld",
  file_path: "D:/ocean_data/ctd_station_A01.csv",
  columns: {
    temperature: "temp",
    salinity: "salt",
    pressure: "pres"
  },
  mld_criteria: {
    method: "density_threshold",
    threshold: 0.03  // kg/m³
  },
  output_path: "D:/ocean_data/ctd_A01_analysis.json"
}

输出结果：
✅ 剖面分析完成

1. 混合层深度 (MLD):
   - MLD = 42 米
   - 表层密度 (5m): 1023.45 kg/m³
   - MLD 处密度: 1023.48 kg/m³
   - 密度差: 0.03 kg/m³

2. 层结特征:
   - 混合层: 0-42 m (均匀混合)
   - 温跃层: 42-150 m (强梯度)
   - 深层水: >150 m (弱梯度)

3. 密度剖面:
   | 深度(m) | 温度(°C) | 盐度(PSU) | σt(kg/m³) | σθ(kg/m³) |
   |---------|----------|-----------|-----------|-----------|
   | 5       | 28.5     | 33.8      | 21.45     | 21.45     |
   | 50      | 28.3     | 33.9      | 21.48     | 21.48     |
   | 100     | 22.1     | 34.2      | 23.67     | 23.68     |
   | 200     | 15.8     | 34.5      | 25.89     | 25.92     |
   | 500     | 8.2      | 34.4      | 27.12     | 27.22     |
```

---

### 3.2 计算稳定性（Brunt-Väisälä 频率）

**实际示例**：
```
用户：计算水体稳定性，识别强分层区域

Agent 执行：
OceanProfileAnalysis {
  operation: "calculate_stability",
  file_path: "D:/ocean_data/ctd_station_A01.csv",
  output_path: "D:/ocean_data/ctd_A01_stability.csv"
}

输出结果：
✅ 稳定性分析完成

Brunt-Väisälä 频率 (N²):
- 表层 (0-50m): N² = 0.0002 s⁻² (弱分层)
- 温跃层 (50-150m): N² = 0.0045 s⁻² ⭐ (强分层)
- 深层 (>150m): N² = 0.0001 s⁻² (非常弱)

强分层区域（N² > 0.001 s⁻²）:
- 深度范围: 62-145 米
- 最大 N²: 0.0058 s⁻² (深度 85m)
- 物理意义: 该层阻碍垂直混合
```

---

### 3.3 T-S 图分析（温度-盐度图）

**实际示例**：
```
用户：创建 T-S 图，识别水团类型

Agent 执行：
OceanProfileAnalysis {
  operation: "ts_diagram",
  file_path: "D:/ocean_data/ctd_station_A01.csv",
  add_density_contours: true,
  output_path: "D:/ocean_data/ts_diagram.png"
}

输出结果：
✅ T-S 图已生成

水团识别：
1. **表层水团** (28-29°C, 33.5-34.0 PSU)
   - 特征: 高温、低盐
   - 深度: 0-50m
   - 来源: 受珠江冲淡水影响

2. **次表层水团** (20-25°C, 34.0-34.5 PSU)
   - 特征: 中温、中盐
   - 深度: 50-150m
   - 来源: 南海表层水

3. **深层水团** (8-15°C, 34.4-34.6 PSU)
   - 特征: 低温、高盐
   - 深度: >200m
   - 来源: 南海深层水

图表保存: D:/ocean_data/ts_diagram.png
```

---

## 4. TimeSeriesAnalysis

**作用**：时间序列数据分析

### 4.1 时间序列分解

**实际示例**：
```
用户：分析海温时间序列的趋势和季节性

Agent 执行：
TimeSeriesAnalysis {
  operation: "decompose",
  file_path: "D:/ocean_data/sst_daily_2015_2020.csv",
  date_column: "date",
  value_column: "sst",
  period: 365,  // 年周期
  model: "additive",
  output_path: "D:/ocean_data/sst_decomposition.json"
}

输出结果：
✅ 时间序列分解完成

1. **趋势 (Trend)**:
   - 2015-2020 年增温: +0.8°C
   - 年均增长率: +0.16°C/年
   - 趋势显著性: p < 0.001 ⭐

2. **季节性 (Seasonal)**:
   - 振幅: 11.2°C
   - 最暖月: 8月 (平均 29.3°C)
   - 最冷月: 2月 (平均 18.1°C)
   - 季节模式稳定

3. **残差 (Residual)**:
   - 标准差: 0.8°C
   - 异常事件: 检测到 3 次 (>2σ)
     • 2016-01-15: -2.3°C (寒潮)
     • 2017-07-20: +2.8°C (热浪)
     • 2019-03-10: -1.9°C (冷空气)

图表已生成: 包含原始数据、趋势、季节、残差
```

---

### 4.2 异常检测

**实际示例**：
```
用户：识别海温异常事件

Agent 执行：
TimeSeriesAnalysis {
  operation: "detect_anomalies",
  file_path: "D:/ocean_data/sst_daily_2015_2020.csv",
  method: "statistical",
  threshold: 2.0,  // 2倍标准差
  output_path: "D:/ocean_data/sst_anomalies.csv"
}

输出结果：
✅ 检测到 15 个异常事件

异常事件列表：
1. 2016-01-15 至 2016-01-22 (8天)
   - 异常值: -2.3°C (低于正常)
   - 类型: 寒潮事件

2. 2017-07-18 至 2017-07-25 (8天)
   - 异常值: +2.8°C (高于正常)
   - 类型: 海洋热浪

3. 2019-08-10 至 2019-08-13 (4天)
   - 异常值: +3.1°C (高于正常)
   - 类型: 极端高温

... (共 15 个)

统计摘要:
- 冷异常: 7 次
- 暖异常: 8 次
- 平均持续: 5.3 天
- 最长持续: 12 天 (2018-02)
```

---

### 4.3 时间序列预测

**实际示例**：
```
用户：预测未来 30 天的海温

Agent 执行：
TimeSeriesAnalysis {
  operation: "forecast",
  file_path: "D:/ocean_data/sst_daily_2015_2020.csv",
  model: "arima",
  forecast_periods: 30,
  confidence_level: 0.95,
  output_path: "D:/ocean_data/sst_forecast.csv"
}

输出结果：
✅ 预测完成 (未来 30 天)

预测结果（前 10 天）:
| 日期       | 预测值(°C) | 95% 置信区间下限 | 95% 置信区间上限 |
|-----------|-----------|----------------|----------------|
| 2021-01-01| 19.8      | 18.5           | 21.1           |
| 2021-01-02| 19.6      | 18.2           | 21.0           |
| 2021-01-03| 19.5      | 17.9           | 21.1           |
| ...       | ...       | ...            | ...            |

模型性能:
- 模型类型: ARIMA(2,1,2)
- 训练集 RMSE: 0.72°C
- 验证集 RMSE: 0.85°C
- AIC: 1234.5

预测趋势: 逐步降温 (冬季模式)
```

---

## 5. GeoSpatialPlot

**作用**：创建地理空间可视化（地图）

### 5.1 SST 空间分布图

**实际示例**：
```
用户：绘制南海海表温度分布图

Agent 执行：
GeoSpatialPlot {
  plot_type: "contourf",  // 填充等值线
  data_file: "D:/ocean_data/scs_sst_2020_summer.nc",
  variable: "sst",
  region: [5, 25, 105, 120],
  projection: "PlateCarree",
  colormap: "thermal",
  add_coastline: true,
  add_gridlines: true,
  title: "南海夏季平均海表温度 (2020)",
  colorbar_label: "Temperature (°C)",
  output_path: "D:/ocean_data/scs_sst_map.png"
}

输出结果：
✅ 地图已生成

数据统计:
- 平均 SST: 29.1°C
- 最高: 31.5°C (越南东部沿海)
- 最低: 26.8°C (深海区域)
- 空间梯度: 0.2°C/100km

图表要素:
- 海岸线: ✅
- 经纬网格: ✅ (每 5°)
- 颜色标尺: ✅
- 投影: 等距圆柱投影
- 分辨率: 1200×900 像素

保存到: D:/ocean_data/scs_sst_map.png
```

---

### 5.2 站位分布图

**实际示例**：
```
用户：绘制 ARGO 浮标的空间分布

Agent 执行：
GeoSpatialPlot {
  plot_type: "scatter",
  data_file: "D:/ocean_data/argo_locations.csv",
  lat_column: "latitude",
  lon_column: "longitude",
  color_by: "profile_count",
  marker_size: "profile_count",
  region: [5, 25, 105, 120],
  add_coastline: true,
  title: "南海 ARGO 浮标分布 (2020)",
  colorbar_label: "剖面数量",
  output_path: "D:/ocean_data/argo_distribution.png"
}

输出结果：
✅ 站位分布图已生成

站位统计:
- 浮标数量: 156 个
- 剖面总数: 2,341 个
- 平均剖面/浮标: 15.0
- 空间覆盖: 较均匀

空间分布特征:
- 高密度区: 吕宋海峡 (35 个浮标)
- 低密度区: 北部湾 (8 个浮标)
- 深海区覆盖充足

保存到: D:/ocean_data/argo_distribution.png
```

---

### 5.3 海流矢量场

**实际示例**：
```
用户：绘制夏季表层海流分布

Agent 执行：
GeoSpatialPlot {
  plot_type: "quiver",  // 矢量箭头
  data_file: "D:/ocean_data/scs_current_summer.nc",
  u_variable: "u_velocity",  // 东向分量
  v_variable: "v_velocity",  // 北向分量
  region: [5, 25, 105, 120],
  skip: 3,  // 每 3 个点绘制一个箭头
  scale: 30,
  add_coastline: true,
  title: "南海夏季表层环流 (2020)",
  output_path: "D:/ocean_data/scs_current.png"
}

输出结果：
✅ 海流矢量图已生成

海流特征:
- 平均流速: 0.35 m/s
- 最大流速: 1.2 m/s (吕宋海峡)
- 主要环流: 气旋式涡旋
- 主流向: 西南向

环流系统:
- 北部: 南海暖流 (东北向)
- 中部: 反气旋涡 (顺时针)
- 南部: 越南沿岸流 (西南向)

保存到: D:/ocean_data/scs_current.png
```

---

## 6. StandardChart

**作用**：创建标准科学图表

### 6.1 T-S 图（温度-盐度散点图）

**实际示例**：
```
用户：创建多站位的 T-S 图对比

Agent 执行：
StandardChart {
  chart_type: "scatter",
  data_files: [
    "D:/ocean_data/ctd_station_A01.csv",
    "D:/ocean_data/ctd_station_B02.csv",
    "D:/ocean_data/ctd_station_C03.csv"
  ],
  x_column: "salinity",
  y_column: "temperature",
  color_by: "station",
  add_density_contours: true,
  xlabel: "盐度 (PSU)",
  ylabel: "温度 (°C)",
  title: "三个站位的 T-S 图对比",
  legend: true,
  output_path: "D:/ocean_data/ts_comparison.png"
}

输出结果：
✅ T-S 图已生成

站位特征对比:
1. 站位 A01 (近岸):
   - 温度范围: 18-29°C
   - 盐度范围: 32.5-34.2 PSU
   - 受淡水影响明显

2. 站位 B02 (陆架):
   - 温度范围: 15-28°C
   - 盐度范围: 33.8-34.6 PSU
   - 典型陆架水特征

3. 站位 C03 (深海):
   - 温度范围: 8-27°C
   - 盐度范围: 34.3-34.7 PSU
   - 深层水明显

密度等值线: σt = 20-27 kg/m³

保存到: D:/ocean_data/ts_comparison.png
```

---

### 6.2 垂直剖面图

**实际示例**：
```
用户：绘制温度和盐度的垂直剖面

Agent 执行：
StandardChart {
  chart_type: "line",
  data_file: "D:/ocean_data/ctd_station_A01.csv",
  x_columns: ["temperature", "salinity"],
  y_column: "depth",
  invert_y: true,  // 深度向下
  xlabel: ["温度 (°C)", "盐度 (PSU)"],
  ylabel: "深度 (m)",
  title: "站位 A01 垂直剖面",
  subplot: true,  // 两个子图
  output_path: "D:/ocean_data/vertical_profile.png"
}

输出结果：
✅ 垂直剖面图已生成

剖面特征:
1. 温度剖面:
   - 表层 (0-50m): 28-29°C (混合均匀)
   - 温跃层 (50-150m): 29→15°C (急剧下降)
   - 深层 (>150m): 15→8°C (缓慢下降)

2. 盐度剖面:
   - 表层 (0-30m): 33.5-33.8 PSU (淡水影响)
   - 次表层 (30-100m): 33.8→34.5 PSU (逐渐增加)
   - 深层 (>100m): 34.5 PSU (稳定)

保存到: D:/ocean_data/vertical_profile.png
```

---

### 6.3 时间序列折线图

**实际示例**：
```
用户：绘制 2020 年逐日 SST 变化

Agent 执行：
StandardChart {
  chart_type: "line",
  data_file: "D:/ocean_data/sst_daily_2020.csv",
  x_column: "date",
  y_column: "sst",
  add_moving_average: true,
  ma_window: 30,  // 30天移动平均
  xlabel: "日期",
  ylabel: "海表温度 (°C)",
  title: "2020 年逐日 SST 变化（含 30 天移动平均）",
  grid: true,
  output_path: "D:/ocean_data/sst_timeseries.png"
}

输出结果：
✅ 时间序列图已生成

年度特征:
- 年平均: 25.3°C
- 最高: 30.1°C (2020-08-15)
- 最低: 17.9°C (2020-02-08)
- 年较差: 12.2°C

季节变化:
- 冬季 (12-2月): 18-21°C
- 春季 (3-5月): 21-27°C (快速升温)
- 夏季 (6-8月): 28-30°C
- 秋季 (9-11月): 27-22°C (逐步降温)

短期波动:
- 日变化幅度: 0.5-1.5°C
- 事件峰值: 3 次明显冷/暖事件

保存到: D:/ocean_data/sst_timeseries.png
```

---

### 6.4 箱线图（统计对比）

**实际示例**：
```
用户：对比 4 个季节的 SST 分布

Agent 执行：
StandardChart {
  chart_type: "boxplot",
  data_file: "D:/ocean_data/sst_2015_2020.csv",
  x_column: "season",
  y_column: "sst",
  order: ["Winter", "Spring", "Summer", "Fall"],
  xlabel: "季节",
  ylabel: "海表温度 (°C)",
  title: "2015-2020 年各季节 SST 分布对比",
  showfliers: true,  // 显示异常值
  output_path: "D:/ocean_data/sst_seasonal_boxplot.png"
}

输出结果：
✅ 箱线图已生成

季节统计:
1. Winter (冬季):
   - 中位数: 19.2°C
   - 四分位距: 18.1-20.5°C
   - 异常值: 3 个 (极端寒潮)

2. Spring (春季):
   - 中位数: 24.8°C
   - 四分位距: 22.5-26.9°C
   - 变异性最大 (过渡季节)

3. Summer (夏季):
   - 中位数: 29.5°C
   - 四分位距: 28.7-30.2°C
   - 最稳定 (小四分位距)

4. Fall (秋季):
   - 中位数: 25.6°C
   - 四分位距: 23.8-27.1°C
   - 异常值: 5 个 (台风影响)

显著性检验: 季节间差异显著 (p < 0.001)

保存到: D:/ocean_data/sst_seasonal_boxplot.png
```

---

### 6.5 热力图（相关矩阵）

**实际示例**：
```
用户：分析海洋参数之间的相关性

Agent 执行：
StandardChart {
  chart_type: "heatmap",
  data_file: "D:/ocean_data/multi_parameters.csv",
  variables: ["sst", "salinity", "chlorophyll", "wind_speed", "ssh"],
  method: "pearson",
  annot: true,  // 显示数值
  cmap: "coolwarm",
  title: "海洋参数相关性矩阵",
  output_path: "D:/ocean_data/correlation_heatmap.png"
}

输出结果：
✅ 相关性热力图已生成

相关性分析:
                SST    Salt   Chl    Wind   SSH
SST             1.00   -0.45  -0.62   0.23   0.71
Salinity       -0.45    1.00   0.35  -0.18  -0.33
Chlorophyll    -0.62    0.35   1.00  -0.15  -0.58
Wind Speed      0.23   -0.18  -0.15   1.00   0.12
SSH             0.71   -0.33  -0.58   0.12   1.00

强相关关系 (|r| > 0.6):
- SST ↔ SSH: r = 0.71 (热膨胀效应)
- SST ↔ Chlorophyll: r = -0.62 (温度抑制营养盐上升)

中等相关关系 (0.3 < |r| < 0.6):
- SST ↔ Salinity: r = -0.45 (淡水稀释降温)
- Chlorophyll ↔ SSH: r = -0.58 (涌升区高叶绿素)

保存到: D:/ocean_data/correlation_heatmap.png
```

---

## 🛠️ 通用工具

## 7. FileRead

**作用**：读取文件内容

### 7.1 读取 NetCDF 文件信息

**实际示例**：
```
用户：查看 NetCDF 文件的结构和元数据

Agent 执行：
FileRead {
  file_path: "D:/ocean_data/jaxa_2020_sst.nc"
}

输出结果：
NetCDF 文件信息:

维度 (Dimensions):
- time: 365 (天数)
- lat: 451 (纬度点)
- lon: 351 (经度点)

变量 (Variables):
1. sst (time, lat, lon):
   - 长名称: Sea Surface Temperature
   - 单位: Celsius
   - 有效范围: -2 to 40°C
   - 缺失值: -999.0
   - 数据类型: float32

2. lat (lat):
   - 长名称: Latitude
   - 单位: degrees_north
   - 范围: 15.0 to 24.0°N

3. lon (lon):
   - 长名称: Longitude
   - 单位: degrees_east
   - 范围: 111.0 to 118.0°E

全局属性:
- 数据来源: JAXA Satellite Observation
- 创建时间: 2021-01-15
- 分辨率: 0.02°
- 投影: WGS84

文件大小: 456.7 MB
```

---

### 7.2 读取 CSV 数据

**实际示例**：
```
用户：查看 CTD CSV 文件内容

Agent 执行：
FileRead {
  file_path: "D:/ocean_data/ctd_station_A01.csv",
  limit: 10  // 只显示前 10 行
}

输出结果:
CSV 文件预览 (前 10 行):

| depth | temperature | salinity | pressure | density |
|-------|-------------|----------|----------|---------|
| 5     | 28.5        | 33.8     | 5.1      | 1021.45 |
| 10    | 28.4        | 33.9     | 10.2     | 1021.52 |
| 15    | 28.3        | 33.9     | 15.3     | 1021.58 |
| 20    | 28.2        | 34.0     | 20.4     | 1021.67 |
| 25    | 28.1        | 34.0     | 25.5     | 1021.73 |
| 30    | 27.8        | 34.1     | 30.6     | 1021.89 |
| 40    | 27.2        | 34.2     | 40.8     | 1022.21 |
| 50    | 25.8        | 34.3     | 51.0     | 1022.98 |
| 60    | 23.1        | 34.4     | 61.2     | 1024.15 |
| 70    | 20.5        | 34.5     | 71.4     | 1025.23 |

总行数: 156
列数: 5
文件大小: 12.3 KB
```

---

## 8. FileWrite

**作用**：写入新文件

### 8.1 创建处理脚本

**实际示例**：
```
用户：创建一个批处理脚本来处理多个 NetCDF 文件

Agent 执行：
FileWrite {
  file_path: "D:/ocean_data/batch_process.py",
  content: """
import glob
import xarray as xr

# 查找所有 NetCDF 文件
files = glob.glob('D:/ocean_data/jaxa_*.nc')

for file in files:
    print(f'Processing {file}...')

    # 读取数据
    ds = xr.open_dataset(file)

    # 裁剪珠三角区域
    ds_subset = ds.sel(
        lat=slice(15, 24),
        lon=slice(111, 118)
    )

    # 保存结果
    output = file.replace('.nc', '_prd.nc')
    ds_subset.to_netcdf(output)

    print(f'Saved to {output}')

print('Batch processing complete!')
"""
}

输出结果：
✅ 文件已创建: D:/ocean_data/batch_process.py

文件内容:
- Python 脚本用于批量处理 NetCDF 文件
- 功能: 裁剪珠三角区域
- 可以直接运行: python batch_process.py
```

---

## 9. FileEdit

**作用**：编辑现有文件

### 9.1 修改配置文件

**实际示例**：
```
用户：修改数据处理配置，改变输出路径

Agent 执行：
FileEdit {
  file_path: "D:/ocean_data/config.json",
  old_string: '"output_dir": "/tmp/output"',
  new_string: '"output_dir": "D:/ocean_data/results"'
}

输出结果：
✅ 文件已更新: D:/ocean_data/config.json

修改内容:
- 旧值: "output_dir": "/tmp/output"
+ 新值: "output_dir": "D:/ocean_data/results"

位置: 第 15 行
```

---

## 10. Bash

**作用**：执行命令行命令

### 10.1 运行 Python 脚本

**实际示例**：
```
用户：运行云掩码提取脚本

Agent 执行：
Bash {
  command: "python D:/ocean_data/scripts/extract_masks.py --input D:/ocean_data/jaxa_2020.nc --output D:/ocean_data/masks.npy --count 360"
}

输出结果：
正在提取云掩码...
读取文件: D:/ocean_data/jaxa_2020.nc
数据形状: (365, 451, 351)
生成掩码数量: 360

进度: [████████████████████] 100%

✅ 完成！
- 掩码数量: 360
- 缺失比例: 10.2% - 59.8%
- 保存到: D:/ocean_data/masks.npy
- 用时: 12.3 秒
```

---

### 10.2 检查文件大小

**实际示例**：
```
用户：查看数据文件夹的大小

Agent 执行：
Bash {
  command: "du -sh D:/ocean_data/*"
}

输出结果：
456M    D:/ocean_data/jaxa_2020_sst.nc
512M    D:/ocean_data/ostia_2020_sst.nc
2.3G    D:/ocean_data/training_data.h5
45M     D:/ocean_data/jaxa_masks.npy
128M    D:/ocean_data/argo_profiles/
23M     D:/ocean_data/ctd_data/

总计: 3.4 GB
```

---

## 11. Glob

**作用**：文件模式匹配搜索

### 11.1 查找所有 NetCDF 文件

**实际示例**：
```
用户：找出所有的 JAXA NetCDF 文件

Agent 执行：
Glob {
  pattern: "D:/ocean_data/**/jaxa*.nc"
}

输出结果：
找到 12 个文件:

D:/ocean_data/jaxa_2015_sst.nc
D:/ocean_data/jaxa_2016_sst.nc
D:/ocean_data/jaxa_2017_sst.nc
D:/ocean_data/jaxa_2018_sst.nc
D:/ocean_data/jaxa_2019_sst.nc
D:/ocean_data/jaxa_2020_sst.nc
D:/ocean_data/summer/jaxa_2020_06_sst.nc
D:/ocean_data/summer/jaxa_2020_07_sst.nc
D:/ocean_data/summer/jaxa_2020_08_sst.nc
D:/ocean_data/winter/jaxa_2020_12_sst.nc
D:/ocean_data/winter/jaxa_2021_01_sst.nc
D:/ocean_data/winter/jaxa_2021_02_sst.nc

按修改时间排序（最新在前）
```

---

### 11.2 查找 CTD CSV 文件

**实际示例**：
```
用户：查找所有 CTD 站位的数据文件

Agent 执行：
Glob {
  pattern: "D:/ocean_data/ctd_data/**/*.csv"
}

输出结果：
找到 45 个 CTD 文件:

D:/ocean_data/ctd_data/cruise01/station_A01.csv
D:/ocean_data/ctd_data/cruise01/station_A02.csv
...
D:/ocean_data/ctd_data/cruise03/station_C15.csv

站位分布:
- Cruise 01: 15 个站位
- Cruise 02: 18 个站位
- Cruise 03: 12 个站位
```

---

## 12. Grep

**作用**：搜索文件内容

### 12.1 搜索错误日志

**实际示例**：
```
用户：在日志文件中查找错误信息

Agent 执行：
Grep {
  pattern: "ERROR",
  path: "D:/ocean_data/logs/",
  output_mode: "content",
  -n: true,  // 显示行号
  -C: 2      // 显示上下文（前后 2 行）
}

输出结果：
D:/ocean_data/logs/process_2020.log:
145: INFO: Processing file jaxa_2020_06.nc
146: INFO: Extracting masks...
147: ERROR: Invalid data range detected at time index 15
148: WARNING: Skipping time step 15
149: INFO: Continuing with next time step

D:/ocean_data/logs/process_2020.log:
234: INFO: Loading OSTIA data
235: ERROR: File not found: ostia_2020_07.nc
236: CRITICAL: Processing halted

找到 2 个错误:
1. 第 147 行: 数据范围无效
2. 第 235 行: 文件未找到
```

---

### 12.2 搜索配置参数

**实际示例**：
```
用户：在所有配置文件中查找 output_dir 设置

Agent 执行：
Grep {
  pattern: "output_dir",
  path: "D:/ocean_data/",
  glob: "*.json",
  output_mode: "content",
  -n: true
}

输出结果：
D:/ocean_data/config.json:
15: "output_dir": "D:/ocean_data/results",

D:/ocean_data/settings.json:
8: "output_dir": "/tmp/ocean_processing",

D:/ocean_data/ml_config.json:
23: "training_output_dir": "D:/ml_models/outputs",
24: "test_output_dir": "D:/ml_models/test_results",

找到 3 个配置文件包含 output_dir 设置
```

---

## 🎯 综合应用示例

### 完整工作流 1: JAXA → OSTIA → ML 训练数据

```
步骤 1: 查找 JAXA 文件
用户: 找出 2020 年的 JAXA 数据文件
Agent: [使用 Glob]
      找到: D:/ocean_data/jaxa_2020_sst.nc

步骤 2: 检查文件信息
用户: 查看文件结构
Agent: [使用 FileRead]
      维度: time=365, lat=451, lon=351
      变量: sst (有缺失值)

步骤 3: 提取云掩码
用户: 从 JAXA 提取 360 个云掩码
Agent: [使用 OceanDataPreprocess]
      操作: generate_masks
      输出: D:/ocean_data/jaxa_masks.npy
      ✅ 完成: 360 个掩码

步骤 4: 构建训练对
用户: 用 OSTIA 数据和掩码创建训练集，裁剪珠三角
Agent: [使用 OceanDataPreprocess]
      操作: build_training_pairs
      输入: ostia_2020_sst.nc + jaxa_masks.npy
      区域: [15, 24, 111, 118]
      输出: D:/ocean_data/training_data.h5
      ✅ 完成: 131,400 个训练样本

步骤 5: 验证输出
用户: 检查 HDF5 文件结构
Agent: [使用 Bash + h5ls]
      数据集:
      - input_sst: (131400, 451, 351)
      - ground_truth_sst: (131400, 451, 351)
      - masks: (131400, 451, 351)
      ✅ 数据结构正确

步骤 6: 可视化样本
用户: 随机显示一个训练样本
Agent: [使用 GeoSpatialPlot]
      创建 3 个子图: input (有缺失) + ground_truth (完整) + mask
      ✅ 样本质量良好
```

---

### 完整工作流 2: CTD 数据分析

```
步骤 1: 读取 CTD 数据
用户: 读取站位 A01 的 CTD 数据
Agent: [使用 FileRead]
      156 行数据，深度 5-500m

步骤 2: 质量检查
用户: 检查数据质量
Agent: [使用 OceanDataPreprocess]
      操作: quality_check
      ⚠️ 发现 3 个盐度异常值

步骤 3: 清洗数据
用户: 移除异常值
Agent: [使用 OceanDataPreprocess]
      操作: clean
      ✅ 已移除 3 个异常点

步骤 4: 剖面分析
用户: 计算密度和 MLD
Agent: [使用 OceanProfileAnalysis]
      操作: calculate_density_and_mld
      MLD = 42 米
      温跃层: 42-150 米

步骤 5: 绘制 T-S 图
用户: 创建 T-S 图
Agent: [使用 StandardChart]
      识别出 3 个水团
      ✅ 图表已保存

步骤 6: 绘制垂直剖面
用户: 绘制温度和盐度剖面
Agent: [使用 StandardChart]
      双子图显示
      ✅ 剖面清晰可见
```

---

### 完整工作流 3: 时间序列分析

```
步骤 1: 查询数据
用户: 从 COPERNICUS 查询珠江口 2015-2020 年的 SST
Agent: [使用 OceanDatabaseQuery]
      查询区域: 珠江口
      时间: 2015-2020 (日数据)
      ✅ 获得 2191 天的数据

步骤 2: 数据预处理
用户: 填充缺失值
Agent: [使用 OceanDataPreprocess]
      操作: fill_missing
      方法: linear
      ✅ 填充 15 个缺失点

步骤 3: 时间序列分解
用户: 分解趋势和季节性
Agent: [使用 TimeSeriesAnalysis]
      操作: decompose
      趋势: +0.8°C (6年)
      季节振幅: 11.2°C
      ✅ 检测到 3 个异常事件

步骤 4: 异常检测
用户: 识别所有异常事件
Agent: [使用 TimeSeriesAnalysis]
      操作: detect_anomalies
      ✅ 找到 15 个异常事件

步骤 5: 可视化
用户: 绘制时间序列图和分解图
Agent: [使用 StandardChart]
      图 1: 原始数据 + 移动平均
      图 2: 趋势 + 季节 + 残差
      ✅ 图表已生成

步骤 6: 预测
用户: 预测未来 30 天
Agent: [使用 TimeSeriesAnalysis]
      操作: forecast
      模型: ARIMA(2,1,2)
      ✅ 预测完成，含 95% 置信区间
```

---

## 💡 使用技巧

### 技巧 1: 链式调用
Agent 会自动链式调用多个工具完成复杂任务。您只需描述最终目标：

```
❌ 不好的方式:
"先用 Glob 找文件"
"然后用 FileRead 读取"
"接着用 OceanDataPreprocess 处理"
...

✅ 好的方式:
"从 JAXA 数据生成云掩码并应用到 OSTIA 创建训练数据，裁剪珠三角区域"
→ Agent 自动完成所有步骤
```

---

### 技巧 2: 指定详细参数
提供详细参数可以获得更精确的结果：

```
❌ 模糊的请求:
"处理海洋数据"

✅ 清晰的请求:
"从 D:/data/jaxa.nc 提取 360 个云掩码，缺失率 10-60%，保存为 masks.npy"
```

---

### 技巧 3: 批量操作
Agent 支持批量处理：

```
用户: 处理 2015-2020 年所有 JAXA 文件，每个生成 360 个掩码

Agent 会:
1. [Glob] 找到所有文件
2. [循环] 对每个文件:
   - [OceanDataPreprocess] 提取掩码
   - [报告] 进度和结果
3. [总结] 批量处理完成
```

---

### 技巧 4: 验证结果
Agent 会自动验证结果，但您也可以明确要求：

```
用户: 生成训练数据并验证数据质量

Agent 会:
1. 生成数据
2. 自动检查:
   - 数据形状是否正确
   - 数值范围是否合理
   - 缺失比例是否符合预期
3. 报告任何问题
```

---

### 技巧 5: 保存中间结果
对于复杂流程，建议保存中间结果：

```
用户: 处理 JAXA 数据，保存每个步骤的结果

Agent 会:
1. 提取掩码 → 保存 masks.npy
2. 裁剪区域 → 保存 region_subset.nc
3. 质量检查 → 保存 quality_report.json
4. 创建训练对 → 保存 training_data.h5

优点: 便于调试和重复使用
```

---

## 🎓 总结

### 工具分类速查

**数据获取**:
- OceanDatabaseQuery: 查询在线数据库
- Glob: 查找本地文件
- FileRead: 读取文件内容

**数据处理**:
- OceanDataPreprocess: 预处理、掩码、训练对
- OceanProfileAnalysis: 剖面分析、密度计算
- TimeSeriesAnalysis: 时间序列分解、预测

**数据可视化**:
- GeoSpatialPlot: 地图和空间图
- StandardChart: 科学图表

**文件操作**:
- FileRead/Write/Edit: 文件读写编辑
- Bash: 命令执行
- Grep: 内容搜索

---

### 常见任务快速索引

| 任务 | 主要工具 | 辅助工具 |
|-----|---------|---------|
| JAXA 云掩码提取 | OceanDataPreprocess | FileRead, Glob |
| ML 训练数据准备 | OceanDataPreprocess | FileRead, Bash |
| CTD 剖面分析 | OceanProfileAnalysis | StandardChart |
| 海温时间序列 | TimeSeriesAnalysis | StandardChart |
| 数据库查询 | OceanDatabaseQuery | GeoSpatialPlot |
| T-S 图绘制 | StandardChart | OceanProfileAnalysis |
| 空间分布图 | GeoSpatialPlot | OceanDataPreprocess |
| 批量处理 | Bash + Glob | OceanDataPreprocess |

---

### 下一步

1. **尝试简单任务**: 从读取文件、提取掩码等基础任务开始
2. **逐步提高复杂度**: 尝试链式任务和批量操作
3. **查看实际输出**: 验证每个工具的输出是否符合预期
4. **参考文档**: 遇到问题查看 `TOOLS_EXPLANATION.md` 和 `OCEAN_AGENT_GUIDE.md`

---

**文档版本**: v1.0
**创建日期**: 2024-10-29
**适用于**: ocean-data-specialist Agent

需要更多帮助？只需在 Kode 中输入您的需求，Agent 会自动选择合适的工具！🌊
