
import sys
import numpy as np
import json
from pathlib import Path

def load_data(file_path):
    """Load data from various formats"""
    ext = Path(file_path).suffix.lower()
    if ext == '.npy':
        return np.load(file_path)
    elif ext == '.npz':
        data = np.load(file_path)
        return data[list(data.keys())[0]]
    else:
        raise ValueError(f"Unsupported format: {ext}")

def prepare_dataset(data, scale_factor, train_ratio, normalize):
    """Prepare high-res and low-res pairs"""
    from scipy.ndimage import zoom

    # Generate low-res version (handle 4D data: N, H, W, C)
    if len(data.shape) == 4:
        lr_data = zoom(data, (1, 1/scale_factor, 1/scale_factor, 1), order=3)
    else:
        lr_data = zoom(data, (1, 1/scale_factor, 1/scale_factor), order=3)

    # Split train/test
    n_samples = data.shape[0]
    n_train = int(n_samples * train_ratio)

    hr_train, hr_test = data[:n_train], data[n_train:]
    lr_train, lr_test = lr_data[:n_train], lr_data[n_train:]

    # Normalize if needed
    if normalize:
        mean, std = hr_train.mean(), hr_train.std()
        hr_train = (hr_train - mean) / std
        hr_test = (hr_test - mean) / std
        lr_train = (lr_train - mean) / std
        lr_test = (lr_test - mean) / std
    else:
        mean, std = 0, 1

    return {
        'hr_train': hr_train, 'lr_train': lr_train,
        'hr_test': hr_test, 'lr_test': lr_test,
        'mean': float(mean), 'std': float(std),
        'scale_factor': scale_factor
    }

def compute_statistics(data):
    """Compute dataset statistics"""
    return {
        'shape': data.shape,
        'dtype': str(data.dtype),
        'min': float(data.min()),
        'max': float(data.max()),
        'mean': float(data.mean()),
        'std': float(data.std()),
        'size_mb': data.nbytes / (1024**2)
    }

# Main execution
data_path = "D:/tmp/ERA5wind_vo_128_128_subset_10000.npy"
output_path = "D:/tmp/era5_wind_prepared"
operation = "prepare"
scale_factor = 4
train_ratio = 0.8
normalize = True

try:
    data = load_data(data_path)

    if operation == 'statistics':
        stats = compute_statistics(data)
        print(json.dumps(stats, indent=2))

    elif operation == 'validate':
        stats = compute_statistics(data)
        valid = (
            len(data.shape) == 3 and
            data.shape[1] == data.shape[2] and
            data.shape[1] % scale_factor == 0
        )
        result = {'valid': valid, 'stats': stats}
        print(json.dumps(result, indent=2))

    elif operation == 'prepare':
        dataset = prepare_dataset(data, scale_factor, train_ratio, normalize)

        if output_path:
            output_dir = Path(output_path)
            output_dir.mkdir(parents=True, exist_ok=True)

            np.save(output_dir / 'hr_train.npy', dataset['hr_train'])
            np.save(output_dir / 'lr_train.npy', dataset['lr_train'])
            np.save(output_dir / 'hr_test.npy', dataset['hr_test'])
            np.save(output_dir / 'lr_test.npy', dataset['lr_test'])

            metadata = {
                'dataset_type': 'era5_wind',
                'scale_factor': dataset['scale_factor'],
                'mean': dataset['mean'],
                'std': dataset['std'],
                'train_samples': int(dataset['hr_train'].shape[0]),
                'test_samples': int(dataset['hr_test'].shape[0]),
                'hr_shape': dataset['hr_train'].shape[1:],
                'lr_shape': dataset['lr_train'].shape[1:]
            }

            with open(output_dir / 'metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)

            print(json.dumps(metadata, indent=2))
        else:
            print(json.dumps({
                'train_samples': int(dataset['hr_train'].shape[0]),
                'test_samples': int(dataset['hr_test'].shape[0])
            }, indent=2))

except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
