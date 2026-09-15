import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

const apiTarget =
  process.env.MARQUEZ_HOST && process.env.MARQUEZ_PORT
    ? `http://${process.env.MARQUEZ_HOST}:${process.env.MARQUEZ_PORT}`
    : 'http://localhost:8080'

const apiProxy = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    process.env.ANALYZE === 'true' && visualizer(),
  ],
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled', '@mui/material/Tooltip'],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // elkjs tries to require 'web-worker' in Node.js environments
      // but we're in a browser, so we can safely ignore it
      'web-worker': path.resolve(__dirname, 'src/shared/utils/web-worker-stub.ts'),
    },
  },
  server: {
    port: 1337,
    open: true,
    proxy: apiProxy,
  },
  // `vite preview` serves dist/ in the Docker image; it needs the same API proxy.
  preview: {
    port: Number(process.env.WEB_PORT) || 3000,
    host: true,
    proxy: apiProxy,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers', '@mui/x-charts'],
          'vis-vendor': ['d3-selection', 'd3-zoom', 'reactflow'],
        },
      },
    },
  },
  define: {
    __API_URL__: JSON.stringify('/api/v2'),
    __API_BETA_URL__: JSON.stringify('/api/v2beta'),
    __FEEDBACK_FORM_URL__: JSON.stringify('https://forms.gle/f3tTSrZ8wPj3sHTA7'),
    __REACT_APP_ADVANCED_SEARCH__: false,
    __API_DOCS_URL__: JSON.stringify('https://marquezproject.github.io/marquez/openapi.html'),
    __TEMP_ACTOR_STR__: JSON.stringify('me'),
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]__[hash:base64:5]',
    },
  },
})
