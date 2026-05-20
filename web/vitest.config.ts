import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
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
          'setupProxy.js',
          'src/test/**',
          'src/serviceWorker.js',
          // Entry points (covered by integration tests)
          'src/main.tsx',
          'src/app/globals.ts',
          // Type definition files
          'src/shared/types/**',
          'src/i18n/**',
          'src/vite-env.d.ts',
          'src/styles.d.ts',
          // Barrel files (only re-exports, no real code to cover)
          'src/features/**/index.ts',
          'src/shared/**/index.ts',
          'src/features/lineage/components/graph/types.ts',
        ],
      },
    },
  })
)
