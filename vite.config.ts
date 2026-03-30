import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'Nemesia',
      formats: ['es', 'umd'],
      fileName: (format) => {
        if (format === 'es') {
          return 'nemesia.js'
        }

        return 'nemesia.umd.js'
      }
    },
    sourcemap: true,
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  }
})
