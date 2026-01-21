import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const execAsync = promisify(exec)

// ESM compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class OceanDepsManager {
	private static diffSRPath: string | null = null
	private static predictionPath: string | null = null
	private static pythonPath: string | null = null

	/**
	 * 获取 DiffSR 路径
	 * 优先级：嵌入式路径（产品自带）> 环境变量 > 用户自定义路径
	 *
	 * 产品默认使用嵌入在 Kode 中的 DiffSR 代码，无需用户额外下载
	 */
	static async ensureDiffSR(): Promise<string> {
		if (this.diffSRPath) return this.diffSRPath

		// 1. 优先使用嵌入的 DiffSR（产品自带，开箱即用）
		const bundledPath = path.resolve(__dirname, '..', 'services', 'diffsr')
		try {
			await fs.access(path.join(bundledPath, 'main.py'))
			this.diffSRPath = bundledPath
			console.log(`✓ Using embedded DiffSR (built-in): ${bundledPath}`)
			return bundledPath
		} catch {
			console.log(`ℹ Embedded DiffSR not found, trying alternative locations...`)
		}

		// 2. 回退：环境变量指定的路径（用于高级用户自定义）
		if (process.env.DIFFSR_PATH) {
			try {
				await fs.access(path.join(process.env.DIFFSR_PATH, 'main.py'))
				this.diffSRPath = process.env.DIFFSR_PATH
				console.log(`✓ Using DiffSR from DIFFSR_PATH: ${this.diffSRPath}`)
				return this.diffSRPath
			} catch {
				console.warn(`⚠ DIFFSR_PATH set but invalid: ${process.env.DIFFSR_PATH}`)
			}
		}

		// 3. 最后回退：用户本地路径（开发者模式）
		const devDiffSRPath = 'D:/tmp/DiffSR-main'
		try {
			await fs.access(path.join(devDiffSRPath, 'main.py'))
			this.diffSRPath = devDiffSRPath
			console.log(`✓ Using developer DiffSR at: ${devDiffSRPath}`)
			return devDiffSRPath
		} catch (error) {
			throw new Error(
				`❌ DiffSR not found!

` +
				`This should not happen in a properly packaged Kode installation.
` +
				`The embedded DiffSR should be available at: ${bundledPath}

` +
				`Tried locations:
` +
				`  1. Embedded (built-in): ${bundledPath}
` +
				`  2. DIFFSR_PATH env var: ${process.env.DIFFSR_PATH || '(not set)'}
` +
				`  3. Developer path: ${devDiffSRPath}

` +
				`If you installed Kode from npm/package, please reinstall.
` +
				`Error: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * 获取 Prediction 路径
	 * 优先级：嵌入式路径（产品自带）> 环境变量 > 用户自定义路径
	 *
	 * 产品默认使用嵌入在 Kode 中的 Prediction 代码，无需用户额外下载
	 */
	static async ensurePrediction(): Promise<string> {
		if (this.predictionPath) return this.predictionPath

		// 1. 优先使用嵌入的 Prediction（产品自带，开箱即用）
		const bundledPath = path.resolve(__dirname, '..', 'services', 'prediction')
		try {
			await fs.access(path.join(bundledPath, 'main.py'))
			this.predictionPath = bundledPath
			console.log(`✓ Using embedded Prediction (built-in): ${bundledPath}`)
			return bundledPath
		} catch {
			console.log(`ℹ Embedded Prediction not found, trying alternative locations...`)
		}

		// 2. 回退：环境变量指定的路径（用于高级用户自定义）
		if (process.env.PREDICTION_PATH) {
			try {
				await fs.access(path.join(process.env.PREDICTION_PATH, 'main.py'))
				this.predictionPath = process.env.PREDICTION_PATH
				console.log(`✓ Using Prediction from PREDICTION_PATH: ${this.predictionPath}`)
				return this.predictionPath
			} catch {
				console.warn(`⚠ PREDICTION_PATH set but invalid: ${process.env.PREDICTION_PATH}`)
			}
		}

		// 3. 最后回退：用户本地路径（开发者模式）
		const devPredictionPath = 'D:/tmp/prediction'
		try {
			await fs.access(path.join(devPredictionPath, 'main.py'))
			this.predictionPath = devPredictionPath
			console.log(`✓ Using developer Prediction at: ${devPredictionPath}`)
			return devPredictionPath
		} catch (error) {
			throw new Error(
				`❌ Prediction not found!

` +
				`This should not happen in a properly packaged Kode installation.
` +
				`The embedded Prediction should be available at: ${bundledPath}

` +
				`Tried locations:
` +
				`  1. Embedded (built-in): ${bundledPath}
` +
				`  2. PREDICTION_PATH env var: ${process.env.PREDICTION_PATH || '(not set)'}
` +
				`  3. Developer path: ${devPredictionPath}

` +
				`If you installed Kode from npm/package, please reinstall.
` +
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
		prediction_path: string
		python_path: string
	}> {
		return {
			diffsr_path: await this.ensureDiffSR(),
			prediction_path: await this.ensurePrediction(),
			python_path: await this.findPython(),
		}
	}
}
