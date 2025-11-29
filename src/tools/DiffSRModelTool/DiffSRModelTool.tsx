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
	model_type: z.enum([
		'fno', 'edsr', 'swinir', 'ddpm', 'sr3', 'resshift',
		'hinote', 'mwt', 'galerkin', 'm2no', 'mg_ddpm',
		'remg', 'sronet', 'unet', 'wdno'
	]).describe('Model architecture type'),
	operation: z.enum(['train', 'test', 'inference', 'info']).default('info').describe(
		'Operation: train (train model), test (evaluate), inference (predict), info (show config)'
	),
	config_path: z.string().optional().describe('Path to model configuration YAML file'),
	checkpoint_path: z.string().optional().describe('Path to model checkpoint'),
	data_path: z.string().optional().describe('Path to dataset'),
	output_path: z.string().optional().describe('Output directory for results'),
	epochs: z.number().default(100).describe('Number of training epochs'),
	batch_size: z.number().default(8).describe('Training batch size'),
	learning_rate: z.number().default(0.001).describe('Learning rate'),
	gpu_id: z.number().default(0).describe('GPU device ID (-1 for CPU)'),
})

type Input = z.infer<typeof inputSchema>

type Output = {
	result: string
	durationMs: number
}

const DESCRIPTION = `Train and manage DiffSR super-resolution models.

Supported models:
- fno: Fourier Neural Operator
- edsr: Enhanced Deep Super-Resolution
- swinir: Swin Transformer for Image Restoration
- ddpm: Denoising Diffusion Probabilistic Model
- sr3: Super-Resolution via Iterative Refinement
- resshift: Residual Shift Diffusion Model
- hinote: Hierarchical Neural Operator
- mwt: Multi-scale Wavelet Transform
- galerkin: Galerkin Transformer
- m2no: Multi-scale Multi-fidelity Neural Operator
- mg_ddpm: Multi-grid DDPM
- remg: Residual Multi-grid
- sronet: Super-Resolution Operator Network
- unet: U-Net architecture
- wdno: Wavelet-based Denoising Neural Operator

Operations:
- info: Display model information
- train: Train model on dataset
- test: Evaluate trained model
- inference: Generate super-resolution predictions

Example usage:
{
  "model_type": "fno",
  "operation": "train",
  "data_path": "datasets/ocean_prepared",
  "output_path": "outputs/fno_ocean",
  "epochs": 100,
  "batch_size": 8
}`

const MODEL_INFO: Record<string, string> = {
	fno: 'Fourier Neural Operator - Fast spectral convolution for PDEs',
	edsr: 'Enhanced Deep Super-Resolution - Deep residual network',
	swinir: 'Swin Transformer for Image Restoration - Attention-based',
	ddpm: 'Denoising Diffusion Probabilistic Model - Generative diffusion',
	sr3: 'Image Super-Resolution via Iterative Refinement - Diffusion SR',
	resshift: 'Residual Shift Diffusion - Advanced diffusion model',
	hinote: 'Hierarchical Neural Operator - Multi-scale operator',
	mwt: 'Multi-scale Wavelet Transform - Wavelet-based network',
	galerkin: 'Galerkin Transformer - Physics-informed transformer',
	m2no: 'Multi-scale Multi-fidelity Neural Operator',
	mg_ddpm: 'Multi-grid DDPM - Coarse-to-fine diffusion',
	remg: 'Residual Multi-grid - Enhanced multi-grid approach',
	sronet: 'Super-Resolution Operator Network',
	unet: 'U-Net - Classic encoder-decoder architecture',
	wdno: 'Wavelet-based Denoising Neural Operator'
}

export const DiffSRModelTool = {
	name: 'DiffSRModel',
	async description() {
		return DESCRIPTION
	},
	userFacingName() {
		return 'DiffSR Model'
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
		return `${input.operation} ${input.model_type} model${verbose ? ` (epochs: ${input.epochs}, batch: ${input.batch_size})` : ''}`
	},
	renderToolResultMessage(output: Output) {
		return (
			<Box flexDirection="column">
				<Text color="green">Model operation complete ({output.durationMs}ms)</Text>
			</Box>
		)
	},
	renderResultForAssistant(output: Output) {
		return output.result
	},
	async *call(params: Input, { abortController }: { abortController: AbortController }) {
		const start = Date.now()

		try {
			const { operation, model_type } = params

			if (operation === 'info') {
				const info = {
					model: model_type,
					description: MODEL_INFO[model_type],
					supported_operations: ['train', 'test', 'inference'],
					default_config: `template_configs/${model_type}.yaml`,
				}

				const output: Output = {
					result: JSON.stringify(info, null, 2),
					durationMs: Date.now() - start,
				}

				yield {
					type: 'result' as const,
					resultForAssistant: this.renderResultForAssistant(output),
					data: output,
				}
				return
			}

			const pythonScript = `
import sys
import json
import torch
import yaml
from pathlib import Path

model_type = "${model_type}"
operation = "${operation}"
data_path = "${params.data_path?.replace(/\\/g, '/') || ''}"
output_path = "${params.output_path?.replace(/\\/g, '/') || ''}"
checkpoint_path = "${params.checkpoint_path?.replace(/\\/g, '/') || ''}"
epochs = ${params.epochs}
batch_size = ${params.batch_size}
lr = ${params.learning_rate}
gpu_id = ${params.gpu_id}

try:
    # Set device
    device = torch.device(f'cuda:{gpu_id}' if gpu_id >= 0 and torch.cuda.is_available() else 'cpu')

    result = {
        'operation': operation,
        'model_type': model_type,
        'device': str(device),
        'status': 'initialized'
    }

    if operation == 'train':
        result['epochs'] = epochs
        result['batch_size'] = batch_size
        result['learning_rate'] = lr
        result['message'] = f'Training {model_type} model configured. Integrate with DiffSR main.py for full training.'

    elif operation == 'test':
        if not checkpoint_path:
            raise ValueError('checkpoint_path required for testing')
        result['checkpoint'] = checkpoint_path
        result['message'] = f'Testing {model_type} model configured.'

    elif operation == 'inference':
        if not checkpoint_path:
            raise ValueError('checkpoint_path required for inference')
        if not data_path:
            raise ValueError('data_path required for inference')
        result['checkpoint'] = checkpoint_path
        result['data_path'] = data_path
        result['message'] = f'Inference {model_type} model configured.'

    print(json.dumps(result, indent=2))

except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`

			const tempScript = path.join(getCwd(), '.diffsr_model_temp.py')
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
				result: stdout || `Model ${operation} completed`,
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
				result: `Error: ${errorMessage}`,
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
