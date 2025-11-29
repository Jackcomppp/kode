# OceanDatabaseQueryTool - 快速开始

## 🚀 5分钟上手指南

### 第一步：了解工具位置

```
D:\train\Kode-main\src\tools\OceanDatabaseQueryTool\
├── OceanDatabaseQueryTool.tsx  # 主工具实现 (24KB)
├── prompt.ts                    # 工具描述 (1.4KB)
├── examples.ts                  # 使用示例 (8.8KB)
├── README.md                    # 完整文档 (5.9KB)
├── DESIGN_COMPARISON.md         # 设计对比 (15KB)
└── QUICKSTART.md               # 本文件
```

### 第二步：最简单的查询

```typescript
// 查询世界海洋数据库，获取温度和盐度数据
{
  database: "wod",
  parameters: ["temperature", "salinity"],
  output_format: "json",
  max_results: 50
}
```

### 第三步：添加地理过滤

```typescript
// 查询特定海域（如西太平洋）
{
  database: "argo",
  parameters: ["temperature", "salinity"],
  latitude_range: [25.0, 45.0],    // 北纬25°-45°
  longitude_range: [120.0, 150.0], // 东经120°-150°
  output_format: "csv",
  max_results: 100
}
```

### 第四步：添加时间和深度范围

```typescript
// 完整的多维度查询
{
  database: "copernicus",
  parameters: ["temperature", "salinity", "oxygen"],
  latitude_range: [30.0, 40.0],
  longitude_range: [125.0, 145.0],
  depth_range: [0, 1000],           // 0-1000米深度
  time_range: ["2023-01-01", "2023-12-31"],
  output_format: "json",
  max_results: 500
}
```

## 📊 支持的数据库

| 代码 | 名称 | 说明 |
|------|------|------|
| `wod` | World Ocean Database | NOAA全球海洋数据库 |
| `copernicus` | Copernicus Marine | 欧洲海洋观测系统 |
| `argo` | Argo Floats | 全球Argo浮标网络 |
| `glodap` | GLODAP | 全球海洋数据分析项目 |
| `noaa` | NOAA ERDDAP | NOAA数据服务 |

## 🌊 支持的海洋参数

**基础参数**:
- `temperature` - 温度 (°C)
- `salinity` - 盐度 (PSU)
- `pressure` - 压力 (dbar)
- `depth` - 深度 (米)

**生物地球化学**:
- `oxygen` - 溶解氧
- `ph` - pH值
- `chlorophyll` - 叶绿素
- `nitrate` - 硝酸盐
- `phosphate` - 磷酸盐
- `silicate` - 硅酸盐

**时空信息**:
- `latitude` - 纬度
- `longitude` - 经度
- `time` - 时间

## 💡 常见使用模式

### 模式1: 探索性查询（小数据集）

```typescript
{
  database: "wod",
  parameters: ["temperature"],
  max_results: 10,  // 先查少量数据
  output_format: "json"
}
```

### 模式2: 区域研究（中等数据集）

```typescript
{
  database: "argo",
  parameters: ["temperature", "salinity", "depth"],
  latitude_range: [30.0, 40.0],
  longitude_range: [120.0, 140.0],
  max_results: 500,
  output_format: "csv"
}
```

### 模式3: 时间序列分析（大数据集）

```typescript
{
  database: "copernicus",
  parameters: ["temperature", "salinity"],
  time_range: ["2020-01-01", "2023-12-31"],
  max_results: 2000,
  output_format: "json"
}
```

## 🎯 输出格式选择

### JSON - 推荐用于：
- ✅ 程序处理
- ✅ API集成
- ✅ 复杂嵌套数据
- ✅ 与其他工具链接

```json
[
  {
    "latitude": "35.2450",
    "longitude": "135.6789",
    "temperature": "18.45",
    "salinity": "34.82"
  }
]
```

### CSV - 推荐用于：
- ✅ Excel分析
- ✅ 统计软件(R, MATLAB)
- ✅ 数据可视化
- ✅ 简单数据查看

```csv
latitude,longitude,temperature,salinity
35.2450,135.6789,18.45,34.82
```

## ⚡ 性能优化技巧

1. **使用精确的空间范围**
   ```typescript
   // ❌ 差：全球范围
   latitude_range: [-90, 90]

   // ✅ 好：具体区域
   latitude_range: [30.0, 35.0]
   ```

2. **限制初始查询结果**
   ```typescript
   // 先查询少量数据确认
   max_results: 10

   // 确认后再扩大
   max_results: 1000
   ```

3. **选择必要的参数**
   ```typescript
   // ❌ 差：不指定参数（返回所有）
   // parameters: undefined

   // ✅ 好：只查询需要的
   parameters: ["temperature", "salinity"]
   ```

## 🔗 与其他工具配合使用

### 工作流示例：

```typescript
// 1️⃣ 使用 OceanDatabaseQueryTool 查询数据
{
  database: "argo",
  parameters: ["temperature", "salinity", "depth"],
  latitude_range: [30.0, 40.0],
  output_format: "json",
  max_results: 1000
}

// 2️⃣ 使用 FileWriteTool 保存结果
// 保存到: ./data/ocean_data.json

// 3️⃣ 使用 OceanDataPreprocessTool 预处理
{
  file_path: "./data/ocean_data.json",
  operations: ["clean", "quality_check", "statistics"],
  output_path: "./data/ocean_data_processed.csv"
}

// 4️⃣ 使用 GrepTool 搜索特定模式
// 在处理后的数据中查找异常值
```

## ❓ 常见问题

### Q: 查询返回的数据为什么不到 max_results？
A: 实际匹配的数据可能少于限制。尝试扩大地理或时间范围。

### Q: 可以查询多个不连续的区域吗？
A: 当前版本不支持。需要分别查询后合并结果。

### Q: 如何获取历史数据？
A: 使用 `time_range` 参数指定时间段：
```typescript
time_range: ["2010-01-01", "2020-12-31"]
```

### Q: 输出数据太大怎么办？
A:
1. 减小 `max_results`
2. 缩小空间范围
3. 缩短时间范围
4. 选择更少的参数

## 📚 进一步学习

1. **完整文档**: 查看 `README.md`
2. **使用示例**: 查看 `examples.ts` (包含20+示例)
3. **设计说明**: 查看 `DESIGN_COMPARISON.md`
4. **源代码**: 查看 `OceanDatabaseQueryTool.tsx`

## 🎓 推荐学习路径

**初学者** (10分钟):
1. 阅读本快速开始指南
2. 尝试 `examples.ts` 中的 example1-3
3. 修改参数进行实验

**中级用户** (30分钟):
1. 阅读完整的 `README.md`
2. 尝试 `examples.ts` 中的所有示例
3. 设计自己的查询场景

**高级用户** (1小时+):
1. 阅读 `DESIGN_COMPARISON.md`
2. 查看源代码实现
3. 扩展工具功能
4. 集成真实API

## 🚦 下一步

选择一个开始：

- [ ] 运行第一个简单查询
- [ ] 浏览 `examples.ts` 中的示例
- [ ] 设计一个针对你研究区域的查询
- [ ] 与 OceanDataPreprocessTool 配合使用
- [ ] 阅读完整文档了解所有功能

---

**祝你使用愉快！🌊**

如有问题，请查看其他文档或查看源代码注释。
