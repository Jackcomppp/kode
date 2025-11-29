/**
 * TimeSeriesAnalysisTool 使用示例
 *
 * 展示如何使用时间序列分析工具进行各种分析
 */

// ============================================
// 示例 1: 基础完整分析
// ============================================
const example1 = {
  data_source: "./data/sales_data.csv",
  time_column: "date",
  value_column: "sales",
  analysis_type: "all",
  forecast_periods: 30
}
// 执行所有类型的分析，包括趋势、季节性、预测等

// ============================================
// 示例 2: 仅进行描述性统计
// ============================================
const example2 = {
  data_source: "./data/temperature.csv",
  time_column: "timestamp",
  value_column: "temp_celsius",
  analysis_type: "descriptive"
}
// 只计算均值、标准差、分位数等基础统计量

// ============================================
// 示例 3: 趋势分析
// ============================================
const example3 = {
  data_source: "./data/stock_prices.csv",
  time_column: "date",
  value_column: "close_price",
  analysis_type: "trend",
  frequency: "D"  // 日数据
}
// 检测数据中的趋势类型和强度

// ============================================
// 示例 4: 季节性分解
// ============================================
const example4 = {
  data_source: "./data/monthly_revenue.csv",
  time_column: "month",
  value_column: "revenue",
  analysis_type: "decomposition",
  seasonal_periods: 12,  // 12个月的季节周期
  frequency: "M"
}
// 将时间序列分解为趋势、季节性和残差成分

// ============================================
// 示例 5: 平稳性检验
// ============================================
const example5 = {
  data_source: "./data/sensor_readings.csv",
  time_column: "timestamp",
  value_column: "value",
  analysis_type: "stationarity",
  date_format: "%Y-%m-%d %H:%M:%S"
}
// 使用ADF检验判断序列是否平稳

// ============================================
// 示例 6: 自相关分析
// ============================================
const example6 = {
  data_source: "./data/daily_visits.csv",
  time_column: "date",
  value_column: "visits",
  analysis_type: "autocorrelation"
}
// 计算ACF和PACF，识别显著的滞后项

// ============================================
// 示例 7: 预测分析（ARIMA）
// ============================================
const example7 = {
  data_source: "./data/historical_demand.csv",
  time_column: "date",
  value_column: "demand",
  analysis_type: "forecast",
  forecast_periods: 60,
  forecast_method: "arima",
  confidence_level: 0.95,
  frequency: "D"
}
// 使用ARIMA方法预测未来60个周期

// ============================================
// 示例 8: 预测分析（指数平滑）
// ============================================
const example8 = {
  data_source: "./data/product_sales.csv",
  time_column: "week",
  value_column: "units_sold",
  analysis_type: "forecast",
  forecast_periods: 12,
  forecast_method: "exponential",
  frequency: "W"
}
// 使用指数平滑方法预测未来12周

// ============================================
// 示例 9: 异常值检测
// ============================================
const example9 = {
  data_source: "./data/server_metrics.csv",
  time_column: "timestamp",
  value_column: "response_time",
  analysis_type: "anomaly",
  detect_anomalies: true
}
// 检测时间序列中的异常值

// ============================================
// 示例 10: 变化点检测
// ============================================
const example10 = {
  data_source: "./data/user_activity.csv",
  time_column: "date",
  value_column: "active_users",
  analysis_type: "changepoint"
}
// 识别序列中的结构性变化点

// ============================================
// 示例 11: 使用内联JSON数据
// ============================================
const example11 = {
  data_source: JSON.stringify([
    { timestamp: "2024-01-01", value: 100 },
    { timestamp: "2024-01-02", value: 105 },
    { timestamp: "2024-01-03", value: 103 },
    { timestamp: "2024-01-04", value: 110 },
    { timestamp: "2024-01-05", value: 108 },
    // ... more data points
  ]),
  time_column: "timestamp",
  value_column: "value",
  analysis_type: "all"
}
// 直接提供JSON数据而不是文件路径

// ============================================
// 示例 12: 月度销售数据分析与预测
// ============================================
const example12 = {
  data_source: "./data/monthly_sales_2020_2023.csv",
  time_column: "month",
  value_column: "sales_amount",
  analysis_type: "all",
  frequency: "M",
  seasonal_periods: 12,
  forecast_periods: 6,
  forecast_method: "seasonal",
  confidence_level: 0.95
}
// 完整分析月度销售数据并预测未来6个月

// ============================================
// 示例 13: 小时级传感器数据分析
// ============================================
const example13 = {
  data_source: "./data/sensor_hourly.csv",
  time_column: "datetime",
  value_column: "temperature",
  date_format: "%Y-%m-%d %H:%M:%S",
  analysis_type: "all",
  frequency: "H",
  seasonal_periods: 24,  // 24小时周期
  detect_anomalies: true,
  forecast_periods: 48  // 预测未来48小时
}
// 分析小时级数据，检测日周期模式

// ============================================
// 示例 14: 季度财务数据
// ============================================
const example14 = {
  data_source: "./data/quarterly_earnings.csv",
  time_column: "quarter",
  value_column: "earnings",
  analysis_type: "all",
  frequency: "Q",
  seasonal_periods: 4,
  forecast_periods: 4
}
// 分析季度数据，识别年度模式

// ============================================
// 示例 15: 去趋势分析
// ============================================
const example15 = {
  data_source: "./data/long_term_growth.csv",
  time_column: "year",
  value_column: "metric",
  analysis_type: "all",
  detrend: true,  // 去除趋势后分析
  frequency: "Y"
}
// 去除长期趋势后分析周期性模式

// ============================================
// 工作流示例：完整的时间序列分析流程
// ============================================

/**
 * 步骤1: 加载并探索数据
 */
const workflow_step1 = {
  data_source: "./data/website_traffic.csv",
  time_column: "date",
  value_column: "daily_visitors",
  analysis_type: "descriptive",
  frequency: "D"
}
// 首先了解数据的基本统计特征

/**
 * 步骤2: 检查平稳性
 */
const workflow_step2 = {
  data_source: "./data/website_traffic.csv",
  time_column: "date",
  value_column: "daily_visitors",
  analysis_type: "stationarity"
}
// 判断数据是否需要差分处理

/**
 * 步骤3: 季节性分析
 */
const workflow_step3 = {
  data_source: "./data/website_traffic.csv",
  time_column: "date",
  value_column: "daily_visitors",
  analysis_type: "decomposition",
  seasonal_periods: 7,  // 周周期
  frequency: "D"
}
// 检测周期性模式

/**
 * 步骤4: 异常值检测和清理
 */
const workflow_step4 = {
  data_source: "./data/website_traffic.csv",
  time_column: "date",
  value_column: "daily_visitors",
  analysis_type: "anomaly",
  detect_anomalies: true
}
// 识别需要处理的异常值

/**
 * 步骤5: 建立预测模型
 */
const workflow_step5 = {
  data_source: "./data/website_traffic.csv",
  time_column: "date",
  value_column: "daily_visitors",
  analysis_type: "forecast",
  forecast_periods: 30,
  forecast_method: "arima",
  confidence_level: 0.95,
  frequency: "D"
}
// 预测未来30天的访问量

/**
 * 步骤6: 综合分析报告
 */
const workflow_step6 = {
  data_source: "./data/website_traffic.csv",
  time_column: "date",
  value_column: "daily_visitors",
  analysis_type: "all",
  seasonal_periods: 7,
  forecast_periods: 30,
  forecast_method: "seasonal",
  detect_anomalies: true,
  frequency: "D"
}
// 生成完整的分析报告

// ============================================
// 不同预测方法对比
// ============================================

/**
 * 方法1: ARIMA预测（适合复杂模式）
 */
const forecast_arima = {
  data_source: "./data/complex_series.csv",
  time_column: "date",
  value_column: "value",
  analysis_type: "forecast",
  forecast_method: "arima",
  forecast_periods: 20
}

/**
 * 方法2: 指数平滑（适合平滑趋势）
 */
const forecast_exponential = {
  data_source: "./data/complex_series.csv",
  time_column: "date",
  value_column: "value",
  analysis_type: "forecast",
  forecast_method: "exponential",
  forecast_periods: 20
}

/**
 * 方法3: 线性预测（适合线性趋势）
 */
const forecast_linear = {
  data_source: "./data/complex_series.csv",
  time_column: "date",
  value_column: "value",
  analysis_type: "forecast",
  forecast_method: "linear",
  forecast_periods: 20
}

/**
 * 方法4: 季节性预测（适合强季节性）
 */
const forecast_seasonal = {
  data_source: "./data/complex_series.csv",
  time_column: "date",
  value_column: "value",
  analysis_type: "forecast",
  forecast_method: "seasonal",
  forecast_periods: 20,
  seasonal_periods: 12
}

// ============================================
// 应用场景示例
// ============================================

/**
 * 场景1: 电商销售预测
 */
const ecommerce_forecast = {
  data_source: "./data/ecommerce_daily_sales.csv",
  time_column: "date",
  value_column: "total_sales",
  analysis_type: "all",
  frequency: "D",
  seasonal_periods: 7,  // 周周期
  forecast_periods: 14,  // 预测两周
  forecast_method: "seasonal",
  detect_anomalies: true
}

/**
 * 场景2: 能源消耗预测
 */
const energy_forecast = {
  data_source: "./data/hourly_energy_consumption.csv",
  time_column: "hour",
  value_column: "kwh",
  date_format: "%Y-%m-%d %H:%M:%S",
  analysis_type: "all",
  frequency: "H",
  seasonal_periods: 24,  // 日周期
  forecast_periods: 72,  // 预测3天
  forecast_method: "arima"
}

/**
 * 场景3: 股票价格分析
 */
const stock_analysis = {
  data_source: "./data/stock_daily_close.csv",
  time_column: "date",
  value_column: "close",
  analysis_type: "all",
  frequency: "D",
  forecast_periods: 5,
  forecast_method: "arima",
  detect_anomalies: true,
  confidence_level: 0.99
}

/**
 * 场景4: 天气预报辅助分析
 */
const weather_analysis = {
  data_source: "./data/historical_temperature.csv",
  time_column: "date",
  value_column: "avg_temp",
  analysis_type: "all",
  frequency: "D",
  seasonal_periods: 365,  // 年周期
  forecast_periods: 7,
  forecast_method: "seasonal"
}

/**
 * 场景5: 网站流量监控
 */
const traffic_monitoring = {
  data_source: "./data/website_hourly_traffic.csv",
  time_column: "timestamp",
  value_column: "page_views",
  date_format: "%Y-%m-%d %H:%M:%S",
  analysis_type: "all",
  frequency: "H",
  seasonal_periods: 24,
  detect_anomalies: true,  // 检测流量异常
  forecast_periods: 24
}

/**
 * 场景6: 制造业质量控制
 */
const quality_control = {
  data_source: "./data/product_defect_rate.csv",
  time_column: "date",
  value_column: "defect_percentage",
  analysis_type: "all",
  frequency: "D",
  detect_anomalies: true,  // 检测质量异常
  changepoint: true  // 检测工艺变化点
}

/**
 * 场景7: 农业产量预测
 */
const agriculture_forecast = {
  data_source: "./data/crop_yield_yearly.csv",
  time_column: "year",
  value_column: "yield_tons",
  analysis_type: "all",
  frequency: "Y",
  forecast_periods: 3,
  forecast_method: "linear"
}

// ============================================
// CSV数据格式示例
// ============================================

/**
 * 标准CSV格式（带日期列）
 *
 * date,sales
 * 2024-01-01,1500
 * 2024-01-02,1650
 * 2024-01-03,1580
 * ...
 */

/**
 * 带时间戳的CSV格式
 *
 * timestamp,temperature,humidity
 * 2024-01-01 00:00:00,22.5,65
 * 2024-01-01 01:00:00,21.8,67
 * 2024-01-01 02:00:00,21.2,68
 * ...
 */

/**
 * 多列CSV格式（选择一列分析）
 *
 * date,product_a_sales,product_b_sales,total_sales
 * 2024-01-01,500,800,1300
 * 2024-01-02,520,850,1370
 * ...
 *
 * 使用 value_column: "product_a_sales" 来分析特定产品
 */

// ============================================
// JSON数据格式示例
// ============================================

/**
 * JSON数组格式
 */
const json_example = {
  data_source: JSON.stringify([
    { "date": "2024-01-01", "value": 100, "category": "A" },
    { "date": "2024-01-02", "value": 105, "category": "A" },
    { "date": "2024-01-03", "value": 103, "category": "A" }
  ]),
  time_column: "date",
  value_column: "value",
  analysis_type: "all"
}

// ============================================
// 组合分析示例
// ============================================

/**
 * 先分析历史数据，再用于预测
 */
const combined_analysis = {
  data_source: "./data/complete_timeseries.csv",
  time_column: "datetime",
  value_column: "metric",
  date_format: "%Y-%m-%d %H:%M:%S",
  analysis_type: "all",
  frequency: "H",
  seasonal_periods: 24,
  forecast_periods: 48,
  forecast_method: "arima",
  detect_anomalies: true,
  confidence_level: 0.95,
  detrend: false
}

export {
  example1, example2, example3, example4, example5,
  example6, example7, example8, example9, example10,
  example11, example12, example13, example14, example15,
  workflow_step1, workflow_step2, workflow_step3,
  workflow_step4, workflow_step5, workflow_step6,
  forecast_arima, forecast_exponential, forecast_linear, forecast_seasonal,
  ecommerce_forecast, energy_forecast, stock_analysis,
  weather_analysis, traffic_monitoring, quality_control,
  agriculture_forecast,
  json_example, combined_analysis
}
