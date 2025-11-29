#!/usr/bin/env python3
"""
Ocean Visualization Tool
Creates visualizations for ocean data, training curves, and error maps
"""

import sys
import json
import argparse
from pathlib import Path
import requests

try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


class OceanVisualizer:
    def __init__(self, output_dir='./ocean_outputs', dashboard_url='http://localhost:3737'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.dashboard_url = dashboard_url

    def create_training_curve(self, epochs, losses, title='Training Loss Curve'):
        """Create training loss curve"""
        if not HAS_MATPLOTLIB or not HAS_NUMPY:
            raise ImportError("matplotlib and numpy required")

        plt.figure(figsize=(10, 6))
        plt.plot(epochs, losses, 'b-', linewidth=2)
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.title(title)
        plt.grid(True, alpha=0.3)

        output_path = self.output_dir / f'training_curve_{len(epochs)}.png'
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return str(output_path)

    def create_error_map(self, data, title='Error Map'):
        """Create 2D error heatmap"""
        if not HAS_MATPLOTLIB or not HAS_NUMPY:
            raise ImportError("matplotlib and numpy required")

        plt.figure(figsize=(12, 8))
        plt.imshow(data, cmap='RdBu_r', aspect='auto')
        plt.colorbar(label='Error')
        plt.title(title)

        output_path = self.output_dir / f'error_map_{hash(title)}.png'
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return str(output_path)

    def update_dashboard(self, viz_id, viz_type, title, image_path):
        """Update dashboard with visualization"""
        try:
            response = requests.post(
                f"{self.dashboard_url}/api/visualization",
                json={
                    'id': viz_id,
                    'type': viz_type,
                    'title': title,
                    'imagePath': image_path
                },
                timeout=5
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Warning: Failed to update dashboard: {e}", file=sys.stderr)
            return False


def main():
    parser = argparser.ArgumentParser(description='Ocean visualization')
    parser.add_argument('--type', choices=['curve', 'error', 'metric'], required=True)
    parser.add_argument('--data', required=True, help='JSON data for visualization')
    parser.add_argument('--title', default='Visualization')
    parser.add_argument('--output-dir', default='./ocean_outputs')
    parser.add_argument('--dashboard-url', default='http://localhost:3737')

    args = parser.parse_args()

    try:
        visualizer = OceanVisualizer(args.output_dir, args.dashboard_url)
        data = json.loads(args.data)

        if args.type == 'curve':
            image_path = visualizer.create_training_curve(
                data['epochs'], data['losses'], args.title
            )
        elif args.type == 'error':
            image_path = visualizer.create_error_map(
                np.array(data['error_map']), args.title
            )

        # Update dashboard
        visualizer.update_dashboard(
            f'viz_{args.type}_{hash(args.title)}',
            args.type,
            args.title,
            image_path
        )

        result = {
            'success': True,
            'image_path': image_path,
            'type': args.type,
            'title': args.title
        }
        print(json.dumps(result))
        return 0

    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        return 1


if __name__ == '__main__':
    sys.exit(main())
