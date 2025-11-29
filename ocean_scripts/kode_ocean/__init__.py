"""
Kode Ocean - Automatic Dashboard Monitoring for Ocean ML Training

Simple integration with Ocean Dashboard for PyTorch training.

Usage:
    from kode_ocean import DashboardMonitor

    with DashboardMonitor() as monitor:
        model = YourModel()
        monitor.register_model(model, "YourModel", {"lr": 0.001})
        monitor.start_training(100)

        for epoch in range(100):
            loss = train_one_epoch()
            monitor.log_epoch(epoch+1, loss, {"accuracy": acc})
"""

__version__ = "0.1.0"

from .monitor import DashboardMonitor
from .dashboard_client import DashboardClient

__all__ = ['DashboardMonitor', 'DashboardClient']
