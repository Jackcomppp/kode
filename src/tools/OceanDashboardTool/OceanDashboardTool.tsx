/**
 * Ocean Dashboard Tool
 *
 * Manages the real-time web dashboard for ocean ML workflows
 */

import { z } from 'zod'
import { Tool } from '@tool'
import { startDashboard, stopDashboard, getDashboardServer } from '@services/oceanDashboard/dashboardServer'
import { Text, Box } from 'ink'
import React from 'react'
import { createAssistantMessage } from '@utils/messages'

export const inputSchema = z.strictObject({
  action: z.enum(['start', 'stop', 'status', 'url']).describe('Dashboard action: start, stop, status, or get URL'),
  port: z.number().optional().default(3737).describe('Port number for the dashboard server (default: 3737)')
})

type In = typeof inputSchema
export type Out = {
  action: string
  url?: string
  status: string
  port?: number
}

export const OceanDashboardTool = {
  name: 'ocean_dashboard',

  async description() {
    return 'Start, stop, or check status of the Ocean ML real-time web dashboard for monitoring training progress, visualizations, and metrics'
  },

  async prompt() {
    return `
# Ocean Dashboard Tool

This tool manages a real-time web dashboard for ocean machine learning workflows.

## Usage

The dashboard provides real-time visualization of:
- Training progress and metrics
- Model architecture and variables
- Data information
- Visualizations (plots, charts, etc.)
- Training curves
- Logs

## Actions

- **start**: Start the dashboard server
- **stop**: Stop the dashboard server
- **status**: Check if dashboard is running
- **url**: Get the dashboard URL

## Examples

Start the dashboard on default port (3737):
\`\`\`
{
  "action": "start"
}
\`\`\`

Start on custom port:
\`\`\`
{
  "action": "start",
  "port": 8080
}
\`\`\`

Get dashboard URL:
\`\`\`
{
  "action": "url"
}
\`\`\`

## Notes

- The dashboard runs on http://localhost:PORT
- It persists state between restarts
- Other tools can update dashboard data via the dashboard server
- The dashboard uses WebSocket for real-time updates
`
  },

  isReadOnly() {
    return false
  },

  isConcurrencySafe() {
    return true // Dashboard tool is safe for concurrent calls
  },

  inputSchema,

  userFacingName() {
    return 'Ocean Dashboard'
  },

  async isEnabled() {
    return true
  },

  needsPermissions(): boolean {
    return false // Dashboard is safe, no permissions needed
  },

  renderToolUseMessage({ action, port }) {
    return `Managing Ocean Dashboard: ${action}${port ? ` (port ${port})` : ''}`
  },

  renderResultForAssistant(output: Out) {
    let result = `Dashboard action '${output.action}' completed. Status: ${output.status}`
    if (output.url) {
      result += `\nDashboard URL: ${output.url}`
    }
    if (output.port) {
      result += `\nPort: ${output.port}`
    }
    return result
  },

  renderToolResultMessage(content: Out) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan" bold>Ocean Dashboard</Text>
        <Text>Action: <Text color="green">{content.action}</Text></Text>
        <Text>Status: <Text color={content.status === 'running' ? 'green' : 'yellow'}>{content.status}</Text></Text>
        {content.url && (
          <Text>
            URL: <Text color="blue" underline>{content.url}</Text>
          </Text>
        )}
        {content.port && (
          <Text>Port: {content.port}</Text>
        )}
      </Box>
    )
  },

  async *call({ action, port }, { abortController }) {
    let result: Out

    try {
      switch (action) {
        case 'start': {
          yield {
            type: 'progress' as const,
            content: createAssistantMessage(`Starting Ocean Dashboard on port ${port}...`)
          }

          const server = await startDashboard(port)
          const url = server.getURL()

          result = {
            action: 'start',
            status: 'running',
            url,
            port
          }

          yield {
            type: 'progress' as const,
            content: createAssistantMessage(`Dashboard started successfully at ${url}`)
          }
          break
        }

        case 'stop': {
          yield {
            type: 'progress' as const,
            content: createAssistantMessage('Stopping Ocean Dashboard...')
          }

          await stopDashboard()

          result = {
            action: 'stop',
            status: 'stopped'
          }

          yield {
            type: 'progress' as const,
            content: createAssistantMessage('Dashboard stopped')
          }
          break
        }

        case 'status': {
          const server = getDashboardServer(port)
          const isRunning = server.getIsRunning()
          const url = isRunning ? server.getURL() : undefined

          result = {
            action: 'status',
            status: isRunning ? 'running' : 'stopped',
            url,
            port: isRunning ? port : undefined
          }
          break
        }

        case 'url': {
          const server = getDashboardServer(port)
          const isRunning = server.getIsRunning()

          if (!isRunning) {
            result = {
              action: 'url',
              status: 'stopped'
            }
          } else {
            result = {
              action: 'url',
              status: 'running',
              url: server.getURL(),
              port
            }
          }
          break
        }

        default:
          throw new Error(`Unknown action: ${action}`)
      }

      yield {
        type: 'result' as const,
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result = {
        action,
        status: 'error'
      }

      yield {
        type: 'result' as const,
        data: result,
        resultForAssistant: `Dashboard error: ${errorMessage}`
      }
    }
  }
} satisfies Tool<In, Out>
