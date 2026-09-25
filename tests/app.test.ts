import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
	BaseComponent,
	Component,
	DistributedComponent,
	createApp,
	type ComponentConstructor,
	type NemesiaApp
} from '../src/index.js'

function root(name: string, tag = 'div'): HTMLElement {
	const element = document.createElement(tag)
	element.setAttribute('data-nemesia', name)
	document.body.append(element)
	return element
}

async function flushMicrotasks(): Promise<void> {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
}

describe('app creation and registration', () => {
	it('normalizes app options and retains the observe request', () => {
		expect(createApp().options).toEqual({ observe: false })
		expect(createApp({ observe: true }).options).toEqual({ observe: true })
	})

	it('registers arrays including one-item arrays and returns the app', () => {
		class First extends Component('first') {}
		class Second extends Component('second') {}
		const app = createApp()

		expect(app.register([First])).toBe(app)
		expect(app.register([Second])).toBe(app)
		expectTypeOf(app.register).parameter(0).toEqualTypeOf<ComponentConstructor[]>()

		if (false) {
			// @ts-expect-error register intentionally has no single-component overload.
			app.register(First)
		}
	})

	it('rejects non-array registration at runtime with the exact TypeError', () => {
		class Invalid extends Component('invalid') {}
		const register = createApp().register as unknown as (value: unknown) => unknown

		expect(() => register(Invalid)).toThrow(
			new TypeError('[Nemesia] app.register(...) expects an array of components.')
		)
	})

	it('warns on duplicates and mounts the latest registration', () => {
		const mounted: string[] = []
		class Original extends Component('duplicate') {
			onMount(): void {
				mounted.push('original')
			}
		}
		class Latest extends Component('duplicate') {
			onMount(): void {
				mounted.push('latest')
			}
		}
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = createApp()

		app.register([Original, Latest])
		root('duplicate')
		app.mount()

		expect(warn).toHaveBeenCalledWith(
			'[Nemesia] Component "duplicate" was registered more than once. The latest registration was used.',
			{ component: 'duplicate' }
		)
		expect(mounted).toEqual(['latest'])
	})

	it('retains distributed registrations until an explicit mount', () => {
		const mounted = vi.fn()
		class Distributed extends DistributedComponent('distributed') {
			onMount(): void {
				mounted()
			}
		}
		const app = createApp({ observe: true }).register([Distributed])

		expect(mounted).not.toHaveBeenCalled()
		expect(() => app.mount(document)).not.toThrow()
		expect(mounted).toHaveBeenCalledOnce()
		expect(() => app.disconnect(document)).not.toThrow()
	})
})

describe('concrete root discovery', () => {
	it('mounts exact data-nemesia values from the default body only', () => {
		const mounted: Element[] = []
		class Exact extends Component('exact') {
			onMount(): void {
				mounted.push(this.root)
			}
		}
		const exact = root('exact')
		const list = root('exact other')
		const alternative = document.createElement('div')
		alternative.setAttribute('data-component', 'exact')
		document.body.append(alternative)

		createApp().register([Exact]).mount()

		expect(mounted).toEqual([exact])
		expect(mounted).not.toContain(list)
		expect(mounted).not.toContain(alternative)
	})

	it('includes an element scope itself and mounts nested roots before their parents', () => {
		const mounted: Element[] = []
		class Ordered extends Component('ordered') {
			onMount(): void {
				mounted.push(this.root)
			}
		}
		const scope = root('ordered')
		const first = document.createElement('div')
		const second = document.createElement('div')
		first.dataset.nemesia = 'ordered'
		second.dataset.nemesia = 'ordered'
		scope.append(first, second)

		createApp().register([Ordered]).mount(scope)

		expect(mounted).toEqual([first, second, scope])
	})

	it('mounts an explicitly passed detached root by exact scope identity', () => {
		const mounted = vi.fn()
		class DetachedExact extends Component('detached-exact') {
			onMount(): void {
				mounted(this.root)
			}
		}
		const target = document.createElement('div')
		target.dataset.nemesia = 'detached-exact'

		createApp().register([DetachedExact]).mount(target)

		expect(target.isConnected).toBe(false)
		expect(mounted).toHaveBeenCalledOnce()
		expect(mounted).toHaveBeenCalledWith(target)
	})

	it('aborts a constructed candidate that an earlier hook moved out of scope', () => {
		const constructed: Element[] = []
		const mounted: Element[] = []
		const listened: Element[] = []
		const target = new EventTarget()
		let stale!: HTMLElement
		class Remover extends Component('explicit-candidate-remover') {
			onMount(): void {
				stale.remove()
			}
		}
		class Singleton extends Component('explicit-stale-singleton', {
			multiple: false
		}) {
			tracked = (() => {
				constructed.push(this.root)
			})()
			listening = (() => {
				this.on(target, 'change', () => listened.push(this.root))
			})()

			onMount(): void {
				mounted.push(this.root)
			}
		}
		const scope = document.createElement('main')
		const remover = document.createElement('div')
		stale = document.createElement('div')
		remover.dataset.nemesia = 'explicit-candidate-remover'
		stale.dataset.nemesia = 'explicit-stale-singleton'
		scope.append(remover, stale)
		document.body.append(scope)
		const app = createApp().register([Remover, Singleton])

		app.mount(scope)
		target.dispatchEvent(new Event('change'))

		expect(constructed).toEqual([stale])
		expect(mounted).toEqual([])
		expect(listened).toEqual([])

		const replacement = document.createElement('div')
		replacement.dataset.nemesia = 'explicit-stale-singleton'
		scope.append(replacement)
		app.mount(scope)
		target.dispatchEvent(new Event('change'))

		expect(constructed).toEqual([stale, replacement])
		expect(mounted).toEqual([replacement])
		expect(listened).toEqual([replacement])
	})

	it('aborts a singleton that detaches itself during construction', () => {
		const constructed: Element[] = []
		const mounted: Element[] = []
		const destroyed: Element[] = []
		const listened: Element[] = []
		const target = new EventTarget()
		let stale!: HTMLElement
		class SelfDetaching extends Component('self-detaching-singleton', {
			multiple: false
		}) {
			tracked = (() => {
				constructed.push(this.root)
			})()
			listening = (() => {
				this.on(target, 'change', () => listened.push(this.root))
			})()
			detached = (() => {
				if (this.root === stale) this.root.remove()
			})()

			onMount(): void {
				mounted.push(this.root)
			}
			onDestroy(): void {
				destroyed.push(this.root)
			}
		}
		const scope = document.createElement('main')
		stale = document.createElement('div')
		stale.dataset.nemesia = 'self-detaching-singleton'
		scope.append(stale)
		document.body.append(scope)
		const app = createApp().register([SelfDetaching])

		app.mount(scope)
		target.dispatchEvent(new Event('change'))

		expect(constructed).toEqual([stale])
		expect(mounted).toEqual([])
		expect(destroyed).toEqual([])
		expect(listened).toEqual([])

		const replacement = document.createElement('div')
		replacement.dataset.nemesia = 'self-detaching-singleton'
		scope.append(replacement)
		app.mount(scope)
		target.dispatchEvent(new Event('change'))

		expect(constructed).toEqual([stale, replacement])
		expect(mounted).toEqual([replacement])
		expect(destroyed).toEqual([])
		expect(listened).toEqual([replacement])
	})

	it('lets the next singleton candidate mount when the first detaches itself during construction', () => {
		const mounted: string[] = []
		class Solo extends Component('self-detaching-solo', { multiple: false }) {
			detached = (() => {
				if (this.root.id === 'first') this.root.remove()
			})()

			onMount(): void {
				mounted.push(this.root.id)
			}
		}
		const scope = document.createElement('main')
		scope.innerHTML =
			'<div data-nemesia="self-detaching-solo" id="first"></div><div data-nemesia="self-detaching-solo" id="second"></div>'
		document.body.append(scope)
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([Solo]).mount(scope)

		expect(mounted).toEqual(['second'])
		expect(warn).not.toHaveBeenCalled()
	})

	it('does not mount a second component on an already mounted root', () => {
		const mounted: string[] = []
		class First extends Component('first-on-root') {
			onMount(): void {
				mounted.push('first')
			}
		}
		class Second extends Component('second-on-root') {
			onMount(): void {
				mounted.push('second')
			}
		}
		const target = root('first-on-root')
		const app = createApp().register([First, Second])

		app.mount(target)
		target.dataset.nemesia = 'second-on-root'
		app.mount(target)

		expect(mounted).toEqual(['first'])

		app.destroy(target)
		app.mount(target)

		expect(mounted).toEqual(['first', 'second'])
	})

	it('reserves a root against a different component during construction', () => {
		const mounted: string[] = []
		const app = createApp()
		class First extends Component('constructing-first') {
			changed = (() => {
				this.root.dataset.nemesia = 'constructing-second'
				app.mount(this.root)
			})()

			onMount(): void {
				mounted.push('first')
			}
		}
		class Second extends Component('constructing-second') {
			onMount(): void {
				mounted.push('second')
			}
		}
		const target = root('constructing-first')

		app.register([First, Second]).mount(target)

		expect(mounted).toEqual(['first'])

		app.destroy(target)
		app.mount(target)

		expect(mounted).toEqual(['first', 'second'])
	})

	it('mounts nested component roots before their parents', () => {
		const calls: string[] = []
		class Parent extends Component('parent') {
			onMount(): void {
				calls.push('parent')
			}
		}
		class Child extends Component('child') {
			onMount(): void {
				calls.push('child')
			}
		}
		const parent = root('parent')
		const child = document.createElement('section')
		child.dataset.nemesia = 'child'
		parent.append(child)

		createApp().register([Parent, Child]).mount(parent)

		expect(calls).toEqual(['child', 'parent'])
	})

	it('supports detached DocumentFragment subtrees', () => {
		const mounted: Element[] = []
		const destroyed: Element[] = []
		class Detached extends Component('detached') {
			onMount(): void {
				mounted.push(this.root)
			}
			onDestroy(): void {
				destroyed.push(this.root)
			}
		}
		const fragment = document.createDocumentFragment()
		const outer = document.createElement('div')
		const inner = document.createElement('div')
		outer.dataset.nemesia = 'detached'
		inner.dataset.nemesia = 'detached'
		outer.append(inner)
		fragment.append(outer)
		const app = createApp().register([Detached])

		app.mount(fragment)
		app.destroy(fragment)

		expect(mounted).toEqual([inner, outer])
		expect(destroyed).toEqual([inner, outer])
	})

	it('compares registration names exactly without selector interpolation', () => {
		const name = 'item\"]:not([data-nemesia]) \\ slash'
		const mounted = vi.fn()
		class Special extends Component(name) {
			onMount(): void {
				mounted(this.root)
			}
		}
		const target = root(name)

		createApp().register([Special]).mount()

		expect(mounted).toHaveBeenCalledWith(target)
	})

	it('accepts foreign-realm HTML roots and rejects SVG/default and wrong configured tags', () => {
		const mounted: Element[] = []
		class AnyHtml extends Component('any-html') {
			onMount(): void {
				mounted.push(this.root)
			}
		}
		class FormOnly extends Component('form-only', { root: 'form' }) {
			onMount(): void {
				mounted.push(this.root)
			}
		}
		const iframe = document.createElement('iframe')
		document.body.append(iframe)
		const foreignDocument = iframe.contentDocument!
		const foreignRoot = foreignDocument.createElement('article')
		foreignRoot.dataset.nemesia = 'any-html'
		foreignDocument.body.append(foreignRoot)
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		svg.setAttribute('data-nemesia', 'any-html')
		const wrong = root('form-only')
		document.body.append(svg)
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = createApp().register([AnyHtml, FormOnly])

		app.mount(foreignDocument)
		app.mount(document.body)

		expect(mounted).toEqual([foreignRoot])
		expect(warn).toHaveBeenCalledWith('[Nemesia] Component "form-only" skipped: expected an HTML <form> root.', {
			component: 'form-only',
			root: wrong,
			expected: 'form',
			received: 'div'
		})
		expect(warn).toHaveBeenCalledWith('[Nemesia] Component "any-html" skipped: expected an HTML element root.', {
			component: 'any-html',
			root: svg
		})
	})
})

describe('mount validation and lifecycle', () => {
	it('converts controlled ref and option failures to exact warnings and continues', () => {
		const goodMount = vi.fn()
		class MissingRef extends Component('missing-ref') {
			button = this.ref.button('submit')
		}
		class BadOption extends Component('bad-option') {
			duration = this.option.number('duration')
		}
		class Good extends Component('good') {
			onMount(): void {
				goodMount()
			}
		}
		const missing = root('missing-ref')
		const bad = root('bad-option')
		bad.setAttribute('data-option-duration', 'never')
		root('good')
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([MissingRef, BadOption, Good]).mount()

		expect(warn).toHaveBeenCalledWith('[Nemesia] Component "missing-ref" skipped: missing required ref "submit".', {
			component: 'missing-ref',
			root: missing,
			ref: 'submit',
			selector: '[data-ref="submit"]'
		})
		expect(warn).toHaveBeenCalledWith(
			'[Nemesia] Component "bad-option" skipped: invalid option "duration".',
			expect.objectContaining({
				component: 'bad-option',
				root: bad,
				option: 'duration',
				attribute: 'data-option-duration',
				received: 'never'
			})
		)
		expect(goodMount).toHaveBeenCalledOnce()
	})

	it('logs unexpected construction errors and continues', () => {
		const error = new Error('field failed')
		const goodMount = vi.fn()
		class Broken extends Component('broken') {
			value = (() => {
				throw error
			})()
		}
		class Good extends Component('good') {
			onMount(): void {
				goodMount()
			}
		}
		const broken = root('broken')
		root('good')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})

		createApp().register([Broken, Good]).mount()

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "broken" failed during construction.', {
			component: 'broken',
			root: broken,
			error
		})
		expect(goodMount).toHaveBeenCalledOnce()
	})

	it('is idempotent and records before onMount for recursive mount safety', () => {
		const onMount = vi.fn()
		const app = createApp()
		class Recursive extends Component('recursive') {
			onMount(): void {
				onMount()
				app.mount(document.body)
			}
		}
		root('recursive')

		app.register([Recursive]).mount()
		app.mount()

		expect(onMount).toHaveBeenCalledOnce()
	})

	it('reserves a singleton during constructor-time recursive mounting', () => {
		const target = new EventTarget()
		const listener = vi.fn()
		let constructed = 0
		let mounted = 0
		let destroyed = 0
		let reentered = false
		const app = createApp()
		class RecursiveConstructor extends Component('recursive-constructor', { multiple: false }) {
			construction = (() => {
				constructed += 1
				if (!reentered) {
					reentered = true
					app.mount(document.body)
				}
			})()

			onMount(): void {
				mounted += 1
				this.on(target, 'change', () => listener())
			}

			onDestroy(): void {
				destroyed += 1
			}
		}
		root('recursive-constructor')
		root('recursive-constructor')
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		app.register([RecursiveConstructor]).mount()
		target.dispatchEvent(new Event('change'))
		const callsBeforeDestroy = listener.mock.calls.length
		app.destroy()
		listener.mockClear()
		target.dispatchEvent(new Event('change'))

		expect({
			constructed,
			mounted,
			callsBeforeDestroy,
			callsAfterDestroy: listener.mock.calls.length,
			destroyed
		}).toEqual({
			constructed: 1,
			mounted: 1,
			callsBeforeDestroy: 1,
			callsAfterDestroy: 0,
			destroyed: 1
		})
	})

	it.each(['controlled', 'unexpected'] as const)(
		'aborts listener resources without onDestroy after a %s partial-construction failure',
		failureKind => {
			const target = new EventTarget()
			const listener = vi.fn()
			const onDestroy = vi.fn()
			const failure = new Error('later field failed')
			class Partial extends Component(`partial-${failureKind}`) {
				attached = (() => {
					this.on(target, 'change', listener)
					return true
				})()

				failed =
					failureKind === 'controlled'
						? this.ref.button('missing')
						: (() => {
								throw failure
							})()

				onDestroy(): void {
					onDestroy()
				}
			}
			root(`partial-${failureKind}`)
			vi.spyOn(console, 'warn').mockImplementation(() => {})
			vi.spyOn(console, 'error').mockImplementation(() => {})

			createApp().register([Partial]).mount()
			target.dispatchEvent(new Event('change'))

			expect(listener).not.toHaveBeenCalled()
			expect(onDestroy).not.toHaveBeenCalled()
		}
	)

	it.each(['controlled', 'unexpected'] as const)(
		'captures the intended partial after a pre-super helper and a %s failure',
		failureKind => {
			const helperTarget = new EventTarget()
			const outerTarget = new EventTarget()
			const helperListener = vi.fn()
			const outerListener = vi.fn()
			const helperDestroy = vi.fn()
			const outerDestroy = vi.fn()
			const failure = new Error('outer field failed')
			class Helper extends Component(`helper-${failureKind}`) {
				attached = (() => {
					this.on(helperTarget, 'change', helperListener)
					return true
				})()

				onDestroy(): void {
					helperDestroy()
				}
			}
			let helper!: Helper
			class Outer extends Component(`outer-${failureKind}`) {
				constructor(componentRoot: HTMLElement) {
					helper = new Helper(document.createElement('aside'))
					super(componentRoot)
				}

				attached = (() => {
					this.on(outerTarget, 'change', outerListener)
					return true
				})()

				failed =
					failureKind === 'controlled'
						? this.ref.button('missing')
						: (() => {
								throw failure
							})()

				onDestroy(): void {
					outerDestroy()
				}
			}
			root(`outer-${failureKind}`)
			vi.spyOn(console, 'warn').mockImplementation(() => {})
			vi.spyOn(console, 'error').mockImplementation(() => {})

			createApp().register([Outer]).mount()
			helperTarget.dispatchEvent(new Event('change'))
			outerTarget.dispatchEvent(new Event('change'))

			expect(helper).toBeInstanceOf(Helper)
			expect(helperListener).toHaveBeenCalledOnce()
			expect(outerListener).not.toHaveBeenCalled()
			expect(helperDestroy).not.toHaveBeenCalled()
			expect(outerDestroy).not.toHaveBeenCalled()
		}
	)

	it('does not let a same-constructor same-root pre-super helper steal capture', () => {
		const componentRoot = root('same-target-concrete')
		const helperTarget = new EventTarget()
		const outerTarget = new EventTarget()
		const helperListener = vi.fn()
		const outerListener = vi.fn()
		const helperDestroy = vi.fn()
		const outerDestroy = vi.fn()
		const failure = new Error('outer field failed')
		let constructingHelper = false
		let helper: SameTarget | undefined

		class SameTarget extends Component('same-target-concrete') {
			constructor(sameRoot: HTMLElement) {
				if (!constructingHelper) {
					constructingHelper = true
					try {
						helper = new SameTarget(sameRoot)
					} finally {
						constructingHelper = false
					}
				}
				super(sameRoot)
			}

			isHelper = constructingHelper
			attached = (() => {
				this.on(this.isHelper ? helperTarget : outerTarget, 'change', this.isHelper ? helperListener : outerListener)
				return true
			})()

			failed = this.isHelper
				? false
				: (() => {
						throw failure
					})()

			onDestroy(): void {
				if (this.isHelper) helperDestroy()
				else outerDestroy()
			}
		}
		vi.spyOn(console, 'error').mockImplementation(() => {})

		createApp().register([SameTarget]).mount(document.body)
		helperTarget.dispatchEvent(new Event('change'))
		outerTarget.dispatchEvent(new Event('change'))

		expect(helper).toBeInstanceOf(SameTarget)
		expect(helper?.root).toBe(componentRoot)
		expect(helperListener).toHaveBeenCalledOnce()
		expect(outerListener).not.toHaveBeenCalled()
		expect(helperDestroy).not.toHaveBeenCalled()
		expect(outerDestroy).not.toHaveBeenCalled()
	})

	it('resolves refs and options before onMount', () => {
		const observations: unknown[] = []
		class Ready extends Component('ready') {
			button = this.ref.button('submit')
			delay = this.option.number('delay')
			onMount(): void {
				observations.push(this.button, this.delay)
			}
		}
		const ready = root('ready')
		ready.setAttribute('data-option-delay', '12')
		const button = document.createElement('button')
		button.dataset.ref = 'submit'
		ready.append(button)

		createApp().register([Ready]).mount()

		expect(observations).toEqual([button, 12])
	})

	it('claims a singleton only after valid construction and releases it on destroy', () => {
		const mounted: Element[] = []
		class Singleton extends Component('singleton', {
			multiple: false
		}) {
			required = this.ref.button('required')
			onMount(): void {
				mounted.push(this.root)
			}
		}
		const invalid = root('singleton')
		const first = root('singleton')
		const second = root('singleton')
		for (const target of [first, second]) {
			const button = document.createElement('button')
			button.dataset.ref = 'required'
			target.append(button)
		}
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = createApp().register([Singleton])

		app.mount()

		expect(mounted).toEqual([first])
		expect(warn).toHaveBeenCalledWith('[Nemesia] Component "singleton" skipped: only one instance may be mounted.', {
			component: 'singleton',
			root: second
		})

		app.destroy(first)
		app.mount(second)
		expect(mounted).toEqual([first, second])
		expect(invalid.isConnected).toBe(true)
	})

	it('uses active counts when a live multiple registration is replaced by a singleton', () => {
		const mounted: Element[] = []
		class Multiple extends Component('changed-multiplicity') {
			onMount(): void {
				mounted.push(this.root)
			}
		}
		class Singleton extends Component('changed-multiplicity', {
			multiple: false
		}) {
			onMount(): void {
				mounted.push(this.root)
			}
		}
		const first = root('changed-multiplicity')
		const second = root('changed-multiplicity')
		const app = createApp().register([Multiple])
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		app.mount(first)
		app.register([Singleton])
		app.mount(second)

		expect(mounted).toEqual([first])
		expect(warn).toHaveBeenCalledWith(
			'[Nemesia] Component "changed-multiplicity" skipped: only one instance may be mounted.',
			{ component: 'changed-multiplicity', root: second }
		)

		app.destroy(first)
		app.mount(second)
		expect(mounted).toEqual([first, second])
	})

	it('retries singleton candidates on a later mount after a synchronous onMount failure', () => {
		const error = new Error('mount failed')
		const mounted: Element[] = []
		let attempt = 0
		class Singleton extends Component('sync-singleton', {
			multiple: false
		}) {
			onMount(): void {
				attempt += 1
				if (attempt === 1) throw error
				mounted.push(this.root)
			}
		}
		const first = root('sync-singleton')
		const second = root('sync-singleton')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = createApp().register([Singleton])

		app.mount()

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "sync-singleton" failed during onMount.', {
			component: 'sync-singleton',
			root: first,
			error
		})
		expect(warn).toHaveBeenCalledWith(
			'[Nemesia] Component "sync-singleton" skipped: only one instance may be mounted.',
			{
				component: 'sync-singleton',
				root: second
			}
		)
		expect(mounted).toEqual([])

		app.mount()

		expect(mounted).toEqual([first])
	})

	it('contains sync onMount errors, destroys the partial instance, and continues', () => {
		const error = new Error('mount failed')
		const listener = vi.fn()
		const destroyed = vi.fn()
		const target = new EventTarget()
		const good = vi.fn()
		class Broken extends Component('sync-broken') {
			onMount(): void {
				this.on(target, 'change', listener)
				throw error
			}
			onDestroy(): void {
				destroyed()
			}
		}
		class Good extends Component('sync-good') {
			onMount(): void {
				good()
			}
		}
		const broken = root('sync-broken')
		root('sync-good')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([Broken, Good])

		app.mount()
		target.dispatchEvent(new Event('change'))
		app.mount(broken)

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "sync-broken" failed during onMount.', {
			component: 'sync-broken',
			root: broken,
			error
		})
		expect(destroyed).toHaveBeenCalledTimes(2)
		expect(listener).not.toHaveBeenCalled()
		expect(good).toHaveBeenCalledOnce()
	})

	it.each([
		['a rejected Promise', () => Promise.reject(new Error('rejected'))],
		[
			'a rejecting foreign thenable',
			() => ({
				then: (_resolve: unknown, reject: (error: unknown) => void) => reject(new Error('thenable'))
			})
		]
	])('contains %s from onMount and cleans the partial instance', async (_label, resultFactory) => {
		const listener = vi.fn()
		const destroyed = vi.fn()
		const continued = vi.fn()
		const target = new EventTarget()
		class AsyncBroken extends Component('async-broken') {
			onMount(): Promise<void> {
				this.on(target, 'change', listener)
				return resultFactory() as Promise<void>
			}
			onDestroy(): void {
				destroyed()
			}
		}
		class AsyncGood extends Component('async-good') {
			onMount(): void {
				continued()
			}
		}
		const componentRoot = root('async-broken')
		root('async-good')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([AsyncBroken, AsyncGood])

		app.mount()
		await flushMicrotasks()
		target.dispatchEvent(new Event('change'))

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "async-broken" failed during onMount.', {
			component: 'async-broken',
			root: componentRoot,
			error: expect.any(Error)
		})
		expect(destroyed).toHaveBeenCalledOnce()
		expect(listener).not.toHaveBeenCalled()
		expect(continued).toHaveBeenCalledOnce()
	})

	it('does not create an unhandled rejection when the async diagnostic reporter throws', async () => {
		class Broken extends Component('reporter-broken') {
			onMount(): Promise<void> {
				return Promise.reject(new Error('failed'))
			}
		}
		root('reporter-broken')
		vi.spyOn(console, 'error').mockImplementation(() => {
			throw new Error('reporter')
		})

		createApp().register([Broken]).mount()
		await expect(flushMicrotasks()).resolves.toBeUndefined()
	})

	it('does not let a stale onMount rejection destroy a remounted current instance', async () => {
		let rejectOld!: (error: unknown) => void
		const oldMount = new Promise<void>((_resolve, reject) => {
			rejectOld = reject
		})
		const listener = vi.fn()
		const target = new EventTarget()
		let generation = 0
		const destroyed: number[] = []
		class Remounted extends Component('remounted') {
			currentGeneration = ++generation

			onMount(): void | Promise<void> {
				this.on(target, 'change', () => listener(this.currentGeneration))
				return this.currentGeneration === 1 ? oldMount : undefined
			}

			onDestroy(): void {
				destroyed.push(this.currentGeneration)
			}
		}
		const componentRoot = root('remounted')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([Remounted])

		app.mount(componentRoot)
		app.destroy(componentRoot)
		app.mount(componentRoot)
		rejectOld(new Error('stale rejection'))
		await flushMicrotasks()
		target.dispatchEvent(new Event('change'))

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "remounted" failed during onMount.', {
			component: 'remounted',
			root: componentRoot,
			error: expect.any(Error)
		})
		expect(listener).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledWith(2)
		expect(destroyed).toEqual([1])

		app.destroy(componentRoot)
		expect(destroyed).toEqual([1, 2])
	})

	it('does not report an AbortError from onMount after the instance was destroyed', async () => {
		class Loader extends Component('abortable-loader') {
			private controller = new AbortController()

			onMount(): Promise<void> {
				return new Promise((_resolve, reject) => {
					this.controller.signal.addEventListener('abort', () => reject(this.controller.signal.reason))
				})
			}

			onDestroy(): void {
				this.controller.abort()
			}
		}
		const componentRoot = root('abortable-loader')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([Loader])

		app.mount(componentRoot)
		app.destroy(componentRoot)
		await flushMicrotasks()

		expect(report).not.toHaveBeenCalled()
	})

	it('reports an AbortError from onMount while the instance is still mounted', async () => {
		const destroyed = vi.fn()
		class Aborted extends Component('aborted-while-mounted') {
			onMount(): Promise<void> {
				return Promise.reject(new DOMException('aborted', 'AbortError'))
			}

			onDestroy(): void {
				destroyed()
			}
		}
		const componentRoot = root('aborted-while-mounted')
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})

		createApp().register([Aborted]).mount(componentRoot)
		await flushMicrotasks()

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "aborted-while-mounted" failed during onMount.', {
			component: 'aborted-while-mounted',
			root: componentRoot,
			error: expect.any(DOMException)
		})
		expect(destroyed).toHaveBeenCalledOnce()
	})
})

describe('destroy and disconnect', () => {
	it('destroys scope itself and descendants deepest-first, cleans listeners, and is idempotent', () => {
		const order: string[] = []
		const listener = vi.fn()
		const target = new EventTarget()
		class Parent extends Component('destroy-parent') {
			onMount(): void {
				this.on(target, 'change', listener)
			}
			onDestroy(): void {
				order.push('parent')
			}
		}
		class Child extends Component('destroy-child') {
			onDestroy(): void {
				order.push('child')
			}
		}
		const parent = root('destroy-parent')
		const child = document.createElement('div')
		child.dataset.nemesia = 'destroy-child'
		parent.append(child)
		const app = createApp().register([Parent, Child])

		app.mount(parent)
		app.destroy(parent)
		app.destroy(parent)
		target.dispatchEvent(new Event('change'))

		expect(order).toEqual(['child', 'parent'])
		expect(listener).not.toHaveBeenCalled()
	})

	it('defaults destroy to body and allows a clean remount', () => {
		const mounts = vi.fn()
		const destroys = vi.fn()
		class DefaultDestroy extends Component('default-destroy') {
			onMount(): void {
				mounts()
			}
			onDestroy(): void {
				destroys()
			}
		}
		root('default-destroy')
		const app = createApp().register([DefaultDestroy])

		app.mount()
		app.destroy()
		app.mount()

		expect(mounts).toHaveBeenCalledTimes(2)
		expect(destroys).toHaveBeenCalledOnce()
	})

	it('destroys roots detached from the scope before destroy is called', () => {
		const lifecycle: string[] = []
		class Replaced extends Component('replaced') {
			onMount(): void {
				lifecycle.push(`mount:${this.root.id}`)
			}
			onDestroy(): void {
				lifecycle.push(`destroy:${this.root.id}`)
			}
		}
		const scope = document.createElement('main')
		scope.innerHTML = '<div id="old" data-nemesia="replaced"></div>'
		document.body.append(scope)
		const app = createApp().register([Replaced])
		app.mount(scope)

		scope.innerHTML = '<div id="new" data-nemesia="replaced"></div>'
		app.destroy(scope)
		app.mount(scope)

		expect(lifecycle).toEqual(['mount:old', 'destroy:old', 'mount:new'])
	})

	it('destroys detached roots through the default body scope', () => {
		const destroyed = vi.fn()
		class Detached extends Component('detached') {
			onDestroy(): void {
				destroyed()
			}
		}
		const element = root('detached')
		const app = createApp().register([Detached])
		app.mount()

		element.remove()
		app.destroy()

		expect(destroyed).toHaveBeenCalledOnce()
	})

	it('keeps a root moved elsewhere in the same document when its former scope is destroyed', () => {
		const destroyed = vi.fn()
		class Moved extends Component('moved') {
			onDestroy(): void {
				destroyed()
			}
		}
		const source = document.createElement('main')
		const destination = document.createElement('aside')
		const element = document.createElement('div')
		element.setAttribute('data-nemesia', 'moved')
		source.append(element)
		document.body.append(source, destination)
		const app = createApp().register([Moved])
		app.mount(source)

		destination.append(element)
		app.destroy(source)

		expect(destroyed).not.toHaveBeenCalled()

		app.destroy(destination)

		expect(destroyed).toHaveBeenCalledOnce()
	})

	it('disconnect remains a no-op and does not destroy mounted instances', () => {
		const destroyed = vi.fn()
		class Connected extends Component('connected') {
			onDestroy(): void {
				destroyed()
			}
		}
		root('connected')
		const app: NemesiaApp = createApp().register([Connected])

		app.mount()
		app.disconnect()

		expect(destroyed).not.toHaveBeenCalled()
	})

	it('continues destroy traversal when the error reporter itself throws', () => {
		const target = new EventTarget()
		const listener = vi.fn()
		const destroyed: Element[] = []
		let mounts = 0
		class ThrowingDestroy extends Component('throwing-destroy') {
			onMount(): void {
				mounts += 1
				this.on(target, 'change', listener)
			}

			onDestroy(): void {
				destroyed.push(this.root)
				if (destroyed.length === 1) throw new Error('destroy failed')
			}
		}
		const first = root('throwing-destroy')
		const second = root('throwing-destroy')
		const app = createApp().register([ThrowingDestroy])
		vi.spyOn(console, 'error').mockImplementation(() => {
			throw new Error('reporter failed')
		})

		app.mount()
		expect(() => app.destroy()).not.toThrow()
		target.dispatchEvent(new Event('change'))

		expect(destroyed).toEqual([first, second])
		expect(listener).not.toHaveBeenCalled()
		expect(() => app.destroy()).not.toThrow()

		app.mount()
		expect(mounts).toBe(4)
	})
})
