import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Découpage du bundle en vendor chunks (meilleur cache, build sous la
    // limite d'alerte de Vite sur Vercel).
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase/')) return 'firebase'
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/jspdf-autotable') ||
            id.includes('node_modules/html2canvas')
          )
            return 'pdf'
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) return 'charts'
          if (id.includes('node_modules/lucide-react/')) return 'icons'
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/sonner') ||
            id.includes('node_modules/class-variance-authority') ||
            id.includes('node_modules/tailwind-merge') ||
            id.includes('node_modules/clsx')
          )
            return 'vendor'
          return undefined
        },
      },
    },
  },
})