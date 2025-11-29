# 🌊 kode_ocean - Automatic Dashboard Monitoring for Ocean ML

**The easiest way to integrate Ocean Dashboard into your PyTorch training scripts!**

Reduce Dashboard integration from **150+ lines** to just **5-10 lines** of code.

## Features

- 🚀 **Simple Context Manager** - Use Python's `with` statement for automatic setup and cleanup
- 🧹 **Auto-Clear Old Data** - Starts fresh every time
- 🎮 **Auto-Detect GPU** - Automatically finds and uses GPU if available
- 🔍 **Auto-Extract Model Layers** - No manual layer_info needed!
- 📊 **Auto-Update Dashboard** - Training status, metrics, progress all handled
- 💾 **Auto-Monitor GPU Memory** - Track GPU memory usage every 10 epochs
- ✅ **Auto-Complete Training** - Marks training as completed/failed on exit
- 🧼 **Auto-Cleanup** - Clears GPU memory on exit

## Installation

### One-Time Setup

```bash
conda activate agentUse
cd /e/个人项目/海洋KODE魔改/Kode-Ocean/ocean_scripts
pip install -e .
```

This installs the package in "editable mode" so you can modify it and see changes immediately.

## Quick Start

### Before (Old Way) - 150+ Lines

```python
import requests

class DashboardClient:
    def __init__(self, url):
        self.url = url

    def ping(self):
        # ... 20 lines ...

    def clear_all(self):
        # ... 15 lines ...

    def update_model_info(self, architecture, params, layer_info):
        # ... 30 lines ...

    # ... 100+ more lines ...

# Setup
client = DashboardClient("http://localhost:3737")
if client.ping():
    client.clear_all()
    client.log_info("Starting training")

# Detect GPU
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
client.log_info(f"Using device: {device}")

# Create model
model = YourModel().to(device)

# Manual layer info extraction
layer_info = []
for name, module in model.named_modules():
    # ... 20 lines of extraction code ...

# Update model info
client.update_model_info("YourModel", params, layer_info)
client.start_training(100)

# Training loop
for epoch in range(100):
    loss = train_one_epoch()
    client.add_metric(epoch+1, loss, {})
    client.update_epoch(epoch+1, 100)

    # GPU monitoring
    if device.type == 'cuda' and epoch % 10 == 0:
        allocated = torch.cuda.memory_allocated(0) / 1024**3
        # ... more monitoring code ...

# Cleanup
client.complete_training(100, 100)
if device.type == 'cuda':
    torch.cuda.empty_cache()
```

### After (New Way) - 5-10 Lines! 🎉

```python
from kode_ocean import DashboardMonitor

with DashboardMonitor() as monitor:
    model = YourModel().to(monitor.device)
    monitor.register_model(model, "YourModel", {"lr": 0.001})
    monitor.start_training(100)

    for epoch in range(100):
        loss = train_one_epoch()
        monitor.log_epoch(epoch+1, loss, {"accuracy": acc})

    # Everything else is automatic!
```

## Complete Example

```python
"""
Complete training script with kode_ocean
"""
import torch
import torch.nn as nn
import torch.optim as optim
from kode_ocean import DashboardMonitor


class MyModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 64, 3)
        self.fc = nn.Linear(64, 10)

    def forward(self, x):
        x = self.conv1(x)
        x = self.fc(x.view(x.size(0), -1))
        return x


def main():
    # 🌊 Dashboard integration - just use context manager!
    with DashboardMonitor(url="http://localhost:3737") as monitor:

        # Create model and move to auto-detected device
        model = MyModel().to(monitor.device)
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        criterion = nn.CrossEntropyLoss()

        # Register model (auto-extracts all layers!)
        monitor.register_model(
            model,
            name="MyCustomModel",
            params={
                "learning_rate": 0.001,
                "optimizer": "Adam",
                "batch_size": 32
            }
        )

        # Start training
        num_epochs = 100
        monitor.start_training(num_epochs)

        # Training loop
        for epoch in range(num_epochs):
            # Your training code
            train_loss = 0.0
            for batch in train_loader:
                optimizer.zero_grad()
                output = model(batch['input'].to(monitor.device))
                loss = criterion(output, batch['target'].to(monitor.device))
                loss.backward()
                optimizer.step()
                train_loss += loss.item()

            train_loss /= len(train_loader)

            # Log to Dashboard (auto-updates status, metrics, progress!)
            monitor.log_epoch(
                epoch=epoch + 1,
                loss=train_loss,
                metrics={
                    "train_loss": train_loss,
                    "learning_rate": optimizer.param_groups[0]['lr']
                }
            )

            print(f"Epoch {epoch+1}/{num_epochs} - Loss: {train_loss:.6f}")

        # Optional: Add custom visualizations
        monitor.add_visualization(
            title="Training Curve",
            image_path="/outputs/training_curve.png",
            viz_type="training_curve"
        )

        # Dashboard automatically marks training complete on exit!
        # GPU memory automatically cleared!


if __name__ == "__main__":
    main()
```

## API Reference

### DashboardMonitor

Main context manager for Dashboard integration.

```python
DashboardMonitor(
    url="http://localhost:3737",    # Dashboard URL
    clear_old_data=True,             # Clear old data on start
    auto_gpu_monitor=True            # Monitor GPU memory automatically
)
```

**Attributes:**
- `device` - PyTorch device (cuda or cpu), auto-detected
- `client` - Low-level DashboardClient for advanced usage

**Methods:**

#### `register_model(model, name, params=None)`

Register PyTorch model with Dashboard. Automatically extracts layer information.

```python
monitor.register_model(
    model,                           # PyTorch nn.Module
    name="FNO-2D",                  # Model architecture name
    params={                         # Optional hyperparameters
        "learning_rate": 0.001,
        "batch_size": 32,
        "optimizer": "Adam"
    }
)
```

#### `start_training(num_epochs)`

Start training session.

```python
monitor.start_training(100)  # Training for 100 epochs
```

#### `log_epoch(epoch, loss, metrics=None)`

Log one epoch's results. Call this at the end of each epoch.

```python
monitor.log_epoch(
    epoch=epoch + 1,           # Epoch number (1-indexed!)
    loss=train_loss,           # Training loss
    metrics={                  # Optional additional metrics
        "accuracy": 0.95,
        "val_loss": 0.3
    }
)
```

#### `add_visualization(title, image_path, viz_type="plot")`

Add visualization to Dashboard.

```python
monitor.add_visualization(
    title="Training Progress",
    image_path="/outputs/plot.png",  # Relative path with leading /
    viz_type="training_curve"         # or "error_map", "prediction", etc.
)
```

#### `log_info(message)` / `log_warning(message)` / `log_error(message)`

Add log entries to Dashboard.

```python
monitor.log_info("Training started")
monitor.log_warning("Learning rate is very high")
monitor.log_error("CUDA out of memory")
```

### DashboardClient

Low-level API client for advanced usage. Most users should use `DashboardMonitor` instead.

```python
from kode_ocean import DashboardClient

client = DashboardClient("http://localhost:3737")

# Check connection
if client.ping():
    print("Dashboard is running")

# Clear all data
client.clear_all()

# Update model info (manual)
client.update_model_info(
    architecture="FNO-2D",
    params={"lr": 0.001},
    layer_info=[...]
)

# Training status
client.start_training(100)
client.update_epoch(50, 100)
client.complete_training(100, 100)

# Metrics
client.add_metric(epoch=1, loss=0.5, metrics={"acc": 0.9})

# Visualization
client.add_visualization(
    title="Plot",
    image_path="/outputs/plot.png",
    viz_type="plot"
)

# Logging
client.log_info("Message")
client.log_warning("Warning")
client.log_error("Error")
```

## What Happens Automatically

When you use `with DashboardMonitor() as monitor:`, here's what happens:

### On Enter (`__enter__`)

1. ✅ **Checks Dashboard connection** - Warns if not reachable
2. ✅ **Clears old data** - Calls `clear_all()` to start fresh
3. ✅ **Logs session start** - Adds "NEW TRAINING SESSION" separator
4. ✅ **Detects GPU** - Auto-detects CUDA availability
5. ✅ **Logs GPU info** - Shows GPU name and memory if available
6. ✅ **Warns if no GPU** - Warns if training on CPU

### During Training (`log_epoch`)

1. ✅ **Adds metrics** - Updates training curves
2. ✅ **Updates progress** - Updates epoch counter
3. ✅ **Monitors GPU memory** - Every 10 epochs, logs GPU memory usage

### On Exit (`__exit__`)

1. ✅ **Marks completion** - Sets status to "completed" (or "failed" if error)
2. ✅ **Logs result** - Adds success/failure message
3. ✅ **Clears GPU memory** - Calls `torch.cuda.empty_cache()`
4. ✅ **Logs cleanup** - Confirms memory cleared

## Package Structure

```
kode_ocean/
├── __init__.py           # Package exports
├── dashboard_client.py   # Low-level API client
├── monitor.py            # DashboardMonitor context manager
└── model_inspector.py    # Automatic layer extraction
```

## Advanced: Layer Information Extraction

The `model_inspector` module provides utilities for automatic model inspection:

```python
from kode_ocean.model_inspector import extract_layer_info, get_model_summary

# Extract layer information
layer_info = extract_layer_info(
    model,
    input_shape=(1, 3, 224, 224)  # Optional: enables shape inference
)

# Get complete model summary
summary = get_model_summary(model, input_shape=(1, 3, 224, 224))
# Returns:
# {
#     "total_parameters": 1234567,
#     "trainable_parameters": 1234567,
#     "non_trainable_parameters": 0,
#     "layer_count": 10,
#     "layer_info": [...]
# }
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'kode_ocean'"

Make sure you installed the package:
```bash
conda activate agentUse
cd /e/个人项目/海洋KODE魔改/Kode-Ocean/ocean_scripts
pip install -e .
```

### "Dashboard not reachable"

Start the Dashboard first:
```bash
# In Kode, use the ocean_dashboard tool
# Or manually:
cd /e/个人项目/海洋KODE魔改/Kode-Ocean
node dist/index.js
```

### Dashboard not showing layer information

If you don't provide `input_shape` to `extract_layer_info()`, shapes will be empty. Either:
1. Let DashboardMonitor handle it automatically (recommended)
2. Provide input_shape manually in register_model()

### GPU not detected

Make sure CUDA is available:
```python
import torch
print(torch.cuda.is_available())  # Should be True
print(torch.cuda.get_device_name(0))
```

If False, check your PyTorch installation and CUDA setup.

## Comparison: kode_ocean vs Manual Integration

| Feature | kode_ocean | Manual DashboardClient |
|---------|-----------|----------------------|
| Lines of code | 5-10 | 150+ |
| Auto-clear data | ✅ Yes | ❌ Manual |
| Auto-detect GPU | ✅ Yes | ❌ Manual |
| Auto-extract layers | ✅ Yes | ❌ Manual (20+ lines) |
| Auto-monitor memory | ✅ Yes | ❌ Manual |
| Auto-complete training | ✅ Yes | ❌ Manual |
| Auto-cleanup GPU | ✅ Yes | ❌ Manual |
| Error handling | ✅ Automatic | ❌ Manual try/except |
| Learning curve | Easy | Complex |

## License

Part of Kode-Ocean project.

## Contributing

To contribute or modify:

1. Edit files in `ocean_scripts/kode_ocean/`
2. Changes are immediately available (editable install)
3. No need to reinstall after changes

## See Also

- `example_with_monitor.py` - Complete working example
- `DASHBOARD_AUTO_MONITOR_DESIGN.md` - Design documentation
- Ocean ML Agent (`ocean-workspace/.kode/agents/ocean-ml.md`) - Usage in agent workflows
