#!/usr/bin/env node
/**
 * 构建 Kode API 导出（打包版本）
 * 用于后端集成
 */
import { build } from 'esbuild'
import { writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

console.log('📦 构建 Kode API 导出（打包版本）...')

// 读取 package.json 获取版本号
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

await build({
  entryPoints: ['src/api.ts'],
  outfile: 'dist/api.bundle.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node20'],
  sourcemap: true,
  // 强制在文件开头导入 shims
  banner: {
    js: `import '@anthropic-ai/sdk/shims/node';
// Injected package info
globalThis.__KODE_PKG__ = ${JSON.stringify({ version: pkg.version, name: pkg.name })};`
  },
  // 关键：不打包外部依赖，让后端的 node_modules 提供
  external: [
    // node 内置模块
    'node:*',
    'fs', 'path', 'url', 'util', 'stream', 'events', 'http', 'https',
    'crypto', 'os', 'child_process', 'zlib', 'tty', 'net', 'readline',
    'process', 'buffer', 'assert', 'module', 'querystring',

    // 大型 AI SDK - 必须 external
    '@anthropic-ai/sdk',
    '@anthropic-ai/sdk/*',
    '@anthropic-ai/bedrock-sdk',
    '@anthropic-ai/vertex-sdk',
    '@modelcontextprotocol/sdk',
    'openai',

    // React 和 UI 框架 - 后端不需要
    'react',
    'react/*',
    'ink',
    'ink/*',
    '@inkjs/ui',
    'ink-link',
    'ink-select-input',
    'ink-text-input',
    'terminal-link',
    'supports-color',
    'supports-hyperlinks',

    // 有动态 require 的包
    'spawn-rx',
    'cli-highlight',
    'highlight.js',
    'undici',
    'node-html-parser',
    'ansi-escapes',
    'figures',
    'string-width',
    'strip-ansi',
    'wrap-ansi',
    'cli-table3',
    'turndown',
    'shell-quote',

    // 其他常用依赖
    'zod',
    'zod-to-json-schema',
    'chalk',
    'dotenv',
    'glob',
    'lodash-es',
    'marked',
    'gray-matter',
    'commander',
    'diff',
    'debug',
    'nanoid',
    'node-fetch',
    'semver',
    'ws',
    'express',
  ],
  logLevel: 'info',
})

console.log('✅ API 打包完成: dist/api.bundle.js')
console.log('\n📋 后端使用方式:')
console.log("  import { query, getAllTools, getContext } from '@shareai-lab/kode/api'")

