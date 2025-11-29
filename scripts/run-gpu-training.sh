#!/bin/bash
# 在 GPU 服务器上运行 Kode 超分辨率训练

set -e  # 遇到错误立即退出

echo "======================================"
echo "Kode DiffSR GPU 训练示例"
echo "======================================"

# 1. 检查环境
echo -e "\n[Step 1] 检查 GPU 环境..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "✗ 未检测到 NVIDIA GPU"
    exit 1
fi

echo "可用 GPU:"
nvidia-smi --query-gpu=index,name,memory.free --format=csv,noheader

# 2. 设置 GPU 设备（可选，默认使用 GPU 0）
export CUDA_VISIBLE_DEVICES=0  # 使用第一块 GPU
echo "使用 GPU: $CUDA_VISIBLE_DEVICES"

# 3. 进入 Kode 目录
cd "$(dirname "$0")/.."
echo "当前目录: $(pwd)"

# 4. 准备训练数据（示例）
echo -e "\n[Step 2] 准备训练数据..."
if [ ! -f "data/ocean_prepared/hr_train.npy" ]; then
    echo "⚠ 训练数据未准备，请先运行数据预处理"
    echo "示例: kode '准备海洋超分辨率训练数据'"
    # 这里可以自动调用 DiffSRDataset 工具
fi

# 5. 选择配置文件
CONFIG_PATH="src/services/diffsr/template_configs/Ocean/fno.yaml"
if [ ! -f "$CONFIG_PATH" ]; then
    echo "✗ 配置文件不存在: $CONFIG_PATH"
    exit 1
fi
echo "配置文件: $CONFIG_PATH"

# 6. 启动训练
echo -e "\n[Step 3] 启动 DiffSR 训练..."
echo "======================================"

# 使用 Kode CLI
node cli.js << 'EOF'
使用 DiffSRPipeline 训练 FNO 模型:
- 配置文件: template_configs/Ocean/fno.yaml
- 输出目录: outputs/ocean_fno_gpu
- 训练轮数: 100
- 批次大小: 16
- GPU: 0
EOF

# 或者直接使用 Python 运行（如果需要更多控制）
# cd src/services/diffsr
# python3 main.py --config "$CONFIG_PATH" --mode train

echo -e "\n======================================"
echo "训练完成！检查输出目录："
echo "outputs/ocean_fno_gpu/"
echo "======================================"

# 7. 验证模型
if [ -f "outputs/ocean_fno_gpu/checkpoint.pth" ]; then
    echo "✓ 模型检查点已保存"
    ls -lh outputs/ocean_fno_gpu/checkpoint.pth
else
    echo "⚠ 未找到模型检查点"
fi
