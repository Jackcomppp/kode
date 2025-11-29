
import json
import sys
import os
import numpy as np

input_path = "D:/tmp/ERA5wind_vo_128_128_subset_10000.npy"
output_path = "D:/tmp/ERA5wind_vo_preprocessed.npy"
data_type = "era5"
operation = "full"

try:
    # Load data
    if input_path.endswith('.npy'):
        data = np.load(input_path)
    elif input_path.endswith('.npz'):
        npz_file = np.load(input_path)
        data = npz_file[list(npz_file.keys())[0]]
    else:
        raise ValueError("Unsupported file format. Use .npy or .npz")

    original_shape = data.shape

    # Apply preprocessing operations
    if operation in ['normalize', 'full']:
        # Standardization
        mean = data.mean()
        std = data.std()
        data = (data - mean) / std

    if operation in ['filter', 'full']:
        # Simple quality filtering (remove NaN/Inf)
        data = np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0)

    # Create output directory
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Save preprocessed data
    np.save(output_path, data)

    # Metadata
    metadata = {
        'input_path': input_path,
        'output_path': output_path,
        'data_type': data_type,
        'operation': operation,
        'original_shape': list(original_shape),
        'output_shape': list(data.shape),
        'statistics': {
            'mean': float(data.mean()),
            'std': float(data.std()),
            'min': float(data.min()),
            'max': float(data.max())
        }
    }

    if true:
        metadata_path = output_path.replace('.npy', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

    print(json.dumps(metadata, indent=2))

except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
