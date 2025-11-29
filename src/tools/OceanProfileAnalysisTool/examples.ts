/**
 * OceanProfileAnalysisTool 使用示例
 *
 * 展示如何使用海洋剖面分析工具分析CTD数据
 */

// ============================================
// 示例 1: 基础剖面分析
// ============================================
const example1 = {
  data_source: "./data/ctd_profile.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity"
}
// 分析CTD剖面数据，计算所有标准参数

// ============================================
// 示例 2: 带位置信息的分析
// ============================================
const example2 = {
  data_source: "./data/station_001.csv",
  depth_column: "depth_m",
  temperature_column: "temp_c",
  salinity_column: "sal_psu",
  latitude: 35.5,
  longitude: 139.8
}
// 包含地理位置，用于更准确的压力和科里奥利计算

// ============================================
// 示例 3: 包含压力数据
// ============================================
const example3 = {
  data_source: "./data/ctd_with_pressure.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity",
  pressure_column: "pressure"
}
// 使用实测压力数据而非从深度计算

// ============================================
// 示例 4: 混合层深度分析（温度标准）
// ============================================
const example4 = {
  data_source: "./data/upper_ocean.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  mld_criteria: "temperature",
  mld_threshold: 0.2  // 0.2°C 温差
}
// 使用温度标准确定混合层深度

// ============================================
// 示例 5: 混合层深度分析（密度标准）
// ============================================
const example5 = {
  data_source: "./data/density_profile.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  mld_criteria: "density",
  mld_threshold: 0.03  // 0.03 kg/m³ 密度差
}
// 使用密度标准确定混合层深度（更常用）

// ============================================
// 示例 6: 指定参考压力的位势密度
// ============================================
const example6 = {
  data_source: "./data/deep_profile.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity",
  reference_pressure: 1000  // 1000 dbar 参考压力
}
// 计算相对于1000dbar的位势密度（σ₁）

// ============================================
// 示例 7: 使用不同的状态方程
// ============================================
const example7_unesco = {
  data_source: "./data/profile.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  equation_of_state: "unesco"  // UNESCO EOS-80
}

const example7_teos10 = {
  data_source: "./data/profile.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  equation_of_state: "teos10"  // TEOS-10 (新标准)
}

const example7_simplified = {
  data_source: "./data/profile.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  equation_of_state: "simplified"  // 简化线性方程
}

// ============================================
// 示例 8: 完整分析配置
// ============================================
const example8 = {
  data_source: "./data/complete_profile.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity",
  latitude: 40.0,
  longitude: -70.0,
  reference_pressure: 0,
  mld_criteria: "both",  // 同时使用温度和密度标准
  equation_of_state: "unesco",
  calculate_sound_speed: true,
  calculate_stability: true,
  output_ts_diagram: true
}
// 完整配置，计算所有参数

// ============================================
// 示例 9: 仅计算密度剖面
// ============================================
const example9 = {
  data_source: "./data/ts_data.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  calculate_sound_speed: false,
  calculate_stability: false,
  output_ts_diagram: false
}
// 最小化计算，仅需要密度

// ============================================
// 示例 10: 使用内联JSON数据
// ============================================
const example10 = {
  data_source: JSON.stringify([
    { depth: 0, temperature: 20.5, salinity: 35.0 },
    { depth: 10, temperature: 20.3, salinity: 35.1 },
    { depth: 20, temperature: 19.8, salinity: 35.2 },
    { depth: 50, temperature: 18.5, salinity: 35.5 },
    { depth: 100, temperature: 15.2, salinity: 35.8 },
    { depth: 200, temperature: 12.5, salinity: 35.9 },
    { depth: 500, temperature: 8.5, salinity: 35.5 }
  ]),
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity"
}
// 直接提供JSON数据

// ============================================
// 应用场景示例
// ============================================

/**
 * 场景1: Argo浮标数据分析
 */
const argo_profile = {
  data_source: "./data/argo_6903123_cycle_001.csv",
  depth_column: "PRES",  // Argo使用压力作为"深度"
  temperature_column: "TEMP",
  salinity_column: "PSAL",
  pressure_column: "PRES",
  latitude: 35.125,
  longitude: 141.875,
  equation_of_state: "teos10"
}
// Argo浮标标准格式

/**
 * 场景2: 科考船CTD站位
 */
const research_vessel_ctd = {
  data_source: "./data/cruise_KH23_station_05.csv",
  depth_column: "Depth_m",
  temperature_column: "Temp_ITS90",
  salinity_column: "Sal_PSS78",
  pressure_column: "Pressure_dbar",
  latitude: 28.5,
  longitude: 129.0,
  equation_of_state: "unesco",
  calculate_sound_speed: true
}
// 研究船CTD标准输出

/**
 * 场景3: 浅水区混合层研究
 */
const shallow_water_mld = {
  data_source: "./data/coastal_station.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity",
  latitude: 34.0,
  longitude: 135.0,
  mld_criteria: "temperature",
  mld_threshold: 0.5,  // 浅水区使用更大阈值
  reference_pressure: 0
}
// 沿岸浅水区混合层

/**
 * 场景4: 深海水团分析
 */
const deep_water_mass = {
  data_source: "./data/deep_ocean_profile.csv",
  depth_column: "depth",
  temperature_column: "potential_temp",  // 如果已经是位温
  salinity_column: "salinity",
  pressure_column: "pressure",
  latitude: -60.0,  // 南大洋
  longitude: 0.0,
  reference_pressure: 2000,  // σ₂参考面
  output_ts_diagram: true
}
// 深海水团T-S特征

/**
 * 场景5: 温跃层季节变化
 */
const seasonal_thermocline = {
  data_source: "./data/time_series_summer.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: 40.0,
  longitude: 140.0,
  mld_criteria: "temperature",
  calculate_stability: true
}
// 研究温跃层季节性变化

/**
 * 场景6: 声速剖面计算（声呐应用）
 */
const sound_speed_profile = {
  data_source: "./data/acoustic_survey.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: 35.0,
  longitude: 139.0,
  calculate_sound_speed: true,
  calculate_stability: false,
  output_ts_diagram: false
}
// 水声应用的声速剖面

/**
 * 场景7: 地转流计算准备
 */
const geostrophic_current_prep = {
  data_source: "./data/hydrographic_section.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: 36.0,
  longitude: 142.0,
  reference_pressure: 1500,
  equation_of_state: "unesco",
  calculate_stability: true
}
// 为地转流计算准备动力高度数据

/**
 * 场景8: 极地海洋学
 */
const polar_oceanography = {
  data_source: "./data/arctic_station.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: 80.0,
  longitude: 10.0,
  mld_criteria: "both",
  equation_of_state: "teos10"  // 极地推荐TEOS-10
}
// 极地水文剖面

/**
 * 场景9: 赤道海洋学
 */
const equatorial_profile = {
  data_source: "./data/equatorial_pacific.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: 0.0,
  longitude: -140.0,
  mld_criteria: "density",
  calculate_stability: true
}
// 赤道上升流区域

/**
 * 场景10: 水团混合分析
 */
const water_mass_mixing = {
  data_source: "./data/frontal_zone.csv",
  depth_column: "depth",
  temperature_column: "temp",
  salinity_column: "sal",
  latitude: 42.0,
  longitude: 142.0,
  output_ts_diagram: true,  // T-S图用于识别水团
  equation_of_state: "unesco"
}
// 锋面区水团混合

// ============================================
// 工作流示例
// ============================================

/**
 * 完整的CTD数据分析工作流
 */

// 步骤1: 数据采集（假设已有）
// 使用CTD仪器采集温度、盐度、深度数据

// 步骤2: 数据预处理
// 使用 OceanDataPreprocessTool 清洗数据
const preprocessing = {
  file_path: "./data/raw_ctd.csv",
  operations: ["clean", "quality_check"],
  output_path: "./data/cleaned_ctd.csv"
}

// 步骤3: 剖面分析
const profile_analysis = {
  data_source: "./data/cleaned_ctd.csv",
  depth_column: "depth",
  temperature_column: "temperature",
  salinity_column: "salinity",
  latitude: 35.0,
  longitude: 140.0,
  equation_of_state: "unesco",
  calculate_sound_speed: true,
  calculate_stability: true,
  output_ts_diagram: true
}

// 步骤4: 结果可视化（外部工具）
// 使用返回的JSON数据生成剖面图、T-S图等

// ============================================
// 数据格式示例
// ============================================

/**
 * CSV格式示例
 *
 * depth,temperature,salinity,pressure
 * 0.0,20.5,35.0,0.0
 * 5.0,20.4,35.0,5.1
 * 10.0,20.2,35.1,10.2
 * 20.0,19.8,35.2,20.4
 * 50.0,18.5,35.5,51.0
 * 100.0,15.2,35.8,102.0
 * 200.0,12.5,35.9,204.0
 */

/**
 * JSON格式示例
 */
const json_format_example = [
  {
    "depth": 0.0,
    "temperature": 20.5,
    "salinity": 35.0,
    "pressure": 0.0,
    "latitude": 35.0,
    "longitude": 140.0
  },
  {
    "depth": 10.0,
    "temperature": 20.2,
    "salinity": 35.1,
    "pressure": 10.2
  }
]

/**
 * Argo NetCDF转CSV后的格式
 *
 * CYCLE,PRES,TEMP,PSAL,LATITUDE,LONGITUDE
 * 1,0.0,20.5,35.0,35.125,141.875
 * 1,10.0,20.2,35.1,35.125,141.875
 */

// ============================================
// 输出结果解读
// ============================================

/**
 * 混合层深度(MLD)解读
 */
// MLD = 50m 表示：
// - 0-50m为混合均匀的表层
// - 50m以下开始出现温跃层/密跃层
// - 夏季MLD较浅（20-40m）
// - 冬季MLD较深（100-200m）

/**
 * 温跃层深度解读
 */
// Thermocline depth = 75m 表示：
// - 75m附近温度梯度最大
// - 温跃层将表层温水与深层冷水分隔

/**
 * 浮力频率(N²)解读
 */
// N² > 0: 稳定层化
// N² = 0: 中性层化
// N² < 0: 不稳定（很少见）
// Max N² 通常在温跃层/密跃层处

/**
 * 声速解读
 */
// Sound speed:
// - 表层：1500-1540 m/s（温暖）
// - 深层：1480-1500 m/s（寒冷高压）
// - 最小值：约1000-1500m（声道轴）

/**
 * T-S图解读
 */
// T-S diagram:
// - 每种水团有特征T-S曲线
// - 表层水：高温高盐或高温低盐
// - 中层水：中温中盐
// - 深层水：低温高盐

/**
 * 密度解读
 */
// σt (sigma-t): 表层参考密度异常
// σθ (sigma-theta): 位势密度异常
// 典型值：
// - 表层：20-26 kg/m³
// - 中层：26-27.5 kg/m³
// - 深层：27.5-28 kg/m³

// ============================================
// 高级应用
// ============================================

/**
 * 批量处理多个站位
 */
const batch_processing_example = [
  {
    data_source: "./data/station_001.csv",
    depth_column: "depth",
    temperature_column: "temp",
    salinity_column: "sal",
    latitude: 35.0,
    longitude: 139.0
  },
  {
    data_source: "./data/station_002.csv",
    depth_column: "depth",
    temperature_column: "temp",
    salinity_column: "sal",
    latitude: 35.0,
    longitude: 140.0
  }
]
// 循环处理，比较不同站位

/**
 * 时间序列剖面分析
 */
const time_series_profiles = [
  {
    data_source: "./data/mooring_202301.csv",
    depth_column: "depth",
    temperature_column: "temp",
    salinity_column: "sal"
  },
  {
    data_source: "./data/mooring_202302.csv",
    depth_column: "depth",
    temperature_column: "temp",
    salinity_column: "sal"
  }
]
// 分析混合层深度的时间变化

/**
 * 断面分析准备
 */
const section_stations = {
  // 沿经线的多个站位
  stations: [
    { lat: 30, lon: 140, file: "station_30N.csv" },
    { lat: 35, lon: 140, file: "station_35N.csv" },
    { lat: 40, lon: 140, file: "station_40N.csv" }
  ]
}
// 为断面图准备数据

export {
  example1, example2, example3, example4, example5,
  example6, example7_unesco, example7_teos10, example7_simplified,
  example8, example9, example10,
  argo_profile, research_vessel_ctd, shallow_water_mld,
  deep_water_mass, seasonal_thermocline, sound_speed_profile,
  geostrophic_current_prep, polar_oceanography, equatorial_profile,
  water_mass_mixing,
  preprocessing, profile_analysis,
  json_format_example,
  batch_processing_example, time_series_profiles, section_stations
}
