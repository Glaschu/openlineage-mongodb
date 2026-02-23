import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/setupTests.ts'],
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/__tests__/**',
          '**/coverage/**',
          // Root config files
          '.eslintrc.js',
          '.prettierrc.js',
          'styles.d.ts',
          '*.config.ts',
          '*.config.js',
          // Setup and config files
          'globalSetup.ts',
          'setupEnzyme.ts',
          'setupJest.ts',
          'setupProxy.js',
          'src/setupTests.ts',
          'src/serviceWorker.js',
          // Entry points (covered by integration tests)
          'src/index.tsx',
          'src/globals.ts',
          // Type definition files
          'src/types/**',
          'src/i18n/config.ts',
          'src/vite-env.d.ts',
          'src/styles.d.ts',
        ],
      },
    },
  })
)
