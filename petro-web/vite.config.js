import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (process.env.VERCEL) {
    let api
    try { api = new URL(env.VITE_API_URL || '') } catch { throw new Error('Set VITE_API_URL in Vercel to your HTTPS API base URL ending in /api') }
    if (api.protocol !== 'https:' || api.hostname === 'localhost' || api.username || api.password || !api.pathname.replace(/\/$/, '').endsWith('/api') || api.search || api.hash) throw new Error('VITE_API_URL must be an HTTPS API URL ending in /api')
  }
  return { plugins: [react()] }
})
