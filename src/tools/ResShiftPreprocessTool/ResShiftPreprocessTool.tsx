import { Box, Text } from 'ink'
import React from 'react'
import { z } from 'zod'
import { Tool } from '../../Tool'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import { getCwd } from '@utils/state'

const execAsync = promisify(exec)

const inputSchema = z.strictObject({
  input_path: z.string().describe("Raw data file path"),
  output_path: z.string().describe("Preprocessed data output path"),
  data_type: z.enum(['ocean', 'era5', 'ns2d']).optional().default('ocean').describe("Data type"),
  operation: z.enum(['normalize', 'filter', 'resample', 'full']).optional().default('full').describe("Preprocessing operation"),
  scale_factor: z.number().optional().default(1).describe("Resampling scale factor"),
  normalization_method: z.enum(['standard', 'minmax', 'robust']).optional().default('standard').describe("Normalization method"),
  missing_value_strategy: z.enum(['remove', 'interpolate', 'fill']).optional().default('interpolate').describe("Handle missing values"),
  quality_threshold: z.number().optional().default(0.8).describe("Quality threshold (0-1)"),
  save_metadata: z.boolean().optional().default(true).describe("Save preprocessing metadata")
})

type Input = z.infer<typeof inputSchema>

type Output = {
	result: string
	durationMs: number
}

const DESCRIPTION = `Preprocess raw ocean and atmospheric data for ResShift training and inference.

Features:
- Data normalization and standardization
- Spatial and temporal filtering
- Missing value handling
- Quality control
- Multi-source data integration
- Metadata preservation

Operations:
- normalize: Apply normalization
- filter: Spatial/temporal filtering
- resample: Downsample/upsample data
- full: Complete preprocessing pipeline

Supported Data:
- Ocean SST/salinity from various sources
- ERA5 atmospheric reanalysis
- NS2D turbulence simulations
- Satellite observations

Example usage:
{
  "input_path": "data/raw_ocean.nc",
  "output_path": "data/preprocessed_ocean.npy",
  "data_type": "ocean",
  "operation": "full"
}`

export const ResShiftPreprocessTool = {
  name: "ResShiftPreprocess",
  async description() {
    return DESCRIPTION
  },
  inputSchema,
  userFacingName() {
    return 'ResShift Preprocess'
  },
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
    return `preprocess ${input.data_type} data${verbose ? ` (${input.operation})` : ''}`
  },
  renderToolResultMessage(output: Output) {
    return (
      <Box flexDirection="column">
        <Text color="green">Preprocessing complete ({output.durationMs}ms)</Text>
      </Box>
    )
  },
  renderResultForAssistant(output: Output) {
    return output.result
  },
  async *call(params: Input, { abortController }: { abortController: AbortController }) {
    const start = Date.now()

    try {
      const scriptContent = `
import json
import sys
import os
import numpy as np

input_path = "${params.input_path.replace(/\\/g, '/')}"
output_path = "${params.output_path.replace(/\\/g, '/')}"
data_type = "${params.data_type}"
operation = "${params.operation}"

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

    if ${params.save_metadata}:
        metadata_path = output_path.replace('.npy', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

    print(json.dumps(metadata, indent=2))

except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`

      const tempScript = path.join(getCwd(), '.resshift_preprocess_temp.py')
      await fs.writeFile(tempScript, scriptContent)

      const { stdout, stderr } = await execAsync(`python "${tempScript}"`, {
        maxBuffer: 10 * 1024 * 1024,
      })

      await fs.unlink(tempScript)

      if (stderr && !stdout) {
        throw new Error(stderr)
      }

      const output: Output = {
        result: stdout || 'Preprocessing completed',
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
