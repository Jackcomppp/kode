# StandardChartTool - 快速开始

## 📊 3分钟创建第一张图表

### 第一步：准备数据

**CSV格式**:
```csv
month,revenue
Jan,10000
Feb,12000
Mar,11500
Apr,13000
May,14500
Jun,15000
```

### 第二步：最简单的绘图

```typescript
{
  data_source: "./data/revenue.csv",
  chart_type: "line",
  x_column: "month",
  y_column: "revenue",
  title: "Monthly Revenue",
  output_path: "./output/revenue.png"
}
```

### 第三步：查看结果

打开 `./output/revenue.png` 查看生成的图表！

---

## 📋 常用场景速查

### 场景1: 折线图（趋势分析）

```typescript
{
  data_source: "./data/sales.csv",
  chart_type: "line",
  x_column: "date",
  y_column: "sales",
  title: "Sales Trend",
  x_label: "Date",
  y_label: "Sales ($)",
  grid: true,
  output_path: "./output/sales_trend.png"
}
```

### 场景2: 多系列对比

```typescript
{
  data_source: "./data/comparison.csv",
  chart_type: "line",
  x_column: "month",
  y_column: "product_a,product_b,product_c",  // 逗号分隔
  title: "Product Comparison",
  legend: true,
  output_path: "./output/comparison.png"
}
```

### 场景3: 柱状图（类别对比）

```typescript
{
  data_source: "./data/categories.csv",
  chart_type: "bar",
  x_column: "category",
  y_column: "value",
  title: "Category Performance",
  color_scheme: "pastel",
  output_path: "./output/categories.png"
}
```

### 场景4: 散点图（相关性）

```typescript
{
  data_source: "./data/correlation.csv",
  chart_type: "scatter",
  x_column: "temperature",
  y_column: "sales",
  title: "Temperature vs Sales",
  marker_size: 80,
  alpha: 0.6,
  output_path: "./output/correlation.png"
}
```

### 场景5: 直方图（分布）

```typescript
{
  data_source: "./data/scores.csv",
  chart_type: "histogram",
  x_column: "score",
  title: "Score Distribution",
  bins: 30,
  output_path: "./output/distribution.png"
}
```

### 场景6: 饼图（占比）

```typescript
{
  data_source: "./data/market_share.csv",
  chart_type: "pie",
  x_column: "company",
  y_column: "share",
  title: "Market Share",
  output_path: "./output/market_share.png"
}
```

---

## 🎨 参数快速选择

### 选择图表类型

| 你的需求 | 使用 |
|---------|------|
| 展示趋势 | `chart_type: "line"` |
| 比较类别 | `chart_type: "bar"` |
| 查看相关性 | `chart_type: "scatter"` |
| 分析分布 | `chart_type: "histogram"` |
| 展示占比 | `chart_type: "pie"` |
| 多系列累积 | `chart_type: "area", stacked: true` |

### 选择颜色方案

| 场景 | 推荐配色 |
|------|---------|
| 通用报告 | `"default"` 或 `"Set1"` |
| 商务演示 | `"pastel"` 或 `"Set2"` |
| 科学出版 | `"colorblind"` |
| 营销材料 | `"bright"` |

### 选择样式风格

| 风格 | 说明 |
|------|------|
| `"default"` | 标准 matplotlib 风格 |
| `"seaborn"` | 统计分析风格 |
| `"ggplot"` | R ggplot2 风格 |
| `"fivethirtyeight"` | 新闻媒体风格 |

---

## 💡 实用技巧

### 技巧1: 多系列数据

```typescript
{
  // 在 y_column 中用逗号分隔多个列
  y_column: "series1,series2,series3",
  legend: true  // 显示图例
}
```

### 技巧2: 高清图片

```typescript
{
  figure_size: [12, 8],  // 更大的画布
  dpi: 300,  // 高分辨率
  output_path: "./output/high_res.png"
}
```

### 技巧3: 自定义样式

```typescript
{
  line_width: 3,        // 粗线条
  marker_size: 100,     // 大标记
  alpha: 0.7,           // 透明度
  color_scheme: "bright",  // 鲜艳配色
  grid: true            // 显示网格
}
```

### 技巧4: 堆叠图表

```typescript
{
  chart_type: "bar",  // 或 "area"
  stacked: true,      // 启用堆叠
  y_column: "a,b,c"   // 多个系列
}
```

### 技巧5: 水平柱状图（适合长标签）

```typescript
{
  chart_type: "barh",  // 水平柱状图
  x_column: "value",
  y_column: "category_name"
}
```

---

## ⚡ 常见问题

### ❓ 如何绘制多条线？

在 `y_column` 中用逗号分隔多个列名：
```typescript
y_column: "revenue,profit,costs"
```

### ❓ 数据列名包含空格？

用引号包裹，CSV中保持原样：
```typescript
x_column: "Sales Date"
```

### ❓ 图表太小/太大？

调整 `figure_size`:
```typescript
figure_size: [14, 8]  // [宽, 高] 单位英寸
```

### ❓ 标记/线条不明显？

增大尺寸和宽度：
```typescript
{
  marker_size: 120,
  line_width: 3,
  alpha: 0.9
}
```

### ❓ 颜色不好看？

尝试不同配色方案：
```typescript
color_scheme: "pastel"  // 或 bright, Set1, Set2 等
```

### ❓ 需要出版级质量？

提高 DPI 并使用 PDF：
```typescript
{
  dpi: 600,
  output_path: "./output/figure.pdf"
}
```

---

## 📊 完整工作流

### 工作流1: 数据分析到可视化

```typescript
// 1. 查询/读取数据
FileReadTool({
  file_path: "./data/sales_data.csv"
})

// 2. 时间序列分析（可选）
TimeSeriesAnalysisTool({
  data_source: "./data/sales_data.csv",
  date_column: "date",
  value_column: "sales",
  analysis_type: "trend"
})

// 3. 绘制图表
StandardChartTool({
  data_source: "./data/sales_data.csv",
  chart_type: "line",
  x_column: "date",
  y_column: "sales",
  title: "Sales Analysis",
  output_path: "./output/sales_chart.png"
})
```

### 工作流2: 多图表对比

```typescript
// 图表1: 原始数据
{
  data_source: "./data/data.csv",
  chart_type: "scatter",
  x_column: "x",
  y_column: "y",
  output_path: "./output/scatter.png"
}

// 图表2: X的分布
{
  data_source: "./data/data.csv",
  chart_type: "histogram",
  x_column: "x",
  output_path: "./output/x_dist.png"
}

// 图表3: Y的分布
{
  data_source: "./data/data.csv",
  chart_type: "histogram",
  x_column: "y",
  output_path: "./output/y_dist.png"
}
```

---

## 🎯 速查表

### 基础配置（折线图）
```typescript
{
  data_source: "./data.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "y",
  title: "My Chart",
  output_path: "./output.png"
}
```

### 多系列配置
```typescript
{
  data_source: "./data.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "y1,y2,y3",  // 多列
  legend: true,
  output_path: "./output.png"
}
```

### 散点图配置
```typescript
{
  data_source: "./data.csv",
  chart_type: "scatter",
  x_column: "x",
  y_column: "y",
  marker_size: 80,
  alpha: 0.6,
  output_path: "./output.png"
}
```

### 柱状图配置
```typescript
{
  data_source: "./data.csv",
  chart_type: "bar",
  x_column: "category",
  y_column: "value",
  color_scheme: "pastel",
  output_path: "./output.png"
}
```

### 直方图配置
```typescript
{
  data_source: "./data.csv",
  chart_type: "histogram",
  x_column: "values",
  bins: 30,
  alpha: 0.7,
  output_path: "./output.png"
}
```

### 饼图配置
```typescript
{
  data_source: "./data.csv",
  chart_type: "pie",
  x_column: "labels",
  y_column: "values",
  output_path: "./output.png"
}
```

### 高级配置（完整选项）
```typescript
{
  data_source: "./data.csv",
  chart_type: "line",
  x_column: "x",
  y_column: "y1,y2",
  title: "Advanced Chart",
  x_label: "X Axis",
  y_label: "Y Axis",
  legend: true,
  grid: true,
  style: "seaborn",
  color_scheme: "colorblind",
  line_style: "-",
  line_width: 2.5,
  marker_style: "o",
  marker_size: 80,
  alpha: 0.8,
  figure_size: [12, 8],
  dpi: 300,
  output_path: "./output.png"
}
```

---

## 🔥 快速示例库

### 示例1: 销售趋势
```typescript
{
  data_source: "./sales.csv",
  chart_type: "line",
  x_column: "month",
  y_column: "sales",
  title: "Monthly Sales",
  output_path: "./sales.png"
}
```

### 示例2: 产品对比
```typescript
{
  data_source: "./products.csv",
  chart_type: "bar",
  x_column: "product",
  y_column: "revenue",
  title: "Product Revenue",
  output_path: "./products.png"
}
```

### 示例3: 温度vs销售
```typescript
{
  data_source: "./weather_sales.csv",
  chart_type: "scatter",
  x_column: "temp",
  y_column: "sales",
  title: "Temperature Impact",
  output_path: "./temp_sales.png"
}
```

### 示例4: 成绩分布
```typescript
{
  data_source: "./scores.csv",
  chart_type: "histogram",
  x_column: "score",
  title: "Score Distribution",
  bins: 20,
  output_path: "./scores.png"
}
```

### 示例5: 市场份额
```typescript
{
  data_source: "./market.csv",
  chart_type: "pie",
  x_column: "company",
  y_column: "share",
  title: "Market Share",
  output_path: "./market.png"
}
```

---

## 📝 数据格式示例

### CSV（单系列）
```csv
month,revenue
Jan,10000
Feb,12000
Mar,11500
```

### CSV（多系列）
```csv
month,north,south,east,west
Q1,10000,12000,11000,13000
Q2,11000,13000,12000,14000
Q3,12000,14000,13000,15000
```

### JSON
```json
[
  {"month": "Jan", "revenue": 10000},
  {"month": "Feb", "revenue": 12000},
  {"month": "Mar", "revenue": 11500}
]
```

---

**准备好了吗？开始创建你的第一张图表吧！** 📊

查看 [README.md](./README.md) 获取完整文档。
