import { Hono } from '@hono/hono';
import { serveStatic } from '@hono/hono/deno';
import rtc from './rtc/rtcMessaging.ts';
import { reloadApi, reloadWS } from './reload/reload.ts';

const isDenoDeploy = Deno.env.get( 'DENO_DEPLOYMENT_ID' ) !== undefined;
const app = new Hono();

const port = 3000;
console.log( `🚀 Server starting on http://localhost:${port}` );
console.log( `🎮 Game available at http://localhost:${port}` );

// RTC WebSocket Endpoint
app.route( '/ws', rtc );

if ( !isDenoDeploy ) {
	console.log( `⚡ Live reload enabled` );
	// WebSocket endpoint for live reload
	app.route( '/ws/reload', reloadWS );
	// API endpoint to trigger reload (called by build script)
	app.route( '/api/reload', reloadApi );
}

// Serve the main HTML file
app.use( '/*', serveStatic( { root: './static/' } ) );
app.get( '/', serveStatic( { path: './static/index.html' } ) );
app.get( '*', serveStatic( { path: './static/404.html' } ) );

// Health check endpoint
app.get(
	'/health',
	( c ) => c.json( { status: 'ok', timestamp: new Date().toISOString() } ),
);

// Start server
Deno.serve( { port }, app.fetch );
