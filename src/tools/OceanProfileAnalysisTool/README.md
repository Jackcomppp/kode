# OceanProfileAnalysisTool

专业的海洋垂直剖面分析工具，计算关键海洋学参数，支持CTD数据、Argo浮标、瓶采样等各类剖面数据。

## 🌊 核心功能

### 计算的海洋参数

#### 1. **密度计算**
- **In-situ density** (ρ): 现场密度
- **Potential density** (ρθ): 位势密度
- **Sigma-t** (σt): 表层密度异常
- **Sigma-theta** (σθ): 位势密度异常

#### 2. **稳定性参数**
- **Brunt-Väisälä frequency** (N²): 浮力频率/稳定度
- **Richardson number**: 理查森数
- **Stratification index**: 层化指数

#### 3. **水层特征**
- **Mixed Layer Depth** (MLD): 混合层深度
- **Thermocline depth**: 温跃层深度
- **Halocline depth**: 盐跃层深度
- **Pycnocline depth**: 密跃层深度

#### 4. **其他参数**
- **Sound speed**: 声速剖面
- **Dynamic height**: 动力高度
- **T-S diagram data**: T-S图数据
- **Potential temperature**: 位温

## 📊 支持的状态方程

- **UNESCO EOS-80**: 传统标准（Millero & Poisson 1981）
- **TEOS-10**: 新国际标准（IOC/SCOR/IAPSO 2010）
- **Simplified**: 简化线性方程（快速计算）

## 🚀 快速开始

### 最简单的用法

```typescript
{
  data_source: "./data/ctd_profile.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity"
}
```

### 完整配置

```typescript
{
  data_source: "./data/argo_profile.csv",
  depth_column: "PRES",
  temperature_column: "TEMP",
  salinity_column: "PSAL",
  pressure_column: "PRES",
  latitude: 35.5,
  longitude: 139.8,
  reference_pressure: 0,
  mld_criteria: "density",
  mld_threshold: 0.03,
  equation_of_state: "unesco",
  calculate_sound_speed: true,
  calculate_stability: true,
  output_ts_diagram: true
}
```

## 📋 参数说明

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `data_source` | string | CSV/JSON文件路径 |
| `depth_column` | string | 深度列名（米） |
| `temperature_column` | string | 温度列名（°C） |
| `salinity_column` | string | 盐度列名（PSU） |

### 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `pressure_column` | string | - | 压力列名（dbar），未提供则从深度计算 |
| `latitude` | number | - | 纬度（-90~90） |
| `longitude` | number | - | 经度（-180~180） |
| `reference_pressure` | number | 0 | 位势密度参考压力（dbar） |
| `mld_criteria` | enum | 'density' | MLD标准：temperature/density/both |
| `mld_threshold` | number | auto | MLD阈值 |
| `equation_of_state` | enum | 'unesco' | 状态方程：unesco/teos10/simplified |
| `calculate_sound_speed` | boolean | true | 计算声速 |
| `calculate_stability` | boolean | true | 计算稳定性参数 |
| `output_ts_diagram` | boolean | true | 输出T-S图数据 |

## 📤 输出格式

```json
{
  "type": "ocean_profile_analysis",
  "data": {
    "metadata": {
      "dataSource": "ctd_profile.csv",
      "location": {"latitude": 35.5, "longitude": 139.8},
      "depthRange": {"min": 0, "max": 2000},
      "dataPoints": 200
    },
    "profileData": [
      {
        "depth": 0,
        "pressure": 0,
        "temperature": 20.5,
        "salinity": 35.0,
        "density": 1024.5,
        "potential_density": 1024.5,
        "sigma_t": 24.5,
        "sigma_theta": 24.5,
        "buoyancy_frequency": 0.0001,
        "sound_speed": 1520.5,
        "dynamic_height": 0
      }
    ],
    "derivedParameters": {
      "mixedLayerDepth": {
        "value": 45.0,
        "criteria": "density",
        "threshold": 0.03
      },
      "thermoclineDepth": 75.0,
      "pycnoclineDepth": 80.0,
      "maxBuoyancyFrequency": {
        "value": 0.0005,
        "depth": 82.0
      }
    },
    "tsDiagram": {
      "temperature": [...],
      "salinity": [...],
      "density": [...],
      "depth": [...]
    },
    "statistics": {...}
  }
}
```

## 💡 应用场景

### 1. CTD数据分析
```typescript
{
  data_source: "./data/research_vessel_ctd.csv",
  depth_column: "Depth_m",
  temperature_column: "Temp_ITS90",
  salinity_column: "Sal_PSS78",
  pressure_column: "Pressure_dbar",
  latitude: 35.0,
  longitude: 140.0
}
```

### 2. Argo浮标分析
```typescript
{
  data_source: "./data/argo_6903123_cycle_001.csv",
  depth_column: "PRES",
  temperature_column: "TEMP",
  salinity_column: "PSAL",
  pressure_column: "PRES",
  latitude: 35.125,
  longitude: 141.875,
  equation_of_state: "teos10"
}
```

### 3. 混合层研究
```typescript
{
  data_source: "./data/upper_ocean.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  mld_criteria: "both",
  mld_threshold: 0.2
}
```

### 4. 深海水团分析
```typescript
{
  data_source: "./data/deep_ocean.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  reference_pressure: 2000,  // σ₂
  output_ts_diagram: true
}
```

### 5. 声速剖面（声呐应用）
```typescript
{
  data_source: "./data/acoustic_survey.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  calculate_sound_speed: true
}
```

## 🔬 海洋学方法

### 密度计算（UNESCO EOS-80）

```
ρ(T,S,P) = ρ₀(T,S) / [1 - P/K(T,S,P)]
```

其中：
- ρ₀: 表层密度（Millero & Poisson 1981）
- K: 体积模量（压缩性）
- T: 温度（°C）
- S: 盐度（PSU）
- P: 压力（dbar）

### 位温计算

```
θ = T - Γ(T,S,P,P_ref)
```

其中 Γ 是绝热温度梯度

### 浮力频率（Brunt-Väisälä频率）

```
N² = -(g/ρ) · (∂ρ/∂z)
```

其中：
- g: 重力加速度（9.81 m/s²）
- ρ: 密度
- z: 深度

### 声速（Mackenzie公式）

```
c = 1448.96 + 4.591T - 5.304×10⁻²T² + 2.374×10⁻⁴T³
    + 1.340(S-35) + 1.630×10⁻²D + 1.675×10⁻⁷D²
    - 1.025×10⁻²T(S-35) - 7.139×10⁻¹³TD³
```

### 深度-压力转换

```
P = D × (1.0076 + 2.3×10⁻⁵D) × (1 + 5.3×10⁻³sin²φ)
```

其中 φ 是纬度

## 📊 结果解读指南

### 混合层深度（MLD）

| 值 | 解读 | 典型条件 |
|----|------|---------|
| 20-40m | 浅混合层 | 夏季，强层化 |
| 50-100m | 中等 | 春秋季 |
| >150m | 深混合层 | 冬季，强风混合 |

### 温跃层深度

- 温度梯度最大的深度
- 通常略低于MLD
- 季节变化明显

### 浮力频率（N²）

| N² 值 | 解读 |
|-------|------|
| > 10⁻⁴ s⁻² | 强层化 |
| 10⁻⁵ - 10⁻⁴ | 中等层化 |
| < 10⁻⁵ | 弱层化 |
| ≈ 0 | 混合均匀 |
| < 0 | 不稳定（罕见） |

### 密度（σθ）

| σθ 范围 | 水团 |
|---------|------|
| 20-26 | 表层暖水 |
| 26-27.5 | 中层水 |
| 27.5-28 | 深层水 |
| > 28 | 底层水 |

## 🔗 与其他工具集成

```
OceanDatabaseQueryTool → 查询剖面数据
    ↓
FileWriteTool → 保存CSV
    ↓
OceanDataPreprocessTool → 数据清洗
    ↓
OceanProfileAnalysisTool → 剖面分析
    ↓
TimeSeriesAnalysisTool → 时间序列分析
```

## ⚙️ 技术实现

### 核心算法
- UNESCO EOS-80 密度方程
- TEOS-10 标准（简化版）
- Mackenzie声速公式
- Fofonoff & Millard 压力转换
- 有限差分法计算梯度

### 性能
- 最大数据点：10,000
- 最大文件：10MB
- 计算时间：< 1秒（1000点）

## 🎓 参考文献

1. Millero, F. J., & Poisson, A. (1981). *International one-atmosphere equation of state of seawater*. Deep Sea Research, 28(6), 625-629.

2. Fofonoff, N. P., & Millard, R. C. (1983). *Algorithms for computation of fundamental properties of seawater*. UNESCO Technical Papers in Marine Science 44.

3. IOC, SCOR and IAPSO (2010). *The international thermodynamic equation of seawater – 2010: Calculation and use of thermodynamic properties*. UNESCO.

4. Mackenzie, K. V. (1981). *Nine-term equation for sound speed in the oceans*. Journal of the Acoustical Society of America, 70(3), 807-812.

5. de Boyer Montégut, C., et al. (2004). *Mixed layer depth over the global ocean: An examination of profile data and a profile-based climatology*. Journal of Geophysical Research, 109, C12003.

## 📚 推荐库

### Python
- **gsw** (Gibbs SeaWater Oceanographic Toolbox): TEOS-10标准实现
- **seawater**: 经典海洋学计算
- **ctd**: CTD数据处理

### MATLAB
- **GSW Oceanographic Toolbox**: TEOS-10官方工具箱
- **seawater**: 海水属性计算

### R
- **oce**: 海洋学数据分析
- **gsw**: TEOS-10实现

## ⚠️ 注意事项

1. **单位要求**:
   - 深度：米（m）
   - 温度：摄氏度（°C）
   - 盐度：PSU（实用盐度单位）
   - 压力：分巴（dbar）

2. **数据质量**:
   - 确保数据经过质量控制
   - 检查异常值（温度、盐度范围）
   - 注意深度倒置

3. **选择合适的EOS**:
   - **UNESCO**: 传统数据，向后兼容
   - **TEOS-10**: 新数据，推荐使用
   - **Simplified**: 快速估算

4. **MLD标准**:
   - **Density**: 更常用（0.03 kg/m³）
   - **Temperature**: 特定研究（0.2°C）
   - **Both**: 综合评估

## 🚀 扩展功能

### 计划中
- [ ] 完整TEOS-10实现
- [ ] 更多稳定性参数
- [ ] 水团识别算法
- [ ] 地转流计算
- [ ] 剖面比较功能

---

**版本**: 1.0.0
**更新**: 2024-10-27
**作者**: Claude Code Assistant
