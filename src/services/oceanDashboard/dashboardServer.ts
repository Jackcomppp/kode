/**
 * Ocean ML Dashboard Server
 * 
 * Real-time web dashboard for monitoring ocean ML workflows
 * Uses Express + WebSocket for live updates
 */

import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'

interface DashboardData {
  training?: {
    epoch?: number
    loss?: number
    metrics?: Record<string, number>
    progress?: number
  }
  model?: {
    name?: string
    architecture?: string
    variables?: number
  }
  data?: {
    samples?: number
    features?: string[]
    shape?: number[]
  }
  visualizations?: Array<{
    id: string
    type: string
    data: any
    timestamp: number
  }>
  logs?: Array<{
    timestamp: number
    level: string
    message: string
  }>
}

class DashboardServer {
  private app: express.Application | null = null
  private server: ReturnType<typeof createServer> | null = null
  private wss: WebSocketServer | null = null
  private port: number = 3737
  private isRunning: boolean = false
  private clients: Set<WebSocket> = new Set()
  private dashboardData: DashboardData = {}

  constructor() {}

  start(port: number = 3737): Promise<DashboardServer> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve(this)
        return
      }

      this.port = port
      this.app = express()

      // Middleware
      this.app.use(express.json())
      this.app.use(express.static(path.join(__dirname, 'public')))

      // API Routes
      this.app.get('/api/status', (req, res) => {
        res.json({ status: 'running', port: this.port })
      })

      this.app.get('/api/data', (req, res) => {
        res.json(this.dashboardData)
      })

      this.app.post('/api/update', (req, res) => {
        this.updateData(req.body)
        res.json({ success: true })
      })

      this.app.post('/api/log', (req, res) => {
        const { level = 'info', message } = req.body
        this.addLog(level, message)
        res.json({ success: true })
      })

      this.app.post('/api/visualization', (req, res) => {
        const { id, type, data } = req.body
        this.addVisualization(id, type, data)
        res.json({ success: true })
      })

      // Create HTTP server
      this.server = createServer(this.app)

      // WebSocket server
      this.wss = new WebSocketServer({ server: this.server })

      this.wss.on('connection', (ws: WebSocket) => {
        this.clients.add(ws)
        
        // Send current data to new client
        ws.send(JSON.stringify({
          type: 'init',
          data: this.dashboardData
        }))

        ws.on('close', () => {
          this.clients.delete(ws)
        })

        ws.on('error', (error) => {
          console.error('WebSocket error:', error)
          this.clients.delete(ws)
        })
      })

      // Start server
      this.server.listen(port, () => {
        this.isRunning = true
        console.log(`Ocean Dashboard running at http://localhost:${port}`)
        resolve(this)
      })

      this.server.on('error', (error) => {
        this.isRunning = false
        reject(error)
      })
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve()
        return
      }

      // Close all WebSocket connections
      this.clients.forEach(client => {
        client.close()
      })
      this.clients.clear()

      // Close WebSocket server
      if (this.wss) {
        this.wss.close()
      }

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          this.isRunning = false
          this.app = null
          this.server = null
          this.wss = null
          console.log('Ocean Dashboard stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  updateData(data: Partial<DashboardData>) {
    this.dashboardData = {
      ...this.dashboardData,
      ...data
    }
    this.broadcast({
      type: 'update',
      data: this.dashboardData
    })
  }

  addLog(level: string, message: string) {
    if (!this.dashboardData.logs) {
      this.dashboardData.logs = []
    }
    this.dashboardData.logs.push({
      timestamp: Date.now(),
      level,
      message
    })
    // Keep only last 100 logs
    if (this.dashboardData.logs.length > 100) {
      this.dashboardData.logs = this.dashboardData.logs.slice(-100)
    }
    this.broadcast({
      type: 'log',
      data: { level, message, timestamp: Date.now() }
    })
  }

  addVisualization(id: string, type: string, data: any) {
    if (!this.dashboardData.visualizations) {
      this.dashboardData.visualizations = []
    }
    this.dashboardData.visualizations.push({
      id,
      type,
      data,
      timestamp: Date.now()
    })
    this.broadcast({
      type: 'visualization',
      data: { id, type, data, timestamp: Date.now() }
    })
  }

  private broadcast(message: any) {
    const messageStr = JSON.stringify(message)
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr)
      }
    })
  }

  getURL(): string {
    return `http://localhost:${this.port}`
  }

  getIsRunning(): boolean {
    return this.isRunning
  }

  getData(): DashboardData {
    return this.dashboardData
  }

  clearData() {
    this.dashboardData = {}
    this.broadcast({
      type: 'clear',
      data: {}
    })
  }
}

// Global instance
let globalDashboardServer: DashboardServer | null = null
const dashboardServers: Map<number, DashboardServer> = new Map()

export function getDashboardServer(port: number = 3737): DashboardServer {
  if (!dashboardServers.has(port)) {
    dashboardServers.set(port, new DashboardServer())
  }
  return dashboardServers.get(port)!
}

export async function startDashboard(port: number = 3737): Promise<DashboardServer> {
  const server = getDashboardServer(port)
  await server.start(port)
  globalDashboardServer = server
  return server
}

export async function stopDashboard(port?: number): Promise<void> {
  if (port !== undefined) {
    const server = dashboardServers.get(port)
    if (server) {
      await server.stop()
      dashboardServers.delete(port)
    }
  } else {
    // Stop all servers
    for (const [port, server] of dashboardServers.entries()) {
      await server.stop()
      dashboardServers.delete(port)
    }
    globalDashboardServer = null
  }
}

export function getGlobalDashboard(): DashboardServer | null {
  return globalDashboardServer
}

export { DashboardServer }
export type { DashboardData }

// CLI entry point
if (import.meta.main) {
  const port = parseInt(process.argv[2] || '3737')
  startDashboard(port).then(async (server) => {
    const url = server.getURL()
    console.log(`Dashboard started at: ${url}`)
    
    // Auto-open browser
    try {
      const { spawn } = await import('child_process')
      const platform = process.platform
      
      if (platform === 'win32') {
        spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' }).unref()
      } else if (platform === 'darwin') {
        spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
      } else {
        spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
      }
      
      console.log('Browser opened successfully')
    } catch (error) {
      console.error('Failed to open browser:', error)
      console.log('Please manually open:', url)
    }
  }).catch(console.error)
  
  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\nShutting down dashboard...')
    await stopDashboard()
    process.exit(0)
  })
}
