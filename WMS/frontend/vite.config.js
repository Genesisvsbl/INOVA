import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react/jsx-runtime': fileURLToPath(new URL('./node_modules/react/jsx-runtime.js', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      'react-dom/client': fileURLToPath(new URL('./node_modules/react-dom/client.js', import.meta.url)),
      'lucide-react': fileURLToPath(new URL('./node_modules/lucide-react', import.meta.url)),
      recharts: fileURLToPath(new URL('./node_modules/recharts', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'lucide-react', 'recharts'],
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
    proxy: {
      '/api/send-approval-email': {
        target: 'https://inova-delta.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
