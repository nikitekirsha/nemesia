import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/umd.ts',
      name: 'Nemesia',
      formats: ['umd'],
      fileName: () => 'nemesia.umd.js',
    },
    rollupOptions: {
      output: {
        exports: 'default',
      },
    },
    sourcemap: true,
  },
})
