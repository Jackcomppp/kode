# Ocean Data Specialist Agent - 创建总结

## ✅ 已完成

成功创建了一个专门的 Ocean Agent，它会在处理海洋数据时自动被调用，并使用相应的海洋数据处理工具。

## 📁 创建的文件

### 1. 主 Agent 文件
**位置**: `C:\Users\chj\kode\.claude\agents\ocean-data-specialist.md`

**大小**: 11KB

**内容**:
- ✅ YAML frontmatter 配置
- ✅ Agent 名称: `ocean-data-specialist`
- ✅ 详细描述和触发条件
- ✅ 工具列表（6 个海洋工具 + 基础工具）
- ✅ 领域专业知识（海洋学、数据格式、卫星观测）
- ✅ 工作协议和最佳实践
- ✅ 示例交互场景

### 2. 使用指南
**位置**: `C:\Users\chj\kode\.claude\agents\OCEAN_AGENT_GUIDE.md`

**内容**:
- ✅ 功能介绍
- ✅ 3 种使用方法
- ✅ 5 个典型使用场景
- ✅ Agent 工作原理
- ✅ 使用技巧和注意事项
- ✅ 故障排除
- ✅ 快速开始指南

### 3. 测试脚本
**Linux/Mac**: `C:\Users\chj\kode\.claude\agents\test_ocean_agent.sh`
**Windows**: `C:\Users\chj\kode\.claude\agents\test_ocean_agent.bat`

**功能**:
- ✅ 检查 Kode CLI 安装
- ✅ 验证 Agent 文件存在
- ✅ 检查 YAML frontmatter
- ✅ 验证必需字段
- ✅ 显示使用示例

## 🎯 Agent 功能

### 自动工具调用

Agent 配置了以下海洋数据工具：

| 工具 | 用途 |
|------|-----|
| **OceanDataPreprocess** | 数据预处理、掩码生成、ML 训练对 |
| **OceanDatabaseQuery** | 查询 WOD, COPERNICUS, ARGO 等数据库 |
| **OceanProfileAnalysis** | CTD 剖面分析、密度计算、MLD |
| **TimeSeriesAnalysis** | 时间序列分解、趋势分析 |
| **GeoSpatialPlot** | 地理空间可视化、地图绘制 |
| **StandardChart** | 标准图表（T-S 图、剖面图等） |

### 领域专业知识

Agent 理解：
- 🌊 **海洋学术语**: SST, CTD, MLD, 盐度, 密度, 水团
- 📡 **卫星数据**: JAXA (云覆盖), OSTIA (完整), MODIS, AVHRR
- 🗄️ **数据库**: World Ocean Database, COPERNICUS, ARGO, GLODAP
- 📊 **数据格式**: NetCDF (.nc), HDF5 (.h5), CSV, JSON
- 📐 **区域**: 珠三角 (15-24°N, 111-118°E) 等常用区域

## 🚀 使用方法

### 方法 1: 自动触发（推荐）⭐

只需在 Kode 中描述海洋数据任务，Agent 会自动被选择：

```bash
kode

# 然后输入：
我需要处理 JAXA 卫星数据，提取云掩码
```

**触发关键词**:
- "海洋", "ocean", "marine"
- "SST", "CTD", "ARGO", "JAXA", "OSTIA"
- "卫星数据", "剖面", "盐度", "温度"
- NetCDF/HDF5 (在海洋上下文中)

### 方法 2: 显式指定

```bash
kode

# 输入命令：
/agent ocean-data-specialist

# 然后开始任务
```

### 方法 3: 一条命令

```bash
kode --agent ocean-data-specialist "分析这个 CTD 文件"
```

## 📋 典型工作流

### 工作流 1: JAXA → 掩码 → OSTIA → 训练对

```
用户: 我需要从 JAXA 数据生成云掩码，然后应用到 OSTIA 数据创建训练对

Agent: [自动理解] 这是卫星 SST 重建的 ML 训练准备
      [自动调用] OceanDataPreprocess
      [执行步骤]
        1. generate_masks (JAXA)
        2. build_training_pairs (OSTIA + masks)
      [输出] HDF5 训练数据
```

### 工作流 2: CTD 剖面分析

```
用户: 分析这个 CTD 剖面

Agent: [自动理解] CTD 数据分析
      [自动调用] OceanProfileAnalysis
      [计算]
        - 密度 (σt, σθ)
        - 混合层深度
        - 稳定性 (N²)
      [可视化] T-S 图 + 垂直剖面
```

### 工作流 3: 数据库查询

```
用户: 查询南海 2020 年的温度数据

Agent: [自动理解] 需要查询海洋数据库
      [自动调用] OceanDatabaseQuery
      [参数设置]
        - database: COPERNICUS
        - parameters: temperature
        - region: South China Sea
        - time: 2020
      [返回] CSV/JSON 数据
```

## 🔧 技术实现

### Agent 配置 (YAML Frontmatter)

```yaml
---
name: ocean-data-specialist
description: "Specialized agent for all ocean and marine data..."
tools:
  - OceanDataPreprocess
  - OceanDatabaseQuery
  - OceanProfileAnalysis
  - TimeSeriesAnalysis
  - GeoSpatialPlot
  - StandardChart
  - FileRead
  - FileWrite
  - FileEdit
  - Bash
  - Glob
  - Grep
model: claude-3-5-sonnet-20241022
color: blue
---
```

### Agent 加载机制

根据 Kode 的 agent 加载系统（5-tier priority）：

1. Built-in (代码嵌入) - ❌ 不适用
2. `~/.claude/agents/` (Claude Code 用户目录) - ✅ **我们用这个！**
3. `~/.kode/agents/` (Kode 用户)
4. `./.claude/agents/` (Claude Code 项目)
5. `./.kode/agents/` (Kode 项目)

我们的 Agent 放在 **tier 2**，优先级较高，且与 Claude Code 兼容。

### 工具选择逻辑

Agent 的 system prompt 包含明确的工具选择指南：

```
任务类型 → 工具选择

"预处理/掩码/训练对" → OceanDataPreprocess
"CTD/剖面/密度" → OceanProfileAnalysis
"数据库/查询" → OceanDatabaseQuery
"时间序列/趋势" → TimeSeriesAnalysis
"地图/空间" → GeoSpatialPlot
"图表/T-S图" → StandardChart
```

## 📊 Agent 架构图

```
用户输入
    ↓
"我需要处理 JAXA 数据"
    ↓
Kode Agent Loader
    ↓
[检查触发条件]
    - 关键词: "JAXA"
    - 上下文: 海洋数据
    ↓
✅ 加载 ocean-data-specialist
    ↓
Agent 分析任务
    ↓
选择工具: OceanDataPreprocess
    ↓
调用工具: generate_masks
    ↓
执行 Python 子进程
    ↓
返回结果
    ↓
Agent 解释并呈现给用户
```

## 🎨 Agent 特色

### 1. 领域专家
- 理解海洋学概念和术语
- 知道数据有效范围（温度 -2~40°C, 盐度 0~42 PSU）
- 熟悉常用区域和参数

### 2. 智能工具选择
- 根据任务自动选择最合适的工具
- 可以链式调用多个工具
- 验证结果并提供反馈

### 3. 用户友好
- 解释海洋概念（如果用户不熟悉）
- 提供清晰的步骤说明
- 警告潜在问题

### 4. 结果验证
- 检查数据范围合理性
- 验证单位一致性
- 确保地理边界正确

## 🧪 测试验证

### 运行测试脚本

**Windows**:
```bash
cd C:\Users\chj\kode\.claude\agents
test_ocean_agent.bat
```

**Linux/Mac (WSL)**:
```bash
cd /c/Users/chj/kode/.claude/agents
bash test_ocean_agent.sh
```

### 预期输出

```
✅ Kode CLI found
✅ Ocean Data Specialist agent file exists
✅ Agent file has valid YAML frontmatter
✅ Agent name is set correctly
✅ Agent has description
✅ Agent has tools list
```

### 实际使用测试

```bash
# 1. 启动 Kode
kode

# 2. 输入测试命令
我需要分析海洋数据

# 3. 验证 Agent 加载
# 应该看到 Agent 被自动选择（蓝色标识）

# 4. 验证工具调用
# Agent 应该询问具体需求并调用相应工具
```

## 📚 相关文档

### Agent 相关
- **Agent 配置**: `C:\Users\chj\kode\.claude\agents\ocean-data-specialist.md`
- **使用指南**: `C:\Users\chj\kode\.claude\agents\OCEAN_AGENT_GUIDE.md`
- **测试脚本**: `test_ocean_agent.bat` / `test_ocean_agent.sh`

### 工具相关
- **OceanDataPreprocessTool**:
  - `C:\Users\chj\kode\src\tools\OceanDataPreprocessTool\README_ENHANCED.md`
  - `C:\Users\chj\kode\src\tools\OceanDataPreprocessTool\INSTALLATION.md`
- **其他工具**: `C:\Users\chj\kode\src\tools\*`

### Kode 系统
- **Kode 架构**: `C:\Users\chj\kode\CLAUDE.md`
- **Agent 系统**: `src/utils/agentLoader.ts`

## 🎯 使用场景对比

### 之前（没有 Agent）

```
用户: 我需要处理 JAXA 数据

Kode: [使用通用 AI]
      你需要什么帮助？

用户: 提取云掩码

Kode: [可能不理解海洋术语]
      你能解释一下云掩码是什么吗？

用户: [需要详细解释...]

Kode: [可能选错工具或不知道如何调用]
```

### 现在（有 Agent）✨

```
用户: 我需要处理 JAXA 数据

Kode: [自动加载 ocean-data-specialist]

Agent: 你好！我是海洋数据专家。JAXA 是日本卫星观测数据，
       包含真实的云覆盖。你需要：
       1. 提取云掩码？
       2. 应用到 OSTIA 数据？
       3. 创建训练对？

       请提供文件路径，我会自动处理。

用户: D:/data/jaxa.nc

Agent: [自动调用 OceanDataPreprocess]
       [执行 generate_masks 操作]
       [返回结果和统计信息]

       ✅ 已生成 360 个云掩码
       - 网格: 451×351
       - 缺失比例: 10-60%
       - 保存到: masks.npy
```

## 💡 高级功能

### 1. 批处理支持

```
用户: 我有 12 个月的数据需要处理

Agent: [理解批处理需求]
      [自动循环处理]
      [提供进度报告]
```

### 2. 链式任务

```
用户: 从数据库查询数据 → 分析剖面 → 创建可视化

Agent: [规划 3 步流程]
      1. OceanDatabaseQuery
      2. OceanProfileAnalysis
      3. GeoSpatialPlot + StandardChart
      [依次执行并连接输出]
```

### 3. 智能建议

```
Agent: ⚠️ 注意：你的盐度值超出正常范围 (45 PSU)
      建议：
      1. 检查原始数据
      2. 运行 quality_check 操作
      3. 可能需要单位转换
```

## 🔮 未来增强（可选）

- [ ] 添加更多海洋数据源（MODIS, AVHRR）
- [ ] 集成更多数据库（ERDDAP, OPeNDAP）
- [ ] 支持更多可视化类型（3D plots, animations）
- [ ] 添加水团自动识别功能
- [ ] 集成 TEOS-10 标准海水方程

## ✅ 总结

### 创建内容
- ✅ 1 个完整的 Ocean Agent (11KB)
- ✅ 1 个详细使用指南
- ✅ 2 个测试脚本（Windows + Linux）
- ✅ 完整的文档和示例

### 工作原理
1. **用户** 在 Kode 中描述海洋数据任务
2. **Kode** 自动加载 ocean-data-specialist agent
3. **Agent** 理解需求并选择合适的工具
4. **工具** 执行实际处理（Python 集成）
5. **Agent** 验证结果并呈现给用户

### 使用方式
**一条命令**:
```bash
kode
# 然后输入任何海洋数据处理需求
```

就这么简单！🌊

---

**创建时间**: 2024-10-29
**版本**: v1.0
**状态**: ✅ 完成并可用
