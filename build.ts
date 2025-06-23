import * as esbuild from 'esbuild'

// Configuration for esbuild
const buildConfig = {
  entryPoints: ['src/game/main.ts'],
  bundle: true,
  outfile: 'public/game.js',
  format: 'esm' as const,
  target: 'es2020',
  sourcemap: true,
  minify: false, // Set to true for production
  external: [], // Add any external dependencies here
  define: {
    'process.env.NODE_ENV': '"development"'
  }
}

// For Prod
// const buildConfig = {
//   // ... other config
//   minify: true,
//   sourcemap: false,
//   define: {
//     'process.env.NODE_ENV': '"production"'
//   }
// }

// Function to trigger reload via server API
async function triggerReload() {
  try {
    const response = await fetch('http://localhost:3000/api/reload', {
      method: 'POST'
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`🔄 Reload triggered for ${data.clients} clients`)
    }
  } catch (error) {
    // Server might not be running yet, ignore the error
    console.log('🔄 Could not trigger reload (server not ready)')
  }
}

// Build function
async function buildGame() {
  try {
    console.log('🔨 Building game...')
    
    await esbuild.build(buildConfig)
    
    console.log('✅ Build complete!')
    
    // Trigger reload if this is a rebuild (not initial build)
    if (Deno.args.includes('--reload')) {
      await triggerReload()
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error)
    Deno.exit(1)
  }
}

// Watch mode
async function watchMode() {
  console.log('👀 Starting watch mode...')
  
  // Initial build
  await buildGame()
  
  // Watch for file changes
  const watcher = Deno.watchFs(['src/'], { recursive: true })
  
  let buildTimeout: number | null = null
  
  for await (const event of watcher) {
    if (event.kind === 'modify' && event.paths.some(path => path.endsWith('.ts'))) {
      console.log('📝 File changed:', event.paths)
      
      // Debounce builds
      if (buildTimeout) {
        clearTimeout(buildTimeout)
      }
      
      buildTimeout = setTimeout(async () => {
        console.log('🔨 Rebuilding...')
        await esbuild.build(buildConfig)
        console.log('✅ Rebuild complete!')
        await triggerReload()
      }, 100)
    }
  }
}

// Main execution
if (import.meta.main) {
  const args = Deno.args
  
  if (args.includes('--watch')) {
    await watchMode()
  } else {
    await buildGame()
  }
  
  // Clean up esbuild
  await esbuild.stop()
}