import { Hono } from '@hono/hono'
import { serveStatic } from '@hono/hono/deno'
import { upgradeWebSocket } from '@hono/hono/deno'

const app = new Hono()

// Store WebSocket connections for live reload
const reloadConnections = new Set<WebSocket>()

app.use('/favicon.ico', serveStatic({ path: './public/favicon.ico' }))

// WebSocket endpoint for live reload
app.get('/ws/reload', upgradeWebSocket((_c) => {
  return {
    onOpen: (_event, ws) => {
      console.log('🤝 Live reload client connected')
      reloadConnections.add(ws.raw!)
    },
    onClose: (_event, ws) => {
      console.log('👋 Live reload client disconnected')
      reloadConnections.delete(ws.raw!)
    },
    onError: (event, ws) => {
      console.log('🤷‍♂️ Live reload WebSocket error:', event)
      reloadConnections.delete(ws.raw!)
    }
  }
}))

// API endpoint to trigger reload (called by build script)
app.post('/api/reload', (c) => {
  console.log('👍 Triggering reload for', reloadConnections.size, 'clients')

  for (const ws of reloadConnections) {
    try {
      ws.send('reload')
    } catch (error) {
      console.log('🚩 Error sending reload signal:', error)
      reloadConnections.delete(ws)
    }
  }

  return c.json({ success: true, clients: reloadConnections.size })
})

// Serve the main HTML file
app.use('/*', serveStatic({ root: './static/' }));
app.get('/', serveStatic({ path: './static/index.html' }));
app.get('*', serveStatic({ path: './static/404.html' }));
// app.get('/*', serveStatic({
//   path: './static/*',
//   mimes: {
//     js: 'application/javascript'
//   }
// }))

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Start server
const port = 3000
console.log(`🚀 Server starting on http://localhost:${port}`)
console.log(`🎮 Game available at http://localhost:${port}`)
console.log(`⚡ Live reload enabled`)

Deno.serve({ port }, app.fetch)