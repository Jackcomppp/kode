# OceanProfileAnalysisTool - 快速开始

## 🌊 3分钟快速上手

### 第一步：准备你的剖面数据

**CSV格式**（推荐）:
```csv
depth,temperature,salinity
0,20.5,35.0
10,20.3,35.0
20,19.8,35.1
50,18.5,35.3
100,15.2,35.8
200,12.5,35.9
500,8.5,35.5
```

### 第二步：最简单的分析

```typescript
{
  data_source: "./data/ctd_profile.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity"
}
```

**自动计算**:
✅ 密度剖面
✅ 混合层深度
✅ 温跃层/盐跃层位置
✅ 浮力频率
✅ 声速剖面
✅ T-S图数据

### 第三步：查看结果

输出包含：
- 📊 每个深度的完整参数
- 🌡️ 混合层深度（MLD）
- 📈 温跃层/密跃层深度
- 🔊 声速剖面
- 📉 稳定性参数（N²）
- 📐 T-S图数据

---

## 📋 常用场景速查

### 场景1: 分析CTD站位数据

```typescript
{
  data_source: "./data/station_01.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: 35.0,
  longitude: 140.0
}
```

### 场景2: Argo浮标数据

```typescript
{
  data_source: "./data/argo_profile.csv",
  depth_column: "PRES",  // Argo用压力
  temperature_column: "TEMP",
  salinity_column: "PSAL",
  pressure_column: "PRES",
  latitude: 35.5,
  longitude: 139.8
}
```

### 场景3: 计算混合层深度

```typescript
{
  data_source: "./data/upper_ocean.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  mld_criteria: "density",  // 使用密度标准
  mld_threshold: 0.03       // 0.03 kg/m³
}
```

### 场景4: 深海水团分析

```typescript
{
  data_source: "./data/deep_water.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  reference_pressure: 2000,  // σ₂（2000dbar参考）
  output_ts_diagram: true    // 输出T-S图
}
```

---

## 🎯 参数速查

### 混合层深度标准

| 标准 | 推荐阈值 | 适用 |
|------|---------|------|
| `"temperature"` | 0.2°C | 温跃层明显 |
| `"density"` | 0.03 kg/m³ | **最常用** ⭐ |
| `"both"` | 自动 | 综合判断 |

### 状态方程选择

| 方程 | 推荐场景 |
|------|---------|
| `"unesco"` | **标准CTD数据** ⭐ |
| `"teos10"` | 新数据，极地海洋 |
| `"simplified"` | 快速估算 |

### 参考压力（σ系列）

| 参考压力 | 符号 | 适用深度 |
|---------|------|---------|
| 0 dbar | σ₀ (σt) | 表层-200m |
| 1000 dbar | σ₁ | 中层水 |
| 2000 dbar | σ₂ | 深层水 |
| 3000 dbar | σ₃ | 底层水 |
| 4000 dbar | σ₄ | 深渊水 |

---

## 💡 结果解读速查

### 混合层深度（MLD）

```
MLD = 50m 意味着：
✅ 0-50m 温度、盐度相对均匀
✅ 50m以下开始层化
✅ 夏季浅（20-40m），冬季深（100-200m）
```

### 温跃层深度

```
Thermocline = 75m 意味着：
✅ 75m附近温度梯度最大
✅ 通常在MLD下方
✅ 分隔暖表层水和冷深层水
```

### 浮力频率（N²）

```
N² = 0.0005 s⁻² 意味着：
✅ 强层化，水体稳定
✅ 值越大越稳定
✅ 最大值通常在温跃层
```

### 密度异常（σθ）

```
σθ = 24.5 意味着：
✅ 位势密度 = 1024.5 kg/m³
✅ 表层暖水：σθ = 20-26
✅ 深层冷水：σθ = 27-28
```

### 声速

```
Sound speed = 1520 m/s 意味着：
✅ 表层温暖：1500-1540 m/s
✅ 深层寒冷：1480-1500 m/s
✅ 声道轴：最小值深度
```

---

## ⚡ 常见问题快速解决

### ❓ "Data file does not exist"

```typescript
// ❌ 错误
data_source: "profile.csv"

// ✅ 正确
data_source: "./data/profile.csv"
// 或绝对路径
data_source: "D:/ocean_data/profile.csv"
```

### ❓ "temperature_column is required"

```typescript
// ❌ 缺少必需参数
{
  data_source: "./data.csv",
  depth_column: "depth"
}

// ✅ 包含所有必需参数
{
  data_source: "./data.csv",
  depth_column: "depth",
  temperature_column: "temp",  // 必需！
  salinity_column: "sal"       // 必需！
}
```

### ❓ "Unusual temperature/salinity"

这是质量提示，不是错误：

```typescript
// 检查数据范围：
// 温度：-2°C 到 40°C
// 盐度：0 到 42 PSU

// 如果数据正确，可以忽略警告
// 如果数据异常，需要检查原始数据
```

### ❓ 混合层深度很深或很浅

```typescript
// 调整阈值：
{
  mld_criteria: "density",
  mld_threshold: 0.03  // 默认值
}

// 对于：
// - 热带海洋：可能需要更小阈值（0.01-0.02）
// - 极地海洋：可能需要更大阈值（0.05-0.1）
// - 沿岸浅水：考虑温度标准
```

---

## 📊 数据格式指南

### 标准CSV格式

```csv
depth,temperature,salinity
0.0,20.5,35.0
5.0,20.4,35.0
10.0,20.2,35.1
20.0,19.8,35.2
```

### 带压力的CSV

```csv
depth,pressure,temperature,salinity
0.0,0.0,20.5,35.0
10.0,10.2,20.2,35.1
20.0,20.4,19.8,35.2
```

### JSON格式

```json
[
  {"depth": 0, "temperature": 20.5, "salinity": 35.0},
  {"depth": 10, "temperature": 20.2, "salinity": 35.1}
]
```

### Argo标准格式

```csv
CYCLE,PRES,TEMP,PSAL
1,0.0,20.5,35.0
1,10.0,20.2,35.1
```

使用时：
```typescript
{
  depth_column: "PRES",
  temperature_column: "TEMP",
  salinity_column: "PSAL",
  pressure_column: "PRES"
}
```

---

## 🔬 实用技巧

### 技巧1: 从简单到复杂

```typescript
// 第1步：基础分析
{
  data_source: "./data.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal"
}

// 第2步：添加位置
{
  ...previous,
  latitude: 35.0,
  longitude: 140.0
}

// 第3步：调整MLD
{
  ...previous,
  mld_criteria: "density",
  mld_threshold: 0.03
}

// 第4步：选择状态方程
{
  ...previous,
  equation_of_state: "unesco"
}
```

### 技巧2: 根据研究目标选择参数

**表层混合研究**:
```typescript
{
  mld_criteria: "both",
  calculate_stability: true,
  reference_pressure: 0
}
```

**深海水团**:
```typescript
{
  reference_pressure: 2000,
  output_ts_diagram: true,
  equation_of_state: "unesco"
}
```

**声学应用**:
```typescript
{
  calculate_sound_speed: true,
  calculate_stability: false
}
```

### 技巧3: 批量处理

```typescript
// 处理多个站位
const stations = [
  "station_001.csv",
  "station_002.csv",
  "station_003.csv"
]

// 循环分析每个站位
stations.forEach(file => {
  analyze({
    data_source: `./data/${file}`,
    depth_column: "depth",
    temperature_column: "temp",
    salinity_column: "sal"
  })
})
```

---

## 📈 完整工作流示例

```typescript
// 1️⃣ 查询海洋数据
OceanDatabaseQueryTool({
  database: "argo",
  parameters: ["temperature", "salinity", "depth"],
  latitude_range: [30, 40],
  longitude_range: [135, 145]
})

// 2️⃣ 保存为CSV
FileWriteTool({
  file_path: "./data/argo_profile.csv",
  content: queryResult
})

// 3️⃣ 数据清洗
OceanDataPreprocessTool({
  file_path: "./data/argo_profile.csv",
  operations: ["clean", "quality_check"]
})

// 4️⃣ 剖面分析
OceanProfileAnalysisTool({
  data_source: "./data/argo_profile.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity",
  latitude: 35.0,
  longitude: 140.0
})

// 5️⃣ 时间序列分析（如有多个剖面）
TimeSeriesAnalysisTool({
  data_source: "./data/mld_time_series.csv",
  time_column: "date",
  value_column: "mixed_layer_depth"
})
```

---

## 🎓 学习路径

### 初学者（10分钟）
1. ✅ 运行基础示例
2. ✅ 查看MLD结果
3. ✅ 理解密度剖面

### 中级用户（30分钟）
1. ✅ 调整MLD标准
2. ✅ 理解T-S图
3. ✅ 分析不同状态方程结果

### 高级用户（1小时+）
1. ✅ 批量处理多个站位
2. ✅ 水团识别
3. ✅ 结合其他工具分析

---

## 📚 相关资源

### 推荐阅读
- de Boyer Montégut et al. (2004): MLD标准
- Millero & Poisson (1981): UNESCO EOS-80
- IOC/SCOR/IAPSO (2010): TEOS-10

### 在线工具
- [TEOS-10官网](http://www.teos-10.org/)
- [Argo数据中心](https://argo.ucsd.edu/)
- [世界海洋数据库](https://www.ncei.noaa.gov/products/world-ocean-database)

### 相关软件
- **Ocean Data View**: 数据可视化
- **MATLAB Ocean Toolbox**: 海洋学计算
- **Python gsw**: TEOS-10库

---

## 🎯 速查表

### 常用配置模板

**标准CTD**:
```typescript
{
  data_source: "./ctd.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: <LAT>,
  longitude: <LON>
}
```

**Argo浮标**:
```typescript
{
  data_source: "./argo.csv",
  depth_column: "PRES",
  temperature_column: "TEMP",
  salinity_column: "PSAL",
  pressure_column: "PRES",
  equation_of_state: "teos10"
}
```

**快速MLD**:
```typescript
{
  data_source: "./profile.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  mld_criteria: "density",
  calculate_stability: false,
  calculate_sound_speed: false
}
```

---

**准备好了吗？开始分析你的第一个海洋剖面吧！** 🌊

查看 [README.md](./README.md) 获取完整文档。
