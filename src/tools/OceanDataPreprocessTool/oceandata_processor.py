#!/usr/bin/env python3
"""
Ocean Data Processor - Python Helper Script
Handles NetCDF and HDF5 file processing for OceanDataPreprocessTool
"""

import sys
import json
import argparse
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

# Check for required libraries
try:
    import xarray as xr
    import netCDF4 as nc4
    HAS_NETCDF = True
except ImportError:
    HAS_NETCDF = False

try:
    import h5py
    HAS_HDF5 = True
except ImportError:
    HAS_HDF5 = False


def check_dependencies() -> Dict[str, bool]:
    """Check if required libraries are available."""
    return {
        'netcdf4': HAS_NETCDF,
        'h5py': HAS_HDF5,
        'numpy': True,  # Always available if this script runs
        'xarray': HAS_NETCDF,
    }


def load_netcdf_metadata(file_path: str) -> Dict[str, Any]:
    """Load NetCDF file metadata."""
    if not HAS_NETCDF:
        return {'error': 'xarray/netCDF4 not installed'}

    try:
        ds = xr.open_dataset(file_path)
        metadata = {
            'variables': list(ds.data_vars.keys()),
            'coordinates': list(ds.coords.keys()),
            'dimensions': dict(ds.dims),
            'attributes': dict(ds.attrs),
            'shape': {var: list(ds[var].shape) for var in ds.data_vars},
            'dtypes': {var: str(ds[var].dtype) for var in ds.data_vars},
        }
        ds.close()
        return metadata
    except Exception as e:
        return {'error': str(e)}


def load_hdf5_metadata(file_path: str) -> Dict[str, Any]:
    """Load HDF5 file metadata."""
    if not HAS_HDF5:
        return {'error': 'h5py not installed'}

    try:
        metadata = {
            'datasets': [],
            'groups': [],
            'attributes': {},
        }

        with h5py.File(file_path, 'r') as f:
            # List all datasets and groups
            def visit_func(name, obj):
                if isinstance(obj, h5py.Dataset):
                    metadata['datasets'].append({
                        'name': name,
                        'shape': obj.shape,
                        'dtype': str(obj.dtype),
                    })
                elif isinstance(obj, h5py.Group):
                    metadata['groups'].append(name)

            f.visititems(visit_func)

            # Get root attributes
            metadata['attributes'] = {k: str(v) for k, v in f.attrs.items()}

        return metadata
    except Exception as e:
        return {'error': str(e)}


def generate_masks_from_netcdf(
    file_path: str,
    variable_name: str,
    missing_ratio_range: Tuple[float, float] = (0.1, 0.6),
    mask_count: int = 360,
    land_threshold: int = None,
) -> Dict[str, Any]:
    """
    Generate land mask and cloud masks from NetCDF file (JAXA-style processing).

    Args:
        file_path: Path to NetCDF file
        variable_name: Variable to process (e.g., 'sst')
        missing_ratio_range: Valid missing ratio range [min, max]
        mask_count: Number of masks to generate
        land_threshold: Threshold for land mask (frames all NaN)

    Returns:
        Dictionary with land_mask, cloud_masks, and statistics
    """
    if not HAS_NETCDF:
        return {'error': 'xarray not installed'}

    try:
        ds = xr.open_dataset(file_path)

        if variable_name not in ds:
            return {'error': f'Variable {variable_name} not found. Available: {list(ds.data_vars.keys())}'}

        data = ds[variable_name].values  # Shape: (time, lat, lon) or (time, y, x)

        if len(data.shape) != 3:
            return {'error': f'Expected 3D data (time, lat, lon), got shape {data.shape}'}

        n_frames, height, width = data.shape

        # Step 1: Generate land mask (pixels that are always NaN)
        land_mask = np.all(np.isnan(data), axis=0)  # Shape: (height, width)
        land_pixel_count = np.sum(land_mask)

        # Step 2: Generate cloud masks (frames with valid missing ratios)
        cloud_masks = []
        valid_frames = []

        for t in range(n_frames):
            frame = data[t]

            # Calculate missing ratio for ocean pixels only (exclude land)
            ocean_mask = ~land_mask
            ocean_pixels = ocean_mask.sum()

            if ocean_pixels == 0:
                continue

            # Missing pixels in ocean area
            missing_in_ocean = np.isnan(frame) & ocean_mask
            missing_ratio = missing_in_ocean.sum() / ocean_pixels

            # Check if within valid range
            if missing_ratio_range[0] <= missing_ratio <= missing_ratio_range[1]:
                valid_frames.append(t)
                cloud_masks.append(missing_in_ocean)

                if len(cloud_masks) >= mask_count:
                    break

        # Convert to numpy arrays
        cloud_masks_array = np.array(cloud_masks, dtype=bool) if cloud_masks else None

        result = {
            'land_mask': land_mask.tolist(),
            'cloud_masks_count': len(cloud_masks),
            'valid_frames': valid_frames,
            'statistics': {
                'total_frames': n_frames,
                'valid_frames_count': len(valid_frames),
                'land_pixel_count': int(land_pixel_count),
                'ocean_pixel_count': int((~land_mask).sum()),
                'grid_shape': [height, width],
                'missing_ratios': [
                    float((np.isnan(data[t]) & ~land_mask).sum() / (~land_mask).sum())
                    for t in valid_frames[:10]  # First 10 for preview
                ]
            }
        }

        ds.close()
        return result

    except Exception as e:
        return {'error': str(e)}


def apply_masks_to_netcdf(
    file_path: str,
    variable_name: str,
    mask_file_path: str,
    output_path: str,
    latitude_range: Optional[Tuple[float, float]] = None,
    longitude_range: Optional[Tuple[float, float]] = None,
    target_grid: Optional[Tuple[int, int]] = None,
) -> Dict[str, Any]:
    """
    Apply masks to NetCDF data and create training pairs.

    Args:
        file_path: Path to NetCDF file (e.g., OSTIA)
        variable_name: Variable to process
        mask_file_path: Path to .npy file containing masks
        output_path: Path to output HDF5 file
        latitude_range: Optional [min, max] latitude
        longitude_range: Optional [min, max] longitude
        target_grid: Optional [height, width] target grid

    Returns:
        Dictionary with processing statistics
    """
    if not HAS_NETCDF or not HAS_HDF5:
        return {'error': 'Required libraries not installed'}

    try:
        # Load NetCDF data
        ds = xr.open_dataset(file_path)

        if variable_name not in ds:
            return {'error': f'Variable {variable_name} not found'}

        # Extract spatial subset if specified
        if latitude_range or longitude_range:
            lat_name = 'lat' if 'lat' in ds.coords else 'latitude'
            lon_name = 'lon' if 'lon' in ds.coords else 'longitude'

            if latitude_range:
                ds = ds.sel({lat_name: slice(latitude_range[0], latitude_range[1])})
            if longitude_range:
                ds = ds.sel({lon_name: slice(longitude_range[0], longitude_range[1])})

        data = ds[variable_name].values

        # Get coordinates
        lat_name = 'lat' if 'lat' in ds.coords else 'latitude'
        lon_name = 'lon' if 'lon' in ds.coords else 'longitude'
        latitudes = ds[lat_name].values
        longitudes = ds[lon_name].values

        # Get time if available
        times = ds['time'].values if 'time' in ds.coords else None

        # Load masks
        masks_data = np.load(mask_file_path)
        if masks_data.dtype == object:
            # Handle nested structure
            land_mask = masks_data.item().get('land_mask')
            cloud_masks = masks_data.item().get('cloud_masks')
        else:
            # Assume it's just the cloud masks array
            cloud_masks = masks_data
            land_mask = None

        # Align grid if necessary
        if target_grid and data.shape[-2:] != target_grid:
            # Simple nearest-neighbor interpolation
            from scipy.ndimage import zoom
            zoom_factors = [1] + [target_grid[i] / data.shape[i+1] for i in range(2)]
            data = zoom(data, zoom_factors, order=1)

            # Also interpolate coordinates
            latitudes = zoom(latitudes, target_grid[0] / len(latitudes), order=1)
            longitudes = zoom(longitudes, target_grid[1] / len(longitudes), order=1)

        # Create training pairs
        n_frames = min(data.shape[0], cloud_masks.shape[0])

        input_sst = np.copy(data[:n_frames])
        ground_truth_sst = data[:n_frames]
        effective_cloud_mask = cloud_masks[:n_frames]

        # Apply masks to input
        for t in range(n_frames):
            input_sst[t][effective_cloud_mask[t]] = np.nan

        # Save to HDF5
        with h5py.File(output_path, 'w') as f:
            f.create_dataset('input_sst', data=input_sst, compression='gzip')
            f.create_dataset('ground_truth_sst', data=ground_truth_sst, compression='gzip')
            f.create_dataset('effective_cloud_mask', data=effective_cloud_mask.astype(np.uint8), compression='gzip')

            if land_mask is not None:
                f.create_dataset('land_mask', data=land_mask.astype(np.uint8), compression='gzip')

            f.create_dataset('latitude', data=latitudes)
            f.create_dataset('longitude', data=longitudes)

            if times is not None:
                f.create_dataset('time', data=times[:n_frames])

            # Add metadata
            f.attrs['description'] = 'Ocean SST training pairs with cloud masks'
            f.attrs['variable_name'] = variable_name
            f.attrs['n_frames'] = n_frames
            f.attrs['grid_shape'] = data.shape[-2:]

        ds.close()

        return {
            'success': True,
            'output_path': output_path,
            'n_frames': n_frames,
            'grid_shape': list(data.shape[-2:]),
            'input_nan_ratio': float(np.isnan(input_sst).sum() / input_sst.size),
        }

    except Exception as e:
        return {'error': str(e), 'traceback': __import__('traceback').format_exc()}


def merge_netcdf_files(
    file_paths: List[str],
    output_path: str,
    time_dim: str = 'time',
) -> Dict[str, Any]:
    """
    Merge multiple NetCDF files along time dimension.

    Args:
        file_paths: List of NetCDF file paths
        output_path: Output merged NetCDF file path
        time_dim: Name of time dimension

    Returns:
        Dictionary with merge statistics
    """
    if not HAS_NETCDF:
        return {'error': 'xarray not installed'}

    try:
        # Open all datasets
        datasets = [xr.open_dataset(fp) for fp in file_paths]

        # Concatenate along time dimension
        merged = xr.concat(datasets, dim=time_dim)

        # Sort by time
        merged = merged.sortby(time_dim)

        # Save to file
        merged.to_netcdf(output_path)

        # Close datasets
        for ds in datasets:
            ds.close()
        merged.close()

        return {
            'success': True,
            'output_path': output_path,
            'n_files_merged': len(file_paths),
            'time_range': [str(merged[time_dim].values[0]), str(merged[time_dim].values[-1])],
        }

    except Exception as e:
        return {'error': str(e)}


def calculate_statistics_netcdf(
    file_path: str,
    variable_name: str,
) -> Dict[str, Any]:
    """Calculate statistics for NetCDF variable."""
    if not HAS_NETCDF:
        return {'error': 'xarray not installed'}

    try:
        ds = xr.open_dataset(file_path)

        if variable_name not in ds:
            return {'error': f'Variable {variable_name} not found'}

        data = ds[variable_name].values

        # Calculate statistics (ignoring NaN)
        stats = {
            'mean': float(np.nanmean(data)),
            'std': float(np.nanstd(data)),
            'min': float(np.nanmin(data)),
            'max': float(np.nanmax(data)),
            'median': float(np.nanmedian(data)),
            'nan_count': int(np.isnan(data).sum()),
            'nan_ratio': float(np.isnan(data).sum() / data.size),
            'total_count': int(data.size),
            'shape': list(data.shape),
        }

        ds.close()
        return stats

    except Exception as e:
        return {'error': str(e)}


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description='Ocean Data Processor')
    parser.add_argument('command', choices=[
        'check_deps',
        'load_metadata',
        'generate_masks',
        'apply_masks',
        'merge_files',
        'calculate_stats',
    ])
    parser.add_argument('--file', help='Input file path')
    parser.add_argument('--output', help='Output file path')
    parser.add_argument('--variable', help='Variable name')
    parser.add_argument('--mask-file', help='Mask file path')
    parser.add_argument('--params', help='JSON parameters')
    parser.add_argument('--files', nargs='+', help='Multiple input files')

    args = parser.parse_args()

    result = {}

    if args.command == 'check_deps':
        result = check_dependencies()

    elif args.command == 'load_metadata':
        if not args.file:
            result = {'error': '--file required'}
        else:
            ext = Path(args.file).suffix.lower()
            if ext == '.nc':
                result = load_netcdf_metadata(args.file)
            elif ext in ['.h5', '.hdf5']:
                result = load_hdf5_metadata(args.file)
            else:
                result = {'error': f'Unsupported format: {ext}'}

    elif args.command == 'generate_masks':
        if not args.file or not args.variable:
            result = {'error': '--file and --variable required'}
        else:
            params = json.loads(args.params) if args.params else {}
            result = generate_masks_from_netcdf(
                args.file,
                args.variable,
                missing_ratio_range=params.get('missing_ratio_range', [0.1, 0.6]),
                mask_count=params.get('mask_count', 360),
                land_threshold=params.get('land_threshold'),
            )

    elif args.command == 'apply_masks':
        if not args.file or not args.variable or not args.mask_file or not args.output:
            result = {'error': '--file, --variable, --mask-file, and --output required'}
        else:
            params = json.loads(args.params) if args.params else {}
            result = apply_masks_to_netcdf(
                args.file,
                args.variable,
                args.mask_file,
                args.output,
                latitude_range=params.get('latitude_range'),
                longitude_range=params.get('longitude_range'),
                target_grid=params.get('target_grid'),
            )

    elif args.command == 'merge_files':
        if not args.files or not args.output:
            result = {'error': '--files and --output required'}
        else:
            params = json.loads(args.params) if args.params else {}
            result = merge_netcdf_files(
                args.files,
                args.output,
                time_dim=params.get('time_dim', 'time'),
            )

    elif args.command == 'calculate_stats':
        if not args.file or not args.variable:
            result = {'error': '--file and --variable required'}
        else:
            result = calculate_statistics_netcdf(args.file, args.variable)

    # Output result as JSON
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
