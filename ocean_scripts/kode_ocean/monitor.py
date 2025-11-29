"""
Dashboard Monitor - High-level context manager for automatic monitoring

This provides an easy-to-use interface for integrating Ocean Dashboard
into PyTorch training scripts.
"""

import torch
from .dashboard_client import DashboardClient
from .model_inspector import extract_layer_info


class DashboardMonitor:
    """
    Context manager for Ocean Dashboard monitoring

    This is the recommended way to integrate Dashboard into training scripts.

    Usage:
        with DashboardMonitor() as monitor:
            model = YourModel()
            monitor.register_model(model, "YourModel", {"lr": 0.001})
            monitor.start_training(100)

            for epoch in range(100):
                loss = train_one_epoch()
                monitor.log_epoch(epoch+1, loss, {"accuracy": acc})

    Features:
        - Automatic dashboard initialization and cleanup
        - Auto-detects GPU and logs device info
        - Automatically clears old data
        - Auto-extracts model layer information
        - Handles training completion/failure automatically
        - Monitors GPU memory usage
    """

    def __init__(self, url="http://localhost:3737", clear_old_data=True, auto_gpu_monitor=True):
        """
        Initialize Dashboard Monitor

        Args:
            url (str): Dashboard URL (default: http://localhost:3737)
            clear_old_data (bool): Clear old dashboard data on start (default: True)
            auto_gpu_monitor (bool): Automatically monitor GPU memory (default: True)
        """
        self.url = url
        self.clear_old_data = clear_old_data
        self.auto_gpu_monitor = auto_gpu_monitor

        self.client = DashboardClient(url)
        self.current_epoch = 0
        self.total_epochs = 0
        self.device = None

    def __enter__(self):
        """Enter context - initialize dashboard"""

        # Check if dashboard is reachable
        if not self.client.ping():
            print(f"⚠️  Warning: Dashboard not reachable at {self.url}")
            print(f"    Start dashboard with ocean_dashboard tool")

        # Clear old data
        if self.clear_old_data and self.client.ping():
            self.client.clear_all()
            self.client.log_info("=" * 60)
            self.client.log_info("NEW TRAINING SESSION - Dashboard cleared")
            self.client.log_info("=" * 60)

        # Detect GPU
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.client.log_info(f"Using device: {self.device}")

        if self.device.type == 'cuda':
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            self.client.log_info(f"GPU: {gpu_name}, Memory: {gpu_memory:.2f}GB")
        else:
            self.client.log_warning("GPU not available - training will be slow!")

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context - handle completion or failure"""

        if exc_type is None:
            # Normal completion
            self.client.complete_training(self.current_epoch, self.total_epochs)
            self.client.log_info("=" * 60)
            self.client.log_info("Training completed successfully!")
            self.client.log_info("=" * 60)
        else:
            # Error occurred
            self.client.log_error(f"Training failed: {exc_val}")
            self.client.fail_training(self.current_epoch, self.total_epochs)

        # Clear GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            self.client.log_info("GPU memory cleared")

        # Don't suppress exceptions
        return False

    def register_model(self, model, name="Model", params=None):
        """
        Register model with dashboard

        Automatically extracts layer information from PyTorch model.

        Args:
            model (nn.Module): PyTorch model
            name (str): Model architecture name
            params (dict, optional): Additional hyperparameters to display
        """

        # Extract layer info automatically
        layer_info = extract_layer_info(model)

        # Count parameters
        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

        # Merge params with computed values
        all_params = {
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "device": str(self.device) if self.device else "unknown"
        }

        if params:
            all_params.update(params)

        # Update dashboard
        self.client.update_model_info(
            architecture=name,
            params=all_params,
            layer_info=layer_info
        )

        self.client.log_info(f"Model registered: {name}")
        self.client.log_info(f"  - Total parameters: {total_params:,}")
        self.client.log_info(f"  - Trainable parameters: {trainable_params:,}")
        self.client.log_info(f"  - Layers: {len(layer_info)}")

    def start_training(self, num_epochs):
        """
        Start training session

        Args:
            num_epochs (int): Total number of epochs
        """
        self.total_epochs = num_epochs
        self.current_epoch = 0

        self.client.start_training(num_epochs)
        self.client.log_info(f"Starting training for {num_epochs} epochs")

    def log_epoch(self, epoch, loss, metrics=None):
        """
        Log one epoch's metrics

        This should be called at the end of each epoch.

        Args:
            epoch (int): Epoch number (1-indexed)
            loss (float): Training loss
            metrics (dict, optional): Additional metrics
                e.g., {"accuracy": 0.95, "val_loss": 0.3}
        """
        self.current_epoch = epoch

        # Add metric
        self.client.add_metric(epoch, loss, metrics or {})

        # Update progress
        self.client.update_epoch(epoch, self.total_epochs)

        # GPU memory monitoring (every 10 epochs)
        if self.auto_gpu_monitor and torch.cuda.is_available() and epoch % 10 == 0:
            allocated = torch.cuda.memory_allocated(0) / 1024**3
            reserved = torch.cuda.memory_reserved(0) / 1024**3
            self.client.log_info(
                f"Epoch {epoch}: GPU Memory {allocated:.2f}GB allocated, {reserved:.2f}GB reserved"
            )

    def add_visualization(self, title, image_path, viz_type="plot"):
        """
        Add visualization to dashboard

        Args:
            title (str): Visualization title
            image_path (str): Path to image file
                Should start with "/" for relative paths (e.g., "/outputs/plot.png")
            viz_type (str): Visualization type
                e.g., "training_curve", "error_map", "prediction", "plot"
        """
        self.client.add_visualization(title, image_path, viz_type)
        self.client.log_info(f"Visualization added: {title}")

    def log_info(self, message):
        """Log info message to dashboard"""
        self.client.log_info(message)

    def log_warning(self, message):
        """Log warning message to dashboard"""
        self.client.log_warning(message)

    def log_error(self, message):
        """Log error message to dashboard"""
        self.client.log_error(message)
