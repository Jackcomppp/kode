/**
 * GeoSpatialPlotTool 使用示例
 *
 * 展示如何创建各种地理空间可视化
 */

// ============================================
// 示例 1: 基础散点图
// ============================================
const example1 = {
  data_source: "./data/ocean_stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  output_path: "./output/stations_map.png"
}
// 在地图上绘制观测站点

// ============================================
// 示例 2: 带值的散点图（颜色映射）
// ============================================
const example2 = {
  data_source: "./data/temperature_data.csv",
  longitude_column: "longitude",
  latitude_column: "latitude",
  value_column: "sst",  // 海表温度
  plot_type: "scatter",
  colormap: "coolwarm",
  add_colorbar: true,
  title: "Sea Surface Temperature",
  output_path: "./output/sst_map.png"
}
// 用颜色表示温度值

// ============================================
// 示例 3: 轨迹图
// ============================================
const example3 = {
  data_source: "./data/ship_track.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "trajectory",
  basemap_features: ["coastlines", "borders", "land"],
  title: "Ship Trajectory",
  output_path: "./output/ship_track.png"
}
// 绘制船只或浮标轨迹

// ============================================
// 示例 4: 指定地图范围
// ============================================
const example4 = {
  data_source: "./data/western_pacific.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "value",
  plot_type: "scatter",
  extent: [120, 150, 20, 50],  // [lon_min, lon_max, lat_min, lat_max]
  projection: "Mercator",
  output_path: "./output/west_pacific.png"
}
// 聚焦特定区域

// ============================================
// 示例 5: 不同投影
// ============================================
const example5_global = {
  data_source: "./data/global_data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "value",
  plot_type: "scatter",
  projection: "Robinson",  // 适合全球地图
  basemap_features: ["coastlines", "land", "ocean"],
  output_path: "./output/global_robinson.png"
}

const example5_polar = {
  data_source: "./data/arctic_data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  projection: "Stereographic",  // 极地投影
  output_path: "./output/arctic_stereo.png"
}

// ============================================
// 示例 6: 自定义样式
// ============================================
const example6 = {
  data_source: "./data/measurements.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "depth",
  plot_type: "scatter",
  colormap: "viridis",
  marker_style: "^",  // 三角形
  marker_size: 100,
  alpha: 0.6,  // 透明度
  add_gridlines: true,
  title: "Water Depth Measurements",
  figure_size: [16, 10],
  dpi: 300,  // 高分辨率
  output_path: "./output/depth_map.png"
}

// ============================================
// 示例 7: 多特征底图
// ============================================
const example7 = {
  data_source: "./data/coastal_stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  basemap_features: [
    "coastlines",
    "borders",
    "land",
    "lakes",
    "rivers"
  ],
  output_path: "./output/detailed_basemap.png"
}

// ============================================
// 示例 8: Argo浮标轨迹
// ============================================
const argo_trajectory = {
  data_source: "./data/argo_6903123_trajectory.csv",
  longitude_column: "LONGITUDE",
  latitude_column: "LATITUDE",
  plot_type: "trajectory",
  projection: "PlateCarree",
  basemap_features: ["coastlines", "land"],
  extent: [120, 160, 20, 50],
  title: "Argo Float 6903123 Trajectory",
  output_path: "./output/argo_track.png"
}

// ============================================
// 示例 9: CTD站位图
// ============================================
const ctd_stations = {
  data_source: "./data/cruise_stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "station_number",
  plot_type: "scatter",
  colormap: "tab20",
  marker_style: "D",  // 菱形
  marker_size: 150,
  basemap_features: ["coastlines", "borders"],
  add_colorbar: false,
  title: "CTD Station Locations",
  output_path: "./output/ctd_stations.png"
}

// ============================================
// 示例 10: 海表温度分布
// ============================================
const sst_distribution = {
  data_source: "./data/satellite_sst.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "sst_celsius",
  plot_type: "scatter",
  colormap: "RdYlBu",
  marker_size: 50,
  alpha: 0.8,
  add_colorbar: true,
  projection: "Mercator",
  extent: [100, 180, -10, 50],
  title: "Sea Surface Temperature (°C)",
  figure_size: [14, 10],
  dpi: 200,
  output_path: "./output/sst_distribution.png"
}

// ============================================
// 应用场景示例
// ============================================

/**
 * 场景1: 海洋调查航次规划
 */
const survey_planning = {
  data_source: "./data/planned_stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  marker_style: "o",
  marker_size: 100,
  basemap_features: ["coastlines", "borders", "land"],
  add_gridlines: true,
  title: "Survey Station Plan",
  output_path: "./output/survey_plan.png"
}

/**
 * 场景2: 台风路径追踪
 */
const typhoon_track = {
  data_source: "./data/typhoon_path.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "wind_speed",
  plot_type: "trajectory",
  colormap: "YlOrRd",
  basemap_features: ["coastlines", "land"],
  extent: [110, 150, 10, 40],
  title: "Typhoon Track with Wind Speed",
  output_path: "./output/typhoon.png"
}

/**
 * 场景3: 渔场分布
 */
const fishing_grounds = {
  data_source: "./data/fishing_data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "catch_kg",
  plot_type: "scatter",
  colormap: "YlGnBu",
  marker_size: 80,
  add_colorbar: true,
  title: "Fishing Grounds (Catch in kg)",
  output_path: "./output/fishing_grounds.png"
}

/**
 * 场景4: 污染物扩散
 */
const pollution_spread = {
  data_source: "./data/pollution_samples.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "concentration",
  plot_type: "scatter",
  colormap: "Reds",
  marker_size: 120,
  alpha: 0.7,
  basemap_features: ["coastlines", "land", "rivers"],
  title: "Pollutant Concentration",
  output_path: "./output/pollution.png"
}

/**
 * 场景5: 地震分布
 */
const earthquake_map = {
  data_source: "./data/earthquakes.csv",
  longitude_column: "longitude",
  latitude_column: "latitude",
  value_column: "magnitude",
  plot_type: "scatter",
  colormap: "plasma",
  marker_size: 50,  // 可以根据震级调整
  projection: "PlateCarree",
  basemap_features: ["coastlines", "borders"],
  title: "Earthquake Distribution",
  output_path: "./output/earthquakes.png"
}

/**
 * 场景6: 生物多样性热点
 */
const biodiversity_hotspots = {
  data_source: "./data/species_observations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "species_count",
  plot_type: "scatter",
  colormap: "viridis",
  marker_style: "h",  // 六边形
  marker_size: 90,
  add_colorbar: true,
  title: "Biodiversity Hotspots",
  output_path: "./output/biodiversity.png"
}

// ============================================
// 工作流示例
// ============================================

/**
 * 完整的海洋数据可视化工作流
 */

// 步骤1: 查询数据
// OceanDatabaseQueryTool({
//   database: "argo",
//   parameters: ["temperature", "latitude", "longitude"],
//   ...
// })

// 步骤2: 保存数据
// FileWriteTool({
//   file_path: "./data/argo_data.csv",
//   content: queryResult
// })

// 步骤3: 绘制地图
const workflow_plot = {
  data_source: "./data/argo_data.csv",
  longitude_column: "longitude",
  latitude_column: "latitude",
  value_column: "temperature",
  plot_type: "scatter",
  colormap: "coolwarm",
  projection: "PlateCarree",
  basemap_features: ["coastlines", "land"],
  add_colorbar: true,
  title: "Argo Temperature Distribution",
  figure_size: [14, 10],
  dpi: 300,
  output_path: "./output/argo_temperature.png"
}

// ============================================
// 数据格式示例
// ============================================

/**
 * CSV格式
 *
 * lon,lat,value
 * 120.5,35.2,18.5
 * 121.0,35.5,19.2
 * 122.5,36.0,17.8
 */

/**
 * JSON格式
 */
const json_data_example = [
  { "lon": 120.5, "lat": 35.2, "value": 18.5 },
  { "lon": 121.0, "lat": 35.5, "value": 19.2 },
  { "lon": 122.5, "lat": 36.0, "value": 17.8 }
]

// ============================================
// 高级配置示例
// ============================================

/**
 * 高分辨率出版级图片
 */
const publication_figure = {
  data_source: "./data/research_data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "measurement",
  plot_type: "scatter",
  colormap: "viridis",
  marker_size: 80,
  alpha: 0.8,
  basemap_features: ["coastlines", "borders"],
  add_gridlines: true,
  add_colorbar: true,
  title: "Research Measurements",
  figure_size: [16, 12],
  dpi: 600,  // 高DPI用于出版
  output_path: "./output/publication_figure.pdf"
}

/**
 * 区域放大图
 */
const regional_zoom = {
  data_source: "./data/local_data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "value",
  plot_type: "scatter",
  extent: [139.5, 140.5, 35.0, 36.0],  // 东京湾区域
  projection: "Mercator",
  basemap_features: ["coastlines", "land", "lakes"],
  add_gridlines: true,
  title: "Tokyo Bay - Detailed View",
  figure_size: [12, 10],
  dpi: 300,
  output_path: "./output/tokyo_bay.png"
}

/**
 * 全球视图
 */
const global_view = {
  data_source: "./data/global_measurements.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "value",
  plot_type: "scatter",
  projection: "Robinson",
  extent: [-180, 180, -90, 90],
  basemap_features: ["coastlines", "land", "ocean"],
  colormap: "RdYlBu",
  add_colorbar: true,
  title: "Global Distribution",
  figure_size: [20, 10],
  dpi: 150,
  output_path: "./output/global_map.png"
}

export {
  example1, example2, example3, example4,
  example5_global, example5_polar,
  example6, example7,
  argo_trajectory, ctd_stations, sst_distribution,
  survey_planning, typhoon_track, fishing_grounds,
  pollution_spread, earthquake_map, biodiversity_hotspots,
  workflow_plot,
  json_data_example,
  publication_figure, regional_zoom, global_view
}
