#!/usr/bin/env python3
"""
Ocean Dashboard Utilities
Complete toolkit for updating the Ocean ML Dashboard via HTTP API
"""

import requests
from typing import Dict, Any, Optional, List
import base64
from pathlib import Path


class DashboardClient:
    """Client for Ocean ML Dashboard API"""

    def __init__(self, url: str = "http://localhost:3737"):
        self.base_url = url
        self.timeout = 5

    def _post(self, endpoint: str, data: dict) -> bool:
        """Internal method to POST to dashboard API"""
        try:
            response = requests.post(
                f"{self.base_url}/api/{endpoint}",
                json=data,
                timeout=self.timeout
            )
            return response.status_code == 200
        except Exception as e:
            # Silent fail - dashboard might not be running
            return False

    # ==================== Training Status ====================

    def update_training_status(
        self,
        status: str,
        current_epoch: int = 0,
        total_epochs: int = 0
    ) -> bool:
        """
        Update training status

        Args:
            status: 'idle', 'running', 'completed', 'failed'
            current_epoch: Current epoch number
            total_epochs: Total number of epochs
        """
        return self._post("training/status", {
            "status": status,
            "currentEpoch": current_epoch,
            "totalEpochs": total_epochs
        })

    def start_training(self, total_epochs: int) -> bool:
        """Mark training as started"""
        return self.update_training_status("running", 0, total_epochs)

    def update_epoch(self, current: int, total: int) -> bool:
        """Update current epoch progress"""
        return self.update_training_status("running", current, total)

    def complete_training(self, final_epoch: int, total_epochs: int) -> bool:
        """Mark training as completed"""
        return self.update_training_status("completed", final_epoch, total_epochs)

    def fail_training(self, error_epoch: int, total_epochs: int) -> bool:
        """Mark training as failed"""
        return self.update_training_status("failed", error_epoch, total_epochs)

    # ==================== Training Metrics ====================

    def add_metric(
        self,
        epoch: int,
        loss: float,
        metrics: Optional[Dict[str, float]] = None
    ) -> bool:
        """
        Add training metric for one epoch

        Args:
            epoch: Epoch number
            loss: Loss value
            metrics: Additional metrics (e.g., {'mae': 0.1, 'rmse': 0.2})
        """
        return self._post("training/metric", {
            "epoch": epoch,
            "loss": loss,
            "metrics": metrics or {}
        })

    # ==================== Model Information ====================

    def update_model_architecture(self, architecture: str) -> bool:
        """
        Update model architecture name/description

        Args:
            architecture: Model name or description (e.g., "FNO-2D")
        """
        return self._post("model/architecture", {
            "architecture": architecture
        })

    def update_model_variables(self, variables: Dict[str, Any]) -> bool:
        """
        Update model configuration variables

        Args:
            variables: Dict of model parameters
                      e.g., {'layers': 4, 'modes': 12, 'width': 64}
        """
        return self._post("model/variables", variables)

    def update_model_info(
        self,
        architecture: str,
        params: Dict[str, Any],
        layer_info: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """
        Update complete model information

        Args:
            architecture: Model architecture name
            params: Model hyperparameters
            layer_info: List of layer configurations (optional)
                       e.g., [{'name': 'conv1', 'type': 'Conv2d', 'params': 1024}]
        """
        success = True
        success &= self.update_model_architecture(architecture)

        # Add layer info to params if provided
        if layer_info:
            params = params.copy()
            params['layers_detail'] = layer_info

            # Calculate total parameters
            total_params = sum(layer.get('params', 0) for layer in layer_info)
            params['total_parameters'] = total_params

        success &= self.update_model_variables(params)
        return success

    # ==================== Data Information ====================

    def update_data_info(
        self,
        format: str,
        filepath: str,
        variables: List[str],
        shape: List[int],
        loaded: bool = True,
        **kwargs
    ) -> bool:
        """
        Update data information

        Args:
            format: Data format (e.g., 'hdf5', 'netcdf')
            filepath: Path to data file
            variables: List of variable names
            shape: Data shape
            loaded: Whether data is loaded
            **kwargs: Additional metadata
        """
        data = {
            "format": format,
            "filepath": filepath,
            "variables": variables,
            "shape": shape,
            "loaded": loaded,
            **kwargs
        }
        return self._post("data/info", data)

    # ==================== Visualizations ====================

    def add_visualization(
        self,
        title: str,
        image_path: str,
        viz_type: str = "plot"
    ) -> bool:
        """
        Add visualization to dashboard

        Args:
            title: Visualization title
            image_path: Path to image file (relative to dashboard public dir)
            viz_type: Type of visualization
        """
        return self._post("visualization", {
            "title": title,
            "imagePath": image_path,
            "type": viz_type
        })

    def add_visualization_from_file(
        self,
        title: str,
        file_path: str,
        viz_type: str = "plot"
    ) -> bool:
        """
        Add visualization from a local file

        Note: This assumes the file is accessible from the dashboard's perspective.
        For production use, you may want to implement file upload to the dashboard.

        Args:
            title: Visualization title
            file_path: Path to local image file
            viz_type: Type of visualization
        """
        # Convert to relative path or URL
        # For now, just use the filename
        path = Path(file_path)
        image_path = f"/visualizations/{path.name}"

        return self.add_visualization(title, image_path, viz_type)

    # ==================== Logging ====================

    def log(self, message: str, level: str = "info") -> bool:
        """
        Add log entry

        Args:
            message: Log message
            level: 'info', 'warning', or 'error'
        """
        return self._post("log", {
            "message": message,
            "level": level
        })

    def log_info(self, message: str) -> bool:
        """Log info message"""
        return self.log(message, "info")

    def log_warning(self, message: str) -> bool:
        """Log warning message"""
        return self.log(message, "warning")

    def log_error(self, message: str) -> bool:
        """Log error message"""
        return self.log(message, "error")

    # ==================== Utility Methods ====================

    def clear_all(self) -> bool:
        """Clear all dashboard data"""
        return self._post("clear", {})

    def ping(self) -> bool:
        """Check if dashboard is reachable"""
        try:
            response = requests.get(f"{self.base_url}/api/state", timeout=2)
            return response.status_code == 200
        except:
            return False


# ==================== Convenience Functions ====================

# Global default client
_default_client = None


def get_client(url: str = "http://localhost:3737") -> DashboardClient:
    """Get or create default dashboard client"""
    global _default_client
    if _default_client is None:
        _default_client = DashboardClient(url)
    return _default_client


# Training status shortcuts
def start_training(total_epochs: int, url: str = "http://localhost:3737") -> bool:
    return get_client(url).start_training(total_epochs)


def update_epoch(current: int, total: int, url: str = "http://localhost:3737") -> bool:
    return get_client(url).update_epoch(current, total)


def complete_training(final_epoch: int, total: int, url: str = "http://localhost:3737") -> bool:
    return get_client(url).complete_training(final_epoch, total)


# Metrics
def add_metric(epoch: int, loss: float, metrics: Optional[Dict] = None,
               url: str = "http://localhost:3737") -> bool:
    return get_client(url).add_metric(epoch, loss, metrics)


# Model info
def update_model_info(architecture: str, params: Dict, layer_info: Optional[List] = None,
                     url: str = "http://localhost:3737") -> bool:
    return get_client(url).update_model_info(architecture, params, layer_info)


# Visualization
def add_visualization(title: str, image_path: str, viz_type: str = "plot",
                     url: str = "http://localhost:3737") -> bool:
    return get_client(url).add_visualization(title, image_path, viz_type)


# Logging
def log_info(message: str, url: str = "http://localhost:3737") -> bool:
    return get_client(url).log_info(message)


def log_warning(message: str, url: str = "http://localhost:3737") -> bool:
    return get_client(url).log_warning(message)


def log_error(message: str, url: str = "http://localhost:3737") -> bool:
    return get_client(url).log_error(message)


# ==================== Example Usage ====================

if __name__ == "__main__":
    # Example: Complete training workflow
    client = DashboardClient()

    # Check connection
    if not client.ping():
        print("Dashboard not reachable at http://localhost:3737")
        exit(1)

    print("Dashboard connected!")

    # Update model info
    client.update_model_info(
        architecture="FNO-2D",
        params={
            "modes": 12,
            "width": 64,
            "learning_rate": 0.001,
            "batch_size": 32
        },
        layer_info=[
            {"name": "conv1", "type": "SpectralConv2d", "params": 49152},
            {"name": "conv2", "type": "SpectralConv2d", "params": 49152},
            {"name": "conv3", "type": "SpectralConv2d", "params": 49152},
            {"name": "fc", "type": "Linear", "params": 4096}
        ]
    )

    # Simulate training
    epochs = 10
    client.start_training(epochs)

    for epoch in range(1, epochs + 1):
        loss = 1.0 / epoch  # Decreasing loss
        client.add_metric(epoch, loss, {"mae": loss * 0.8, "rmse": loss * 1.2})
        client.update_epoch(epoch, epochs)
        client.log_info(f"Epoch {epoch}/{epochs} completed, loss={loss:.4f}")

    client.complete_training(epochs, epochs)
    client.log_info("Training completed successfully!")
