import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

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
      // elkjs tries to require 'web-worker' in Node.js environments
      // but we're in a browser, so we can safely ignore it
      'web-worker': path.resolve(__dirname, 'src/helpers/web-worker-stub.ts'),
    },
  },
  server: {
    port: 1337,
    open: true,
    proxy: {
      '/api': {
        target: process.env.MARQUEZ_HOST && process.env.MARQUEZ_PORT
          ? `http://${process.env.MARQUEZ_HOST}:${process.env.MARQUEZ_PORT}`
          : 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers', '@mui/x-charts'],
          'vis-vendor': ['d3-selection', 'd3-transition', 'd3-zoom', 'reactflow', 'elkjs'],
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
