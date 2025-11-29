/**
 * StandardChartTool 使用示例
 *
 * 展示如何创建各种标准图表
 */

// ============================================
// 示例 1: 基础折线图
// ============================================
const example1_lineChart = {
  data_source: "./data/sales.csv",
  chart_type: "line",
  x_column: "month",
  y_column: "revenue",
  title: "Monthly Revenue",
  x_label: "Month",
  y_label: "Revenue ($)",
  output_path: "./output/revenue_line.png"
}
// 简单的时间序列折线图

// ============================================
// 示例 2: 多系列折线图
// ============================================
const example2_multiLine = {
  data_source: "./data/comparison.csv",
  chart_type: "line",
  x_column: "date",
  y_column: "product_a,product_b,product_c", // 多个系列用逗号分隔
  title: "Product Comparison",
  x_label: "Date",
  y_label: "Sales",
  legend: true,
  grid: true,
  output_path: "./output/multi_line.png"
}
// 比较多个产品的销售趋势

// ============================================
// 示例 3: 散点图
// ============================================
const example3_scatter = {
  data_source: "./data/correlation.csv",
  chart_type: "scatter",
  x_column: "temperature",
  y_column: "ice_cream_sales",
  title: "Temperature vs Ice Cream Sales",
  x_label: "Temperature (°C)",
  y_label: "Sales",
  marker_size: 80,
  alpha: 0.6,
  output_path: "./output/scatter.png"
}
// 展示两个变量之间的关系

// ============================================
// 示例 4: 柱状图
// ============================================
const example4_bar = {
  data_source: "./data/categories.csv",
  chart_type: "bar",
  x_column: "category",
  y_column: "value",
  title: "Category Comparison",
  x_label: "Category",
  y_label: "Value",
  color_scheme: "pastel",
  output_path: "./output/bar_chart.png"
}
// 比较不同类别的数值

// ============================================
// 示例 5: 分组柱状图
// ============================================
const example5_groupedBar = {
  data_source: "./data/quarterly.csv",
  chart_type: "bar",
  x_column: "quarter",
  y_column: "q1,q2,q3,q4",
  title: "Quarterly Performance",
  x_label: "Quarter",
  y_label: "Revenue",
  legend: true,
  output_path: "./output/grouped_bar.png"
}
// 展示多个系列的分组柱状图

// ============================================
// 示例 6: 堆叠柱状图
// ============================================
const example6_stackedBar = {
  data_source: "./data/segments.csv",
  chart_type: "bar",
  x_column: "year",
  y_column: "segment_a,segment_b,segment_c",
  title: "Market Segments Over Time",
  stacked: true,
  legend: true,
  output_path: "./output/stacked_bar.png"
}
// 展示组成部分的堆叠关系

// ============================================
// 示例 7: 水平柱状图
// ============================================
const example7_horizontalBar = {
  data_source: "./data/ranking.csv",
  chart_type: "barh",
  x_column: "score",
  y_column: "country",
  title: "Country Ranking",
  x_label: "Score",
  y_label: "Country",
  output_path: "./output/horizontal_bar.png"
}
// 用于排名或长标签的情况

// ============================================
// 示例 8: 直方图
// ============================================
const example8_histogram = {
  data_source: "./data/distribution.csv",
  chart_type: "histogram",
  x_column: "values",
  title: "Value Distribution",
  x_label: "Value",
  y_label: "Frequency",
  bins: 50,
  alpha: 0.7,
  output_path: "./output/histogram.png"
}
// 展示数据的分布情况

// ============================================
// 示例 9: 箱线图
// ============================================
const example9_boxPlot = {
  data_source: "./data/measurements.csv",
  chart_type: "box",
  y_column: "measurement",
  group_column: "group",
  title: "Measurement Distribution by Group",
  x_label: "Group",
  y_label: "Measurement",
  output_path: "./output/box_plot.png"
}
// 展示分组数据的分布和离群值

// ============================================
// 示例 10: 小提琴图
// ============================================
const example10_violin = {
  data_source: "./data/scores.csv",
  chart_type: "violin",
  y_column: "score",
  group_column: "class",
  title: "Score Distribution by Class",
  x_label: "Class",
  y_label: "Score",
  alpha: 0.6,
  output_path: "./output/violin_plot.png"
}
// 展示数据的密度分布

// ============================================
// 示例 11: 饼图
// ============================================
const example11_pie = {
  data_source: "./data/market_share.csv",
  chart_type: "pie",
  x_column: "company",
  y_column: "share",
  title: "Market Share",
  output_path: "./output/pie_chart.png"
}
// 展示组成比例

// ============================================
// 示例 12: 面积图
// ============================================
const example12_area = {
  data_source: "./data/growth.csv",
  chart_type: "area",
  x_column: "year",
  y_column: "users",
  title: "User Growth Over Time",
  x_label: "Year",
  y_label: "Users (millions)",
  alpha: 0.5,
  output_path: "./output/area_chart.png"
}
// 强调增长趋势

// ============================================
// 示例 13: 堆叠面积图
// ============================================
const example13_stackedArea = {
  data_source: "./data/traffic_sources.csv",
  chart_type: "area",
  x_column: "month",
  y_column: "organic,paid,social,direct",
  title: "Traffic Sources Over Time",
  stacked: true,
  legend: true,
  output_path: "./output/stacked_area.png"
}
// 展示各部分随时间的变化

// ============================================
// 示例 14: 阶梯图
// ============================================
const example14_step = {
  data_source: "./data/inventory.csv",
  chart_type: "step",
  x_column: "date",
  y_column: "stock_level",
  title: "Inventory Levels",
  x_label: "Date",
  y_label: "Stock",
  line_width: 2,
  output_path: "./output/step_chart.png"
}
// 展示阶段性变化

// ============================================
// 示例 15: 热力图
// ============================================
const example15_heatmap = {
  data_source: "./data/correlation_matrix.csv",
  chart_type: "heatmap",
  x_column: "variable1",
  y_column: "variable2",
  group_column: "correlation",
  title: "Correlation Heatmap",
  colormap: "coolwarm",
  output_path: "./output/heatmap.png"
}
// 展示矩阵数据或相关性

// ============================================
// 应用场景示例
// ============================================

/**
 * 场景1: 财务报表可视化
 */
const finance_report = {
  data_source: "./data/financial_data.csv",
  chart_type: "line",
  x_column: "quarter",
  y_column: "revenue,profit,expenses",
  title: "Financial Performance Q1-Q4 2024",
  x_label: "Quarter",
  y_label: "Amount ($M)",
  legend: true,
  grid: true,
  color_scheme: "Set1",
  line_width: 3,
  marker_style: "o",
  marker_size: 100,
  figure_size: [12, 6],
  dpi: 200,
  output_path: "./output/financial_report.png"
}

/**
 * 场景2: 科学数据分析
 */
const science_scatter = {
  data_source: "./data/experiment_results.csv",
  chart_type: "scatter",
  x_column: "concentration",
  y_column: "reaction_rate",
  title: "Reaction Rate vs Concentration",
  x_label: "Concentration (mol/L)",
  y_label: "Reaction Rate (mol/L/s)",
  marker_size: 60,
  alpha: 0.7,
  grid: true,
  style: "seaborn",
  output_path: "./output/science_scatter.png"
}

/**
 * 场景3: 销售业绩对比
 */
const sales_comparison = {
  data_source: "./data/sales_team.csv",
  chart_type: "barh",
  x_column: "sales",
  y_column: "salesperson",
  title: "Sales Team Performance 2024",
  x_label: "Total Sales ($)",
  y_label: "Salesperson",
  color_scheme: "bright",
  alpha: 0.8,
  figure_size: [10, 8],
  output_path: "./output/sales_team.png"
}

/**
 * 场景4: 统计分布分析
 */
const distribution_analysis = {
  data_source: "./data/test_scores.csv",
  chart_type: "histogram",
  x_column: "score",
  title: "Exam Score Distribution",
  x_label: "Score",
  y_label: "Number of Students",
  bins: 20,
  alpha: 0.7,
  grid: true,
  color_scheme: "pastel",
  output_path: "./output/score_distribution.png"
}

/**
 * 场景5: 市场份额分析
 */
const market_analysis = {
  data_source: "./data/market_data.csv",
  chart_type: "pie",
  x_column: "brand",
  y_column: "market_share",
  title: "Smartphone Market Share 2024",
  color_scheme: "Set2",
  alpha: 0.9,
  figure_size: [8, 8],
  dpi: 200,
  output_path: "./output/market_share.png"
}

/**
 * 场景6: 时间序列趋势
 */
const time_series_trend = {
  data_source: "./data/stock_prices.csv",
  chart_type: "line",
  x_column: "date",
  y_column: "close_price",
  title: "Stock Price Trend",
  x_label: "Date",
  y_label: "Price ($)",
  line_style: "-",
  line_width: 2,
  color_scheme: "default",
  grid: true,
  style: "ggplot",
  figure_size: [14, 6],
  output_path: "./output/stock_trend.png"
}

/**
 * 场景7: A/B测试结果
 */
const ab_test_results = {
  data_source: "./data/ab_test.csv",
  chart_type: "box",
  y_column: "conversion_rate",
  group_column: "variant",
  title: "A/B Test Conversion Rate Comparison",
  x_label: "Variant",
  y_label: "Conversion Rate (%)",
  color_scheme: "colorblind",
  alpha: 0.7,
  output_path: "./output/ab_test.png"
}

/**
 * 场景8: 网站流量分析
 */
const traffic_analysis = {
  data_source: "./data/website_traffic.csv",
  chart_type: "area",
  x_column: "date",
  y_column: "desktop,mobile,tablet",
  title: "Website Traffic by Device",
  x_label: "Date",
  y_label: "Visitors",
  stacked: true,
  legend: true,
  color_scheme: "Set3",
  alpha: 0.7,
  grid: true,
  output_path: "./output/traffic_analysis.png"
}

/**
 * 场景9: 温度变化记录
 */
const temperature_log = {
  data_source: "./data/temperature.csv",
  chart_type: "line",
  x_column: "hour",
  y_column: "temperature",
  title: "24-Hour Temperature Log",
  x_label: "Hour",
  y_label: "Temperature (°C)",
  line_style: "-",
  marker_style: "o",
  marker_size: 40,
  color_scheme: "default",
  grid: true,
  output_path: "./output/temperature_log.png"
}

/**
 * 场景10: 员工满意度调查
 */
const satisfaction_survey = {
  data_source: "./data/employee_survey.csv",
  chart_type: "bar",
  x_column: "department",
  y_column: "satisfaction_score",
  title: "Employee Satisfaction by Department",
  x_label: "Department",
  y_label: "Satisfaction Score (1-10)",
  color_scheme: "pastel",
  alpha: 0.8,
  grid: true,
  output_path: "./output/satisfaction.png"
}

// ============================================
// 样式定制示例
// ============================================

/**
 * 高级样式1: Seaborn风格
 */
const seaborn_style = {
  data_source: "./data/data.csv",
  chart_type: "scatter",
  x_column: "x",
  y_column: "y",
  title: "Seaborn Style Scatter",
  style: "seaborn",
  color_scheme: "bright",
  marker_size: 80,
  alpha: 0.6,
  output_path: "./output/seaborn_style.png"
}

/**
 * 高级样式2: ggplot风格
 */
const ggplot_style = {
  data_source: "./data/data.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "y1,y2",
  title: "GGPlot Style Line Chart",
  style: "ggplot",
  line_width: 2.5,
  legend: true,
  output_path: "./output/ggplot_style.png"
}

/**
 * 高级样式3: FiveThirtyEight风格
 */
const fivethirtyeight_style = {
  data_source: "./data/data.csv",
  chart_type: "bar",
  x_column: "category",
  y_column: "value",
  title: "FiveThirtyEight Style Bar Chart",
  style: "fivethirtyeight",
  color_scheme: "bright",
  output_path: "./output/fivethirtyeight_style.png"
}

/**
 * 高级样式4: 灰度样式
 */
const grayscale_style = {
  data_source: "./data/data.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "y",
  title: "Grayscale Style",
  style: "grayscale",
  line_width: 3,
  marker_style: "o",
  output_path: "./output/grayscale_style.png"
}

// ============================================
// 出版级图表
// ============================================

/**
 * 高分辨率出版图
 */
const publication_figure = {
  data_source: "./data/research_data.csv",
  chart_type: "scatter",
  x_column: "independent_variable",
  y_column: "dependent_variable",
  title: "Effect of X on Y",
  x_label: "Independent Variable (units)",
  y_label: "Dependent Variable (units)",
  marker_size: 60,
  alpha: 0.7,
  grid: true,
  figure_size: [8, 6],
  dpi: 600,
  style: "seaborn",
  output_path: "./output/publication_figure.pdf"
}

// ============================================
// 数据格式示例
// ============================================

/**
 * CSV格式示例
 *
 * month,revenue,costs
 * Jan,10000,8000
 * Feb,12000,8500
 * Mar,11500,8200
 * Apr,13000,9000
 */

/**
 * JSON格式示例
 */
const json_data_example = [
  { "month": "Jan", "revenue": 10000, "costs": 8000 },
  { "month": "Feb", "revenue": 12000, "costs": 8500 },
  { "month": "Mar", "revenue": 11500, "costs": 8200 },
  { "month": "Apr", "revenue": 13000, "costs": 9000 }
]

/**
 * 内联JSON数据使用示例
 */
const inline_data_example = {
  data_source: JSON.stringify([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 }
  ]),
  chart_type: "line",
  x_column: "x",
  y_column: "y",
  title: "Simple Line Chart",
  output_path: "./output/inline_data.png"
}

// ============================================
// 完整工作流示例
// ============================================

/**
 * 工作流: 数据分析到可视化
 */

// 步骤1: 时间序列分析
// TimeSeriesAnalysisTool({
//   data_source: "./data/sales.csv",
//   date_column: "date",
//   value_column: "sales",
//   analysis_type: "trend"
// })

// 步骤2: 绘制原始数据
const workflow_step2 = {
  data_source: "./data/sales.csv",
  chart_type: "line",
  x_column: "date",
  y_column: "sales",
  title: "Original Sales Data",
  output_path: "./output/original_sales.png"
}

// 步骤3: 绘制趋势对比
const workflow_step3 = {
  data_source: "./data/sales_with_trend.csv",
  chart_type: "line",
  x_column: "date",
  y_column: "sales,trend",
  title: "Sales Data with Trend",
  legend: true,
  output_path: "./output/sales_with_trend.png"
}

// ============================================
// 多图表对比
// ============================================

/**
 * 创建多个相关图表
 */

// 图表1: 散点图
const multi_chart_1 = {
  data_source: "./data/correlation.csv",
  chart_type: "scatter",
  x_column: "x",
  y_column: "y",
  title: "Scatter Plot",
  output_path: "./output/multi_1_scatter.png"
}

// 图表2: X的分布
const multi_chart_2 = {
  data_source: "./data/correlation.csv",
  chart_type: "histogram",
  x_column: "x",
  title: "X Distribution",
  bins: 30,
  output_path: "./output/multi_2_hist_x.png"
}

// 图表3: Y的分布
const multi_chart_3 = {
  data_source: "./data/correlation.csv",
  chart_type: "histogram",
  x_column: "y",
  title: "Y Distribution",
  bins: 30,
  output_path: "./output/multi_3_hist_y.png"
}

// ============================================
// 颜色方案对比
// ============================================

const color_default = {
  data_source: "./data/multi_series.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "s1,s2,s3,s4",
  title: "Default Colors",
  color_scheme: "default",
  legend: true,
  output_path: "./output/colors_default.png"
}

const color_pastel = {
  data_source: "./data/multi_series.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "s1,s2,s3,s4",
  title: "Pastel Colors",
  color_scheme: "pastel",
  legend: true,
  output_path: "./output/colors_pastel.png"
}

const color_bright = {
  data_source: "./data/multi_series.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "s1,s2,s3,s4",
  title: "Bright Colors",
  color_scheme: "bright",
  legend: true,
  output_path: "./output/colors_bright.png"
}

const color_colorblind = {
  data_source: "./data/multi_series.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "s1,s2,s3,s4",
  title: "Colorblind-Friendly Colors",
  color_scheme: "colorblind",
  legend: true,
  output_path: "./output/colors_colorblind.png"
}

export {
  example1_lineChart,
  example2_multiLine,
  example3_scatter,
  example4_bar,
  example5_groupedBar,
  example6_stackedBar,
  example7_horizontalBar,
  example8_histogram,
  example9_boxPlot,
  example10_violin,
  example11_pie,
  example12_area,
  example13_stackedArea,
  example14_step,
  example15_heatmap,
  finance_report,
  science_scatter,
  sales_comparison,
  distribution_analysis,
  market_analysis,
  time_series_trend,
  ab_test_results,
  traffic_analysis,
  temperature_log,
  satisfaction_survey,
  seaborn_style,
  ggplot_style,
  fivethirtyeight_style,
  grayscale_style,
  publication_figure,
  json_data_example,
  inline_data_example,
  workflow_step2,
  workflow_step3,
  multi_chart_1,
  multi_chart_2,
  multi_chart_3,
  color_default,
  color_pastel,
  color_bright,
  color_colorblind
}
