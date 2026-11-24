import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/sanctum': 'http://127.0.0.1:8000',
    },
  },
  optimizeDeps: {
    // Avoid scanning optional chart engines and the whole icon catalog on first boot.
    noDiscovery: true,
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom/client',
      'react-router-dom',
      'radix-ui',
      'cmdk',
      'sonner',
      '@tanstack/react-query',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'recharts',
      'zod',
      'decimal.js',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'axios',
    ],
  },
})
