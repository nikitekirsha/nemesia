import { readFile, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import ts from 'typescript'

export function check(condition, message) {
	if (!condition) throw new Error(`[verify-build] ${message}`)
}

function displayPath(projectRoot, absolutePath) {
	return relative(projectRoot, absolutePath) || '.'
}

export async function requireFile(projectRoot, absolutePath) {
	const label = displayPath(projectRoot, absolutePath)

	try {
		const details = await stat(absolutePath)
		check(details.isFile(), `${label} exists but is not a file`)
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('[verify-build]')) {
			throw error
		}
		throw new Error(`[verify-build] missing required file: ${label}`, {
			cause: error
		})
	}

	return absolutePath
}

export function declarationReferences(source) {
	const references = ts.preProcessFile(source, true, true)

	return {
		imports: references.importedFiles.map(reference => reference.fileName),
		paths: references.referencedFiles.map(reference => reference.fileName),
		types: references.typeReferenceDirectives.map(reference => reference.fileName)
	}
}

function isInside(directory, candidate) {
	const pathFromDirectory = relative(directory, candidate)
	return pathFromDirectory !== '..' && !pathFromDirectory.startsWith(`..${sep}`) && !isAbsolute(pathFromDirectory)
}

function checkedRelativePath({ distDirectory, importerPath, projectRoot, specifier }) {
	check(
		specifier.startsWith('.'),
		`${displayPath(projectRoot, importerPath)} references unexpected package ${JSON.stringify(specifier)}`
	)

	const referencedPath = resolve(dirname(importerPath), specifier)

	check(
		isInside(distDirectory, referencedPath),
		`${displayPath(projectRoot, importerPath)} references a declaration outside dist: ${specifier}`
	)

	return referencedPath
}

export function declarationImportPath(options) {
	const importedPath = checkedRelativePath(options)

	if (/\.d\.(?:c|m)?ts$/.test(importedPath)) return importedPath
	if (importedPath.endsWith('.mjs')) return `${importedPath.slice(0, -4)}.d.mts`
	if (importedPath.endsWith('.cjs')) return `${importedPath.slice(0, -4)}.d.cts`
	if (importedPath.endsWith('.js')) return `${importedPath.slice(0, -3)}.d.ts`
	return `${importedPath}.d.ts`
}

export function declarationReferencePath(options) {
	return checkedRelativePath(options)
}

function sourceMappingUrls(source) {
	return [...source.matchAll(/^\/\/# sourceMappingURL=([^\s]+)\r?$/gm)]
}

export function validateSourceMap({ generatedPath, mapPath, map, projectRoot, source }) {
	const generatedLabel = displayPath(projectRoot, generatedPath)
	const mapLabel = displayPath(projectRoot, mapPath)
	const expectedUrl = basename(mapPath)
	const directives = sourceMappingUrls(source)
	const directive = directives[0]
	const trailingSource = directive === undefined ? source : source.slice((directive.index ?? 0) + directive[0].length)

	check(
		directives.length === 1 && directive?.[1] === expectedUrl && trailingSource.trim() === '',
		`${generatedLabel} must end with exactly //# sourceMappingURL=${expectedUrl}`
	)
	check(typeof map === 'object' && map !== null && !Array.isArray(map), `${mapLabel} must contain a JSON object`)
	check(map.version === 3, `${mapLabel} must use source map version 3`)
	check(map.file === basename(generatedPath), `${mapLabel} file must equal ${JSON.stringify(basename(generatedPath))}`)
	check(
		Array.isArray(map.sources) &&
			map.sources.length > 0 &&
			map.sources.every(item => typeof item === 'string' && item.length > 0),
		`${mapLabel} sources must be a nonempty array of nonempty strings`
	)
	check(
		typeof map.mappings === 'string' && map.mappings.length > 0 && /^[A-Za-z0-9+/,;=]+$/.test(map.mappings),
		`${mapLabel} mappings must be a nonempty source-map mappings string`
	)
}

export async function verifySourceMap({ generatedPath, mapPath, projectRoot }) {
	await requireFile(projectRoot, generatedPath)
	await requireFile(projectRoot, mapPath)

	const [source, serializedMap] = await Promise.all([readFile(generatedPath, 'utf8'), readFile(mapPath, 'utf8')])

	let map
	try {
		map = JSON.parse(serializedMap)
	} catch (error) {
		throw new Error(`[verify-build] ${displayPath(projectRoot, mapPath)} contains invalid JSON`, { cause: error })
	}

	validateSourceMap({ generatedPath, mapPath, map, projectRoot, source })
}

export async function verifyDeclarationGraph({ distDirectory, entryPath, projectRoot }) {
	const pending = [entryPath]
	const visited = new Set()

	while (pending.length > 0) {
		const declaration = pending.pop()
		if (declaration === undefined || visited.has(declaration)) continue
		visited.add(declaration)

		await requireFile(projectRoot, declaration)
		const source = await readFile(declaration, 'utf8')
		await verifySourceMap({
			generatedPath: declaration,
			mapPath: `${declaration}.map`,
			projectRoot
		})

		const references = declarationReferences(source)

		for (const specifier of [...references.imports, ...references.types]) {
			pending.push(
				declarationImportPath({
					distDirectory,
					importerPath: declaration,
					projectRoot,
					specifier
				})
			)
		}
		for (const specifier of references.paths) {
			pending.push(
				declarationReferencePath({
					distDirectory,
					importerPath: declaration,
					projectRoot,
					specifier
				})
			)
		}
	}

	check(visited.size > 1, 'dist/index.d.ts does not reference any emitted declarations')
}

// The landing page states how much the browser build weighs. Both numbers must describe the bundle that was just built.
export async function verifyStatedSize({ bundlePath, pagePath, projectRoot }) {
	await requireFile(projectRoot, bundlePath)
	await requireFile(projectRoot, pagePath)

	const [bundle, page] = await Promise.all([readFile(bundlePath), readFile(pagePath, 'utf8')])
	const kilobytes = gzipSync(bundle, { level: 9 }).length / 1000
	const actual = `${displayPath(projectRoot, bundlePath)} is ${kilobytes.toFixed(1)} KB gzipped`
	const label = displayPath(projectRoot, pagePath)

	const compared = page.match(/name: 'nemesia', size: (\d+(?:\.\d+)?)/)?.[1]
	check(compared !== undefined, `${label} no longer lists nemesia in the size comparison`)
	check(
		Number(compared).toFixed(1) === kilobytes.toFixed(1),
		`${label} lists nemesia as ${compared} KB in the size comparison, but ${actual}`
	)

	const rounded = page.match(/~(\d+) KB gzip/)?.[1]
	check(rounded !== undefined, `${label} no longer states the rounded gzip size`)
	check(Number(rounded) === Math.round(kilobytes), `${label} states ~${rounded} KB gzip, but ${actual}`)
}
