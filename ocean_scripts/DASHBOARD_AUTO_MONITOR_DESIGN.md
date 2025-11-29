# 🚀 Dashboard自动监控系统设计方案

**问题**: 现在每个训练脚本都要复制粘贴150+行的DashboardClient代码，太繁琐！

**解决方案**: 创建自动化的监控系统，让用户只需1-3行代码就能集成Dashboard。

---

## 方案对比

| 方案 | 用户代码量 | 自动化程度 | 实现难度 | 推荐度 |
|------|-----------|-----------|---------|--------|
| 1. 装饰器 | 1行 | ⭐⭐⭐ | 简单 | ⭐⭐⭐⭐ |
| 2. 上下文管理器 | 3行 | ⭐⭐⭐⭐ | 简单 | ⭐⭐⭐⭐⭐ |
| 3. PyTorch Hook | 2行 | ⭐⭐⭐⭐⭐ | 中等 | ⭐⭐⭐⭐⭐ |
| 4. 全局注册 | 1行 | ⭐⭐⭐⭐ | 简单 | ⭐⭐⭐⭐ |
| 5. Trainer封装 | 5行 | ⭐⭐⭐⭐⭐ | 复杂 | ⭐⭐⭐ |

---

## 方案1: 装饰器方式 (推荐⭐⭐⭐⭐)

### 使用方式

```python
from kode_ocean import monitor_training

@monitor_training(url="http://localhost:3737", clear_old_data=True)
def train():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SimpleRNN().to(device)
    optimizer = torch.optim.Adam(model.parameters())

    for epoch in range(100):
        # ... training code ...
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        # 自动捕获: epoch, loss, model, device信息

    # 自动标记训练完成

if __name__ == "__main__":
    train()
```

### 优点
- ✅ 只需1行代码
- ✅ 不侵入训练逻辑
- ✅ 清晰的开始/结束标记

### 缺点
- ❌ 难以捕获每个epoch的详细信息
- ❌ 需要手动yield/return信息

### 实现方式

```python
# kode_ocean/monitor.py
import functools
import torch
from .dashboard_client import DashboardClient

def monitor_training(url="http://localhost:3737", clear_old_data=True):
    """
    Decorator to automatically monitor training with Ocean Dashboard

    Usage:
        @monitor_training()
        def train():
            # ... your training code ...
            pass
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            client = DashboardClient(url)

            # Clear old data
            if clear_old_data and client.ping():
                client.clear_all()
                client.log_info("Dashboard cleared - new training session")

            # Detect GPU
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            client.log_info(f"Using device: {device}")

            if device.type == 'cuda':
                gpu_name = torch.cuda.get_device_name(0)
                client.log_info(f"GPU: {gpu_name}")

            try:
                # Run training
                result = func(*args, **kwargs)
                client.complete_training(1, 1)  # Generic completion
                client.log_info("Training completed successfully")
                return result
            except Exception as e:
                client.log_error(f"Training failed: {e}")
                client.fail_training(0, 1)
                raise

        return wrapper
    return decorator
```

---

## 方案2: 上下文管理器 (推荐⭐⭐⭐⭐⭐)

### 使用方式

```python
from kode_ocean import DashboardMonitor

with DashboardMonitor(url="http://localhost:3737") as monitor:
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SimpleRNN().to(device)

    # 注册模型（自动提取layer info）
    monitor.register_model(model, name="SimpleRNN", params={
        "learning_rate": 0.001,
        "batch_size": 32
    })

    optimizer = torch.optim.Adam(model.parameters())

    # 开始训练
    monitor.start_training(num_epochs=100)

    for epoch in range(100):
        # ... training code ...
        loss = criterion(output, target)

        # 记录metrics
        monitor.log_epoch(epoch+1, loss=loss.item(), metrics={
            "accuracy": acc
        })

    # 自动在退出时标记完成
```

### 优点
- ✅ 清晰的生命周期管理
- ✅ 自动清理资源
- ✅ 支持with语句，优雅
- ✅ 可以细粒度控制

### 缺点
- ❌ 需要手动调用log_epoch

### 实现方式

```python
# kode_ocean/monitor.py
import torch
from .dashboard_client import DashboardClient
from .model_inspector import extract_layer_info

class DashboardMonitor:
    """
    Context manager for Ocean Dashboard monitoring

    Usage:
        with DashboardMonitor() as monitor:
            monitor.register_model(model)
            monitor.start_training(100)
            for epoch in range(100):
                loss = train_one_epoch()
                monitor.log_epoch(epoch+1, loss)
    """

    def __init__(self, url="http://localhost:3737", clear_old_data=True):
        self.url = url
        self.clear_old_data = clear_old_data
        self.client = DashboardClient(url)
        self.current_epoch = 0
        self.total_epochs = 0

    def __enter__(self):
        # Clear old data
        if self.clear_old_data and self.client.ping():
            self.client.clear_all()
            self.client.log_info("=" * 60)
            self.client.log_info("NEW TRAINING SESSION - Dashboard cleared")
            self.client.log_info("=" * 60)

        # Detect GPU
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.client.log_info(f"Using device: {device}")

        if device.type == 'cuda':
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            self.client.log_info(f"GPU: {gpu_name}, Memory: {gpu_memory:.2f}GB")

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            # Normal completion
            self.client.complete_training(self.current_epoch, self.total_epochs)
            self.client.log_info("Training completed successfully!")
        else:
            # Error occurred
            self.client.log_error(f"Training failed: {exc_val}")
            self.client.fail_training(self.current_epoch, self.total_epochs)

        # Clear GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            self.client.log_info("GPU memory cleared")

    def register_model(self, model, name="Model", params=None):
        """Register model with automatic layer info extraction"""
        # Extract layer info automatically
        layer_info = extract_layer_info(model)

        # Count parameters
        total_params = sum(p.numel() for p in model.parameters())

        # Update dashboard
        self.client.update_model_info(
            architecture=name,
            params={
                **(params or {}),
                "total_parameters": total_params
            },
            layer_info=layer_info
        )

        self.client.log_info(f"Model registered: {name} ({total_params:,} parameters)")

    def start_training(self, num_epochs):
        """Start training session"""
        self.total_epochs = num_epochs
        self.current_epoch = 0
        self.client.start_training(num_epochs)
        self.client.log_info(f"Starting training for {num_epochs} epochs")

    def log_epoch(self, epoch, loss, metrics=None):
        """Log one epoch's metrics"""
        self.current_epoch = epoch

        # Add metric
        self.client.add_metric(epoch, loss, metrics or {})

        # Update progress
        self.client.update_epoch(epoch, self.total_epochs)

        # GPU memory monitoring
        if torch.cuda.is_available() and epoch % 10 == 0:
            allocated = torch.cuda.memory_allocated(0) / 1024**3
            self.client.log_info(f"Epoch {epoch}: GPU Memory {allocated:.2f}GB allocated")

    def add_visualization(self, title, image_path, viz_type="plot"):
        """Add visualization to dashboard"""
        self.client.add_visualization(title, image_path, viz_type)
        self.client.log_info(f"Visualization added: {title}")
```

---

## 方案3: PyTorch Hook自动捕获 (推荐⭐⭐⭐⭐⭐)

### 使用方式

```python
from kode_ocean import auto_monitor

# 只需这一行！
monitor = auto_monitor(url="http://localhost:3737")

# 正常写训练代码
model = SimpleRNN().to(device)
optimizer = torch.optim.Adam(model.parameters())

for epoch in range(100):
    for batch in train_loader:
        output = model(batch)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        # 自动捕获loss, 自动更新dashboard

# 自动检测训练结束
```

### 优点
- ✅ 完全自动化
- ✅ 零侵入
- ✅ 自动捕获loss、gradients等

### 缺点
- ❌ 实现复杂
- ❌ 可能影响性能
- ❌ 难以处理自定义训练循环

### 实现方式

```python
# kode_ocean/auto_monitor.py
import torch
import torch.nn as nn
from .dashboard_client import DashboardClient

class AutoMonitor:
    """
    Automatic monitoring using PyTorch hooks

    Usage:
        monitor = auto_monitor()
        # ... normal training code ...
        # Everything is captured automatically
    """

    def __init__(self, url="http://localhost:3737"):
        self.client = DashboardClient(url)
        self.client.clear_all()

        self.epoch_losses = []
        self.current_epoch = 0
        self.hooks = []

        # Hook into PyTorch
        self._install_hooks()

    def _install_hooks(self):
        """Install hooks to capture training process"""

        # Hook backward to detect training
        original_backward = torch.Tensor.backward

        def hooked_backward(self, *args, **kwargs):
            # Capture loss value
            if self.requires_grad and self.numel() == 1:
                loss_value = self.item()
                self._monitor_loss(loss_value)

            return original_backward(self, *args, **kwargs)

        torch.Tensor.backward = hooked_backward

        # Hook optimizer.step to detect epochs
        # ... (more complex)

    def _monitor_loss(self, loss):
        """Called automatically when loss.backward() is called"""
        self.epoch_losses.append(loss)

        # If we've collected enough losses, assume one epoch
        if len(self.epoch_losses) >= 50:  # heuristic
            avg_loss = sum(self.epoch_losses) / len(self.epoch_losses)
            self.current_epoch += 1

            self.client.add_metric(
                epoch=self.current_epoch,
                loss=avg_loss,
                metrics={}
            )

            self.epoch_losses = []

def auto_monitor(url="http://localhost:3737"):
    """Enable automatic monitoring"""
    return AutoMonitor(url)
```

---

## 方案4: 全局注册 (推荐⭐⭐⭐⭐)

### 使用方式

```python
import kode_ocean

# 在脚本开头注册一次
kode_ocean.register_dashboard("http://localhost:3737")

# 之后正常训练，自动监控
model = SimpleRNN()
# ... training ...
```

### 优点
- ✅ 最简单，一行代码
- ✅ 全局生效

### 缺点
- ❌ 全局状态可能有副作用
- ❌ 难以细粒度控制

### 实现方式

```python
# kode_ocean/__init__.py
_global_monitor = None

def register_dashboard(url="http://localhost:3737", **options):
    """
    Register global dashboard monitoring

    Usage:
        import kode_ocean
        kode_ocean.register_dashboard()

        # All subsequent training will be monitored
    """
    global _global_monitor
    _global_monitor = AutoMonitor(url, **options)
    return _global_monitor

def get_monitor():
    """Get global monitor instance"""
    return _global_monitor
```

---

## 方案5: Trainer封装 (类似PyTorch Lightning)

### 使用方式

```python
from kode_ocean import OceanTrainer

# 定义训练逻辑
class MyTrainingModule:
    def __init__(self):
        self.model = SimpleRNN()
        self.optimizer = torch.optim.Adam(self.model.parameters())
        self.criterion = nn.MSELoss()

    def training_step(self, batch):
        output = self.model(batch['input'])
        loss = self.criterion(output, batch['target'])
        return loss

# 使用Trainer
module = MyTrainingModule()
trainer = OceanTrainer(
    dashboard_url="http://localhost:3737",
    max_epochs=100
)
trainer.fit(module, train_loader)
```

### 优点
- ✅ 最强大，类似PyTorch Lightning
- ✅ 统一的训练接口
- ✅ 支持分布式、混合精度等高级功能

### 缺点
- ❌ 需要重构现有代码
- ❌ 学习成本高
- ❌ 实现复杂

---

## 推荐实现方案

### 阶段1: 快速方案（1-2小时）

实现**方案2（上下文管理器）**：

1. 创建 `kode_ocean/monitor.py`
2. 实现 `DashboardMonitor` 类
3. 提供 `extract_layer_info()` 辅助函数
4. 在conda环境中安装：`pip install -e .`

**用户代码示例**:
```python
from kode_ocean import DashboardMonitor

with DashboardMonitor() as monitor:
    model = SimpleRNN()
    monitor.register_model(model, "SimpleRNN", {"lr": 0.001})
    monitor.start_training(100)

    for epoch in range(100):
        loss = train_one_epoch()
        monitor.log_epoch(epoch+1, loss)
```

### 阶段2: 增强方案（2-4小时）

添加**方案4（全局注册）**：

```python
import kode_ocean
kode_ocean.enable_auto_monitor()

# 正常训练，自动监控
```

### 阶段3: 完整方案（1-2天）

实现**方案3（PyTorch Hook）**，完全自动化。

---

## 辅助工具：模型层信息自动提取

```python
# kode_ocean/model_inspector.py
import torch.nn as nn

def extract_layer_info(model):
    """
    Automatically extract layer information from PyTorch model

    Returns:
        List of dicts with layer details
    """
    layer_info = []

    for name, module in model.named_modules():
        if len(list(module.children())) == 0:  # Leaf modules only
            # Count parameters
            params = sum(p.numel() for p in module.parameters())

            # Get module type
            module_type = type(module).__name__

            # Try to get input/output shapes
            # (这个比较复杂，需要实际forward一次或者用hook)

            layer_info.append({
                "name": name or "root",
                "type": module_type,
                "params": params,
                "input_shape": [],  # TODO: Need forward hook to get
                "output_shape": []  # TODO: Need forward hook to get
            })

    return layer_info
```

---

## 文件结构

```
Kode-Ocean/
├── ocean_scripts/
│   └── kode_ocean/           # 新的Python包
│       ├── __init__.py       # 导出公共API
│       ├── dashboard_client.py  # 基础DashboardClient
│       ├── monitor.py        # DashboardMonitor (方案2)
│       ├── auto_monitor.py   # AutoMonitor (方案3)
│       ├── decorators.py     # @monitor_training (方案1)
│       ├── model_inspector.py  # 模型层信息提取
│       └── trainer.py        # OceanTrainer (方案5)
├── setup.py                  # 安装脚本
└── README.md
```

---

## 安装方式

```bash
cd Kode-Ocean/ocean_scripts
pip install -e .
```

或者添加到conda环境：
```bash
conda activate agentUse
cd Kode-Ocean/ocean_scripts
pip install -e .
```

---

## 总结

| 方案 | 代码量 | 推荐场景 |
|------|--------|---------|
| 装饰器 | 1行 | 简单脚本，不需要细粒度控制 |
| 上下文管理器 | 5-10行 | **最推荐**，平衡易用性和灵活性 |
| PyTorch Hook | 1行 | 想要完全自动化，不在乎性能 |
| 全局注册 | 1行 | 整个项目统一监控 |
| Trainer封装 | 20+行 | 大型项目，需要统一训练框架 |

**建议先实现方案2（上下文管理器），它是最实用的！**
