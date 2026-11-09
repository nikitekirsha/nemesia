import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { gzipSync } from 'node:zlib'

import { verifyStatedSize } from './verify-build-lib.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verifierPath = join(projectRoot, 'scripts/verify-build.mjs')

function runVerifier() {
	return spawnSync(process.execPath, [verifierPath], {
		cwd: projectRoot,
		encoding: 'utf8'
	})
}

async function withMutatedArtifact(relativePath, mutate, verify) {
	const artifactPath = join(projectRoot, relativePath)
	const original = await readFile(artifactPath, 'utf8')

	try {
		await writeFile(artifactPath, mutate(original))
		await verify(runVerifier())
	} finally {
		await writeFile(artifactPath, original)
	}
}

function outputOf(result) {
	return `${result.stdout}\n${result.stderr}`
}

test('rejects a bare type import even when the package is a devDependency', async () => {
	await withMutatedArtifact(
		'dist/index.d.ts',
		source => source.replace('\n//# sourceMappingURL=', '\nimport type {} from "vite";\n//# sourceMappingURL='),
		result => {
			assert.notEqual(result.status, 0)
			assert.match(outputOf(result), /dist[/\\]index\.d\.ts/)
			assert.match(outputOf(result), /vite/)
		}
	)
})

test('rejects every declaration syntax that references a package', async t => {
	const declarations = [
		'export type {} from "vite";',
		'type External = import("vite").UserConfig;',
		'import "vite";',
		'import Vite = require("vite");',
		'/// <reference types="vite" />'
	]

	for (const declaration of declarations) {
		await t.test(declaration, async () => {
			await withMutatedArtifact(
				'dist/index.d.ts',
				source =>
					declaration.startsWith('///')
						? `${declaration}\n${source}`
						: source.replace('\n//# sourceMappingURL=', `\n${declaration}\n//# sourceMappingURL=`),
				result => {
					assert.notEqual(result.status, 0)
					assert.match(outputOf(result), /vite/)
				}
			)
		})
	}
})

test('rejects a type reference regardless of triple-slash attribute order', async () => {
	await withMutatedArtifact(
		'dist/index.d.ts',
		source => `/// <reference preserve="true" types="vite" />\n${source}`,
		result => {
			assert.notEqual(result.status, 0)
			assert.match(outputOf(result), /vite/)
		}
	)
})

test('ignores import examples in declaration JSDoc', async () => {
	await withMutatedArtifact(
		'dist/index.d.ts',
		source =>
			source.replace('\n//# sourceMappingURL=', '\n/** @example import { x } from "vite" */\n//# sourceMappingURL='),
		result => {
			assert.equal(result.status, 0, outputOf(result))
		}
	)
})

test('traverses a relative triple-slash path reference', async () => {
	const declarationPath = join(projectRoot, 'dist/adversarial.d.ts')
	const mapPath = `${declarationPath}.map`

	try {
		await writeFile(declarationPath, 'import type {} from "vite";\n//# sourceMappingURL=adversarial.d.ts.map\n')
		await writeFile(
			mapPath,
			JSON.stringify({
				version: 3,
				file: 'adversarial.d.ts',
				sources: ['../src/index.ts'],
				mappings: 'AAAA'
			})
		)

		await withMutatedArtifact(
			'dist/index.d.ts',
			source => `/// <reference path="./adversarial.d.ts" />\n${source}`,
			result => {
				assert.notEqual(result.status, 0)
				assert.match(outputOf(result), /dist[/\\]adversarial\.d\.ts/)
				assert.match(outputOf(result), /vite/)
			}
		)
	} finally {
		await Promise.allSettled([unlink(declarationPath), unlink(mapPath)])
	}
})

test('rejects malformed JSON in a JavaScript source map', async () => {
	await withMutatedArtifact(
		'dist/nemesia.js.map',
		() => '{ definitely not JSON',
		result => {
			assert.notEqual(result.status, 0)
			assert.match(outputOf(result), /dist[/\\]nemesia\.js\.map/)
		}
	)
})

test('rejects an empty JavaScript source map', async () => {
	await withMutatedArtifact(
		'dist/nemesia.js.map',
		() =>
			JSON.stringify({
				version: 3,
				file: 'nemesia.js',
				sources: [],
				names: [],
				mappings: ''
			}),
		result => {
			assert.notEqual(result.status, 0)
			assert.match(outputOf(result), /sources|mappings/)
		}
	)
})

test('rejects a generated artifact with the wrong sourceMappingURL', async () => {
	await withMutatedArtifact(
		'dist/nemesia.js',
		source => source.replace('//# sourceMappingURL=nemesia.js.map', '//# sourceMappingURL=wrong.js.map'),
		result => {
			assert.notEqual(result.status, 0)
			assert.match(outputOf(result), /sourceMappingURL/)
		}
	)
})

test('does not accept sourceMappingURL text that is not a line directive', async () => {
	await withMutatedArtifact(
		'dist/nemesia.js',
		source =>
			source.replace(
				'//# sourceMappingURL=nemesia.js.map',
				'const sourceMappingURLText = `//# sourceMappingURL=nemesia.js.map'
			),
		result => {
			assert.notEqual(result.status, 0)
			assert.match(outputOf(result), /\[verify-build\].*must end with exactly/)
		}
	)
})

test('rejects a malformed source map for a referenced declaration', async () => {
	await withMutatedArtifact(
		'dist/component/factories.d.ts.map',
		() => 'null',
		result => {
			assert.notEqual(result.status, 0)
			assert.match(outputOf(result), /dist[/\\]component[/\\]factories\.d\.ts\.map/)
		}
	)
})

async function withStatedSize(page, verify) {
	const directory = await mkdtemp(join(tmpdir(), 'nemesia-size-'))
	const bundlePath = join(directory, 'bundle.js')
	const pagePath = join(directory, 'index.md')
	const bundle = Buffer.from(Array.from({ length: 4000 }, (_, index) => (index * 7919) % 251))

	try {
		await writeFile(bundlePath, bundle)
		const kilobytes = gzipSync(bundle, { level: 9 }).length / 1000
		await writeFile(pagePath, page(kilobytes))
		await verify(() => verifyStatedSize({ bundlePath, pagePath, projectRoot: directory }))
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
}

const sizePage = (compared, rounded) =>
	`<span>~${rounded} KB gzip</span>\n<SizeBars :rows="[{ name: 'nemesia', size: ${compared}, self: true }]" />\n`

test('accepts a landing page that states the size of the built bundle', async () => {
	await withStatedSize(
		kilobytes => sizePage(kilobytes.toFixed(1), Math.round(kilobytes)),
		run => assert.doesNotReject(run)
	)
})

test('rejects a landing page with a stale size in the comparison', async () => {
	await withStatedSize(
		kilobytes => sizePage((kilobytes + 0.4).toFixed(1), Math.round(kilobytes)),
		run =>
			assert.rejects(run, /\[verify-build\] index\.md lists nemesia as .* KB in the size comparison, but bundle\.js is/)
	)
})

test('rejects a landing page with a stale rounded size', async () => {
	await withStatedSize(
		kilobytes => sizePage(kilobytes.toFixed(1), Math.round(kilobytes) + 1),
		run => assert.rejects(run, /\[verify-build\] index\.md states ~\d+ KB gzip, but bundle\.js is/)
	)
})

test('rejects a landing page that no longer states the size', async () => {
	await withStatedSize(
		() => '<p>No numbers here.</p>\n',
		run => assert.rejects(run, /no longer lists nemesia in the size comparison/)
	)
})
