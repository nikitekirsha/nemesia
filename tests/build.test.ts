import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, test } from 'vitest'

interface PackageJson {
	name?: string
	type?: string
	sideEffects?: boolean
	engines?: Record<string, string>
	main?: string
	module?: string
	types?: string
	unpkg?: string
	jsdelivr?: string
	exports?: Record<string, Record<string, string>>
	files?: string[]
	scripts?: Record<string, string>
	dependencies?: Record<string, string>
}

const packageJsonPath = resolve(process.cwd(), 'package.json')

async function readPackageJson(): Promise<PackageJson> {
	return JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson
}

describe('package build contract', () => {
	test('publishes a side-effect-free ESM package without runtime dependencies', async () => {
		const packageJson = await readPackageJson()

		expect(packageJson.name).toBe('nemesia')
		expect(packageJson.type).toBe('module')
		expect(packageJson.sideEffects).toBe(false)
		expect(packageJson.dependencies ?? {}).toEqual({})
	})

	test('maps the package entry points to the built artifacts', async () => {
		const packageJson = await readPackageJson()

		expect(packageJson.main).toBe('./dist/nemesia.js')
		expect(packageJson.module).toBe('./dist/nemesia.js')
		expect(packageJson.types).toBe('./dist/index.d.ts')
		expect(packageJson.unpkg).toBe('./dist/nemesia.umd.js')
		expect(packageJson.jsdelivr).toBe('./dist/nemesia.umd.js')
		expect(packageJson.exports?.['.']).toEqual({
			types: './dist/index.d.ts',
			import: './dist/nemesia.js',
			default: './dist/nemesia.js'
		})
	})

	test('ships only release files and declares the Node version required by Vite', async () => {
		const packageJson = await readPackageJson()

		expect(packageJson.files).toEqual(expect.arrayContaining(['dist', 'docs', 'README.md']))
		expect(packageJson.engines?.node).toBe('^20.19.0 || >=22.12.0')
	})

	test('builds bundles and declarations before checking consumers and artifacts', async () => {
		const packageJson = await readPackageJson()
		const build = packageJson.scripts?.build ?? ''
		const phases = [
			'vite build',
			'vite build --config vite.umd.config.ts',
			'tsc -p tsconfig.build.json',
			'tsc -p tests/consumer/tsconfig.json',
			'node --test scripts/verify-build.test.mjs',
			'node scripts/verify-build.mjs'
		]

		for (const phase of phases) expect(build).toContain(phase)
		for (let index = 1; index < phases.length; index += 1) {
			expect(build.indexOf(phases[index] as string)).toBeGreaterThan(build.indexOf(phases[index - 1] as string))
		}
	})
})
