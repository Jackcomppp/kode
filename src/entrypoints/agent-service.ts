// src/entrypoints/agent-service.ts
// HTTP Agent 服务入口，使用 Bun.serve

import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { query } from '../query'
import { getAllTools } from '../api'
import type { Message, UserMessage, AssistantMessage } from '../query'
import type { ToolUseContext, Tool } from '../Tool'
import type { CanUseToolFn } from '../hooks/useCanUseTool'

// 和 src/query.ts 中 ExtendedToolUseContext 保持一致
interface ExtendedToolUseContext extends ToolUseContext {
  abortController: AbortController
  options: {
    commands: any[]
    forkNumber: number
    messageLogName: string
    tools: Tool[]
    verbose: boolean
    safeMode: boolean
    maxThinkingTokens: number
    isKodingRequest?: boolean
    model?: string
  }
  readFileTimestamps: { [filename: string]: number }
  setToolJSX: (jsx: any) => void
  requestId?: string
}

// 工具缓存，避免每次请求都重新初始化
let toolsCache: Tool[] | null = null
async function loadTools(): Promise<Tool[]> {
  if (toolsCache) return toolsCache
  toolsCache = await getAllTools()
  console.log(
    `[agent-service] loaded ${toolsCache.length} tools:`,
    toolsCache.map((t) => t.name),
  )
  return toolsCache
}

// SSE 辅助：把对象编码成一条 SSE 事件
function encodeSseEvent(event: any): Uint8Array {
  const data = `data: ${JSON.stringify(event)}\n\n`
  return new TextEncoder().encode(data)
}

// 从 AssistantMessage 中提取文本内容（兼容 OpenAI / Anthropic / 云雾）
function getTextFromAssistantMessage(msg: AssistantMessage): string {
  const m: any = (msg as any).message
  if (!m) return ''

  // OpenAI 风格：message.content 是字符串
  if (typeof m.content === 'string') {
    return m.content
  }

  // Anthropic / 云雾：message.content 是块数组
  if (Array.isArray(m.content)) {
    return m.content
      .filter(
        (b: any) => b && b.type === 'text' && typeof b.text === 'string',
      )
      .map((b: any) => b.text)
      .join('\n')
  }

  return ''
}

// Clean up old temp files on startup to prevent accumulation
async function cleanupOldTempFiles() {
  try {
    const { execSync } = await import('child_process')
    const { PRODUCT_COMMAND } = await import('@constants/product')
    const os = await import('os')
    const tmpDir = os.tmpdir()

    console.log('[agent-service] Cleaning up old temp files...')

    // Find and count old kode temp files
    try {
      const countCmd = `find "${tmpDir}" -maxdepth 1 -name "${PRODUCT_COMMAND}-*" -type f 2>/dev/null | wc -l`
      const count = execSync(countCmd, { encoding: 'utf-8' }).trim()

      if (parseInt(count) > 0) {
        console.log(`[agent-service] Found ${count} old temp files, cleaning up...`)

        // Delete old temp files (only from previous runs)
        const deleteCmd = `find "${tmpDir}" -maxdepth 1 -name "${PRODUCT_COMMAND}-*" -type f -delete 2>/dev/null || true`
        execSync(deleteCmd, { timeout: 30000 })

        console.log('[agent-service] Old temp files cleaned up successfully')
      } else {
        console.log('[agent-service] No old temp files to clean up')
      }
    } catch (err) {
      console.warn('[agent-service] Failed to clean up temp files (non-critical):', err)
    }
  } catch (err) {
    console.warn('[agent-service] Temp file cleanup skipped:', err)
  }
}

const PORT = Number(process.env.KODE_API_PORT ?? '8787')
const API_SECRET = process.env.KODE_API_SECRET

if (!API_SECRET) {
  console.warn(
    '[agent-service] 环境变量 KODE_API_SECRET 未设置，/api/chat/stream 将拒绝所有请求',
  )
}

console.log(
  `[agent-service] 启动中，端口=${PORT}, Bun=${Bun.version}, NODE_ENV=${process.env.NODE_ENV}`,
)

// 🔥 CRITICAL FIX: 禁用 streaming 模式以避免 API 代理兼容性问题
// 某些 API 代理（如 yunwu.ai）在 streaming 模式下不正确发送 input_json_delta 事件
// 这会导致 tool_use 的 input 参数为空，从而触发验证错误
import { getGlobalConfig, saveGlobalConfig } from '../utils/config'
const globalConfig = getGlobalConfig()
if (globalConfig.stream !== false) {
  saveGlobalConfig({ ...globalConfig, stream: false })
  console.log('[agent-service] Streaming 模式已禁用 (API 代理兼容性修复)')
} else {
  console.log('[agent-service] Streaming 模式已为禁用状态')
}

// Clean up old temp files asynchronously (don't block startup)
cleanupOldTempFiles().catch(err => {
  console.warn('[agent-service] Background cleanup failed:', err)
})

Bun.serve({
  port: PORT,
  fetch: async (req) => {
    const url = new URL(req.url)

    // 健康检查
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'kode-agent-service',
          timestamp: Date.now(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 对话 + 工具接口
    if (url.pathname === '/api/chat/stream' && req.method === 'POST') {
      const now = new Date().toISOString()
      const reqId = randomUUID().slice(0, 8)
      const ip =
        req.headers.get('x-forwarded-for') ??
        req.headers.get('x-real-ip') ??
        'unknown'

      console.log(
        `[agent-service] [${now}] [req ${reqId}] incoming request from ${ip}`,
      )

      // 简单鉴权
      const apiKey = req.headers.get('x-api-key') ?? req.headers.get('X-API-Key')
      if (!API_SECRET || apiKey !== API_SECRET) {
        console.warn(
          `[agent-service] [req ${reqId}] unauthorized request: bad X-API-Key`,
        )
        return new Response(
          JSON.stringify({
            error: 'UNAUTHORIZED',
            message: 'Invalid or missing X-API-Key',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      // 解析请求体
      let body: any
      try {
        body = await req.json()
      } catch {
        console.error(
          `[agent-service] [req ${reqId}] failed to parse JSON body`,
        )
        return new Response(
          JSON.stringify({
            error: 'BAD_REQUEST',
            message: 'Invalid JSON body',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const message: string | undefined = body?.message
      const contextInput: any = body?.context ?? {}

      if (!message || typeof message !== 'string') {
        console.warn(
          `[agent-service] [req ${reqId}] missing or invalid "message" field`,
        )
        return new Response(
          JSON.stringify({
            error: 'BAD_REQUEST',
            message: 'Field "message" must be a non-empty string',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const userId: string = contextInput.userId ?? 'anonymous'
      const workingDir: string = contextInput.workingDir ?? ''
      const outputsPath: string = body?.outputsPath ?? ''
      const files: string[] = Array.isArray(contextInput.files)
        ? contextInput.files
        : []

      console.log(
        `[agent-service] [req ${reqId}] message="${message.slice(
          0,
          80,
        )}" userId=${userId} workingDir=${workingDir} outputsPath=${outputsPath} files=${JSON.stringify(
          files,
        )}`,
      )

      // 🔥 CRITICAL: Set the working directory to outputsPath if provided
      // This ensures all generated files go to the correct outputs directory
      if (outputsPath && existsSync(outputsPath)) {
        console.log(`[agent-service] [req ${reqId}] Setting working directory to: ${outputsPath}`)
        const { setOriginalCwd } = await import('../utils/state')
        const { PersistentShell } = await import('../utils/PersistentShell')

        // Set as original cwd for security checks
        setOriginalCwd(outputsPath)

        // Actually change the shell's working directory
        try {
          await PersistentShell.getInstance().setCwd(outputsPath)
          console.log(`[agent-service] [req ${reqId}] Successfully changed working directory to: ${outputsPath}`)
        } catch (err) {
          console.error(`[agent-service] [req ${reqId}] Failed to set working directory:`, err)
        }
      } else if (workingDir && existsSync(workingDir)) {
        console.log(`[agent-service] [req ${reqId}] outputsPath not provided or doesn't exist, using workingDir: ${workingDir}`)
        const { setOriginalCwd } = await import('../utils/state')
        const { PersistentShell } = await import('../utils/PersistentShell')

        setOriginalCwd(workingDir)

        try {
          await PersistentShell.getInstance().setCwd(workingDir)
          console.log(`[agent-service] [req ${reqId}] Successfully changed working directory to: ${workingDir}`)
        } catch (err) {
          console.error(`[agent-service] [req ${reqId}] Failed to set working directory:`, err)
        }
      }

      // 构造第一条 UserMessage
      const userMessage: UserMessage = {
        type: 'user',
        uuid: randomUUID() as any,
        message: {
          role: 'user',
          content: message,
        },
      } as any

      const messages: Message[] = [userMessage]

      // systemPrompt：这里可以根据你实际 Agent 的定位来调整
      const systemPrompt: string[] = [
        '你是一个运行在自定义 Web API 后端的智能代理。',
        '你可以根据用户上传的数据文件和指令，调用内部工具进行数据分析、方案定制、代码生成与运行。',
        '当用户使用中文时，请用中文回答。',
      ]

      // 🔥 Add outputs path instruction to system prompt
      if (outputsPath) {
        systemPrompt.push(
          '',
          '⚠️ **重要：文件输出规则**',
          `- 当前工作目录: ${outputsPath}`,
          '- 所有生成的文件（图表、报告、模型、数据处理结果等）必须保存在当前工作目录中',
          '- 使用相对路径或直接指定文件名即可，不要使用绝对路径',
          '- 例如: plt.savefig("plot.png") 而不是 plt.savefig("/some/absolute/path/plot.png")',
          '- 例如: pd.to_csv("result.csv") 而不是指定其他目录',
          '- 这样可以确保所有输出文件都在正确的位置，便于用户查找和管理',
        )
      }

      // context：根据你的需求扩展
      const context: { [k: string]: string } = {
        userId,
      }
      if (workingDir) context['workingDir'] = workingDir
      if (outputsPath) context['outputsPath'] = outputsPath
      if (files.length) context['files'] = files.join(',')

      // 加载全部工具，并允许使用
      const tools = await loadTools()
      const canUseTool: CanUseToolFn = (async () => true) as any

      const abortController = new AbortController()

      const toolUseContext: ExtendedToolUseContext = {
        messageId: undefined,
        agentId: 'web-api',
        safeMode: false,
        abortController,
        readFileTimestamps: {},
        options: {
          commands: [],
          tools,
          verbose: false,
          safeMode: false,
          forkNumber: 0,
          messageLogName: `web-api-${reqId}`,
          maxThinkingTokens: 0,
          model: 'main', // 或 'claude-sonnet-4-5-20250929'，视你的配置
        },
        responseState: {},
        setToolJSX: () => null,
        requestId: reqId,
      }

      console.log(
        `[agent-service] [req ${reqId}] starting query with ${tools.length} tools`,
      )

      // 用 ReadableStream 封装 SSE 输出（带 closed 标记，避免重复 enqueue）
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          let closed = false

          const safeEnqueue = (event: any) => {
            if (closed) return false
            try {
              controller.enqueue(encodeSseEvent(event))
              return true
            } catch (err: any) {
              const msg = String(err?.message ?? err)
              const name = (err && (err.name || err.code)) ?? ''
              if (
                name === 'ERR_INVALID_STATE' ||
                msg.includes('Controller is already closed')
              ) {
                console.warn(
                  `[agent-service] [req ${reqId}] controller already closed, stop enqueue`,
                )
              } else {
                console.error(
                  `[agent-service] [req ${reqId}] enqueue error:`,
                  err,
                )
              }
              closed = true
              try {
                controller.close()
              } catch {}
              return false
            }
          }

          const run = async () => {
            // 🔥 心跳定时器变量，定义在外层以便在 catch 块中也能访问
            let heartbeatInterval: NodeJS.Timeout | null = null
            let heartbeatCount = 0

            try {
              if (
                !safeEnqueue({
                  type: 'start',
                  model: toolUseContext.options.model ?? 'main',
                  timestamp: Date.now(),
                })
              ) {
                return
              }

              // 🔥 启动心跳定时器，每2秒发送一次进度消息，防止客户端超时
              heartbeatInterval = setInterval(() => {
                if (!closed) {
                  heartbeatCount++
                  const heartbeatSent = safeEnqueue({
                    type: 'heartbeat',
                    message: 'processing',
                    count: heartbeatCount,
                    timestamp: Date.now(),
                  })
                  console.log(
                    `[agent-service] [req ${reqId}] Sent heartbeat #${heartbeatCount} (${heartbeatSent ? 'success' : 'failed'})`,
                  )
                }
              }, 2000) // 每2秒发送一次

              try {
                for await (const msg of query(
                  messages,
                  systemPrompt,
                  context,
                  canUseTool,
                  toolUseContext,
                )) {
                if (closed) break

                const msgType = (msg as any).type
                const rawMessage = (msg as any).message

                console.log(`[agent-service] [req ${reqId}] =============================`)
                console.log(`[agent-service] [req ${reqId}] Received message type: ${msgType}`)

                // 🔥 详细打印 assistant 消息
                if (msgType === 'assistant') {
                  const assistantMsg = msg as AssistantMessage

                  // 打印元数据
                  console.log(`[agent-service] [req ${reqId}] Assistant metadata:`)
                  console.log(`  - id: ${rawMessage?.id}`)
                  console.log(`  - model: ${rawMessage?.model}`)
                  console.log(`  - stop_reason: ${rawMessage?.stop_reason}`)
                  console.log(`  - usage:`, rawMessage?.usage)

                  // 打印 content 详情
                  if (Array.isArray(rawMessage?.content)) {
                    console.log(`[agent-service] [req ${reqId}] Content blocks (${rawMessage.content.length} blocks):`)

                    rawMessage.content.forEach((block: any, idx: number) => {
                      console.log(`[agent-service] [req ${reqId}] Block[${idx}] type: ${block.type}`)

                      if (block.type === 'text') {
                        const text = String(block.text || '')
                        console.log(`[agent-service] [req ${reqId}]   Text content (${text.length} chars):`)
                        console.log(`[agent-service] [req ${reqId}]   "${text.slice(0, 500)}${text.length > 500 ? '...' : ''}"`)
                      } else if (block.type === 'tool_use') {
                        console.log(`[agent-service] [req ${reqId}]   Tool use:`)
                        console.log(`[agent-service] [req ${reqId}]     - id: ${block.id}`)
                        console.log(`[agent-service] [req ${reqId}]     - name: ${block.name}`)
                        console.log(`[agent-service] [req ${reqId}]     - input:`, JSON.stringify(block.input, null, 2))
                      } else if (block.type === 'thinking') {
                        const thinking = String(block.thinking || '')
                        console.log(`[agent-service] [req ${reqId}]   Thinking (${thinking.length} chars):`)
                        console.log(`[agent-service] [req ${reqId}]   "${thinking.slice(0, 300)}${thinking.length > 300 ? '...' : ''}"`)
                      }
                    })
                  } else {
                    console.log(`[agent-service] [req ${reqId}] Content is not an array:`, rawMessage?.content)
                  }

                  // 提取并发送文本内容
                  const text = getTextFromAssistantMessage(assistantMsg)
                  if (text && text.trim().length > 0) {
                    console.log(`[agent-service] [req ${reqId}] Sending SSE text event (${text.length} chars)`)
                    if (
                      !safeEnqueue({
                        type: 'text',
                        content: text,
                        timestamp: Date.now(),
                      })
                    ) {
                      console.warn(`[agent-service] [req ${reqId}] Failed to enqueue text event, breaking loop`)
                      break
                    }
                  } else {
                    console.log(`[agent-service] [req ${reqId}] No text content to send (likely tool_use only)`)
                  }

                  // 🔥 发送 tool_use 事件（让 backend 可以提取代码）
                  if (Array.isArray(rawMessage?.content)) {
                    for (const block of rawMessage.content) {
                      if (block.type === 'tool_use') {
                        console.log(`[agent-service] [req ${reqId}] Sending SSE tool_use event: ${block.name}`)
                        if (
                          !safeEnqueue({
                            type: 'tool_use',
                            tool: block.name,
                            input: block.input,
                            id: block.id,
                            timestamp: Date.now(),
                          })
                        ) {
                          console.warn(`[agent-service] [req ${reqId}] Failed to enqueue tool_use event`)
                          break
                        }
                      }
                    }
                  }
                }

                // 🔥 详细打印 user 消息（包含 tool_result）
                if (msgType === 'user') {
                  const userMsg = msg as UserMessage

                  console.log(`[agent-service] [req ${reqId}] User message:`)

                  if (Array.isArray(rawMessage?.content)) {
                    console.log(`[agent-service] [req ${reqId}] Content blocks (${rawMessage.content.length} blocks):`)

                    rawMessage.content.forEach((block: any, idx: number) => {
                      console.log(`[agent-service] [req ${reqId}] Block[${idx}] type: ${block.type}`)

                      if (block.type === 'tool_result') {
                        console.log(`[agent-service] [req ${reqId}]   Tool result:`)
                        console.log(`[agent-service] [req ${reqId}]     - tool_use_id: ${block.tool_use_id}`)
                        console.log(`[agent-service] [req ${reqId}]     - is_error: ${block.is_error}`)

                        const contentStr = typeof block.content === 'string'
                          ? block.content
                          : JSON.stringify(block.content)

                        console.log(`[agent-service] [req ${reqId}]     - content length: ${contentStr.length} chars`)
                        console.log(`[agent-service] [req ${reqId}]     - content preview:`)
                        console.log(contentStr.slice(0, 1000))
                        if (contentStr.length > 1000) {
                          console.log(`[agent-service] [req ${reqId}]     ... (truncated, ${contentStr.length - 1000} more chars)`)
                        }

                        // 🔥 发送 tool_result 事件（让 backend 可以显示输出）
                        console.log(`[agent-service] [req ${reqId}] Sending SSE tool_result event`)
                        safeEnqueue({
                          type: 'tool_result',
                          tool_use_id: block.tool_use_id,
                          result: contentStr,
                          is_error: block.is_error,
                          timestamp: Date.now(),
                        })

                      } else if (block.type === 'text') {
                        const text = block.text || ''
                        console.log(`[agent-service] [req ${reqId}]   Text (${text.length} chars): "${text.slice(0, 200)}..."`)
                      }
                    })
                  } else if (typeof rawMessage?.content === 'string') {
                    console.log(`[agent-service] [req ${reqId}] Content (string): "${rawMessage.content.slice(0, 200)}..."`)
                  } else {
                    console.log(`[agent-service] [req ${reqId}] Content:`, rawMessage?.content)
                  }
                }

                console.log(`[agent-service] [req ${reqId}] =============================`)
              }

              } catch (queryErr: any) {
                // 🔥 query 执行过程中的错误（比如工具执行失败等）
                console.error(
                  `[agent-service] [req ${reqId}] Error during query execution:`,
                  queryErr,
                )
                // 这里的错误会被外层 catch 捕获处理
                throw queryErr
              }

              // 🔥 清除心跳定时器
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
                console.log(
                  `[agent-service] [req ${reqId}] Cleared heartbeat timer (sent ${heartbeatCount} heartbeats)`,
                )
              }

              if (!closed) {
                safeEnqueue({
                  type: 'done',
                  metadata: {
                    model: toolUseContext.options.model ?? 'main',
                    timestamp: Date.now(),
                  },
                })
                try {
                  controller.close()
                } catch {}
                closed = true
                console.log(
                  `[agent-service] [req ${reqId}] stream done and closed`,
                )
              }
            } catch (err: any) {
              // 🔥 在错误情况下也清除心跳定时器
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
                console.log(
                  `[agent-service] [req ${reqId}] Cleared heartbeat timer due to error (sent ${heartbeatCount} heartbeats)`,
                )
              }

              const name = (err && (err.name || err.code)) ?? ''
              // 客户端中断 / abort 不视为致命错误
              if (
                name === 'AbortError' ||
                name === 'ABORT_ERR' ||
                (typeof err === 'object' && (err as any).code === 20)
              ) {
                console.warn(
                  `[agent-service] [req ${reqId}] stream aborted by client`,
                )
                try {
                  controller.close()
                } catch {}
                closed = true
                return
              }

              console.error(
                `[agent-service] [req ${reqId}] stream error:`,
                err,
              )
              if (!closed) {
                safeEnqueue({
                  type: 'error',
                  error: 'INTERNAL_ERROR',
                  message: String(err?.message ?? err),
                  timestamp: Date.now(),
                })
                try {
                  controller.close()
                } catch {}
                closed = true
              }
            }
          }

          run().catch((err) => {
            console.error(
              `[agent-service] [req ${reqId}] unhandled error in run():`,
              err,
            )
            try {
              controller.close()
            } catch {}
          })
        },

        // 客户端主动关闭 SSE 时会调用这里
        cancel() {
          console.warn(
            `[agent-service] [req ${reqId}] stream cancelled by client`,
          )
          // 不再调用 abortController.abort()，避免 ABORT_ERR 直接炸服务
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    }

    // 未匹配路由
    return new Response('Not found', { status: 404 })
  },
})
