import { Box, Text } from 'ink'
import React from 'react'
import { z } from 'zod'
import { Tool } from '../../Tool.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { getCwd } from '@utils/state'

const execAsync = promisify(exec)

const inputSchema = z.strictObject({
	dataset_type: z.enum(['ocean', 'era5', 'era5_temperature', 'era5_wind', 'ns2d']).describe(
		'Dataset type: ocean (ocean SST), era5 (ERA5 combined), era5_temperature, era5_wind, ns2d (2D turbulence)'
	),
	data_path: z.string().describe('Path to input data file'),
	output_path: z.string().optional().describe('Output path for processed dataset'),
	scale_factor: z.number().default(4).describe('Downsampling scale factor (2, 4, 8)'),
	operation: z.enum(['prepare', 'validate', 'statistics']).default('prepare').describe(
		'Operation: prepare (create dataset), validate (check), statistics (analyze)'
	),
	train_ratio: z.number().default(0.8).describe('Training data ratio (0-1)'),
	normalize: z.boolean().default(true).describe('Apply normalization'),
})

type Input = z.infer<typeof inputSchema>

type Output = {
	result: string
	durationMs: number
}

const DESCRIPTION = `Prepare and manage datasets for DiffSR super-resolution models.

Supports multiple dataset types:
- ocean: Ocean SST data
- era5: ERA5 atmospheric reanalysis
- era5_temperature: ERA5 temperature fields
- era5_wind: ERA5 wind fields
- ns2d: 2D Navier-Stokes turbulence

Operations:
- prepare: Create high-res/low-res training pairs
- validate: Check dataset compatibility
- statistics: Compute dataset statistics

Example usage:
{
  "dataset_type": "ocean",
  "data_path": "ocean_data.npy",
  "output_path": "datasets/ocean_prepared",
  "scale_factor": 4,
  "operation": "prepare"
}`

export const DiffSRDatasetTool = {
	name: 'DiffSRDataset',
	async description() {
		return DESCRIPTION
	},
	userFacingName() {
		return 'DiffSR Dataset'
	},
	inputSchema,
	async isEnabled() {
		return true
	},
	isReadOnly() {
		return false
	},
	isConcurrencySafe() {
		return false
	},
	needsPermissions() {
		return true
	},
	async prompt() {
		return DESCRIPTION
	},
	renderToolUseMessage(input: Input, { verbose }: { verbose: boolean }) {
		return `${input.operation} ${input.dataset_type} dataset: ${input.data_path}${verbose ? ` (scale: ${input.scale_factor})` : ''}`
	},
	renderToolResultMessage(output: Output) {
		return (
			<Box flexDirection="column">
				<Text color="green">Dataset operation complete ({output.durationMs}ms)</Text>
			</Box>
		)
	},
	renderResultForAssistant(output: Output) {
		return output.result
	},
	async *call(params: Input, { abortController }: { abortController: AbortController }) {
		const start = Date.now()

		try {
			const pythonScript = `
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

    # Generate low-res version
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
data_path = "${params.data_path.replace(/\\/g, '/')}"
output_path = "${params.output_path?.replace(/\\/g, '/') || ''}"
operation = "${params.operation}"
scale_factor = ${params.scale_factor}
train_ratio = ${params.train_ratio}
normalize = ${params.normalize}

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
                'dataset_type': '${params.dataset_type}',
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
`

			const tempScript = path.join(getCwd(), '.diffsr_dataset_temp.py')
			const fs = await import('fs/promises')
			await fs.writeFile(tempScript, pythonScript)

			const { stdout, stderr } = await execAsync(`python "${tempScript}"`, {
				maxBuffer: 10 * 1024 * 1024,
			})

			await fs.unlink(tempScript)

			if (stderr && !stdout) {
				throw new Error(stderr)
			}

			const output: Output = {
				result: stdout || 'Dataset processed successfully',
				durationMs: Date.now() - start,
			}

			yield {
				type: 'result' as const,
				resultForAssistant: this.renderResultForAssistant(output),
				data: output,
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			const output: Output = {
				result: `Error processing dataset: ${errorMessage}`,
				durationMs: Date.now() - start,
			}
			yield {
				type: 'result' as const,
				resultForAssistant: this.renderResultForAssistant(output),
				data: output,
			}
		}
	},
} satisfies Tool<typeof inputSchema, Output>
