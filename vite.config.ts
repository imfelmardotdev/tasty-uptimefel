import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:3001', // Your backend server address
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] Sending request ${req.method} ${req.url} to target ${options.target}${proxyReq.path}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Vite Proxy] Received response ${proxyRes.statusCode} for ${req.url}`);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy] Error:', err);
          });
        },
        // rewrite: (path) => path.replace(/^\/api/, '') // Optional: remove /api prefix if backend doesn't expect it
      },
    },
  },
})
