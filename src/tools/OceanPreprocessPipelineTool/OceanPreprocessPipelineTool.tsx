import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import type { Tool } from '@tool'
import { getCwd } from '@utils/state'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import * as path from 'node:path'

const inputSchema = z.strictObject({
  input_dir: z.string().describe('输入数据目录路径'),
  output_dir: z.string().describe('输出数据目录路径'),
  file_pattern: z.string().optional().default('*.nc').describe('文件匹配模式，默认 *.nc'),
  variable_name: z.string().optional().default('sst').describe('变量名称，默认 sst'),
  use_cnn_validation: z.boolean().optional().default(true).describe('是否使用CNN验证（需要PyTorch）'),
})

type Input = z.infer<typeof inputSchema>

const DESCRIPTION = `
运行完整的海洋数据预处理流程（带CNN收敛性验证）

功能：
1. 批量处理NC文件
2. 数据清洗和合并
3. CNN验证数据收敛性
4. 自动生成验证报告

适用场景：
- 预处理JAXA/OSTIA等海洋数据
- 需要验证数据质量和收敛性
- 准备超分辨率或预测模型的训练数据
`

const PROMPT = `
You are using the OceanPreprocessPipelineTool to run a complete data preprocessing pipeline with CNN validation.

This tool will:
1. Load and process multiple NC files from input_dir
2. Merge them into a single processed file
3. Validate data quality using a lightweight CNN
4. Generate a detailed validation report

Output files (in output_dir):
- preprocessed_{variable}.nc - Processed data file
- validation_report.md - Detailed validation report
- validation_results.json - Machine-readable results

The tool will show you:
- Processing progress
- Data statistics
- Convergence metrics
- Quality scores

If CNN validation is unavailable (PyTorch not installed), it will fall back to basic statistical validation.
`

export const OceanPreprocessPipelineTool: Tool = {
  name: 'OceanPreprocessPipeline',
  description: DESCRIPTION,
  schema: inputSchema,
  alwaysShowTabs: true,

  execute: async (input: Input) => {
    const { input_dir, output_dir, file_pattern, variable_name, use_cnn_validation } = input
    const cwd = getCwd()

    // 验证路径
    if (!existsSync(input_dir)) {
      throw new Error(`输入目录不存在: ${input_dir}`)
    }

    // 准备Python脚本路径
    const projectRoot = path.join(cwd, 'kode')
    const scriptPath = use_cnn_validation
      ? path.join(projectRoot, 'scripts', 'test_preprocessing.py')
      : path.join(projectRoot, 'scripts', 'test_preprocessing_simple.py')

    // 查找Python可执行文件
    const pythonCmd = process.platform === 'win32'
      ? 'C:\\ProgramData\\anaconda3\\python.exe'
      : 'python3'

    return {
      Component: () => {
        const [output, setOutput] = React.useState<string[]>([])
        const [error, setError] = React.useState<string | null>(null)
        const [exitCode, setExitCode] = React.useState<number | null>(null)

        React.useEffect(() => {
          const env = {
            ...process.env,
            PREPROCESS_INPUT_DIR: input_dir,
            PREPROCESS_OUTPUT_DIR: output_dir,
            PREPROCESS_FILE_PATTERN: file_pattern,
            PREPROCESS_VARIABLE: variable_name,
          }

          const proc = spawn(pythonCmd, [scriptPath], {
            cwd: projectRoot,
            env,
          })

          proc.stdout.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(l => l.trim())
            setOutput(prev => [...prev, ...lines])
          })

          proc.stderr.on('data', (data: Buffer) => {
            const errorMsg = data.toString()
            setError(errorMsg)
            setOutput(prev => [...prev, `[ERROR] ${errorMsg}`])
          })

          proc.on('close', (code) => {
            setExitCode(code)
          })

          return () => {
            proc.kill()
          }
        }, [])

        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text bold>🌊 海洋数据预处理流程</Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
              <Text dimColor>输入目录: {input_dir}</Text>
              <Text dimColor>输出目录: {output_dir}</Text>
              <Text dimColor>文件模式: {file_pattern}</Text>
              <Text dimColor>变量名称: {variable_name}</Text>
              <Text dimColor>CNN验证: {use_cnn_validation ? '启用' : '禁用'}</Text>
            </Box>

            <Box flexDirection="column" borderStyle="single" paddingX={1}>
              {output.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </Box>

            {exitCode !== null && (
              <Box marginTop={1}>
                {exitCode === 0 ? (
                  <Text color="green" bold>
                    ✅ 预处理完成！查看报告: {path.join(output_dir, 'validation_report.md')}
                  </Text>
                ) : (
                  <Text color="red" bold>
                    ❌ 预处理失败（退出码: {exitCode}）
                  </Text>
                )}
              </Box>
            )}

            {error && (
              <Box marginTop={1}>
                <Text color="yellow">⚠️  {error}</Text>
              </Box>
            )}
          </Box>
        )
      },
      meta: {
        input_dir,
        output_dir,
        file_pattern,
        variable_name,
      },
    }
  },
}
