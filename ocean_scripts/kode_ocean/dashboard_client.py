"""
Dashboard Client - Low-level API for Ocean ML Dashboard

This is the base client that handles HTTP communication with the dashboard server.
Most users should use DashboardMonitor instead.
"""

import requests


class DashboardClient:
    """
    Low-level client for Ocean ML Dashboard API

    Correct API Endpoints:
    - GET  /api/health - Health check
    - POST /api/clear - Clear all data
    - POST /api/model/architecture - Update model name
    - POST /api/model/variables - Update model parameters
    - POST /api/training/status - Update training status
    - POST /api/training/metric - Add training metric
    - POST /api/visualization - Add visualization
    - POST /api/log - Add log entry
    """

    def __init__(self, url="http://localhost:3737"):
        self.url = url

    def ping(self):
        """Check if dashboard is reachable"""
        try:
            response = requests.get(f"{self.url}/api/health", timeout=2)
            return response.status_code == 200
        except:
            return False

    def clear_all(self):
        """Clear all dashboard data"""
        try:
            response = requests.post(f"{self.url}/api/clear", timeout=2)
            return response.status_code == 200
        except:
            return False

    def update_model_info(self, architecture, params, layer_info=None):
        """
        Update model information

        IMPORTANT: Calls TWO endpoints:
        1. /api/model/architecture - for model name
        2. /api/model/variables - for parameters and layer details

        Args:
            architecture (str): Model architecture name
            params (dict): Model hyperparameters
            layer_info (list, optional): List of layer configurations
        """
        try:
            # 1. Update architecture name
            requests.post(
                f"{self.url}/api/model/architecture",
                json={"architecture": architecture},
                timeout=2
            )

            # 2. Update parameters (including layer_info if provided)
            variables = params.copy() if params else {}
            if layer_info:
                variables['layers_detail'] = layer_info
                variables['total_parameters'] = sum(
                    layer.get('params', 0) for layer in layer_info
                )

            requests.post(
                f"{self.url}/api/model/variables",
                json=variables,
                timeout=2
            )
            return True
        except:
            return False

    def start_training(self, total_epochs):
        """Start training - set status to 'running'"""
        try:
            requests.post(
                f"{self.url}/api/training/status",
                json={
                    "status": "running",
                    "currentEpoch": 0,
                    "totalEpochs": total_epochs
                },
                timeout=2
            )
        except:
            pass

    def update_epoch(self, current_epoch, total_epochs):
        """Update current epoch progress"""
        try:
            requests.post(
                f"{self.url}/api/training/status",
                json={
                    "status": "running",
                    "currentEpoch": current_epoch,
                    "totalEpochs": total_epochs
                },
                timeout=2
            )
        except:
            pass

    def add_metric(self, epoch, loss, metrics=None):
        """
        Add training metric for one epoch

        Args:
            epoch (int): Epoch number
            loss (float): Loss value
            metrics (dict, optional): Additional metrics
        """
        try:
            requests.post(
                f"{self.url}/api/training/metric",
                json={
                    "epoch": epoch,
                    "loss": loss,
                    "metrics": metrics or {}
                },
                timeout=2
            )
        except:
            pass

    def complete_training(self, current_epoch, total_epochs):
        """Mark training as completed"""
        try:
            requests.post(
                f"{self.url}/api/training/status",
                json={
                    "status": "completed",
                    "currentEpoch": current_epoch,
                    "totalEpochs": total_epochs
                },
                timeout=2
            )
        except:
            pass

    def fail_training(self, current_epoch, total_epochs):
        """Mark training as failed"""
        try:
            requests.post(
                f"{self.url}/api/training/status",
                json={
                    "status": "failed",
                    "currentEpoch": current_epoch,
                    "totalEpochs": total_epochs
                },
                timeout=2
            )
        except:
            pass

    def add_visualization(self, title, image_path, viz_type="plot"):
        """
        Add visualization to dashboard

        CRITICAL: Parameter names must match exactly:
        - imagePath (camelCase, NOT image_path)
        - type (NOT viz_type)

        Args:
            title (str): Visualization title
            image_path (str): Path to image (relative to dashboard)
            viz_type (str): Visualization type
        """
        try:
            requests.post(
                f"{self.url}/api/visualization",
                json={
                    "title": title,
                    "imagePath": image_path,  # Must be 'imagePath'!
                    "type": viz_type          # Must be 'type'!
                },
                timeout=2
            )
        except:
            pass

    def log_info(self, message):
        """Add info log"""
        try:
            requests.post(
                f"{self.url}/api/log",
                json={"level": "info", "message": message},
                timeout=2
            )
        except:
            pass

    def log_warning(self, message):
        """Add warning log"""
        try:
            requests.post(
                f"{self.url}/api/log",
                json={"level": "warning", "message": message},
                timeout=2
            )
        except:
            pass

    def log_error(self, message):
        """Add error log"""
        try:
            requests.post(
                f"{self.url}/api/log",
                json={"level": "error", "message": message},
                timeout=2
            )
        except:
            pass
