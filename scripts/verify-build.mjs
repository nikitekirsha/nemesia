import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

import { check, verifyDeclarationGraph, verifySourceMap } from './verify-build-lib.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = join(projectRoot, 'dist')

function verifyDefaultApp(createApp, label) {
	const app = createApp()

	check(app !== null && typeof app === 'object', `${label} createApp() did not return an app`)
	check(app.options?.observe === false, `${label} createApp() did not default observe to false`)
	check(app.register([]) === app, `${label} register([]) did not return the app`)

	try {
		app.mount()
		app.destroy()
		app.disconnect()
	} catch (error) {
		throw new Error(`[verify-build] ${label} default app requires a DOM`, {
			cause: error
		})
	}
}

function verifyEsmApi(api) {
	const label = 'ESM bundle'

	check(typeof api.createApp === 'function', `${label} is missing named createApp`)
	check(typeof api.Nemesia === 'object' && api.Nemesia !== null, `${label} is missing Nemesia namespace`)
	check(typeof api.BaseComponent === 'function', `${label} is missing BaseComponent`)
	check(api.Nemesia.createApp === api.createApp, `${label} Nemesia.createApp is not named createApp`)
	check(typeof api.Nemesia.Component === 'function', `${label} is missing Nemesia.Component`)
	check(typeof api.Nemesia.DistributedComponent === 'function', `${label} is missing Nemesia.DistributedComponent`)

	const Concrete = api.Nemesia.Component('build-smoke')
	check(
		Object.getPrototypeOf(Concrete.prototype) === api.BaseComponent.prototype,
		`${label} Component factory does not extend BaseComponent`
	)

	verifyDefaultApp(api.createApp, label)
}

function verifyUmdApi(api) {
	const label = 'UMD global'
	const expectedExports = ['Component', 'DistributedComponent', 'createApp']

	check(
		JSON.stringify(Object.keys(api).sort()) === JSON.stringify(expectedExports),
		`${label} has unexpected exports: ${Object.keys(api).join(', ') || '(none)'}`
	)
	check(!Object.hasOwn(api, 'Nemesia'), `${label} contains a nested Nemesia namespace`)
	check(typeof api.createApp === 'function', `${label} is missing createApp`)
	check(typeof api.Component === 'function', `${label} is missing Component`)
	check(typeof api.DistributedComponent === 'function', `${label} is missing DistributedComponent`)

	verifyDefaultApp(api.createApp, label)
}

const esmPath = join(distDirectory, 'nemesia.js')
const umdPath = join(distDirectory, 'nemesia.umd.js')

await verifySourceMap({
	generatedPath: esmPath,
	mapPath: `${esmPath}.map`,
	projectRoot
})
await verifySourceMap({
	generatedPath: umdPath,
	mapPath: `${umdPath}.map`,
	projectRoot
})
await verifyDeclarationGraph({
	distDirectory,
	entryPath: join(distDirectory, 'index.d.ts'),
	projectRoot
})

const esm = await import(pathToFileURL(esmPath).href)
verifyEsmApi(esm)

const umdSource = await readFile(umdPath, 'utf8')
const umdContext = {}

try {
	vm.runInNewContext(umdSource, umdContext, { filename: umdPath })
} catch (error) {
	throw new Error('[verify-build] UMD bundle failed to evaluate without a DOM', {
		cause: error
	})
}

check(
	Object.keys(umdContext).length === 1 && Object.hasOwn(umdContext, 'Nemesia'),
	`UMD bundle created unexpected globals: ${Object.keys(umdContext).join(', ') || '(none)'}`
)
verifyUmdApi(umdContext.Nemesia)

console.log('[verify-build] ESM, UMD, and declaration artifacts verified')
