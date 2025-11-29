# GeoSpatialPlotTool

专业的地理空间数据可视化工具，将带有地理坐标的数据绘制到地图上，支持多种投影、底图和绘图类型。

## 🗺️ 核心功能

### 绘图类型
- **scatter**: 散点图（站位、观测点）
- **trajectory**: 轨迹图（船只、浮标路径）
- **filled_contour**: 填充等值线/热力图
- **contour**: 等值线图
- **heatmap**: 密度热力图
- **quiver**: 矢量场图（洋流、风场）

### 地图投影
- **PlateCarree**: 等距圆柱投影（默认）
- **Mercator**: 墨卡托投影
- **Robinson**: 罗宾逊投影（全球地图推荐）
- **Orthographic**: 正射投影（球体视图）
- **LambertConformal**: 兰伯特投影
- **Stereographic**: 极射方位投影（极地推荐）
- **Mollweide**: 摩尔威德投影

### 底图特征
- **coastlines**: 海岸线
- **borders**: 国界
- **land**: 陆地多边形
- **ocean**: 海洋多边形
- **lakes**: 湖泊
- **rivers**: 河流
- **stock_img**: 自然地球背景图

## 🚀 快速开始

### 最简单的用法

```typescript
{
  data_source: "./data/stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "scatter",
  output_path: "./output/map.png"
}
```

### 带颜色映射

```typescript
{
  data_source: "./data/temperature.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "sst",
  plot_type: "scatter",
  colormap: "coolwarm",
  add_colorbar: true,
  title: "Sea Surface Temperature",
  output_path: "./output/sst_map.png"
}
```

### 完整配置

```typescript
{
  data_source: "./data/ocean_data.csv",
  longitude_column: "longitude",
  latitude_column: "latitude",
  value_column: "temperature",
  plot_type: "scatter",
  projection: "Mercator",
  basemap_features: ["coastlines", "borders", "land"],
  extent: [120, 150, 20, 50],
  colormap: "viridis",
  marker_style: "o",
  marker_size: 80,
  alpha: 0.7,
  add_colorbar: true,
  add_gridlines: true,
  title: "Ocean Temperature Distribution",
  figure_size: [14, 10],
  dpi: 300,
  output_path: "./output/ocean_temp.png"
}
```

## 📋 参数说明

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `data_source` | string | CSV/JSON文件路径 |
| `longitude_column` | string | 经度列名 |
| `latitude_column` | string | 纬度列名 |
| `output_path` | string | 输出图片路径 |

### 主要可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value_column` | string | - | 用于颜色映射的数值列 |
| `plot_type` | enum | scatter | 绘图类型 |
| `projection` | enum | PlateCarree | 地图投影 |
| `basemap_features` | array | [coastlines, borders] | 底图特征 |
| `extent` | [lon_min, lon_max, lat_min, lat_max] | auto | 地图范围 |
| `colormap` | enum | viridis | 色标 |
| `marker_style` | enum | o | 标记样式 |
| `marker_size` | number | 50 | 标记大小 |
| `alpha` | number | 0.7 | 透明度 (0-1) |
| `add_colorbar` | boolean | true | 添加色标 |
| `add_gridlines` | boolean | true | 添加网格线 |
| `title` | string | - | 标题 |
| `figure_size` | [width, height] | [12, 8] | 图片尺寸(英寸) |
| `dpi` | number | 150 | 分辨率 |

## 🎨 色标（Colormap）

### 顺序型
- `viridis`, `plasma`, `inferno`, `magma`, `cividis`

### 发散型
- `coolwarm`, `RdYlBu`, `RdBu`, `seismic`

### 其他
- `jet`, `rainbow`, `turbo`

## 📍 标记样式

| 代码 | 形状 |
|------|------|
| `o` | 圆形 |
| `s` | 方形 |
| `^` | 上三角 |
| `v` | 下三角 |
| `D` | 菱形 |
| `*` | 星形 |
| `h` | 六边形 |

## 💡 应用场景

### 海洋学
```typescript
// CTD站位分布
{
  data_source: "./data/ctd_stations.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "depth",
  colormap: "viridis",
  title: "CTD Station Locations",
  output_path: "./output/ctd_map.png"
}

// Argo浮标轨迹
{
  data_source: "./data/argo_track.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  plot_type: "trajectory",
  title: "Argo Float Trajectory",
  output_path: "./output/argo_track.png"
}
```

### 环境监测
```typescript
// 污染物分布
{
  data_source: "./data/pollution.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "concentration",
  colormap: "Reds",
  title: "Pollutant Concentration",
  output_path: "./output/pollution_map.png"
}
```

### 气象学
```typescript
// 台风路径
{
  data_source: "./data/typhoon.csv",
  longitude_column: "lon",
  latitude_column: "lat",
  value_column: "wind_speed",
  plot_type: "trajectory",
  colormap: "YlOrRd",
  title: "Typhoon Track",
  output_path: "./output/typhoon.png"
}
```

## 📊 数据格式

### CSV格式
```csv
lon,lat,value
120.5,35.2,18.5
121.0,35.5,19.2
122.5,36.0,17.8
```

### JSON格式
```json
[
  {"lon": 120.5, "lat": 35.2, "value": 18.5},
  {"lon": 121.0, "lat": 35.5, "value": 19.2}
]
```

## 🎯 投影选择指南

| 用途 | 推荐投影 |
|------|---------|
| 全球地图 | Robinson, Mollweide |
| 区域地图 | PlateCarree, Mercator |
| 极地区域 | Stereographic |
| 中纬度 | LambertConformal |
| 球体视图 | Orthographic |

## 🔗 与其他工具集成

```
OceanDatabaseQueryTool → 查询数据
    ↓
FileWriteTool → 保存CSV
    ↓
GeoSpatialPlotTool → 绘制地图
    ↓
可视化结果图片
```

## ⚙️ 技术实现

### Python等效代码

工具生成的Python脚本示例：

```python
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature

# 创建地图
fig = plt.figure(figsize=(12, 8))
ax = plt.axes(projection=ccrs.PlateCarree())

# 设置范围
ax.set_extent([120, 150, 20, 50])

# 添加地图特征
ax.coastlines()
ax.add_feature(cfeature.BORDERS)

# 绘制数据
scatter = ax.scatter(lon, lat, c=values,
                    cmap='viridis',
                    transform=ccrs.PlateCarree())

plt.colorbar(scatter)
plt.savefig('output.png', dpi=150)
```

### 推荐库
- **matplotlib**: 基础绘图
- **cartopy**: 地图投影和地理特征
- **geopandas**: 空间数据处理
- **scipy**: 插值和网格化

## ⚠️ 注意事项

1. **坐标系统**:
   - 经度: -180 到 180 (东经为正)
   - 纬度: -90 到 90 (北纬为正)

2. **数据量**:
   - 最大点数: 50,000
   - 超过限制将被截断

3. **投影选择**:
   - 跨越日期变更线时使用PlateCarree
   - 极地数据使用Stereographic

4. **输出格式**:
   - PNG: 网络/演示
   - PDF: 出版/打印
   - 高DPI(300-600): 出版质量

## 📚 参考资源

- [Cartopy Documentation](https://scitools.org.uk/cartopy/)
- [Matplotlib Gallery](https://matplotlib.org/stable/gallery/)
- [Natural Earth Data](https://www.naturalearthdata.com/)

---

**版本**: 1.0.0
**更新**: 2024-10-27
