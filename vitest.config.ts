import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom',
		exclude: [...configDefaults.exclude, 'scripts/verify-build.test.mjs'],
		setupFiles: ['./tests/setup.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			// Type-only modules have nothing to run, and the UMD entry is exercised by scripts/verify-build.mjs.
			exclude: ['src/**/types.ts', 'src/umd.ts'],
			reporter: ['text', 'html'],
			// Every statement and branch of the runtime is exercised. Code that cannot be reached is removed, not ignored.
			thresholds: { 100: true }
		}
	}
})
