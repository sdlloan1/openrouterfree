import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const previewMode = process.env.BASE44_PREVIEW_MODE === '1'

// In the Base44 sandbox the dev server is reached through a rotating public
// hostname, so the preview host has to be allowlisted. Without the preview
// flag the original, permissive-free defaults apply.
const allowedHosts = ['localhost', '127.0.0.1']
if (previewMode) {
  const sandboxDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN
  if (sandboxDomain) allowedHosts.push(`.${sandboxDomain}`)
  const extra = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
  if (extra) allowedHosts.push(...extra.split(',').map((host) => host.trim()).filter(Boolean))
}

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project under /openrouterfree/, so production
  // asset URLs need that prefix. `vite dev` keeps serving from /.
  base: command === 'build' ? '/openrouterfree/' : '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts,
    watch: previewMode ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      '/api': {
        target: process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
    ...(previewMode ? { hmr: { clientPort: 443 } } : {}),
  },
}))
