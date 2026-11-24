import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const api = process.env.MBX_API_URL || 'http://127.0.0.1:8000'
const apiProxy = { '/api': api, '/sanctum': api }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The admin must be served from an origin Laravel trusts for cookie sign-in (SANCTUM_STATEFUL_DOMAINS).
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
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
