import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		emptyOutDir: false,
		lib: {
			entry: 'src/umd.ts',
			name: 'Nemesia',
			formats: ['umd'],
			fileName: () => 'nemesia.umd.js'
		},
		rollupOptions: {
			output: {
				exports: 'default'
			}
		},
		// This is the file browsers download as is, so it gets the minifier that packs it tightest.
		minify: 'terser',
		terserOptions: {
			ecma: 2020,
			compress: { passes: 2 }
		},
		sourcemap: true
	}
})
