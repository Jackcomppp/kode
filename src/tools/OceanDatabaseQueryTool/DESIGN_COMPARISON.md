# OceanDatabaseQueryTool 设计对比

本文档展示 OceanDatabaseQueryTool 如何仿照 FileReadTool 的设计模式。

## 目录结构对比

### FileReadTool
```
FileReadTool/
├── FileReadTool.tsx
└── prompt.ts
```

### OceanDatabaseQueryTool
```
OceanDatabaseQueryTool/
├── OceanDatabaseQueryTool.tsx
├── prompt.ts
├── README.md
└── examples.ts
```

## 核心结构对比

### 1. 工具定义

**FileReadTool** (读取本地文件):
```typescript
export const FileReadTool = {
  name: 'View',
  async description() { return DESCRIPTION },
  async prompt() { return PROMPT },
  inputSchema,
  isReadOnly() { return true },
  isConcurrencySafe() { return true },
  userFacingName() { return 'Read' },
  // ...
}
```

**OceanDatabaseQueryTool** (查询远程数据库):
```typescript
export const OceanDatabaseQueryTool = {
  name: 'OceanDatabaseQuery',
  async description() { return DESCRIPTION },
  async prompt() { return PROMPT },
  inputSchema,
  isReadOnly() { return true },
  isConcurrencySafe() { return true },
  userFacingName() { return 'Ocean Database Query' },
  // ...
}
```

**相似点**:
- 都是只读工具 (`isReadOnly: true`)
- 都支持并发执行 (`isConcurrencySafe: true`)
- 相同的方法签名和结构

---

### 2. 输入Schema

**FileReadTool** (文件路径 + 可选的行范围):
```typescript
const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the file to read'),
  offset: z.number().optional().describe('The line number to start reading from'),
  limit: z.number().optional().describe('The number of lines to read'),
})
```

**OceanDatabaseQueryTool** (数据库 + 过滤条件):
```typescript
const inputSchema = z.strictObject({
  database: z.enum(DATABASES).describe('The ocean database to query'),
  parameters: z.array(z.enum(OCEAN_PARAMETERS)).optional().describe('Ocean parameters'),
  latitude_range: z.tuple([z.number(), z.number()]).optional().describe('Latitude range'),
  longitude_range: z.tuple([z.number(), z.number()]).optional().describe('Longitude range'),
  depth_range: z.tuple([z.number(), z.number()]).optional().describe('Depth range'),
  time_range: z.tuple([z.string(), z.string()]).optional().describe('Time period'),
  output_format: z.enum(['csv', 'json']).default('json').describe('Output format'),
  max_results: z.number().min(1).max(MAX_RESULTS).default(1000).describe('Max records'),
  api_endpoint: z.string().optional().describe('Custom API endpoint'),
})
```

**相似点**:
- 都使用 Zod 进行类型验证
- 都有必需参数和可选参数
- 都提供详细的参数描述

---

### 3. 输入验证

**FileReadTool** (验证文件存在性和大小):
```typescript
async validateInput({ file_path, offset, limit }) {
  const fullFilePath = normalizeFilePath(file_path)

  const fileCheck = secureFileService.safeGetFileInfo(fullFilePath)
  if (!fileCheck.success) {
    const similarFilename = findSimilarFile(fullFilePath)
    return {
      result: false,
      message: similarFilename
        ? `File does not exist. Did you mean ${similarFilename}?`
        : 'File does not exist.'
    }
  }

  if (fileSize > MAX_OUTPUT_SIZE && !offset && !limit) {
    return {
      result: false,
      message: formatFileSizeError(fileSize),
    }
  }

  return { result: true }
}
```

**OceanDatabaseQueryTool** (验证参数范围和格式):
```typescript
async validateInput({
  database, parameters, latitude_range, longitude_range,
  depth_range, time_range, max_results
}) {
  // 验证数据库
  if (!DATABASES.includes(database)) {
    return {
      result: false,
      message: `Invalid database: ${database}. Supported: ${DATABASES.join(', ')}`
    }
  }

  // 验证纬度范围
  if (latitude_range) {
    const [minLat, maxLat] = latitude_range
    if (minLat < -90 || maxLat > 90 || minLat > maxLat) {
      return {
        result: false,
        message: `Invalid latitude range: [${minLat}, ${maxLat}]`
      }
    }
  }

  // ... 更多验证

  return { result: true }
}
```

**相似点**:
- 都在执行前进行输入验证
- 都返回 `{ result: boolean, message?: string }` 格式
- 都提供友好的错误消息和建议

---

### 4. 核心执行逻辑

**FileReadTool** (读取文件内容):
```typescript
async *call({ file_path, offset = 1, limit = undefined }, { readFileTimestamps }) {
  const fullFilePath = normalizeFilePath(file_path)

  // 记录文件读取
  recordFileRead(fullFilePath)
  emitReminderEvent('file:read', { filePath: fullFilePath, ... })
  readFileTimestamps[fullFilePath] = Date.now()

  // 读取文件内容
  if (IMAGE_EXTENSIONS.has(ext)) {
    const data = await readImage(fullFilePath, ext)
    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
    return
  }

  const { content, lineCount, totalLines } = readTextContent(fullFilePath, offset, limit)

  const data = {
    type: 'text',
    file: { filePath, content, numLines: lineCount, startLine: offset, totalLines }
  }

  yield {
    type: 'result',
    data,
    resultForAssistant: this.renderResultForAssistant(data),
  }
}
```

**OceanDatabaseQueryTool** (查询远程API):
```typescript
async *call({
  database, parameters, latitude_range, longitude_range,
  depth_range, time_range, output_format = 'json', max_results = 1000, api_endpoint
}, context) {
  const startTime = Date.now()
  const warnings: string[] = []

  try {
    // 发出查询事件
    emitReminderEvent('ocean:query', { database, parameters, timestamp: Date.now() })

    // 构建API端点和参数
    const endpoint = api_endpoint || getDatabaseEndpoint(database)
    const queryParams = buildQueryParams({ database, parameters, ... })

    // 执行HTTP请求
    const response = await executeHttpRequest(endpoint, queryParams, database)

    // 解析和格式化响应
    const { data, recordCount, actualParameters } = parseResponse(response, database, output_format)

    // 检查结果限制
    if (recordCount >= max_results) {
      warnings.push(`Query returned maximum allowed results (${max_results})...`)
    }

    const formattedContent = formatData(data, output_format, actualParameters)

    const result: QueryResult = {
      type: 'query_result',
      data: {
        database, recordCount, parameters: actualParameters,
        filters: { latitude_range, longitude_range, depth_range, time_range },
        dataFormat: output_format, content: formattedContent,
        metadata: { queryTime: Date.now() - startTime, dataSource: getDatabaseName(database), ... },
        warnings
      }
    }

    yield {
      type: 'result',
      data: result,
      resultForAssistant: this.renderResultForAssistant(result),
    }
  } catch (error) {
    logError(error)
    throw new Error(`Failed to query ocean database: ${error.message}`)
  }
}
```

**相似点**:
- 都使用异步生成器函数 (`async *call`)
- 都发出事件进行追踪 (`emitReminderEvent`)
- 都使用 `yield` 返回结果
- 都包含错误处理
- 都记录执行元数据（时间戳、来源等）

---

### 5. 结果渲染

**FileReadTool** (渲染文件内容):
```typescript
renderToolResultMessage(output) {
  const verbose = false

  switch (output.type) {
    case 'image':
      return (
        <Box justifyContent="space-between">
          <Box flexDirection="row">
            <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
            <Text>Read image</Text>
          </Box>
        </Box>
      )
    case 'text':
      return (
        <Box justifyContent="space-between">
          <Box flexDirection="row">
            <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
            <Box flexDirection="column">
              <HighlightedCode
                code={verbose ? content : content.split('\n').slice(0, MAX_LINES_TO_RENDER).join('\n')}
                language={extname(filePath).slice(1)}
              />
              {!verbose && numLines > MAX_LINES_TO_RENDER && (
                <Text color={getTheme().secondaryText}>
                  ... (+{numLines - MAX_LINES_TO_RENDER} lines)
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      )
  }
}
```

**OceanDatabaseQueryTool** (渲染查询结果):
```typescript
renderToolResultMessage(output) {
  const { data } = output
  const verbose = false

  return (
    <Box justifyContent="space-between" overflowX="hidden" width="100%">
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
          <Text color={getTheme().successText}>
            Retrieved {data.recordCount} records from {data.database.toUpperCase()}
          </Text>
        </Box>
        {data.parameters && data.parameters.length > 0 && (
          <Box flexDirection="row" marginLeft={5}>
            <Text color={getTheme().secondaryText}>
              Parameters: {data.parameters.join(', ')}
            </Text>
          </Box>
        )}
        {data.metadata.queryTime && (
          <Box flexDirection="row" marginLeft={5}>
            <Text color={getTheme().secondaryText}>
              Query time: {data.metadata.queryTime}ms
            </Text>
          </Box>
        )}
        {data.warnings && data.warnings.length > 0 && (
          <Box flexDirection="column" marginLeft={5}>
            {data.warnings.slice(0, 3).map((warning, idx) => (
              <Text key={idx} color={getTheme().warningText}>
                ⚠ {warning}
              </Text>
            ))}
          </Box>
        )}
        {data.content && (
          <Box flexDirection="column" marginLeft={5} marginTop={1}>
            <HighlightedCode
              code={verbose ? data.content : data.content.split('\n').slice(0, MAX_LINES_TO_RENDER).join('\n')}
              language={data.dataFormat === 'csv' ? 'csv' : 'json'}
            />
            {!verbose && data.content.split('\n').length > MAX_LINES_TO_RENDER && (
              <Text color={getTheme().secondaryText}>
                ... (+{data.content.split('\n').length - MAX_LINES_TO_RENDER} lines)
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
```

**相似点**:
- 都使用 React Ink 组件进行终端渲染
- 都使用 `HighlightedCode` 组件显示代码/数据
- 都支持 verbose 和非 verbose 模式
- 都限制显示行数并显示省略信息
- 都使用主题颜色 (`getTheme()`)

---

### 6. 助手结果格式化

**FileReadTool**:
```typescript
renderResultForAssistant(data) {
  switch (data.type) {
    case 'image':
      return [{
        type: 'image',
        source: {
          type: 'base64',
          data: data.file.base64,
          media_type: data.file.type,
        }
      }]
    case 'text':
      return addLineNumbers(data.file)
  }
}
```

**OceanDatabaseQueryTool**:
```typescript
renderResultForAssistant(data: QueryResult) {
  const { data: result } = data
  const output = [
    `Ocean Database Query Results`,
    `===========================`,
    `Database: ${getDatabaseName(result.database)}`,
    `Records Retrieved: ${result.recordCount}`,
    `Parameters: ${result.parameters.join(', ')}`,
    `Output Format: ${result.dataFormat.toUpperCase()}`,
    '',
    `Query Metadata:`,
    `- Query Time: ${result.metadata.queryTime}ms`,
    `- Data Source: ${result.metadata.dataSource}`,
    // ... 更多元数据
    '',
    `Data (${result.dataFormat.toUpperCase()} format):`,
    result.content
  ]

  return output.join('\n')
}
```

**相似点**:
- 都格式化数据供 AI 助手使用
- 都返回结构化的文本或对象
- 都包含元数据信息

---

## 关键设计模式总结

### 共同遵循的设计原则

1. **类型安全**: 使用 TypeScript + Zod Schema
2. **输入验证**: 在执行前验证所有输入
3. **错误处理**: 提供友好的错误消息
4. **事件追踪**: 使用 `emitReminderEvent` 记录操作
5. **并发安全**: 设计为可并发执行
6. **只读操作**: 不修改系统状态
7. **渐进式渲染**: 使用异步生成器
8. **响应式UI**: 使用 React Ink 组件

### 差异点

| 特性 | FileReadTool | OceanDatabaseQueryTool |
|------|--------------|------------------------|
| **数据源** | 本地文件系统 | 远程HTTP API |
| **权限** | 需要文件读取权限 | 不需要本地权限 |
| **验证重点** | 文件存在性、大小 | 参数范围、格式 |
| **主要操作** | 文件读取 | HTTP请求 |
| **输出类型** | 文本/图像 | JSON/CSV数据 |
| **元数据** | 行数、文件路径 | 记录数、查询时间、空间范围 |

---

## 实现亮点

### OceanDatabaseQueryTool 的创新点

1. **多数据源支持**:
   - 支持5个主要海洋数据库
   - 可扩展的数据库配置

2. **灵活的过滤系统**:
   - 多维度过滤（空间、时间、深度）
   - 可组合的过滤条件

3. **双格式输出**:
   - JSON（程序友好）
   - CSV（人类友好）

4. **丰富的元数据**:
   - 查询性能指标
   - 数据覆盖范围
   - 警告和建议

5. **模拟数据支持**:
   - 便于开发和测试
   - 易于切换到真实API

6. **可定制API端点**:
   - 支持自定义API
   - 适应不同部署环境

---

## 使用场景对比

### FileReadTool 使用场景
- 读取配置文件
- 查看源代码
- 显示日志文件
- 预览图像文件

### OceanDatabaseQueryTool 使用场景
- 海洋学研究
- 气候变化分析
- 渔业资源评估
- 环境监测
- 数据可视化准备

---

## 扩展建议

基于 FileReadTool 的成功经验，OceanDatabaseQueryTool 可以进一步扩展：

1. **缓存机制**: 类似文件系统缓存
2. **增量读取**: 类似文件的 offset/limit
3. **格式转换**: 类似图像的自动转换
4. **预览优化**: 类似代码高亮的数据可视化
5. **权限系统**: 类似文件权限的API密钥管理

---

## 总结

OceanDatabaseQueryTool 成功地继承了 FileReadTool 的优秀设计模式，同时针对海洋数据查询的特定需求进行了适当的调整和创新。两个工具在保持一致的代码风格和架构的同时，各自服务于不同的数据源和应用场景。
