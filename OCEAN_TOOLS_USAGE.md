# Kode Ocean Tools - 开箱即用指南

## 一句话使用

```bash
kode -p "@run-agent-ocean-sr /path/to/your/data.npy 用resshift实现4x超分"
```

就这么简单！Kode会自动：
1. ✓ 检测并安装DiffSR（首次使用）
2. ✓ 检测Python环境
3. ✓ 准备训练数据集
4. ✓ 配置ResShift模型
5. ✓ 训练模型
6. ✓ 执行超分推理

## 自动依赖管理

### 首次运行

```bash
# 用户只需要有Python 3.8+和git
kode

# Kode会提示：
# "DiffSR not found. Installing automatically..."
# "Cloning DiffSR repository..."
# "Installing Python dependencies..."
# "✓ DiffSR installed successfully at: ~/.kode/dependencies/DiffSR-main"
```

### DiffSR自动安装位置

优先级顺序：
1. `$DIFFSR_PATH` 环境变量指定的路径
2. `~/.kode/dependencies/DiffSR-main` （自动安装位置）
3. `./DiffSR-main` （当前目录）
4. `/opt/models/DiffSR-main` （Linux服务器常用位置）
5. `D:/tmp/DiffSR-main` （Windows开发环境）

## 服务器部署

### 方案1：完全自动化（推荐）

```bash
# 1. 安装Kode
npm install -g @shareai-lab/kode

# 2. 配置API Key
kode /login

# 3. 直接使用
kode -p "帮我对ERA5数据做4x超分"
# Kode会自动下载和安装所有依赖
```

### 方案2：预安装DiffSR

```bash
# 手动安装到指定位置
git clone https://github.com/wyhuai/DiffSR.git /opt/models/DiffSR-main
export DIFFSR_PATH=/opt/models/DiffSR-main

# 安装Python依赖
pip install torch torchvision numpy scipy pyyaml

# 使用Kode
kode -p "对数据超分"
```

### 方案3：Docker部署

```dockerfile
FROM python:3.10

# 安装Node.js和Kode
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g @shareai-lab/kode

# 预安装DiffSR
RUN git clone https://github.com/wyhuai/DiffSR.git /opt/models/DiffSR-main && \
    pip install torch torchvision numpy scipy pyyaml

ENV DIFFSR_PATH=/opt/models/DiffSR-main
WORKDIR /workspace

CMD ["kode"]
```

## 工作原理

### 依赖检测流程

```typescript
// 1. 检查DiffSR
const diffsr_path = OceanDepsManager.ensureDiffSR()
// 自动检测现有安装或自动下载

// 2. 检查Python
const python_path = OceanDepsManager.findPython()
// 查找 python3, python, conda等

// 3. 安装Python包
await OceanDepsManager.ensurePythonPackages(['torch', 'numpy', 'scipy'])
// 自动安装缺失的包
```

### 用户体验

**无需配置文件**：
```bash
# 不需要创建 ~/.kode.json
# 不需要设置环境变量
# 不需要手动安装依赖
kode -p "超分任务"  # 直接工作
```

**自动环境检测**：
```bash
# Kode自动检测：
✓ Using DiffSR at: ~/.kode/dependencies/DiffSR-main
✓ Using Python: /usr/bin/python3
✓ PyTorch available: CUDA 11.8
```

## 可用工具

| 工具 | 功能 | 自动依赖 |
|------|------|---------|
| `DiffSRDataset` | 准备训练数据集 | ✓ Python + NumPy |
| `DiffSRPipeline` | 完整训练流程 | ✓ DiffSR + PyTorch |
| `DiffSRForecastor` | 扩散模型推理 | ✓ DiffSR + PyTorch |
| `ResShift` | ResShift超分 | ✓ DiffSR + PyTorch |
| `OceanFNOTraining` | FNO模型训练 | ✓ PyTorch |
| `GeoSpatialPlot` | 地理可视化 | ✓ Matplotlib + Cartopy |

## 常见问题

### Q: 首次安装需要多久？
A: 2-5分钟（取决于网络速度）
- 克隆DiffSR: ~1分钟
- 安装PyTorch: ~2-4分钟

### Q: 占用多少磁盘空间？
A: 约500MB-2GB
- DiffSR代码: ~50MB
- PyTorch: ~500MB-1.5GB（取决于CUDA版本）

### Q: 如何更新DiffSR？
A: 手动更新或删除自动安装版本
```bash
rm -rf ~/.kode/dependencies/DiffSR-main
# 下次运行Kode会重新下载最新版
```

### Q: 如何使用自己的DiffSR版本？
A: 设置环境变量
```bash
export DIFFSR_PATH=/my/custom/DiffSR
kode
```

### Q: 离线环境如何使用？
A: 预安装依赖
```bash
# 在有网络的机器上
git clone https://github.com/wyhuai/DiffSR.git
pip download torch torchvision numpy scipy pyyaml -d packages/

# 复制到离线机器
export DIFFSR_PATH=/path/to/DiffSR
pip install --no-index --find-links=packages/ torch torchvision numpy scipy pyyaml
kode
```

## 对比其他方案

| 方案 | 安装步骤 | 用户体验 |
|------|---------|---------|
| **Kode自动管理** | 1步（安装Kode） | ⭐⭐⭐⭐⭐ |
| 手动配置 | 5步（克隆、配置、安装依赖...） | ⭐⭐⭐ |
| Docker镜像 | 2步（pull + run） | ⭐⭐⭐⭐ |
| 内嵌到Kode | 1步（但npm包体积大） | ⭐⭐⭐⭐ |

## 总结

**设计目标**：让用户专注于任务本身，而非环境配置

**实现方式**：
- 智能依赖检测
- 自动下载和安装
- 透明的错误提示
- 多平台兼容

**用户只需要**：
1. 安装Kode
2. 一句话描述任务
3. 等待结果

就是这么简单！🚀
