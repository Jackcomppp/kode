#!/usr/bin/env python3
"""
Ocean ML Workflow Example
Demonstrates the complete workflow: data loading -> model training -> visualization

Updated to use dashboard_utils and include visualization examples
"""

import sys
import json
import time
from pathlib import Path
import argparse

# Import dashboard utilities
import sys
sys.path.insert(0, str(Path(__file__).parent / "utils"))
from dashboard_utils import DashboardClient

# Visualization imports (optional - script works without them)
try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    import numpy as np
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    print("Warning: matplotlib not available, visualizations will be skipped")


def create_training_curve_plot(epochs, losses, metrics, output_path):
    """Create training curve visualization"""
    if not HAS_MATPLOTLIB:
        return False

    try:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

        # Loss curve
        ax1.plot(epochs, losses, 'b-', linewidth=2, label='Loss')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.set_title('Training Loss')
        ax1.grid(True, alpha=0.3)
        ax1.legend()

        # Metrics curves
        if metrics and len(metrics) > 0:
            metric_names = list(metrics[0].keys())
            for metric_name in metric_names:
                metric_values = [m.get(metric_name, 0) for m in metrics]
                ax2.plot(epochs, metric_values, linewidth=2, label=metric_name.upper())

        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Metric Value')
        ax2.set_title('Training Metrics')
        ax2.grid(True, alpha=0.3)
        ax2.legend()

        plt.tight_layout()
        plt.savefig(output_path, dpi=100, bbox_inches='tight')
        plt.close()

        return True
    except Exception as e:
        print(f"Failed to create training curve plot: {e}")
        return False


def create_loss_distribution_plot(losses, output_path):
    """Create loss distribution histogram"""
    if not HAS_MATPLOTLIB:
        return False

    try:
        plt.figure(figsize=(8, 6))
        plt.hist(losses, bins=20, alpha=0.7, color='blue', edgecolor='black')
        plt.xlabel('Loss Value')
        plt.ylabel('Frequency')
        plt.title('Loss Distribution')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(output_path, dpi=100, bbox_inches='tight')
        plt.close()

        return True
    except Exception as e:
        print(f"Failed to create loss distribution plot: {e}")
        return False


def simulate_training(
    client: DashboardClient,
    epochs: int = 100,
    target_loss: float = 0.01,
    output_dir: Path = Path("outputs")
):
    """Simulate model training with decreasing loss and create visualizations"""

    output_dir.mkdir(exist_ok=True)

    client.log_info("Starting training simulation")
    client.start_training(epochs)

    # Track metrics for visualization
    epoch_list = []
    loss_list = []
    metrics_list = []

    # Simulate decreasing loss
    initial_loss = 1.0
    for epoch in range(1, epochs + 1):
        # Exponential decay simulation
        loss = initial_loss * (0.95 ** epoch) + 0.005

        # Add metrics
        metrics = {
            "mae": loss * 1.2,
            "rmse": loss * 1.5,
            "r2": min(0.99, 1 - loss)
        }

        # Update dashboard
        client.add_metric(epoch, loss, metrics)
        client.update_epoch(epoch, epochs)
        client.log_info(f"Epoch {epoch}/{epochs}: Loss = {loss:.6f}")

        # Store for visualization
        epoch_list.append(epoch)
        loss_list.append(loss)
        metrics_list.append(metrics)

        # Create visualizations every 10 epochs
        if epoch % 10 == 0 or epoch == epochs:
            # Training curves
            curves_path = output_dir / f"training_curves_epoch_{epoch}.png"
            if create_training_curve_plot(epoch_list, loss_list, metrics_list, curves_path):
                # Note: In a real scenario, you'd need to serve these images
                # For now, we use relative paths
                client.add_visualization(
                    title=f"Training Progress (Epoch {epoch})",
                    image_path=f"/outputs/{curves_path.name}",
                    viz_type="training_curves"
                )
                client.log_info(f"Created training curves visualization: {curves_path.name}")

        # Check if target reached
        if loss < target_loss:
            client.log_info(f"Target loss {target_loss} reached at epoch {epoch}!")
            client.complete_training(epoch, epochs)

            # Final visualizations
            create_final_visualizations(
                client, epoch_list, loss_list, metrics_list, output_dir
            )

            return {
                "success": True,
                "final_loss": loss,
                "epochs_trained": epoch,
                "target_reached": True
            }

        time.sleep(0.1)  # Simulate training time

    # Training completed
    client.complete_training(epochs, epochs)
    final_loss = initial_loss * (0.95 ** epochs) + 0.005

    # Final visualizations
    create_final_visualizations(
        client, epoch_list, loss_list, metrics_list, output_dir
    )

    return {
        "success": True,
        "final_loss": final_loss,
        "epochs_trained": epochs,
        "target_reached": final_loss < target_loss
    }


def create_final_visualizations(
    client: DashboardClient,
    epochs, losses, metrics_list,
    output_dir: Path
):
    """Create final set of visualizations"""

    # Final training curves
    final_curves = output_dir / "final_training_curves.png"
    if create_training_curve_plot(epochs, losses, metrics_list, final_curves):
        client.add_visualization(
            title="Final Training Curves",
            image_path=f"/outputs/{final_curves.name}",
            viz_type="final_curves"
        )
        client.log_info("Created final training curves")

    # Loss distribution
    loss_dist = output_dir / "loss_distribution.png"
    if create_loss_distribution_plot(losses, loss_dist):
        client.add_visualization(
            title="Loss Distribution",
            image_path=f"/outputs/{loss_dist.name}",
            viz_type="histogram"
        )
        client.log_info("Created loss distribution histogram")


def main():
    parser = argparse.ArgumentParser(description="Ocean ML Training Example")
    parser.add_argument("--epochs", type=int, default=50, help="Number of epochs")
    parser.add_argument("--target-loss", type=float, default=0.01, help="Target loss")
    parser.add_argument("--model", default="FNO", help="Model name")
    parser.add_argument("--dashboard-url", default="http://localhost:3737",
                       help="Dashboard URL")
    parser.add_argument("--output-dir", default="outputs",
                       help="Output directory for visualizations")

    args = parser.parse_args()

    # Create dashboard client
    client = DashboardClient(args.dashboard_url)

    # Check connection
    if not client.ping():
        print(f"Warning: Dashboard not reachable at {args.dashboard_url}")
        print("Continuing anyway, but dashboard won't be updated")

    # Update model info with detailed architecture
    layer_info = [
        {
            "name": "spectral_conv1",
            "type": "SpectralConv2d",
            "params": 49152,
            "input_shape": [64, 64],
            "output_shape": [64, 64]
        },
        {
            "name": "spectral_conv2",
            "type": "SpectralConv2d",
            "params": 49152,
            "input_shape": [64, 64],
            "output_shape": [64, 64]
        },
        {
            "name": "spectral_conv3",
            "type": "SpectralConv2d",
            "params": 49152,
            "input_shape": [64, 64],
            "output_shape": [64, 64]
        },
        {
            "name": "spectral_conv4",
            "type": "SpectralConv2d",
            "params": 49152,
            "input_shape": [64, 64],
            "output_shape": [64, 64]
        },
        {
            "name": "fc",
            "type": "Linear",
            "params": 4096,
            "input_shape": [64],
            "output_shape": [1]
        }
    ]

    client.update_model_info(
        architecture=f"{args.model}-2D",
        params={
            "modes": 12,
            "width": 64,
            "learning_rate": 0.001,
            "batch_size": 32,
            "optimizer": "Adam"
        },
        layer_info=layer_info
    )

    client.log_info(f"Training {args.model} for {args.epochs} epochs")
    client.log_info(f"Target loss: {args.target_loss}")

    # Run training
    output_dir = Path(args.output_dir)
    result = simulate_training(
        client,
        args.epochs,
        args.target_loss,
        output_dir
    )

    # Output result
    print(json.dumps(result, indent=2))

    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
