export const prompt = `
# Ocean Dashboard Tool

This tool manages a real-time web dashboard for ocean machine learning workflows.

## Features

The dashboard provides real-time visualization of:
- **Training Progress**: Live metrics, loss curves, and epoch information
- **Model Information**: Architecture details, variable counts, model name
- **Data Information**: Dataset size, feature list, data shapes
- **Visualizations**: Dynamic plots, charts, and graphics
- **Training Curves**: Real-time loss and metric plots
- **Logs**: Timestamped log messages with different severity levels

## Actions

### start
Start the dashboard server on the specified port.

**Parameters:**
- \`port\` (optional): Port number (default: 3737)

**Example:**
\`\`\`json
{
  "action": "start",
  "port": 3737
}
\`\`\`

### stop
Stop the dashboard server.

**Example:**
\`\`\`json
{
  "action": "stop"
}
\`\`\`

### status
Check if the dashboard is currently running.

**Example:**
\`\`\`json
{
  "action": "status"
}
\`\`\`

### url
Get the dashboard URL (if running).

**Example:**
\`\`\`json
{
  "action": "url"
}
\`\`\`

## Integration with Other Tools

Other ocean tools can update the dashboard in real-time by using the dashboard server API:

\`\`\`typescript
import { getDashboardServer } from '@services/oceanDashboard/dashboardServer'

const dashboard = getDashboardServer()
if (dashboard.getIsRunning()) {
  // Update training progress
  dashboard.updateData({
    training: {
      epoch: 10,
      loss: 0.25,
      metrics: { accuracy: 0.95 },
      progress: 50
    }
  })
  
  // Add a log message
  dashboard.addLog('info', 'Training started')
  
  // Add a visualization
  dashboard.addVisualization('loss-curve', 'line', {
    x: [1, 2, 3, 4, 5],
    y: [0.5, 0.4, 0.3, 0.28, 0.25]
  })
}
\`\`\`

## Usage Tips

1. **Start before training**: Launch the dashboard before starting ML workflows
2. **Keep it running**: The dashboard persists data until explicitly stopped
3. **Real-time updates**: All connected browsers update automatically via WebSocket
4. **Multiple clients**: Multiple browsers can connect to the same dashboard
5. **API access**: Use the REST API for programmatic updates

## Dashboard URL

Once started, access the dashboard at:
- Default: \`http://localhost:3737\`
- Custom port: \`http://localhost:{port}\`

## REST API Endpoints

- \`GET /api/status\` - Get server status
- \`GET /api/data\` - Get current dashboard data
- \`POST /api/update\` - Update dashboard data
- \`POST /api/log\` - Add log message
- \`POST /api/visualization\` - Add visualization

## WebSocket

The dashboard uses WebSocket for real-time updates. Connect to \`ws://localhost:{port}\` to receive live updates.
`
