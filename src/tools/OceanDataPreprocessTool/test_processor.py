#!/usr/bin/env python3
"""
Test script for oceandata_processor.py
Tests all major functionality with sample data
"""

import sys
import json
import tempfile
import numpy as np
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from oceandata_processor import (
        check_dependencies,
        generate_masks_from_netcdf,
        apply_masks_to_netcdf,
        merge_netcdf_files,
        calculate_statistics_netcdf,
        load_netcdf_metadata,
        load_hdf5_metadata,
    )
    HAS_MODULE = True
except ImportError as e:
    print(f"Failed to import oceandata_processor: {e}")
    HAS_MODULE = False


def test_dependencies():
    """Test 1: Check dependencies"""
    print("\n" + "="*60)
    print("Test 1: Checking Python Dependencies")
    print("="*60)

    deps = check_dependencies()
    print(json.dumps(deps, indent=2))

    missing = [k for k, v in deps.items() if not v]
    if missing:
        print(f"\n⚠️  Missing dependencies: {', '.join(missing)}")
        print("\nTo install missing dependencies:")
        print("  pip install xarray netCDF4 h5py numpy scipy")
        return False
    else:
        print("\n✅ All dependencies installed!")
        return True


def test_create_sample_netcdf():
    """Test 2: Create sample NetCDF file for testing"""
    print("\n" + "="*60)
    print("Test 2: Creating Sample NetCDF File")
    print("="*60)

    try:
        import xarray as xr
        import numpy as np

        # Create sample data (simplified JAXA-style)
        n_time = 50
        n_lat = 100
        n_lon = 80

        # Create coordinates
        time = np.arange(n_time)
        lat = np.linspace(15.0, 24.0, n_lat)
        lon = np.linspace(111.0, 118.0, n_lon)

        # Create SST data with some missing values (simulating clouds)
        sst = np.random.uniform(290, 305, (n_time, n_lat, n_lon))  # Kelvin

        # Add land mask (always NaN in certain areas)
        land_indices = (lat[:, None] < 16.5) & (lon[None, :] < 112.5)
        sst[:, land_indices] = np.nan

        # Add cloud cover (random missing data)
        np.random.seed(42)
        for t in range(n_time):
            # Random cloud coverage 10-60%
            missing_ratio = np.random.uniform(0.1, 0.6)
            ocean_pixels = ~np.isnan(sst[0])  # Use first frame to identify ocean
            n_ocean = ocean_pixels.sum()
            n_missing = int(n_ocean * missing_ratio)

            # Randomly select pixels to mask
            ocean_coords = np.argwhere(ocean_pixels)
            missing_coords = ocean_coords[np.random.choice(len(ocean_coords), n_missing, replace=False)]

            for i, j in missing_coords:
                sst[t, i, j] = np.nan

        # Create dataset
        ds = xr.Dataset(
            {
                'sst': (['time', 'lat', 'lon'], sst),
            },
            coords={
                'time': time,
                'lat': lat,
                'lon': lon,
            },
            attrs={
                'description': 'Sample JAXA-style SST data with cloud cover',
                'units': 'Kelvin',
            }
        )

        # Save to temporary file
        temp_dir = tempfile.gettempdir()
        sample_file = Path(temp_dir) / 'sample_jaxa_sst.nc'
        ds.to_netcdf(sample_file)
        ds.close()

        print(f"✅ Created sample file: {sample_file}")
        print(f"   Shape: {sst.shape}")
        print(f"   Time frames: {n_time}")
        print(f"   Grid: {n_lat} x {n_lon}")
        print(f"   Overall NaN ratio: {np.isnan(sst).sum() / sst.size:.2%}")

        return str(sample_file)

    except Exception as e:
        print(f"❌ Failed to create sample NetCDF: {e}")
        return None


def test_load_metadata(sample_file):
    """Test 3: Load metadata from NetCDF file"""
    print("\n" + "="*60)
    print("Test 3: Loading NetCDF Metadata")
    print("="*60)

    try:
        metadata = load_netcdf_metadata(sample_file)

        if 'error' in metadata:
            print(f"❌ Error loading metadata: {metadata['error']}")
            return False

        print("✅ Metadata loaded successfully:")
        print(f"   Variables: {metadata.get('variables', [])}")
        print(f"   Coordinates: {metadata.get('coordinates', [])}")
        print(f"   Dimensions: {metadata.get('dimensions', {})}")
        print(f"   SST shape: {metadata.get('shape', {}).get('sst', 'N/A')}")

        return True

    except Exception as e:
        print(f"❌ Failed to load metadata: {e}")
        return False


def test_generate_masks(sample_file):
    """Test 4: Generate masks from sample data"""
    print("\n" + "="*60)
    print("Test 4: Generating Masks from Sample Data")
    print("="*60)

    try:
        result = generate_masks_from_netcdf(
            sample_file,
            'sst',
            missing_ratio_range=(0.1, 0.6),
            mask_count=20,  # Generate 20 masks for testing
        )

        if 'error' in result:
            print(f"❌ Error generating masks: {result['error']}")
            return None

        stats = result.get('statistics', {})

        print("✅ Masks generated successfully:")
        print(f"   Total frames scanned: {stats.get('total_frames', 0)}")
        print(f"   Valid frames found: {stats.get('valid_frames_count', 0)}")
        print(f"   Cloud masks generated: {result.get('cloud_masks_count', 0)}")
        print(f"   Land pixels: {stats.get('land_pixel_count', 0)}")
        print(f"   Ocean pixels: {stats.get('ocean_pixel_count', 0)}")
        print(f"   Grid shape: {stats.get('grid_shape', [])}")

        if 'missing_ratios' in stats and stats['missing_ratios']:
            print(f"   Sample missing ratios: {[f'{r:.2%}' for r in stats['missing_ratios'][:5]]}")

        # Save masks to file
        temp_dir = tempfile.gettempdir()
        mask_file = Path(temp_dir) / 'sample_masks.npy'

        # Create a simple mask structure
        mask_data = {
            'land_mask': np.array(result.get('land_mask', [])),
            'cloud_masks': np.random.rand(result['cloud_masks_count'], *stats['grid_shape']) > 0.7,
            'valid_frames': result.get('valid_frames', []),
            'statistics': stats,
        }

        np.save(mask_file, mask_data)
        print(f"   Saved masks to: {mask_file}")

        return str(mask_file)

    except Exception as e:
        print(f"❌ Failed to generate masks: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_calculate_stats(sample_file):
    """Test 5: Calculate statistics"""
    print("\n" + "="*60)
    print("Test 5: Calculating Statistics")
    print("="*60)

    try:
        stats = calculate_statistics_netcdf(sample_file, 'sst')

        if 'error' in stats:
            print(f"❌ Error calculating statistics: {stats['error']}")
            return False

        print("✅ Statistics calculated successfully:")
        print(f"   Mean: {stats.get('mean', 0):.2f}")
        print(f"   Std: {stats.get('std', 0):.2f}")
        print(f"   Min: {stats.get('min', 0):.2f}")
        print(f"   Max: {stats.get('max', 0):.2f}")
        print(f"   Median: {stats.get('median', 0):.2f}")
        print(f"   NaN count: {stats.get('nan_count', 0)}")
        print(f"   NaN ratio: {stats.get('nan_ratio', 0):.2%}")
        print(f"   Total count: {stats.get('total_count', 0)}")
        print(f"   Shape: {stats.get('shape', [])}")

        return True

    except Exception as e:
        print(f"❌ Failed to calculate statistics: {e}")
        return False


def test_apply_masks(sample_file, mask_file):
    """Test 6: Apply masks to data"""
    print("\n" + "="*60)
    print("Test 6: Applying Masks to Create Training Pairs")
    print("="*60)

    if not mask_file:
        print("⚠️  Skipping - no mask file available")
        return False

    try:
        temp_dir = tempfile.gettempdir()
        output_file = Path(temp_dir) / 'sample_training_pairs.h5'

        result = apply_masks_to_netcdf(
            sample_file,
            'sst',
            mask_file,
            str(output_file),
            latitude_range=(15.0, 24.0),
            longitude_range=(111.0, 118.0),
        )

        if 'error' in result:
            print(f"❌ Error applying masks: {result['error']}")
            if 'traceback' in result:
                print(result['traceback'])
            return False

        print("✅ Training pairs created successfully:")
        print(f"   Output file: {result.get('output_path', 'N/A')}")
        print(f"   Number of frames: {result.get('n_frames', 0)}")
        print(f"   Grid shape: {result.get('grid_shape', [])}")
        print(f"   Input NaN ratio: {result.get('input_nan_ratio', 0):.2%}")

        # Verify HDF5 file
        try:
            import h5py
            with h5py.File(output_file, 'r') as f:
                print(f"   HDF5 datasets: {list(f.keys())}")
                if 'input_sst' in f:
                    print(f"   input_sst shape: {f['input_sst'].shape}")
                if 'ground_truth_sst' in f:
                    print(f"   ground_truth_sst shape: {f['ground_truth_sst'].shape}")
        except Exception as e:
            print(f"   Warning: Could not verify HDF5 file: {e}")

        return True

    except Exception as e:
        print(f"❌ Failed to apply masks: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "🌊"*30)
    print(" Ocean Data Processor - Test Suite")
    print("🌊"*30)

    if not HAS_MODULE:
        print("\n❌ Cannot run tests - module import failed")
        print("Please ensure oceandata_processor.py is in the same directory")
        return

    # Test 1: Check dependencies
    deps_ok = test_dependencies()

    if not deps_ok:
        print("\n" + "="*60)
        print("⚠️  Cannot proceed with tests - missing dependencies")
        print("="*60)
        return

    # Test 2: Create sample data
    sample_file = test_create_sample_netcdf()
    if not sample_file:
        print("\n❌ Cannot proceed - failed to create sample data")
        return

    # Test 3: Load metadata
    test_load_metadata(sample_file)

    # Test 4: Generate masks
    mask_file = test_generate_masks(sample_file)

    # Test 5: Calculate statistics
    test_calculate_stats(sample_file)

    # Test 6: Apply masks
    test_apply_masks(sample_file, mask_file)

    # Summary
    print("\n" + "="*60)
    print("✅ Test Suite Completed!")
    print("="*60)
    print("\nGenerated test files:")
    print(f"  - Sample NetCDF: {sample_file}")
    if mask_file:
        print(f"  - Sample masks: {mask_file}")

    temp_output = Path(tempfile.gettempdir()) / 'sample_training_pairs.h5'
    if temp_output.exists():
        print(f"  - Training pairs: {temp_output}")

    print("\nYou can inspect these files manually or delete them when done.")
    print("\nNext steps:")
    print("  1. Try with real JAXA/OSTIA data")
    print("  2. Integrate with the TypeScript tool")
    print("  3. Run your ML training pipeline")


if __name__ == '__main__':
    main()
