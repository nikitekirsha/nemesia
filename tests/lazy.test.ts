import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Component, DistributedComponent, createApp, lazy, type LazyComponent } from '../src/index.js'
import { flushMutations } from './helpers.js'

function root(component: string, parent: ParentNode = document.body): HTMLElement {
	const element = document.createElement('div')
	element.dataset.nemesia = component
	parent.append(element)
	return element
}

interface Deferred {
	readonly load: ReturnType<typeof vi.fn<() => Promise<unknown>>>
	resolve(value: unknown): void
	reject(error: unknown): void
}

// A loader the test settles by hand, like a chunk that is still on its way.
function deferred(): Deferred {
	let resolve!: (value: unknown) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<unknown>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise
		reject = rejectPromise
	})

	return { load: vi.fn(() => promise), resolve, reject }
}

// Lets a settled loader reach the app: the batch resolves and the waiting roots mount.
async function settle(): Promise<void> {
	await new Promise<void>(resolve => setTimeout(resolve, 0))
}

describe('lazy components', () => {
	it('describes a component by name without loading anything', () => {
		const { load } = deferred()
		const component = lazy('described', load)

		expectTypeOf(component).toEqualTypeOf<LazyComponent>()
		expect(component.nemesia).toEqual({ kind: 'lazy', name: 'described' })
		expect(load).not.toHaveBeenCalled()
	})

	it('loads nothing until a root is on the page', async () => {
		const { load, resolve } = deferred()
		class Card extends Component('lazy-absent') {}
		const app = createApp().register([lazy('lazy-absent', load)])

		app.mount()
		await settle()

		expect(load).not.toHaveBeenCalled()

		root('lazy-absent')
		app.mount()
		resolve(Card)
		await settle()

		expect(load).toHaveBeenCalledOnce()
		expect(app.findAll(Card)).toHaveLength(1)
	})

	it('mounts a waiting root once the loader resolves to the class', async () => {
		const mounted = vi.fn()
		const { load, resolve } = deferred()
		class Card extends Component('lazy-class') {
			onMount(): void {
				mounted()
			}
		}
		root('lazy-class')
		const app = createApp().register([lazy('lazy-class', load)])

		app.mount()

		expect(load).toHaveBeenCalledOnce()
		expect(app.find(Card)).toBeNull()

		resolve(Card)
		await settle()

		expect(mounted).toHaveBeenCalledOnce()
		expect(app.find(Card)).toBeInstanceOf(Card)
	})

	it('takes the component from a module that exports it among other things', async () => {
		class Card extends Component('lazy-module') {}
		class Unrelated extends Component('lazy-module-unrelated') {}
		root('lazy-module')
		const app = createApp().register([
			lazy('lazy-module', () => Promise.resolve({ helper: () => {}, Unrelated, Card, version: 1 }))
		])

		app.mount()
		await settle()

		expect(app.find(Card)).toBeInstanceOf(Card)
		expect(app.find(Unrelated)).toBeNull()
	})

	it('loads when a root is added to an observed scope', async () => {
		const { load, resolve } = deferred()
		class Card extends Component('lazy-observed') {}
		const app = createApp({ observe: true }).register([lazy('lazy-observed', load)])
		app.mount()

		root('lazy-observed')
		await flushMutations()

		expect(load).toHaveBeenCalledOnce()

		resolve(Card)
		await settle()

		expect(app.findAll(Card)).toHaveLength(1)
		app.disconnect()
	})

	it('loads a batch in parallel and mounts it together, children before parents', async () => {
		const order: string[] = []
		const cart = deferred()
		const item = deferred()
		const counter = deferred()
		class Cart extends Component('lazy-cart') {
			onMount(): void {
				order.push('cart')
			}
		}
		class CartItem extends Component('lazy-cart-item') {
			onMount(): void {
				order.push('item')
			}
		}
		class Counter extends Component('lazy-counter') {
			onMount(): void {
				order.push('counter')
			}
		}
		root('lazy-counter', root('lazy-cart-item', root('lazy-cart')))
		const app = createApp().register([
			lazy('lazy-cart', cart.load),
			lazy('lazy-cart-item', item.load),
			lazy('lazy-counter', counter.load)
		])

		app.mount()

		expect(cart.load).toHaveBeenCalledOnce()
		expect(item.load).toHaveBeenCalledOnce()
		expect(counter.load).toHaveBeenCalledOnce()

		cart.resolve(Cart)
		item.resolve(CartItem)
		await settle()

		expect(order).toEqual([])

		counter.resolve(Counter)
		await settle()

		expect(order).toEqual(['counter', 'item', 'cart'])
	})

	it('requests a module once for many roots, scopes, and mounts', async () => {
		const { load, resolve } = deferred()
		class Card extends Component('lazy-once') {}
		root('lazy-once')
		root('lazy-once')
		const detached = document.createElement('section')
		const inDetached = root('lazy-once', detached)
		const app = createApp().register([lazy('lazy-once', load)])

		app.mount()
		app.mount()
		app.mount(detached)
		resolve(Card)
		await settle()

		expect(load).toHaveBeenCalledOnce()
		expect(app.findAll(Card)).toHaveLength(2)
		expect(app.find(Card, detached)?.root).toBe(inDetached)
	})

	it('mounts a root added while its module is already loading', async () => {
		const { load, resolve } = deferred()
		class Card extends Component('lazy-late-root') {}
		root('lazy-late-root')
		const app = createApp({ observe: true }).register([lazy('lazy-late-root', load)])
		app.mount()

		const late = root('lazy-late-root')
		const gone = root('lazy-late-root')
		await flushMutations()
		gone.remove()
		resolve(Card)
		await settle()

		expect(load).toHaveBeenCalledOnce()
		expect(app.findAll(Card)).toHaveLength(2)
		expect(app.find(Card, late)).toBeInstanceOf(Card)
		expect(app.find(Card, gone)).toBeNull()
		app.disconnect()
	})

	it('accepts one lazy value in two apps and loads it for each', async () => {
		class Card extends Component('lazy-shared') {}
		const load = vi.fn(() => Promise.resolve(Card))
		const shared = lazy('lazy-shared', load)
		root('lazy-shared')
		const first = createApp().register([shared])
		const second = createApp().register([shared])

		first.mount()
		second.mount()
		await settle()

		expect(load).toHaveBeenCalledTimes(2)
		expect(first.find(Card)).not.toBe(second.find(Card))
	})

	it('mounts a parent that is already loaded without waiting for its lazy children', async () => {
		const seen: number[] = []
		const { load, resolve } = deferred()
		class Child extends Component('lazy-child') {}
		class Parent extends Component('lazy-parent') {
			onMount(): void {
				seen.push(this.findAll(Child).length)
			}

			get children(): Child[] {
				return this.findAll(Child)
			}
		}
		root('lazy-child', root('lazy-parent'))
		const app = createApp().register([Parent, lazy('lazy-child', load)])

		app.mount()

		expect(seen).toEqual([0])

		resolve({ Child })
		await settle()

		expect(app.find(Parent)?.children).toHaveLength(1)
	})
})

describe('lazy components that fail to load', () => {
	it('reports a rejected loader and still mounts the rest of the batch', async () => {
		const error = new Error('chunk failed')
		const broken = deferred()
		class Fine extends Component('lazy-fine') {}
		root('lazy-broken')
		root('lazy-fine')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([lazy('lazy-broken', broken.load), lazy('lazy-fine', () => Promise.resolve(Fine))])

		app.mount()
		broken.reject(error)
		await settle()

		expect(report).toHaveBeenCalledOnce()
		expect(report).toHaveBeenCalledWith('[Nemesia] Component "lazy-broken" failed to load.', {
			component: 'lazy-broken',
			error
		})
		expect(app.findAll(Fine)).toHaveLength(1)

		app.mount()
		await settle()

		expect(broken.load).toHaveBeenCalledOnce()
		expect(report).toHaveBeenCalledOnce()
	})

	it('reports a loader that throws instead of returning a promise', async () => {
		const error = new Error('no network')
		root('lazy-throwing')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([
			lazy('lazy-throwing', () => {
				throw error
			})
		])

		expect(() => app.mount()).not.toThrow()
		await settle()

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "lazy-throwing" failed to load.', {
			component: 'lazy-throwing',
			error
		})
	})

	class Base extends Component('lazy-ambiguous') {}
	class Derived extends Base {}
	class Delegation extends DistributedComponent('lazy-ambiguous') {}
	class OtherName extends Component('lazy-other-name') {}

	it.each([
		['an empty module', {}, 0],
		['nothing', null, 0],
		['a component with another name', OtherName, 0],
		['a distributed component of that name', { Delegation }, 0],
		['two components of that name', { Base, Derived }, 2]
	])('reports a loader that resolves to %s', async (_label, loaded, found) => {
		root('lazy-ambiguous')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([lazy('lazy-ambiguous', () => Promise.resolve(loaded))])

		app.mount()
		await settle()

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "lazy-ambiguous" failed to load.', {
			component: 'lazy-ambiguous',
			error: new Error(`Expected exactly one component named "lazy-ambiguous" from the loader, found ${found}.`)
		})
		expect(app.findAll(Base)).toEqual([])
	})
})

describe('lazy components and other app calls', () => {
	it('warns when a lazy component reuses a registered name', () => {
		class Card extends Component('lazy-duplicate') {}
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([Card, lazy('lazy-duplicate', () => Promise.resolve(Card))])

		expect(warn).toHaveBeenCalledWith(
			'[Nemesia] Component "lazy-duplicate" was registered more than once. The latest registration was used.',
			{ component: 'lazy-duplicate' }
		)
	})

	it('keeps a class that replaced the lazy registration while its module was loading', async () => {
		const { load, resolve } = deferred()
		class Loaded extends Component('lazy-replaced') {}
		class Replacement extends Component('lazy-replaced') {}
		root('lazy-replaced')
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = createApp().register([lazy('lazy-replaced', load)])
		app.mount()

		app.register([Replacement]).mount()
		resolve(Loaded)
		await settle()
		root('lazy-replaced')
		app.mount()

		expect(app.findAll(Replacement)).toHaveLength(2)
		expect(app.findAll(Loaded)).toEqual([])
	})

	it('loads a lazy registration that replaced another one while it was loading', async () => {
		const first = deferred()
		const second = deferred()
		class First extends Component('lazy-reregistered') {}
		class Second extends Component('lazy-reregistered') {}
		root('lazy-reregistered')
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = createApp().register([lazy('lazy-reregistered', first.load)])
		app.mount()

		app.register([lazy('lazy-reregistered', second.load)])
		first.resolve(First)
		await settle()

		expect(second.load).toHaveBeenCalledOnce()
		expect(app.findAll(First)).toEqual([])

		second.resolve(Second)
		await settle()

		expect(app.findAll(Second)).toHaveLength(1)
	})

	it('does not mount into a scope destroyed while the module was loading, until it is mounted again', async () => {
		const { load, resolve } = deferred()
		class Card extends Component('lazy-destroyed') {}
		root('lazy-destroyed')
		const app = createApp().register([lazy('lazy-destroyed', load)])
		app.mount()

		app.destroy()
		resolve(Card)
		await settle()

		expect(app.findAll(Card)).toEqual([])

		app.mount()

		expect(app.findAll(Card)).toHaveLength(1)
		expect(load).toHaveBeenCalledOnce()
	})

	it('keeps waiting roots outside a scope that is destroyed while the module is loading', async () => {
		const { load, resolve } = deferred()
		class Card extends Component('lazy-partly-destroyed') {}
		const section = document.createElement('section')
		document.body.append(section)
		const outside = root('lazy-partly-destroyed')
		root('lazy-partly-destroyed', section)
		const app = createApp().register([lazy('lazy-partly-destroyed', load)])
		app.mount()

		app.destroy(section)
		resolve(Card)
		await settle()

		expect(app.findAll(Card).map(card => card.root)).toEqual([outside])
	})

	it('skips a waiting root that left the scope or lost its name before the module arrived', async () => {
		const { load, resolve } = deferred()
		class Card extends Component('lazy-changed') {}
		const removed = root('lazy-changed')
		const renamed = root('lazy-changed')
		const kept = root('lazy-changed')
		const app = createApp().register([lazy('lazy-changed', load)])
		app.mount()

		removed.remove()
		renamed.removeAttribute('data-nemesia')
		resolve(Card)
		await settle()

		expect(app.findAll(Card).map(card => card.root)).toEqual([kept])
		expect(app.find(Card, removed)).toBeNull()
	})
})
