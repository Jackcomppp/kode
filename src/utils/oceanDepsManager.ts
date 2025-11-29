import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export class OceanDepsManager {
	private static diffSRPath: string | null = null
	private static pythonPath: string | null = null

	/**
	 * 获取嵌入式 DiffSR 路径
	 */
	static async ensureDiffSR(): Promise<string> {
		if (this.diffSRPath) return this.diffSRPath

		// 1. 优先使用嵌入的 DiffSR（在 Kode 源码中）
		// 在开发环境和打包后都能正常工作
		const bundledPath = path.resolve(__dirname, '..', 'services', 'diffsr')
		
		try {
			await fs.access(path.join(bundledPath, 'main.py'))
			this.diffSRPath = bundledPath
			console.log(`✓ Using embedded DiffSR at: ${bundledPath}`)
			return bundledPath
		} catch (error) {
			throw new Error(
				`Embedded DiffSR not found at: ${bundledPath}\n` +
				`Please ensure DiffSR code is properly installed in src/services/diffsr/\n` +
				`Error: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * 查找可用的 Python 解释器
	 */
	static async findPython(): Promise<string> {
		if (this.pythonPath) return this.pythonPath

		const candidates = [
			'python3',
			'python',
			'C:/ProgramData/anaconda3/python.exe',
			'C:/Python311/python.exe',
			'/usr/bin/python3',
			'/opt/conda/bin/python',
		]

		for (const cmd of candidates) {
			try {
				const { stdout } = await execAsync(`${cmd} --version`, { timeout: 5000 })
				if (stdout.includes('Python 3')) {
					this.pythonPath = cmd
					console.log(`✓ Using Python: ${cmd}`)
					return cmd
				}
			} catch {}
		}

		throw new Error('Python 3 not found. Please install Python 3.8+ and try again.')
	}

	/**
	 * 检查并安装缺失的 Python 包
	 */
	static async ensurePythonPackages(packages: string[]): Promise<void> {
		const pythonCmd = await this.findPython()

		for (const pkg of packages) {
			try {
				await execAsync(`${pythonCmd} -c "import ${pkg.split('[')[0]}"`, { timeout: 5000 })
			} catch {
				console.log(`Installing missing package: ${pkg}`)
				await execAsync(`${pythonCmd} -m pip install ${pkg} -q`, { timeout: 120000 })
			}
		}
	}

	/**
	 * 获取完整的运行时配置
	 */
	static async getRuntimeConfig(): Promise<{
		diffsr_path: string
		python_path: string
	}> {
		return {
			diffsr_path: await this.ensureDiffSR(),
			python_path: await this.findPython(),
		}
	}
}
