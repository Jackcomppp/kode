#!/usr/bin/env node
import { build } from 'esbuild'
import { existsSync, mkdirSync, writeFileSync, cpSync, readFileSync, readdirSync, statSync, chmodSync } from 'node:fs'
import { join } from 'node:path'

const SRC_DIR = 'src'
const OUT_DIR = 'dist'

function collectEntries(dir, acc = []) {
  const items = readdirSync(dir)
  for (const name of items) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      // skip tests and storybook or similar folders if any, adjust as needed
      if (name === 'test' || name === '__tests__') continue
      collectEntries(p, acc)
    } else if (st.isFile()) {
      if (p.endsWith('.ts') || p.endsWith('.tsx')) acc.push(p)
    }
  }
  return acc
}

function fixRelativeImports(dir) {
  const items = readdirSync(dir)
  for (const name of items) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      fixRelativeImports(p)
      continue
    }
    if (!p.endsWith('.js')) continue
    let text = readFileSync(p, 'utf8')

    // 计算当前文件相对于 OUT_DIR 的深度
    const relativeToOutDir = p.substring(OUT_DIR.length + 1)
    const depth = relativeToOutDir.split(/[/\\]/).length - 1
    const prefix = depth > 0 ? '../'.repeat(depth) : './'

    // 先修复路径别名为相对路径 - 处理 @xxx 和 @xxx/path 两种格式
    text = text.replace(/(from\s+['"])@([a-zA-Z-]+)(\/[^'"\n]*)?(['"])/gm, (m, a, pkg, path, c) => {
      // 映射 @ 别名到相对路径
      const mapping = {
        'services': 'services',
        'constants': 'constants',
        'utils': 'utils',
        'tools': 'tools',
        'tool': 'Tool',
        'commands': 'commands',
        'components': 'components',
        'screens': 'screens',
        'hooks': 'hooks',
        'types': 'types',
        'kode-types': 'types',
        'context': 'context',
        'permissions': 'permissions',
        'history': 'history',
        'messages': 'messages',
        'costTracker': 'cost-tracker',
        'query': 'query',
      }

      let relativePath = mapping[pkg]
      if (!relativePath) return m // 保持原样如果找不到映射

      // 添加正确的前缀（考虑目录深度）
      relativePath = prefix + relativePath

      if (path) {
        relativePath += path
      }

      // 添加 .js 扩展名或 /index.js（如果是目录）
      if (!/\.(js|json|node|mjs|cjs)$/.test(relativePath)) {
        const baseTargetPath = join(OUT_DIR, relativePath.replace(/^(\.\.\/)+/, ''))
        // 优先检查 .js 文件是否存在
        if (existsSync(baseTargetPath + '.js')) {
          relativePath += '.js'
        } else if (existsSync(baseTargetPath) && statSync(baseTargetPath).isDirectory()) {
          // 如果不是 .js 文件但是目录，使用 /index.js
          relativePath += '/index.js'
        } else {
          // 默认添加 .js
          relativePath += '.js'
        }
      }

      return a + relativePath + c
    })

    // 处理 export ... from - 处理 @xxx 和 @xxx/path 两种格式
    text = text.replace(/(export\s+[^;]*?from\s+['"])@([a-zA-Z-]+)(\/[^'"\n]*)?(['"])/gm, (m, a, pkg, path, c) => {
      const mapping = {
        'services': 'services',
        'constants': 'constants',
        'utils': 'utils',
        'tools': 'tools',
        'tool': 'Tool',
        'commands': 'commands',
        'components': 'components',
        'screens': 'screens',
        'hooks': 'hooks',
        'types': 'types',
        'kode-types': 'types',
        'context': 'context',
        'permissions': 'permissions',
        'history': 'history',
        'messages': 'messages',
        'costTracker': 'cost-tracker',
        'query': 'query',
      }

      let relativePath = mapping[pkg]
      if (!relativePath) return m

      // 添加正确的前缀（考虑目录深度）
      relativePath = prefix + relativePath

      if (path) {
        relativePath += path
      }

      // 添加 .js 扩展名或 /index.js（如果是目录）
      if (!/\.(js|json|node|mjs|cjs)$/.test(relativePath)) {
        const baseTargetPath = join(OUT_DIR, relativePath.replace(/^(\.\.\/)+/, ''))
        // 优先检查 .js 文件是否存在
        if (existsSync(baseTargetPath + '.js')) {
          relativePath += '.js'
        } else if (existsSync(baseTargetPath) && statSync(baseTargetPath).isDirectory()) {
          // 如果不是 .js 文件但是目录，使用 /index.js
          relativePath += '/index.js'
        } else {
          // 默认添加 .js
          relativePath += '.js'
        }
      }

      return a + relativePath + c
    })

    // Handle: from '...'
    text = text.replace(/(from\s+['"])(\.{1,2}\/[^'"\n]+)(['"])/gm, (m, a, spec, c) => {
      if (/\.(js|json|node|mjs|cjs)$/.test(spec)) return m
      return a + spec + '.js' + c
    })
    // Handle: export ... from '...'
    text = text.replace(/(export\s+[^;]*?from\s+['"])(\.{1,2}\/[^'"\n]+)(['"])/gm, (m, a, spec, c) => {
      if (/\.(js|json|node|mjs|cjs)$/.test(spec)) return m
      return a + spec + '.js' + c
    })
    // Handle: dynamic import('...')
    text = text.replace(/(import\(\s*['"])(\.{1,2}\/[^'"\n]+)(['"]\s*\))/gm, (m, a, spec, c) => {
      if (/\.(js|json|node|mjs|cjs)$/.test(spec)) return m
      return a + spec + '.js' + c
    })
    writeFileSync(p, text)
  }
}

async function main() {
  console.log('🚀 Building Kode CLI for cross-platform compatibility...')
  
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const entries = collectEntries(SRC_DIR)

  // Build ESM format but ensure Node.js compatibility
  await build({
    entryPoints: entries,
    outdir: OUT_DIR,
    outbase: SRC_DIR,
    bundle: false,
    platform: 'node',
    format: 'esm',
    target: ['node20'],
    sourcemap: true,
    legalComments: 'none',
    logLevel: 'info',
    tsconfig: 'tsconfig.json',
  })

  // Fix relative import specifiers to include .js extension for ESM
  fixRelativeImports(OUT_DIR)

  // Fix files that only contain type definitions (no runtime exports)
  // These files cause "Export not found" errors at runtime
  console.log('🔧 Fixing type-only modules...')

  function addMissingExports(jsFilePath, tsFilePath) {
    if (!existsSync(jsFilePath) || !existsSync(tsFilePath)) return false

    const jsContent = readFileSync(jsFilePath, 'utf8')
    const tsContent = readFileSync(tsFilePath, 'utf8')

    // Find all type exports in TS file
    const typeExports = []
    const typeExportRegex = /export\s+(?:type|interface)\s+(\w+)/g
    let match
    while ((match = typeExportRegex.exec(tsContent)) !== null) {
      typeExports.push(match[1])
    }

    if (typeExports.length === 0) return false

    // Check which exports are missing in JS file
    const missingExports = typeExports.filter(name => {
      const regex = new RegExp(`export\\s+(const|let|var|function|class)\\s+${name}\\b`)
      return !regex.test(jsContent)
    })

    if (missingExports.length === 0) return false

    // Add missing exports
    const exportStatements = '\n// Type-only exports - placeholders for TypeScript types\n' +
      missingExports.map(name => `export const ${name} = undefined`).join('\n') + '\n'

    const newContent = jsContent.replace(
      /\/\/# sourceMappingURL=.*/,
      exportStatements + '//# sourceMappingURL=' + jsFilePath.substring(jsFilePath.lastIndexOf('\\') + 1).replace('.js', '.js.map')
    )

    writeFileSync(jsFilePath, newContent)
    return true
  }

  // List of files that commonly have type-only exports
  const filesToFix = [
    { js: join(OUT_DIR, 'Tool.js'), ts: join(SRC_DIR, 'Tool.ts') },
    { js: join(OUT_DIR, 'types.js'), ts: join(SRC_DIR, 'types.ts') },
    { js: join(OUT_DIR, 'utils', 'config.js'), ts: join(SRC_DIR, 'utils', 'config.ts') },
    { js: join(OUT_DIR, 'query.js'), ts: join(SRC_DIR, 'query.ts') },
  ]

  let fixedCount = 0
  for (const {js, ts} of filesToFix) {
    if (addMissingExports(js, ts)) {
      console.log(`  ✓ Fixed ${js.substring(OUT_DIR.length + 1)}`)
      fixedCount++
    }
  }

  if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} type-only modules`)
  }

  // Mark dist as ES module
  writeFileSync(join(OUT_DIR, 'package.json'), JSON.stringify({
    type: 'module',
    main: './entrypoints/cli.js'
  }, null, 2))

  // Create a proper entrypoint - ESM with async handling
  const mainEntrypoint = join(OUT_DIR, 'index.js')
  writeFileSync(mainEntrypoint, `#!/usr/bin/env node
import('./entrypoints/cli.js').catch(err => {
  console.error('❌ Failed to load CLI:', err.message);
  process.exit(1);
});
`)

  // Copy yoga.wasm alongside outputs
  try {
    cpSync('yoga.wasm', join(OUT_DIR, 'yoga.wasm'))
    console.log('✅ yoga.wasm copied to dist')
  } catch (err) {
    console.warn('⚠️  Could not copy yoga.wasm:', err.message)
  }

  // Copy DiffSR-main to dist/services/diffsr
  const diffSRSource = join(SRC_DIR, 'services', 'diffsr')
  const diffSRTarget = join(OUT_DIR, 'services', 'diffsr')
  try {
    if (existsSync(diffSRSource)) {
      cpSync(diffSRSource, diffSRTarget, { recursive: true })
      console.log('✅ DiffSR-main copied to dist/services/diffsr')
    } else {
      console.warn('⚠️  DiffSR-main not found at src/services/diffsr')
    }
  } catch (err) {
    console.warn('⚠️  Could not copy DiffSR-main:', err.message)
  }

  // Create cross-platform CLI wrapper
  const cliWrapper = `#!/usr/bin/env node

// Cross-platform CLI wrapper for Kode
// Prefers Bun but falls back to Node.js with tsx loader

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Get the directory where this CLI script is installed
const kodeDir = __dirname;
const distPath = path.join(kodeDir, 'dist', 'index.js');

// Check if we have a built version
if (!existsSync(distPath)) {
  console.error('❌ Built files not found. Run "bun run build" first.');
  process.exit(1);
}

// Try to use Bun first, then fallback to Node.js with tsx
const runWithBun = () => {
  const proc = spawn('bun', ['run', distPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: process.cwd()  // Use current working directory, not kode installation directory
  });

  proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      // Bun not found, try Node.js
      runWithNode();
    } else {
      console.error('❌ Failed to start with Bun:', err.message);
      process.exit(1);
    }
  });

  proc.on('close', (code) => {
    process.exit(code);
  });
};

const runWithNode = () => {
  const proc = spawn('node', [distPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: process.cwd()  // Use current working directory, not kode installation directory
  });

  proc.on('error', (err) => {
    console.error('❌ Failed to start with Node.js:', err.message);
    process.exit(1);
  });

  proc.on('close', (code) => {
    process.exit(code);
  });
};

// Start with Bun preference
runWithBun();
`;

  writeFileSync('cli.js', cliWrapper);

  // Make cli.js executable
  try {
    chmodSync('cli.js', 0o755);
    console.log('✅ cli.js made executable');
  } catch (err) {
    console.warn('⚠️  Could not make cli.js executable:', err.message);
  }

  // Create .npmrc file
  const npmrcContent = `# Kode npm configuration
package-lock=false
save-exact=true
`;

  writeFileSync('.npmrc', npmrcContent);

  console.log('✅ Build completed for cross-platform compatibility!')
  console.log('📋 Generated files:')
  console.log('  - dist/ (ESM modules)')
  console.log('  - dist/index.js (main entrypoint)')
  console.log('  - dist/entrypoints/cli.js (CLI main)')
  console.log('  - cli.js (cross-platform wrapper)')
  console.log('  - .npmrc (npm configuration)')
}

main().catch(err => {
  console.error('❌ Build failed:', err)
  process.exit(1)
})
