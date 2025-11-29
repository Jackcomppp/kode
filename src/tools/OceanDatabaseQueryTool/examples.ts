/**
 * OceanDatabaseQueryTool 使用示例
 *
 * 这个文件展示了如何使用 OceanDatabaseQueryTool 查询海洋数据库
 */

// ============================================
// 示例 1: 基础温度和盐度查询
// ============================================
const example1 = {
  database: "wod",
  parameters: ["temperature", "salinity"],
  output_format: "json",
  max_results: 50
}

// 预期输出: 50条包含温度和盐度数据的JSON格式记录


// ============================================
// 示例 2: 特定海域的详细查询
// ============================================
const example2 = {
  database: "argo",
  parameters: ["temperature", "salinity", "pressure", "depth"],
  latitude_range: [25.0, 45.0],      // 北纬25°到45°
  longitude_range: [120.0, 150.0],   // 东经120°到150°
  depth_range: [0, 2000],            // 0到2000米深度
  output_format: "csv",
  max_results: 200
}

// 预期输出: 200条CSV格式的数据，包含指定海域和深度范围的温盐压深数据


// ============================================
// 示例 3: 时间序列分析
// ============================================
const example3 = {
  database: "copernicus",
  parameters: ["temperature", "salinity", "oxygen", "ph"],
  latitude_range: [-10.0, 10.0],     // 赤道附近
  longitude_range: [-180.0, 180.0],  // 全球经度
  time_range: ["2020-01-01", "2023-12-31"],  // 2020-2023年
  output_format: "json",
  max_results: 1000
}

// 预期输出: 2020-2023年间赤道海域的多参数数据


// ============================================
// 示例 4: 深海探测数据
// ============================================
const example4 = {
  database: "glodap",
  parameters: ["temperature", "salinity", "oxygen", "nitrate", "phosphate", "silicate"],
  latitude_range: [30.0, 60.0],      // 北太平洋
  longitude_range: [160.0, -120.0],
  depth_range: [3000, 6000],         // 深海区域
  output_format: "csv",
  max_results: 500
}

// 预期输出: 北太平洋深海区域的生物地球化学参数数据


// ============================================
// 示例 5: 表层海洋参数
// ============================================
const example5 = {
  database: "noaa",
  parameters: ["temperature", "salinity", "chlorophyll"],
  latitude_range: [-40.0, -20.0],    // 南半球
  longitude_range: [140.0, 180.0],
  depth_range: [0, 100],             // 表层到100米
  time_range: ["2023-01-01", "2023-12-31"],
  output_format: "json",
  max_results: 300
}

// 预期输出: 2023年南半球指定海域的表层海洋参数


// ============================================
// 示例 6: 最小配置查询
// ============================================
const example6 = {
  database: "wod",
  output_format: "json"
}

// 预期输出: 使用默认参数的1000条记录（所有可用参数）


// ============================================
// 示例 7: 自定义API端点
// ============================================
const example7 = {
  database: "noaa",
  parameters: ["temperature", "salinity"],
  api_endpoint: "https://custom-ocean-api.example.com/data",
  latitude_range: [0.0, 20.0],
  longitude_range: [100.0, 120.0],
  output_format: "csv",
  max_results: 150
}

// 预期输出: 从自定义API端点获取的数据


// ============================================
// 示例 8: 多参数综合查询
// ============================================
const example8 = {
  database: "copernicus",
  parameters: [
    "latitude",
    "longitude",
    "depth",
    "time",
    "temperature",
    "salinity",
    "pressure",
    "oxygen",
    "ph",
    "chlorophyll"
  ],
  latitude_range: [20.0, 40.0],
  longitude_range: [120.0, 140.0],
  depth_range: [0, 1000],
  time_range: ["2022-06-01", "2022-08-31"],
  output_format: "json",
  max_results: 2000
}

// 预期输出: 2022年夏季指定海域的全面海洋参数数据


// ============================================
// 工作流示例: 完整的数据分析流程
// ============================================

/**
 * 步骤1: 查询数据
 */
const workflowStep1 = {
  database: "argo",
  parameters: ["temperature", "salinity", "depth", "latitude", "longitude"],
  latitude_range: [25.0, 45.0],
  longitude_range: [120.0, 150.0],
  time_range: ["2023-01-01", "2023-12-31"],
  output_format: "json",
  max_results: 1000
}

/**
 * 步骤2: 将查询结果保存到文件
 * 使用 FileWriteTool 保存到: ./data/ocean_data_2023.json
 */

/**
 * 步骤3: 使用 OceanDataPreprocessTool 预处理数据
 * - 清洗数据
 * - 质量检查
 * - 计算统计信息
 * - 标准化数值
 */

/**
 * 步骤4: 使用 GrepTool 搜索特定模式
 * - 查找特定温度范围的数据
 * - 提取异常值
 */


// ============================================
// 错误处理示例
// ============================================

/**
 * 示例: 无效的纬度范围（会被验证拒绝）
 */
const errorExample1 = {
  database: "wod",
  latitude_range: [-100, 100],  // ❌ 纬度必须在 -90 到 90 之间
  output_format: "json"
}

/**
 * 示例: 无效的时间范围（会被验证拒绝）
 */
const errorExample2 = {
  database: "argo",
  time_range: ["2023-12-31", "2023-01-01"],  // ❌ 开始时间不能晚于结束时间
  output_format: "json"
}

/**
 * 示例: 不支持的参数（会被验证拒绝）
 */
const errorExample3 = {
  database: "copernicus",
  parameters: ["temperature", "invalid_param"],  // ❌ invalid_param 不是有效参数
  output_format: "json"
}


// ============================================
// 性能优化建议
// ============================================

/**
 * 1. 限制结果数量
 * - 使用较小的 max_results 值进行初步探索
 * - 确认数据后再进行大规模查询
 */
const performanceTip1 = {
  database: "wod",
  parameters: ["temperature"],
  max_results: 10,  // 先查询少量数据测试
  output_format: "json"
}

/**
 * 2. 精确的空间范围
 * - 指定具体的地理范围，避免全球查询
 */
const performanceTip2 = {
  database: "argo",
  parameters: ["temperature", "salinity"],
  latitude_range: [35.0, 36.0],      // 小范围
  longitude_range: [139.0, 140.0],   // 小范围
  output_format: "json"
}

/**
 * 3. 合理的时间范围
 * - 指定具体的时间段，避免查询全部历史数据
 */
const performanceTip3 = {
  database: "copernicus",
  parameters: ["temperature"],
  time_range: ["2023-10-01", "2023-10-31"],  // 一个月的数据
  output_format: "json"
}


// ============================================
// 数据格式对比
// ============================================

/**
 * JSON格式 - 适合程序处理
 */
const jsonFormat = {
  database: "wod",
  parameters: ["temperature", "salinity"],
  max_results: 5,
  output_format: "json"
}
// 输出示例:
// [
//   {"temperature": "18.45", "salinity": "34.82"},
//   {"temperature": "17.23", "salinity": "35.01"}
// ]

/**
 * CSV格式 - 适合电子表格和数据分析工具
 */
const csvFormat = {
  database: "wod",
  parameters: ["temperature", "salinity"],
  max_results: 5,
  output_format: "csv"
}
// 输出示例:
// temperature,salinity
// 18.45,34.82
// 17.23,35.01


// ============================================
// 常见应用场景
// ============================================

/**
 * 场景1: 气候变化研究
 * - 长时间序列的温度数据
 */
const climateResearch = {
  database: "glodap",
  parameters: ["temperature", "time"],
  time_range: ["2000-01-01", "2023-12-31"],
  output_format: "csv",
  max_results: 5000
}

/**
 * 场景2: 海洋酸化监测
 * - pH值和相关碳酸盐系统参数
 */
const oceanAcidification = {
  database: "glodap",
  parameters: ["ph", "oxygen", "nitrate"],
  time_range: ["2020-01-01", "2023-12-31"],
  output_format: "json",
  max_results: 1000
}

/**
 * 场景3: 渔业资源评估
 * - 表层温度、叶绿素、营养盐
 */
const fisheryAssessment = {
  database: "copernicus",
  parameters: ["temperature", "chlorophyll", "nitrate", "phosphate"],
  depth_range: [0, 200],
  output_format: "csv",
  max_results: 2000
}

/**
 * 场景4: 海洋环流研究
 * - 温度、盐度、压力的垂直剖面
 */
const oceanCirculation = {
  database: "argo",
  parameters: ["temperature", "salinity", "pressure", "depth"],
  latitude_range: [30.0, 35.0],
  longitude_range: [135.0, 140.0],
  depth_range: [0, 4000],
  output_format: "json",
  max_results: 3000
}

export {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
  example7,
  example8,
  workflowStep1,
  climateResearch,
  oceanAcidification,
  fisheryAssessment,
  oceanCirculation
}
