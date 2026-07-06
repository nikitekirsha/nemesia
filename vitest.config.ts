import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [
      ...configDefaults.exclude,
      'scripts/verify-build.test.mjs',
    ],
    setupFiles: ['./tests/setup.ts'],
  },
})
