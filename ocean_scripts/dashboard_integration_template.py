#!/usr/bin/env python3
"""
Ocean ML Dashboard Integration Template

This is the CORRECT way to integrate Ocean ML Dashboard into training scripts.
Copy this DashboardClient class into your training script for dashboard support.

=============================================================================
IMPORTANT: Dashboard API Endpoints (from dashboardServer.ts)
=============================================================================

GET  /api/state              - Get current dashboard state
GET  /api/health             - Health check
POST /api/model/architecture - Update model architecture name
                               Body: {"architecture": "Model Name"}
POST /api/model/variables    - Update model parameters/variables
                               Body: {param1: value1, param2: value2, ...}
POST /api/training/status    - Update training status (start/epoch/complete/fail)
                               Body: {"status": "running|completed|failed",
                                      "currentEpoch": 10,
                                      "totalEpochs": 100}
POST /api/training/metric    - Add training metric for one epoch
                               Body: {"epoch": 1, "loss": 0.5,
                                      "metrics": {"mae": 0.3, "rmse": 0.4}}
POST /api/visualization      - Add visualization
                               Body: {"title": "Plot Title",
                                      "imagePath": "/outputs/plot.png",
                                      "type": "training_curve|error_map|..."}
POST /api/data/info          - Update data information
                               Body: {"format": "hdf5", "shape": [100, 64, 64], ...}
POST /api/log                - Add log entry
                               Body: {"level": "info|warning|error",
                                      "message": "Log message"}
POST /api/clear              - Clear all dashboard data
                               Body: {} (empty)

CRITICAL: Parameter name casing matters!
  - Use "imagePath" NOT "image_path"
  - Use "currentEpoch" NOT "current_epoch"
  - Use "totalEpochs" NOT "total_epochs"
=============================================================================
"""

import requests


class DashboardClient:
    """
    Simplified Dashboard Client for Ocean ML Training

    Usage:
        client = DashboardClient("http://localhost:3737")

        # 1. Clear old data
        client.clear_all()

        # 2. Update model info
        client.update_model_info(
            architecture="FNO-2D",
            params={"modes": 12, "width": 64},
            layer_info=[{"name": "conv1", "type": "SpectralConv2d", "params": 1024}, ...]
        )

        # 3. Start training
        client.start_training(total_epochs=100)

        # 4. Training loop
        for epoch in range(100):
            # ... train one epoch ...
            client.add_metric(epoch+1, loss, {"mae": mae, "rmse": rmse})
            client.update_epoch(epoch+1, 100)
            client.log_info(f"Epoch {epoch+1} completed")

        # 5. Complete
        client.complete_training(100, 100)
    """

    def __init__(self, url="http://localhost:3737"):
        self.url = url.rstrip('/')

    def _post(self, endpoint, data):
        """Send POST request to dashboard"""
        try:
            response = requests.post(f"{self.url}{endpoint}", json=data, timeout=5)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Dashboard error: {e}")
            return False

    def clear_all(self):
        """Clear all dashboard data"""
        return self._post("/api/clear", {})

    def update_model_info(self, architecture, params=None, layer_info=None):
        """Update model architecture and parameters"""
        self._post("/api/model/architecture", {"architecture": architecture})
        if params:
            self._post("/api/model/variables", params)
        return True

    def start_training(self, total_epochs):
        """Start training"""
        return self._post("/api/training/status", {
            "status": "running",
            "currentEpoch": 0,
            "totalEpochs": total_epochs
        })

    def update_epoch(self, current_epoch, total_epochs):
        """Update current epoch"""
        return self._post("/api/training/status", {
            "status": "running",
            "currentEpoch": current_epoch,
            "totalEpochs": total_epochs
        })

    def add_metric(self, epoch, loss, metrics=None):
        """Add training metrics for an epoch"""
        data = {"epoch": epoch, "loss": float(loss)}
        if metrics:
            data["metrics"] = {k: float(v) for k, v in metrics.items()}
        return self._post("/api/training/metric", data)

    def complete_training(self, current_epoch, total_epochs):
        """Mark training as completed"""
        return self._post("/api/training/status", {
            "status": "completed",
            "currentEpoch": current_epoch,
            "totalEpochs": total_epochs
        })

    def fail_training(self, error_message):
        """Mark training as failed"""
        self.log_error(f"Training failed: {error_message}")
        return self._post("/api/training/status", {"status": "failed"})

    def add_visualization(self, title, image_path, viz_type="training_curve"):
        """Add a visualization"""
        return self._post("/api/visualization", {
            "title": title,
            "imagePath": image_path,
            "type": viz_type
        })

    def log_info(self, message):
        """Log info message"""
        return self._post("/api/log", {"level": "info", "message": message})

    def log_warning(self, message):
        """Log warning message"""
        return self._post("/api/log", {"level": "warning", "message": message})

    def log_error(self, message):
        """Log error message"""
        return self._post("/api/log", {"level": "error", "message": message})


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = DashboardClient("http://localhost:3737")
    
    # Clear previous data
    client.clear_all()
    
    # Update model info
    client.update_model_info(
        architecture="Simple Test Model",
        params={"layers": 3, "neurons": 128}
    )
    
    # Start training
    total_epochs = 10
    client.start_training(total_epochs)
    client.log_info("Training started")
    
    # Simulate training loop
    for epoch in range(1, total_epochs + 1):
        # Simulate some loss values
        loss = 1.0 / epoch
        mae = 0.5 / epoch
        rmse = 0.7 / epoch
        
        # Update metrics
        client.add_metric(epoch, loss, {"mae": mae, "rmse": rmse})
        client.update_epoch(epoch, total_epochs)
        client.log_info(f"Epoch {epoch}/{total_epochs} - Loss: {loss:.4f}")
    
    # Complete training
    client.complete_training(total_epochs, total_epochs)
    client.log_info("Training completed successfully!")
    
    print("Dashboard test completed! Check http://localhost:3737")
