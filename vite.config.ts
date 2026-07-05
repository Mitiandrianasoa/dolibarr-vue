// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/local-api': {
        target: 'http://localhost:8000/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/local-api/, ''),
      },
      '/api': {
        target: 'http://localhost/dolibarr-23.0.3/htdocs/api/index.php',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // ⭐ Ajouter ces options pour éviter les problèmes
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Supprimer l'encodage pour éviter les problèmes de compression
            proxyReq.removeHeader('Accept-Encoding')
          })
        }
      }
    }
  }
})