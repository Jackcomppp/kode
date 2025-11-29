# OceanDatabaseQueryTool

一个用于查询权威海洋科学数据库的工具，通过 HTTP API 请求获取海洋学数据。

## 功能特点

- **多数据库支持**：访问全球主要海洋数据库
  - WOD (World Ocean Database - NOAA)
  - COPERNICUS (Copernicus Marine Service)
  - ARGO (Global Array of Profiling Floats)
  - GLODAP (Global Ocean Data Analysis Project)
  - NOAA (NOAA ERDDAP)

- **丰富的海洋参数**：
  - 温度 (temperature)
  - 盐度 (salinity)
  - 压力 (pressure)
  - 溶解氧 (oxygen)
  - pH 值 (ph)
  - 叶绿素 (chlorophyll)
  - 硝酸盐 (nitrate)
  - 磷酸盐 (phosphate)
  - 硅酸盐 (silicate)

- **灵活的过滤条件**：
  - 地理坐标范围（纬度/经度）
  - 深度范围
  - 时间周期
  - 自定义参数组合

- **多种输出格式**：
  - JSON 格式（适合程序处理）
  - CSV 格式（适合数据分析）

## 工具结构

仿照 FileReadTool 的设计模式：

```
OceanDatabaseQueryTool/
├── OceanDatabaseQueryTool.tsx  # 主工具实现
├── prompt.ts                    # 工具描述和提示
└── README.md                    # 使用说明
```

### 核心组件

1. **输入验证** (`validateInput`):
   - 验证数据库选择
   - 验证参数名称
   - 验证地理坐标范围
   - 验证深度和时间范围

2. **HTTP 请求** (`executeHttpRequest`):
   - 构建 API 端点
   - 设置查询参数
   - 执行 HTTP GET 请求
   - 处理超时和错误

3. **数据解析** (`parseResponse`):
   - 解析 JSON 响应
   - 解析 CSV 响应
   - 提取参数信息

4. **格式化输出** (`formatData`):
   - JSON 格式化
   - CSV 格式转换
   - 数据预览生成

## 使用示例

### 基本查询

```typescript
{
  database: "wod",
  parameters: ["temperature", "salinity", "depth"],
  output_format: "json",
  max_results: 100
}
```

### 带地理范围的查询

```typescript
{
  database: "argo",
  parameters: ["temperature", "salinity", "pressure"],
  latitude_range: [20, 40],
  longitude_range: [120, 140],
  depth_range: [0, 1000],
  output_format: "csv",
  max_results: 500
}
```

### 带时间范围的查询

```typescript
{
  database: "copernicus",
  parameters: ["temperature", "salinity", "oxygen", "ph"],
  latitude_range: [-10, 10],
  longitude_range: [-180, 180],
  time_range: ["2020-01-01", "2023-12-31"],
  output_format: "json",
  max_results: 1000
}
```

### 使用自定义 API 端点

```typescript
{
  database: "noaa",
  parameters: ["temperature", "chlorophyll"],
  api_endpoint: "https://custom-api.example.com/ocean-data",
  output_format: "csv",
  max_results: 200
}
```

## 输出格式

### JSON 格式示例

```json
[
  {
    "latitude": "35.2450",
    "longitude": "135.6789",
    "depth": "125.50",
    "temperature": "18.45",
    "salinity": "34.82",
    "time": "2023-06-15"
  },
  {
    "latitude": "36.1234",
    "longitude": "136.4321",
    "depth": "250.00",
    "temperature": "15.23",
    "salinity": "35.01",
    "time": "2023-06-16"
  }
]
```

### CSV 格式示例

```csv
latitude,longitude,depth,temperature,salinity,time
35.2450,135.6789,125.50,18.45,34.82,2023-06-15
36.1234,136.4321,250.00,15.23,35.01,2023-06-16
```

## 元数据信息

工具返回的结果包含丰富的元数据：

- **recordCount**: 返回的记录数量
- **queryTime**: 查询执行时间（毫秒）
- **dataSource**: 数据来源数据库名称
- **spatialExtent**: 空间范围（如果设置了地理过滤）
- **temporalExtent**: 时间范围（如果设置了时间过滤）
- **depthExtent**: 深度范围（如果设置了深度过滤）
- **warnings**: 警告信息（如达到结果上限等）

## 技术特性

1. **类型安全**: 使用 Zod schema 进行输入验证
2. **并发安全**: 支持并发查询
3. **只读操作**: 不修改本地文件系统
4. **错误处理**: 完善的错误处理和用户友好的错误消息
5. **超时控制**: 30秒请求超时，避免长时间等待
6. **结果限制**: 最多返回10,000条记录，防止过大数据

## 实现说明

### 当前实现

工具当前使用模拟数据生成功能 (`generateMockOceanData`) 来演示功能。这允许在没有实际 API 访问权限的情况下测试工具。

### 生产环境部署

要连接真实的海洋数据库 API，需要：

1. 取消注释 `executeHttpRequest` 函数中的实际 HTTP 请求代码
2. 配置 API 认证（API密钥、OAuth令牌等）
3. 根据各数据库的实际 API 规范调整请求参数格式
4. 处理不同数据库的响应格式差异

### API 认证

各数据库通常需要注册和认证：

- **WOD/NOAA**: 需要 NOAA API token
- **Copernicus**: 需要 Copernicus Marine Service 账户
- **Argo**: 公开访问，但可能有速率限制
- **GLODAP**: 通常需要注册

## 与其他工具的集成

可以与项目中的其他工具配合使用：

1. **OceanDatabaseQueryTool** → 查询数据
2. **FileWriteTool** → 保存查询结果到文件
3. **OceanDataPreprocessTool** → 预处理和清洗数据
4. **GrepTool** → 在保存的数据文件中搜索特定内容

## 扩展建议

1. **批量查询**: 支持多个区域或时间段的批量查询
2. **数据可视化**: 集成绘图功能，直接生成海洋数据图表
3. **缓存机制**: 缓存常用查询结果，提高响应速度
4. **增量更新**: 支持增量获取新数据
5. **更多数据库**: 添加更多区域性海洋数据库支持

## 参考资源

- [World Ocean Database](https://www.ncei.noaa.gov/products/world-ocean-database)
- [Copernicus Marine Service](https://marine.copernicus.eu/)
- [Argo Data](https://argo.ucsd.edu/)
- [GLODAP](https://www.glodap.info/)
- [NOAA ERDDAP](https://coastwatch.pfeg.noaa.gov/erddap/)
