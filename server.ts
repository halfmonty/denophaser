import { Hono } from 'hono'
import { serveStatic } from '@hono/hono/deno'
import { upgradeWebSocket } from '@hono/hono/deno'

const app = new Hono()

// Store WebSocket connections for live reload
const reloadConnections = new Set<WebSocket>()

// Serve static files from public directory
app.get('/static/*', async (c) => {
  const filePath = c.req.path.replace('/static/', '')
  const fullPath = `./public/${filePath}`
  
  try {
    const file = await Deno.readFile(fullPath)
    
    // Set proper MIME type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    let contentType = 'text/plain'
    
    switch (ext) {
      case 'js':
        contentType = 'application/javascript'
        break
      case 'css':
        contentType = 'text/css'
        break
      case 'html':
        contentType = 'text/html'
        break
      case 'json':
        contentType = 'application/json'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'svg':
        contentType = 'image/svg+xml'
        break
    }
    
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    return c.notFound()
  }
})
app.use('/favicon.ico', serveStatic({ path: './public/favicon.ico' }))

// WebSocket endpoint for live reload
app.get('/ws/reload', upgradeWebSocket((c) => {
  return {
    onOpen: (event, ws) => {
      console.log('🔄 Live reload client connected')
      reloadConnections.add(ws)
    },
    onClose: (event, ws) => {
      console.log('🔄 Live reload client disconnected')
      reloadConnections.delete(ws)
    },
    onError: (event, ws) => {
      console.log('🔄 Live reload WebSocket error:', event)
      reloadConnections.delete(ws)
    }
  }
}))

// API endpoint to trigger reload (called by build script)
app.post('/api/reload', async (c) => {
  console.log('🔄 Triggering reload for', reloadConnections.size, 'clients')
  
  for (const ws of reloadConnections) {
    try {
      ws.send('reload')
    } catch (error) {
      console.log('🔄 Error sending reload signal:', error)
      reloadConnections.delete(ws)
    }
  }
  
  return c.json({ success: true, clients: reloadConnections.size })
})

// Serve the main HTML file
app.get('/', serveStatic({ path: './src/static/index.html' }))

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Start server
const port = 3000
console.log(`🚀 Server starting on http://localhost:${port}`)
console.log(`🎮 Game available at http://localhost:${port}`)
console.log(`🔄 Live reload enabled`)

Deno.serve({ port }, app.fetch)