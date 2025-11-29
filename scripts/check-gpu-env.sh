#!/bin/bash
# GPU 环境检查脚本 - 在服务器上运行

echo "======================================"
echo "Kode GPU 环境检查"
echo "======================================"

# 1. 检查 NVIDIA GPU
echo -e "\n[1] 检查 NVIDIA GPU..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
    echo "✓ NVIDIA GPU 可用"
else
    echo "✗ 未检测到 NVIDIA GPU 或驱动"
fi

# 2. 检查 CUDA
echo -e "\n[2] 检查 CUDA..."
if command -v nvcc &> /dev/null; then
    nvcc --version | grep "release"
    echo "✓ CUDA 已安装"
else
    echo "⚠ CUDA 未安装或不在 PATH 中"
fi

# 3. 检查 Python
echo -e "\n[3] 检查 Python..."
if command -v python3 &> /dev/null; then
    python3 --version
    echo "✓ Python3 可用"
else
    echo "✗ Python3 未安装"
    exit 1
fi

# 4. 检查 PyTorch GPU 支持
echo -e "\n[4] 检查 PyTorch GPU 支持..."
python3 << 'EOF'
try:
    import torch
    print(f"PyTorch 版本: {torch.__version__}")
    print(f"CUDA 可用: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA 版本: {torch.version.cuda}")
        print(f"GPU 数量: {torch.cuda.device_count()}")
        print(f"当前 GPU: {torch.cuda.get_device_name(0)}")
        print("✓ PyTorch GPU 支持正常")
    else:
        print("⚠ PyTorch 未检测到 GPU")
except ImportError:
    print("✗ PyTorch 未安装")
    print("安装命令: pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
EOF

# 5. 检查必要的 Python 包
echo -e "\n[5] 检查必要的 Python 包..."
python3 << 'EOF'
packages = ['torch', 'numpy', 'scipy', 'yaml', 'einops']
missing = []
for pkg in packages:
    try:
        __import__(pkg)
        print(f"✓ {pkg}")
    except ImportError:
        print(f"✗ {pkg} (未安装)")
        missing.append(pkg)

if missing:
    print(f"\n安装缺失的包: pip3 install {' '.join(missing)}")
EOF

# 6. 检查 Kode DiffSR
echo -e "\n[6] 检查 Kode DiffSR..."
if [ -f "src/services/diffsr/main.py" ]; then
    echo "✓ DiffSR 代码已内嵌"
    ls -lh src/services/diffsr/main.py
else
    echo "✗ DiffSR 代码未找到"
    echo "请确保已正确上传 Kode 项目"
fi

echo -e "\n======================================"
echo "环境检查完成"
echo "======================================"
