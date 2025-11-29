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
	forecastor_type: z.enum(['ddpm', 'resshift', 'base']).describe(
		'Forecastor type: ddpm (Denoising Diffusion), resshift (Residual Shift), base (Basic forecasting)'
	),
	operation: z.enum(['forecast', 'sample', 'configure']).default('forecast').describe(
		'Operation: forecast (generate predictions), sample (generate samples), configure (show settings)'
	),
	model_path: z.string().optional().describe('Path to trained model checkpoint'),
	input_data: z.string().optional().describe('Path to input low-resolution data'),
	output_path: z.string().optional().describe('Output path for forecasted results'),
	num_samples: z.number().default(1).describe('Number of forecast samples to generate'),
	diffusion_steps: z.number().default(1000).describe('Number of diffusion steps (for DDPM/ResShift)'),
	guidance_scale: z.number().default(1.0).describe('Classifier-free guidance scale'),
	temperature: z.number().default(1.0).describe('Sampling temperature'),
	seed: z.number().optional().describe('Random seed for reproducibility'),
})

type Input = z.infer<typeof inputSchema>

type Output = {
	result: string
	durationMs: number
}

const DESCRIPTION = `Generate super-resolution forecasts using DiffSR diffusion models.

Forecastor types:
- ddpm: Denoising Diffusion Probabilistic Model
  * High quality, iterative refinement
  * Typically 1000 diffusion steps
  * Slower but better results

- resshift: Residual Shift Diffusion
  * Fast sampling, efficient
  * Typically 50 steps
  * Good quality with speed

- base: Basic forecasting
  * Deterministic, single-step
  * Fast inference
  * No diffusion process

Operations:
- forecast: Generate super-resolution predictions
- sample: Generate multiple samples for uncertainty quantification
- configure: Display forecastor configuration

Features:
- Multiple sample generation for uncertainty estimation
- Configurable diffusion steps
- Guidance scale control
- Temperature sampling
- Reproducible with seed

Example usage:
{
  "forecastor_type": "resshift",
  "operation": "forecast",
  "model_path": "models/resshift_ocean.pth",
  "input_data": "data/lr_ocean.npy",
  "output_path": "outputs/forecast.npy",
  "num_samples": 5,
  "diffusion_steps": 50
}`

export const DiffSRForecastorTool = {
	name: 'DiffSRForecastor',
	async description() {
		return DESCRIPTION
	},
	userFacingName() {
		return 'DiffSR Forecastor'
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
		return `${input.operation} with ${input.forecastor_type}${verbose ? ` (samples: ${input.num_samples}, steps: ${input.diffusion_steps})` : ''}`
	},
	renderToolResultMessage(output: Output) {
		return (
			<Box flexDirection="column">
				<Text color="green">Forecastor operation complete ({output.durationMs}ms)</Text>
			</Box>
		)
	},
	renderResultForAssistant(output: Output) {
		return output.result
	},
	async *call(params: Input, { abortController }: { abortController: AbortController }) {
		const start = Date.now()

		try {
			const { operation, forecastor_type } = params

			if (operation === 'configure') {
				const config = {
					forecastor: forecastor_type,
					capabilities: {
						ddpm: {
							description: 'Denoising Diffusion Probabilistic Model for SR',
							features: ['Iterative denoising', 'High quality', 'Slow sampling'],
							typical_steps: 1000,
						},
						resshift: {
							description: 'Residual Shift Diffusion Model',
							features: ['Fast sampling', 'Residual learning', 'Efficient'],
							typical_steps: 50,
						},
						base: {
							description: 'Basic forecasting without diffusion',
							features: ['Fast', 'Deterministic', 'Simple'],
							typical_steps: 1,
						},
					}[forecastor_type],
					parameters: {
						num_samples: params.num_samples,
						diffusion_steps: params.diffusion_steps,
						guidance_scale: params.guidance_scale,
						temperature: params.temperature,
					},
				}

				const output: Output = {
					result: JSON.stringify(config, null, 2),
					durationMs: Date.now() - start,
				}

				yield {
					type: 'result' as const,
					resultForAssistant: this.renderResultForAssistant(output),
					data: output,
				}
				return
			}

			const seedValue = params.seed !== undefined ? params.seed : 'None'
			const pythonScript = `
import sys
import json
import numpy as np
import torch
from pathlib import Path

forecastor_type = "${forecastor_type}"
operation = "${operation}"
model_path = "${params.model_path?.replace(/\\/g, '/') || ''}"
input_data = "${params.input_data?.replace(/\\/g, '/') || ''}"
output_path = "${params.output_path?.replace(/\\/g, '/') || ''}"
num_samples = ${params.num_samples}
diffusion_steps = ${params.diffusion_steps}
guidance_scale = ${params.guidance_scale}
temperature = ${params.temperature}
seed = ${seedValue}

try:
    if seed != 'None':
        torch.manual_seed(int(seed))
        np.random.seed(int(seed))

    result = {
        'forecastor': forecastor_type,
        'operation': operation,
        'num_samples': num_samples,
    }

    if operation in ['forecast', 'sample']:
        if not model_path:
            raise ValueError('model_path required for forecasting')
        if not input_data:
            raise ValueError('input_data required for forecasting')

        # Load input data
        if Path(input_data).suffix == '.npy':
            lr_data = np.load(input_data)
        else:
            raise ValueError('Only .npy format supported')

        result['input_shape'] = lr_data.shape
        result['diffusion_steps'] = diffusion_steps
        result['guidance_scale'] = guidance_scale

        # Simulate forecasting (actual implementation would load model and run)
        result['message'] = f'{forecastor_type} forecasting configured. Integrate with DiffSR forecastors for full implementation.'

        if output_path:
            result['output_path'] = output_path
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    print(json.dumps(result, indent=2))

except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`

			const tempScript = path.join(getCwd(), '.diffsr_forecastor_temp.py')
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
				result: stdout || `${operation} completed successfully`,
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
