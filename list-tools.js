import { getAllTools } from './dist/api.bundle.js'

const tools = getAllTools()

console.log('========================================')
console.log('📊 Kode CLI 工具清单')
console.log('========================================')
console.log(`总工具数: ${tools.length}\n`)

// 按类别分组
const categories = {
  Ocean: [],
  File: [],
  Bash: [],
  Search: [],
  Task: [],
  Memory: [],
  Other: []
}

tools.forEach(tool => {
  if (tool.name.includes('Ocean')) {
    categories.Ocean.push(tool.name)
  } else if (tool.name.includes('View') || tool.name.includes('Edit') || tool.name.includes('Write') || tool.name.includes('LS')) {
    categories.File.push(tool.name)
  } else if (tool.name.includes('Bash')) {
    categories.Bash.push(tool.name)
  } else if (tool.name.includes('Grep') || tool.name.includes('Glob')) {
    categories.Search.push(tool.name)
  } else if (tool.name.includes('Task') || tool.name.includes('Expert')) {
    categories.Task.push(tool.name)
  } else if (tool.name.includes('Memory')) {
    categories.Memory.push(tool.name)
  } else {
    categories.Other.push(tool.name)
  }
})

console.log('【Ocean 自定义工具】(' + categories.Ocean.length + ' 个)')
categories.Ocean.forEach(name => console.log(`  ✓ ${name}`))

console.log('\n【文件操作工具】(' + categories.File.length + ' 个)')
categories.File.forEach(name => console.log(`  ✓ ${name}`))

console.log('\n【命令执行工具】(' + categories.Bash.length + ' 个)')
categories.Bash.forEach(name => console.log(`  ✓ ${name}`))

console.log('\n【搜索工具】(' + categories.Search.length + ' 个)')
categories.Search.forEach(name => console.log(`  ✓ ${name}`))

console.log('\n【任务管理工具】(' + categories.Task.length + ' 个)')
categories.Task.forEach(name => console.log(`  ✓ ${name}`))

console.log('\n【记忆工具】(' + categories.Memory.length + ' 个)')
categories.Memory.forEach(name => console.log(`  ✓ ${name}`))

console.log('\n【其他工具】(' + categories.Other.length + ' 个)')
categories.Other.forEach(name => console.log(`  ✓ ${name}`))

console.log('\n========================================')
