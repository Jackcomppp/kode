# GeoSpatialPlotTool - 快速开始

## 🗺️ 3分钟创建第一张地图

### 第一步：准备数据

**CSV格式**:
```csv
lon,lat,value
120.5,35.2,18.5
121.0,35.5,19.2
122.5,36.0,17.8
```

### 第二步：最简单的绘图

```typescript
{
  data_source: "./data/stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  output_path: "./output/map.png"
}
```

### 第三步：查看结果

打开 `./output/map.png` 查看生成的地图！

---

## 📋 常用场景速查

### 场景1: 海洋观测站位图

```typescript
{
  data_source: "./data/ctd_stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  basemap_features: ["coastlines", "borders"],
  title: "CTD Stations",
  output_path: "./output/stations.png"
}
```

### 场景2: 温度分布（带颜色）

```typescript
{
  data_source: "./data/temperature.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "temp",
  plot_type: "scatter",
  colormap: "coolwarm",
  add_colorbar: true,
  title: "Temperature (°C)",
  output_path: "./output/temp_map.png"
}
```

### 场景3: 浮标轨迹

```typescript
{
  data_source: "./data/float_track.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "trajectory",
  basemap_features: ["coastlines", "land"],
  title: "Float Trajectory",
  output_path: "./output/track.png"
}
```

### 场景4: 指定区域

```typescript
{
  data_source: "./data/regional_data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "value",
  extent: [120, 150, 20, 50],  // 西太平洋
  projection: "Mercator",
  output_path: "./output/region.png"
}
```

---

## 🎨 参数快速选择

### 选择绘图类型

| 你的数据是... | 使用 |
|--------------|------|
| 独立的点 | `plot_type: "scatter"` |
| 连续的路径 | `plot_type: "trajectory"` |
| 网格数据 | `plot_type: "filled_contour"` |

### 选择投影

| 区域 | 推荐投影 |
|------|---------|
| 全球 | `"Robinson"` |
| 区域 | `"PlateCarree"` 或 `"Mercator"` |
| 极地 | `"Stereographic"` |

### 选择色标

| 数据类型 | 推荐色标 |
|---------|---------|
| 温度 | `"coolwarm"`, `"RdYlBu"` |
| 深度 | `"viridis"`, `"Blues"` |
| 浓度 | `"YlOrRd"`, `"Reds"` |
| 通用 | `"viridis"`, `"plasma"` |

---

## 💡 实用技巧

### 技巧1: 高清图片

```typescript
{
  // ... 其他参数
  figure_size: [16, 12],
  dpi: 300,
  output_path: "./output/high_res.png"
}
```

### 技巧2: 聚焦区域

```typescript
// 自动计算范围（默认）
extent: undefined

// 手动指定
extent: [lon_min, lon_max, lat_min, lat_max]
```

### 技巧3: 自定义样式

```typescript
{
  colormap: "viridis",    // 色标
  marker_style: "^",      // 三角形
  marker_size: 100,       // 大小
  alpha: 0.6,            // 透明度
  add_gridlines: true    // 网格
}
```

---

## ⚡ 常见问题

### ❓ 点没有显示？

检查坐标范围：
- 经度: -180 到 180
- 纬度: -90 到 90

### ❓ 地图太小/太大？

调整 `extent` 或 `figure_size`:
```typescript
extent: [120, 150, 20, 50],  // 放大区域
figure_size: [16, 12]        // 增大画布
```

### ❓ 颜色不明显？

- 使用发散型色标: `"coolwarm"`, `"RdYlBu"`
- 调整透明度: `alpha: 0.8`
- 增大标记: `marker_size: 120`

---

## 📊 完整工作流

```typescript
// 1. 查询数据
OceanDatabaseQueryTool({
  database: "argo",
  parameters: ["temperature", "latitude", "longitude"]
})

// 2. 保存数据
FileWriteTool({
  file_path: "./data/argo.csv"
})

// 3. 绘制地图
GeoSpatialPlotTool({
  data_source: "./data/argo.csv",
  longitude_column: "longitude",
  latitude_column: "latitude",
  value_column: "temperature",
  plot_type: "scatter",
  colormap: "coolwarm",
  output_path: "./output/argo_temp.png"
})
```

---

## 🎯 速查表

### 基础配置
```typescript
{
  data_source: "./data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  output_path: "./output.png"
}
```

### 带值配置
```typescript
{
  data_source: "./data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "value",
  colormap: "viridis",
  add_colorbar: true,
  output_path: "./output.png"
}
```

### 轨迹配置
```typescript
{
  data_source: "./track.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "trajectory",
  output_path: "./track.png"
}
```

### 高级配置
```typescript
{
  data_source: "./data.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "value",
  plot_type: "scatter",
  projection: "Mercator",
  extent: [120, 150, 20, 50],
  colormap: "coolwarm",
  marker_size: 80,
  alpha: 0.7,
  basemap_features: ["coastlines", "land"],
  title: "My Map",
  figure_size: [14, 10],
  dpi: 300,
  output_path: "./output.png"
}
```

---

**准备好了吗？开始创建你的第一张地图吧！** 🗺️

查看 [README.md](./README.md) 获取完整文档。
