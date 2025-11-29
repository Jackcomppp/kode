import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// 尝试读取 package.json，如果失败则使用注入的全局变量（用于打包后的代码）
let pkg
try {
  pkg = require('../../package.json')
} catch (e) {
  // Fallback to globally injected package info (for bundled code)
  pkg = (globalThis as any).__KODE_PKG__ || { version: '1.1.23', name: '@shareai-lab/kode' }
}

export const MACRO = {
  VERSION: pkg.version,
  README_URL: 'https://github.com/shareAI-lab/kode#readme',
  PACKAGE_URL: '@shareai-lab/kode',
  ISSUES_EXPLAINER: 'report the issue at https://github.com/shareAI-lab/kode/issues',
}
