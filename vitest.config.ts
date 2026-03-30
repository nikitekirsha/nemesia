import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: ['index.ts', 'src/**/*.ts'],
      exclude: ['src/types/**/*.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
})
