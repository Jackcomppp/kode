#!/usr/bin/env python3
"""
Ocean Data Loader
Loads and validates ocean data in various formats (HDF5, NetCDF, etc.)
"""

import sys
import json
import argparse
from pathlib import Path
import requests

try:
    import h5py
    HAS_H5PY = True
except ImportError:
    HAS_H5PY = False

try:
    import netCDF4
    HAS_NETCDF = True
except ImportError:
    HAS_NETCDF = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


class OceanDataLoader:
    """Ocean data loader with support for multiple formats"""

    def __init__(self, dashboard_url="http://localhost:3737"):
        self.dashboard_url = dashboard_url
        self.data = None
        self.metadata = {}

    def load_hdf5(self, filepath):
        """Load HDF5 file"""
        if not HAS_H5PY:
            raise ImportError("h5py is required for HDF5 files. Install: pip install h5py")

        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        with h5py.File(filepath, 'r') as f:
            # Get all datasets
            datasets = {}
            variables = []

            def collect_datasets(name, obj):
                if isinstance(obj, h5py.Dataset):
                    datasets[name] = {
                        'shape': obj.shape,
                        'dtype': str(obj.dtype),
                        'size': obj.size
                    }
                    variables.append(name)

            f.visititems(collect_datasets)

            # Get total shape (use first dataset as reference)
            first_dataset = list(datasets.values())[0] if datasets else None
            shape = first_dataset['shape'] if first_dataset else []

            self.metadata = {
                'format': 'HDF5',
                'filepath': str(filepath),
                'variables': variables,
                'datasets': datasets,
                'shape': list(shape),
                'loaded': True
            }

        return self.metadata

    def load_netcdf(self, filepath):
        """Load NetCDF file"""
        if not HAS_NETCDF:
            raise ImportError("netCDF4 is required. Install: pip install netCDF4")

        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        with netCDF4.Dataset(filepath, 'r') as ds:
            variables = list(ds.variables.keys())
            dimensions = {name: len(dim) for name, dim in ds.dimensions.items()}

            self.metadata = {
                'format': 'NetCDF',
                'filepath': str(filepath),
                'variables': variables,
                'dimensions': dimensions,
                'shape': list(dimensions.values()),
                'loaded': True
            }

        return self.metadata

    def load(self, filepath):
        """Auto-detect format and load data"""
        filepath = Path(filepath)
        suffix = filepath.suffix.lower()

        if suffix in ['.h5', '.hdf5', '.hdf']:
            return self.load_hdf5(filepath)
        elif suffix in ['.nc', '.nc4', '.netcdf']:
            return self.load_netcdf(filepath)
        else:
            raise ValueError(f"Unsupported file format: {suffix}")

    def update_dashboard(self):
        """Update dashboard with data info"""
        try:
            response = requests.post(
                f"{self.dashboard_url}/api/data/info",
                json=self.metadata,
                timeout=5
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Warning: Failed to update dashboard: {e}", file=sys.stderr)
            return False

    def add_log(self, message, level='info'):
        """Add log to dashboard"""
        try:
            requests.post(
                f"{self.dashboard_url}/api/log",
                json={'level': level, 'message': message},
                timeout=5
            )
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description='Load ocean data')
    parser.add_argument('filepath', help='Path to data file')
    parser.add_argument('--dashboard-url', default='http://localhost:3737',
                       help='Dashboard URL (default: http://localhost:3737)')
    parser.add_argument('--format', choices=['hdf5', 'netcdf', 'auto'], default='auto',
                       help='File format (default: auto-detect)')
    parser.add_argument('--output', help='Output JSON file for metadata')

    args = parser.parse_args()

    try:
        loader = OceanDataLoader(dashboard_url=args.dashboard_url)
        loader.add_log(f"Loading data from {args.filepath}")

        # Load data
        if args.format == 'auto':
            metadata = loader.load(args.filepath)
        elif args.format == 'hdf5':
            metadata = loader.load_hdf5(args.filepath)
        elif args.format == 'netcdf':
            metadata = loader.load_netcdf(args.filepath)

        loader.add_log(f"Data loaded successfully: {metadata['format']}", 'info')

        # Update dashboard
        loader.update_dashboard()

        # Output metadata as JSON
        output_data = {
            'success': True,
            'metadata': metadata
        }

        if args.output:
            with open(args.output, 'w') as f:
                json.dump(output_data, f, indent=2)
        else:
            print(json.dumps(output_data, indent=2))

        return 0

    except Exception as e:
        error_data = {
            'success': False,
            'error': str(e)
        }

        if 'loader' in locals():
            loader.add_log(f"Error loading data: {e}", 'error')

        print(json.dumps(error_data, indent=2))
        return 1


if __name__ == '__main__':
    sys.exit(main())
