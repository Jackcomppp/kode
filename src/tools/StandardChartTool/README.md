# StandardChartTool

专业的标准图表绘制工具，用于创建各种常见的数据可视化图表，如折线图、柱状图、散点图等，支持 matplotlib 和 seaborn 风格的绘图。

## 📊 核心功能

### 图表类型

- **line**: 折线图（时间序列、趋势分析）
- **scatter**: 散点图（相关性分析）
- **bar**: 柱状图（类别对比）
- **barh**: 水平柱状图（排名、长标签）
- **histogram**: 直方图（分布分析）
- **box**: 箱线图（分布和离群值）
- **violin**: 小提琴图（密度分布）
- **pie**: 饼图（组成比例）
- **area**: 面积图（累积趋势）
- **step**: 阶梯图（阶段性变化）
- **stem**: 茎叶图（离散数据）
- **heatmap**: 热力图（矩阵数据）

### 样式风格

- **default**: 默认 matplotlib 风格
- **seaborn**: Seaborn 统计图风格
- **ggplot**: R ggplot2 风格
- **bmh**: Bayesian Methods for Hackers 风格
- **fivethirtyeight**: FiveThirtyEight 新闻风格
- **grayscale**: 灰度风格

### 颜色方案

- **default**: 标准配色
- **pastel**: 柔和色系
- **bright**: 鲜艳色系
- **dark**: 深色系
- **colorblind**: 色盲友好配色
- **Set1/Set2/Set3**: ColorBrewer 配色方案
- **tab10/tab20**: Tableau 配色方案

## 🚀 快速开始

### 最简单的用法

```typescript
{
  data_source: "./data/sales.csv",
  chart_type: "line",
  x_column: "month",
  y_column: "revenue",
  title: "Monthly Revenue",
  output_path: "./output/revenue.png"
}
```

### 多系列折线图

```typescript
{
  data_source: "./data/comparison.csv",
  chart_type: "line",
  x_column: "date",
  y_column: "product_a,product_b,product_c", // 逗号分隔多个系列
  title: "Product Comparison",
  legend: true,
  grid: true,
  output_path: "./output/comparison.png"
}
```

### 分组柱状图

```typescript
{
  data_source: "./data/sales.csv",
  chart_type: "bar",
  x_column: "quarter",
  y_column: "north,south,east,west",
  title: "Regional Sales by Quarter",
  legend: true,
  color_scheme: "Set1",
  output_path: "./output/regional_sales.png"
}
```

### 散点图（相关性分析）

```typescript
{
  data_source: "./data/correlation.csv",
  chart_type: "scatter",
  x_column: "temperature",
  y_column: "sales",
  title: "Temperature vs Sales",
  marker_size: 80,
  alpha: 0.6,
  grid: true,
  output_path: "./output/correlation.png"
}
```

### 直方图（分布分析）

```typescript
{
  data_source: "./data/scores.csv",
  chart_type: "histogram",
  x_column: "score",
  title: "Score Distribution",
  bins: 30,
  alpha: 0.7,
  grid: true,
  output_path: "./output/distribution.png"
}
```

## 📋 参数说明

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `data_source` | string | CSV/JSON 文件路径或内联 JSON |
| `chart_type` | enum | 图表类型 |
| `output_path` | string | 输出图片路径（PNG/JPG/PDF） |

### 数据列参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `x_column` | string | X 轴数据列名 |
| `y_column` | string | Y 轴数据列名（可逗号分隔多个系列） |
| `group_column` | string | 分组列名（用于箱线图/小提琴图） |

### 样式参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | string | - | 图表标题 |
| `x_label` | string | - | X 轴标签 |
| `y_label` | string | - | Y 轴标签 |
| `legend` | boolean | true | 显示图例 |
| `grid` | boolean | true | 显示网格 |
| `style` | enum | default | 整体样式风格 |
| `color_scheme` | enum | default | 颜色方案 |
| `alpha` | number | 0.8 | 透明度（0-1） |

### 线条/标记参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `line_style` | enum | - | 线型（-、--、-.、:） |
| `line_width` | number | 2 | 线宽 |
| `marker_style` | enum | o | 标记样式（o、s、^、v 等） |
| `marker_size` | number | 50 | 标记大小 |

### 特殊参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `bins` | number | 30 | 直方图柱数 |
| `stacked` | boolean | false | 是否堆叠（柱状图/面积图） |
| `horizontal` | boolean | false | 是否水平（柱状图） |
| `colormap` | enum | viridis | 热力图色标 |

### 输出参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `figure_size` | [number, number] | [10, 6] | 图片尺寸（英寸） |
| `dpi` | number | 150 | 分辨率 |

## 🎨 标记样式

| 代码 | 形状 | 代码 | 形状 |
|------|------|------|------|
| `o` | 圆形 | `s` | 方形 |
| `^` | 上三角 | `v` | 下三角 |
| `<` | 左三角 | `>` | 右三角 |
| `D` | 菱形 | `p` | 五边形 |
| `*` | 星形 | `h` | 六边形 |
| `x` | X 标记 | `+` | 加号 |
| `.` | 点 | | |

## 📈 线型样式

| 代码 | 样式 | 说明 |
|------|------|------|
| `-` | 实线 | solid |
| `--` | 虚线 | dashed |
| `-.` | 点划线 | dashdot |
| `:` | 点线 | dotted |

## 💡 应用场景

### 财务分析

```typescript
// 收入趋势分析
{
  data_source: "./data/financial.csv",
  chart_type: "line",
  x_column: "quarter",
  y_column: "revenue,profit,expenses",
  title: "Financial Performance 2024",
  legend: true,
  grid: true,
  color_scheme: "Set1",
  line_width: 3,
  output_path: "./output/financial.png"
}
```

### 科学研究

```typescript
// 实验数据可视化
{
  data_source: "./data/experiment.csv",
  chart_type: "scatter",
  x_column: "concentration",
  y_column: "reaction_rate",
  title: "Reaction Kinetics",
  marker_size: 60,
  alpha: 0.7,
  style: "seaborn",
  output_path: "./output/kinetics.png"
}
```

### 业务报表

```typescript
// 销售排名
{
  data_source: "./data/sales_team.csv",
  chart_type: "barh",
  x_column: "sales",
  y_column: "salesperson",
  title: "Sales Team Performance",
  color_scheme: "bright",
  alpha: 0.8,
  output_path: "./output/sales_ranking.png"
}
```

### 统计分析

```typescript
// 数据分布
{
  data_source: "./data/measurements.csv",
  chart_type: "histogram",
  x_column: "value",
  title: "Measurement Distribution",
  bins: 50,
  alpha: 0.7,
  grid: true,
  style: "seaborn",
  output_path: "./output/distribution.png"
}
```

### 市场分析

```typescript
// 市场份额
{
  data_source: "./data/market.csv",
  chart_type: "pie",
  x_column: "company",
  y_column: "share",
  title: "Market Share 2024",
  color_scheme: "Set2",
  figure_size: [8, 8],
  output_path: "./output/market_share.png"
}
```

### A/B 测试

```typescript
// 转化率对比
{
  data_source: "./data/ab_test.csv",
  chart_type: "box",
  y_column: "conversion_rate",
  group_column: "variant",
  title: "A/B Test Results",
  color_scheme: "colorblind",
  output_path: "./output/ab_test.png"
}
```

## 📊 数据格式

### CSV 格式

```csv
month,revenue,costs,profit
Jan,10000,8000,2000
Feb,12000,8500,3500
Mar,11500,8200,3300
Apr,13000,9000,4000
```

### JSON 格式

```json
[
  {"month": "Jan", "revenue": 10000, "costs": 8000},
  {"month": "Feb", "revenue": 12000, "costs": 8500},
  {"month": "Mar", "revenue": 11500, "costs": 8200}
]
```

### 内联 JSON

```typescript
{
  data_source: '[{"x":1,"y":2},{"x":2,"y":4},{"x":3,"y":6}]',
  chart_type: "line",
  x_column: "x",
  y_column: "y",
  output_path: "./output/chart.png"
}
```

## 🎯 图表类型选择指南

| 数据特征 | 推荐图表 | 用途 |
|---------|---------|------|
| 时间序列 | line, area | 趋势分析 |
| 类别对比 | bar, barh | 数值比较 |
| 相关性 | scatter | 关系分析 |
| 分布 | histogram, box, violin | 统计分析 |
| 组成比例 | pie | 占比展示 |
| 多系列趋势 | line, area (stacked) | 对比分析 |
| 排名 | barh | 排序展示 |
| 阶段变化 | step | 离散变化 |

## 🎨 颜色方案选择

| 场景 | 推荐方案 |
|------|---------|
| 通用展示 | default, Set1 |
| 商务报告 | pastel, Set2 |
| 科学出版 | colorblind, Set1 |
| 市场营销 | bright, tab10 |
| 数据仪表板 | dark, tab20 |
| 灰度打印 | grayscale |

## ⚙️ 技术实现

### Python 等效代码

工具生成的 Python 脚本示例：

```python
import matplotlib.pyplot as plt
import numpy as np

# 创建图表
fig, ax = plt.subplots(figsize=(10, 6))

# 数据
x = [1, 2, 3, 4, 5]
y = [2, 4, 6, 8, 10]

# 绘图
ax.plot(x, y, linewidth=2, marker='o', label='Series 1')

# 样式
ax.set_title('Line Chart', fontsize=14, fontweight='bold')
ax.set_xlabel('X Axis', fontsize=12)
ax.set_ylabel('Y Axis', fontsize=12)
ax.legend()
ax.grid(True, alpha=0.3, linestyle='--')

# 保存
plt.tight_layout()
plt.savefig('output.png', dpi=150, bbox_inches='tight')
plt.close()
```

### 推荐库

- **matplotlib**: 基础绘图库
- **seaborn**: 统计图表库
- **pandas**: 数据处理
- **numpy**: 数值计算

## 💡 最佳实践

### 1. 选择合适的图表类型

- 时间序列 → 折线图
- 类别对比 → 柱状图
- 相关性 → 散点图
- 分布 → 直方图/箱线图

### 2. 使用清晰的标签

```typescript
{
  title: "Clear and Descriptive Title",
  x_label: "Time (months)",
  y_label: "Revenue ($1000s)"
}
```

### 3. 适当的颜色对比

```typescript
{
  color_scheme: "colorblind",  // 色盲友好
  alpha: 0.7  // 适当透明度
}
```

### 4. 高质量输出

```typescript
{
  figure_size: [12, 8],  // 合适尺寸
  dpi: 300,  // 高分辨率
  output_path: "./output/figure.pdf"  // PDF 用于出版
}
```

### 5. 网格和图例

```typescript
{
  grid: true,  // 辅助读数
  legend: true  // 多系列时必需
}
```

## 🔗 与其他工具集成

```
数据查询 → OceanDatabaseQueryTool
    ↓
数据分析 → TimeSeriesAnalysisTool
    ↓
保存数据 → FileWriteTool
    ↓
绘制图表 → StandardChartTool
    ↓
可视化结果
```

## ⚠️ 注意事项

1. **数据量限制**:
   - 最大数据点: 100,000
   - 超过限制将被截断

2. **文件格式**:
   - 输入: CSV, JSON
   - 输出: PNG, JPG, PDF

3. **列名要求**:
   - 列名区分大小写
   - 多系列用逗号分隔: `"y1,y2,y3"`

4. **性能建议**:
   - 大数据集使用较低 DPI
   - 复杂图表增加处理时间

5. **样式兼容性**:
   - 某些样式可能影响颜色方案
   - 建议测试后选择最佳组合

## 📚 参考资源

- [Matplotlib Documentation](https://matplotlib.org/)
- [Seaborn Gallery](https://seaborn.pydata.org/examples/)
- [ColorBrewer](https://colorbrewer2.org/)
- [Data Visualization Best Practices](https://www.storytellingwithdata.com/)

## 🆚 与 GeoSpatialPlotTool 的区别

| 特性 | StandardChartTool | GeoSpatialPlotTool |
|------|-------------------|-------------------|
| 用途 | 通用数据可视化 | 地理空间数据 |
| 坐标系 | 笛卡尔坐标 | 地理坐标 |
| 底图 | 无 | 地图特征 |
| 投影 | 无 | 多种地图投影 |
| 典型图表 | 折线、柱状、散点 | 地图、轨迹、热力图 |

---

**版本**: 1.0.0
**更新**: 2024-10-27
