import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { BaseComponent, BaseDistributedComponent, Component, DistributedComponent } from '../src/index.js'
import { observeRejection } from '../src/internal/diagnostics.js'
import { teardownComponent } from '../src/internal/lifecycle.js'

// @ts-expect-error Listener registries are an implementation detail.
type HiddenListenerRegistry = import('../src/index.js').ListenerRegistry
// @ts-expect-error Teardown is available to the runtime, not package consumers.
type HiddenTeardown = import('../src/index.js').teardownComponent

type ComponentInstance = BaseComponent | BaseDistributedComponent

function teardown(instance: ComponentInstance): void {
	instance[teardownComponent]()
}

describe('component event facade', () => {
	it('attaches a listener to one target and passes the dispatched Event', () => {
		const listener = vi.fn<(event: Event) => void>()
		class Clickable extends Component('clickable') {
			attach(target: EventTarget): void {
				this.on(target, 'activate', listener)
			}
		}
		const instance = new Clickable(document.createElement('section'))
		const target = new EventTarget()
		const event = new Event('activate')

		instance.attach(target)
		target.dispatchEvent(event)

		expect(listener).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledWith(event)
	})

	it('attaches one wrapper per readonly array target with stable targets and indexes', () => {
		const calls: Array<[Event, EventTarget, number]> = []
		class Collection extends Component('collection') {
			attach(targets: readonly EventTarget[]): void {
				this.on(targets, 'select', (event, target, index) => {
					calls.push([event, target, index])
				})
			}
		}
		const instance = new Collection(document.createElement('section'))
		const targets = [new EventTarget(), new EventTarget(), new EventTarget()] as const
		const events = targets.map(() => new Event('select'))

		instance.attach(targets)
		targets.forEach((target, index) => target.dispatchEvent(events[index]!))

		expect(calls).toEqual([
			[events[0], targets[0], 0],
			[events[1], targets[1], 1],
			[events[2], targets[2], 2]
		])
	})

	it('accepts an empty readonly target array', () => {
		class EmptyCollection extends Component('empty-collection') {
			attach(targets: readonly EventTarget[]): void {
				this.on(targets, 'select', vi.fn())
			}
		}
		const instance = new EmptyCollection(document.createElement('section'))

		expect(() => instance.attach([])).not.toThrow()
	})

	it('forwards once and capture listener options', () => {
		const order: string[] = []
		class Configured extends Component('configured') {
			attach(parent: HTMLElement): void {
				this.on(parent, 'click', () => order.push('capture'), {
					capture: true,
					once: true
				})
			}
		}
		const parent = document.createElement('div')
		const child = document.createElement('button')
		parent.append(child)
		document.body.append(parent)
		const instance = new Configured(document.createElement('section'))
		const targetListener = vi.fn(() => order.push('target'))
		child.addEventListener('click', targetListener)

		instance.attach(parent)
		child.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		child.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(order).toEqual(['capture', 'target', 'target'])
		expect(targetListener).toHaveBeenCalledTimes(2)
	})

	it('uses the capture value from registration when caller options mutate', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		const options: AddEventListenerOptions = { capture: true }
		class MutableOptions extends Component('mutable-options') {
			attach(): void {
				this.on(target, 'change', listener, options)
			}
		}
		const instance = new MutableOptions(document.createElement('section'))

		instance.attach()
		options.capture = false
		teardown(instance)
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
	})

	it('rolls back every array attachment when a later target throws while adding', () => {
		const addError = new Error('add failed')
		const listener = vi.fn()
		const first = new EventTarget()
		class ThrowAfterAddingTarget extends EventTarget {
			public addEventListener(
				type: string,
				callback: EventListenerOrEventListenerObject | null,
				options?: AddEventListenerOptions | boolean
			): void {
				super.addEventListener(type, callback, options)
				throw addError
			}
		}
		const second = new ThrowAfterAddingTarget()
		class Transactional extends Component('transactional') {
			attach(): void {
				this.on([first, second], 'change', listener)
			}
		}
		const instance = new Transactional(document.createElement('section'))

		expect(() => instance.attach()).toThrow(addError)
		first.dispatchEvent(new Event('change'))
		second.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
	})

	it('preserves overload inference for concrete and distributed components', () => {
		class TypedConcrete extends Component('typed-concrete') {
			attach(target: HTMLButtonElement, targets: readonly HTMLAnchorElement[]): void {
				this.on(target, 'click', event => {
					expectTypeOf(event).toEqualTypeOf<PointerEvent>()
				})
				this.on(targets, 'click', (event, item, index) => {
					expectTypeOf(event).toEqualTypeOf<PointerEvent>()
					expectTypeOf(item).toEqualTypeOf<HTMLAnchorElement>()
					expectTypeOf(index).toEqualTypeOf<number>()
				})
			}
		}
		class TypedDistributed extends DistributedComponent('typed-distributed') {
			attach(targets: readonly HTMLInputElement[]): void {
				this.on(targets, 'change', (event, item, index) => {
					expectTypeOf(event).toEqualTypeOf<Event>()
					expectTypeOf(item).toEqualTypeOf<HTMLInputElement>()
					expectTypeOf(index).toEqualTypeOf<number>()
				})
			}
		}
		const concrete = new TypedConcrete(document.createElement('section'))
		const distributed = new TypedDistributed(document)

		concrete.attach(document.createElement('button'), [document.createElement('a')])
		distributed.attach([document.createElement('input')])
	})
})

describe('component teardown', () => {
	it('lets concrete onDestroy use listeners synchronously, then removes single and array listeners', () => {
		const calls: string[] = []
		const single = new EventTarget()
		const collection = [new EventTarget(), new EventTarget()] as const
		class Destroyable extends Component('destroyable') {
			constructor(root: HTMLElement) {
				super(root)
				this.on(single, 'cleanup', () => calls.push('single'))
				this.on(collection, 'cleanup', (_event, _target, index) => {
					calls.push(`collection-${index}`)
				})
			}

			onDestroy(): void {
				single.dispatchEvent(new Event('cleanup'))
				collection[0].dispatchEvent(new Event('cleanup'))
				collection[1].dispatchEvent(new Event('cleanup'))
			}
		}
		const instance = new Destroyable(document.createElement('section'))

		teardown(instance)
		single.dispatchEvent(new Event('cleanup'))
		collection[0].dispatchEvent(new Event('cleanup'))
		collection[1].dispatchEvent(new Event('cleanup'))

		expect(calls).toEqual(['single', 'collection-0', 'collection-1'])
	})

	it('is idempotent and calls concrete onDestroy once', () => {
		const onDestroy = vi.fn()
		class Once extends Component('once') {
			onDestroy(): void {
				onDestroy()
			}
		}
		const instance = new Once(document.createElement('section'))

		teardown(instance)
		teardown(instance)
		teardown(instance)

		expect(onDestroy).toHaveBeenCalledOnce()
	})

	it('logs a synchronous concrete onDestroy error and still removes listeners', () => {
		const error = new Error('cleanup failed')
		const listener = vi.fn()
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const target = new EventTarget()
		const root = document.createElement('section')
		class Throwing extends Component('throwing') {
			constructor(componentRoot: HTMLElement) {
				super(componentRoot)
				this.on(target, 'change', listener, { capture: true })
			}

			onDestroy(): void {
				throw error
			}
		}
		const instance = new Throwing(root)

		expect(() => teardown(instance)).not.toThrow()
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
		expect(errorSpy).toHaveBeenCalledOnce()
		expect(errorSpy).toHaveBeenCalledWith('[Nemesia] Component "throwing" failed during onDestroy.', {
			component: 'throwing',
			root,
			error
		})
	})

	it('reports destroy and removal errors while continuing later listener cleanup', () => {
		const destroyError = new Error('destroy failed')
		const removalError = new Error('remove failed')
		const listener = vi.fn()
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		class ThrowingRemovalTarget extends EventTarget {
			public removeEventListener(
				_type: string,
				_callback: EventListenerOrEventListenerObject | null,
				_options?: EventListenerOptions | boolean
			): void {
				throw removalError
			}
		}
		const first = new ThrowingRemovalTarget()
		const second = new EventTarget()
		const root = document.createElement('section')
		class FaultyCleanup extends Component('faulty-cleanup') {
			constructor(componentRoot: HTMLElement) {
				super(componentRoot)
				this.on(first, 'change', vi.fn())
				this.on(second, 'change', listener)
			}

			onDestroy(): void {
				throw destroyError
			}
		}
		const instance = new FaultyCleanup(root)

		expect(() => teardown(instance)).not.toThrow()
		second.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
		expect(errorSpy).toHaveBeenCalledTimes(2)
		expect(errorSpy).toHaveBeenNthCalledWith(1, '[Nemesia] Component "faulty-cleanup" failed during onDestroy.', {
			component: 'faulty-cleanup',
			root,
			error: destroyError
		})
		expect(errorSpy).toHaveBeenNthCalledWith(2, '[Nemesia] Component "faulty-cleanup" failed during onDestroy.', {
			component: 'faulty-cleanup',
			root,
			error: removalError
		})
	})

	it('cleans distributed listeners immediately and logs a rejected onDestroy asynchronously', async () => {
		const error = new Error('async cleanup failed')
		const listener = vi.fn()
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const scope = document.createDocumentFragment()
		const target = new EventTarget()
		class Rejecting extends DistributedComponent('rejecting') {
			constructor(componentScope: ParentNode) {
				super(componentScope)
				this.on(target, 'change', listener)
			}

			onDestroy(): Promise<void> {
				return Promise.reject(error)
			}
		}
		const instance = new Rejecting(scope)

		teardown(instance)
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
		expect(errorSpy).not.toHaveBeenCalled()

		await Promise.resolve()

		expect(errorSpy).toHaveBeenCalledOnce()
		expect(errorSpy).toHaveBeenCalledWith('[Nemesia] Component "rejecting" failed during onDestroy.', {
			component: 'rejecting',
			scope,
			error
		})
	})

	it('observes rejected thenables without relying on Promise instanceof checks', async () => {
		const error = new Error('foreign rejection')
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		class Thenable extends DistributedComponent('thenable') {
			onDestroy(): Promise<void> {
				return {
					then(_onFulfilled: (value: void | PromiseLike<void>) => void, onRejected: (reason?: unknown) => void): void {
						onRejected(error)
					}
				} as unknown as Promise<void>
			}
		}
		const instance = new Thenable(document)

		teardown(instance)
		await Promise.resolve()
		await Promise.resolve()

		expect(errorSpy).toHaveBeenCalledWith('[Nemesia] Component "thenable" failed during onDestroy.', {
			component: 'thenable',
			scope: document,
			error
		})
	})

	it('clears listeners before observing a returned foreign thenable', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		class Thenable extends Component('thenable-order') {
			constructor(root: HTMLElement) {
				super(root)
				this.on(target, 'change', listener)
			}

			onDestroy(): Promise<void> {
				return Object.defineProperty({}, 'then', {
					get: () => {
						target.dispatchEvent(new Event('change'))
						return (resolve: () => void): void => resolve()
					}
				}) as Promise<void>
			}
		}
		const instance = new Thenable(document.createElement('section'))

		teardown(instance)

		expect(listener).not.toHaveBeenCalled()
	})

	it('removes distributed listeners and remains safe across repeated teardown', () => {
		const listener = vi.fn()
		const onDestroy = vi.fn()
		const target = new EventTarget()
		class Distributed extends DistributedComponent('distributed') {
			constructor(scope: ParentNode) {
				super(scope)
				this.on(target, 'change', listener)
			}

			onDestroy(): void {
				onDestroy()
			}
		}
		const instance = new Distributed(document)

		teardown(instance)
		teardown(instance)
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
		expect(onDestroy).toHaveBeenCalledOnce()
	})

	it('does not attach listeners through external calls after teardown', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		class Closed extends Component('closed') {
			attach(): void {
				this.on(target, 'change', listener)
			}
		}
		const instance = new Closed(document.createElement('section'))

		teardown(instance)
		teardown(instance)
		instance.attach()
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
	})

	it('does not attach listeners from async onDestroy work after cleanup', async () => {
		const listener = vi.fn()
		const target = new EventTarget()
		let markResumed: () => void = () => {}
		const resumed = new Promise<void>(resolve => {
			markResumed = resolve
		})
		class AsyncDestroy extends DistributedComponent('async-destroy') {
			async onDestroy(): Promise<void> {
				await Promise.resolve()
				this.on(target, 'change', listener)
				markResumed()
			}
		}
		const instance = new AsyncDestroy(document)

		teardown(instance)
		await resumed
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
	})

	it('releases a once listener when it fires instead of holding it until destroy', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		const removeSpy = vi.spyOn(target, 'removeEventListener')
		class FiredOnce extends Component('fired-once') {
			attach(): void {
				this.on(target, 'change', listener, { once: true })
			}
		}
		const instance = new FiredOnce(document.createElement('section'))

		instance.attach()
		target.dispatchEvent(new Event('change'))
		target.dispatchEvent(new Event('change'))
		teardown(instance)

		expect(listener).toHaveBeenCalledOnce()
		expect(removeSpy).not.toHaveBeenCalled()
	})

	it('removes a once listener that never fired', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		class PendingOnce extends Component('pending-once') {
			attach(): void {
				this.on(target, 'change', listener, { once: true })
			}
		}
		const instance = new PendingOnce(document.createElement('section'))

		instance.attach()
		teardown(instance)
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
	})

	it('releases each fired once listener of an array registration separately', () => {
		const calls: number[] = []
		const targets = [new EventTarget(), new EventTarget()] as const
		const removeSpies = targets.map(target => vi.spyOn(target, 'removeEventListener'))
		class OnceCollection extends Component('once-collection') {
			attach(): void {
				this.on(targets, 'change', (_event, _target, index) => calls.push(index), { once: true })
			}
		}
		const instance = new OnceCollection(document.createElement('section'))

		instance.attach()
		targets[0].dispatchEvent(new Event('change'))
		targets[0].dispatchEvent(new Event('change'))
		teardown(instance)
		targets[1].dispatchEvent(new Event('change'))

		expect(calls).toEqual([0])
		expect(removeSpies[0]).not.toHaveBeenCalled()
		expect(removeSpies[1]).toHaveBeenCalledOnce()
	})

	it('releases a listener when its signal aborts instead of holding it until destroy', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		const controller = new AbortController()
		const removeSpy = vi.spyOn(target, 'removeEventListener')
		class Aborted extends Component('aborted') {
			attach(): void {
				this.on(target, 'change', listener, { signal: controller.signal })
			}
		}
		const instance = new Aborted(document.createElement('section'))

		instance.attach()
		controller.abort()
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
		expect(removeSpy).toHaveBeenCalledOnce()

		teardown(instance)

		expect(removeSpy).toHaveBeenCalledOnce()
	})

	it('does not track a listener registered with an already aborted signal', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		const signal = AbortSignal.abort()
		const addSpy = vi.spyOn(target, 'addEventListener')
		const removeSpy = vi.spyOn(target, 'removeEventListener')
		const signalSpy = vi.spyOn(signal, 'addEventListener')
		class AlreadyAborted extends Component('already-aborted') {
			attach(): void {
				this.on(target, 'change', listener, { signal })
			}
		}
		const instance = new AlreadyAborted(document.createElement('section'))

		instance.attach()
		target.dispatchEvent(new Event('change'))
		teardown(instance)

		expect(listener).not.toHaveBeenCalled()
		expect(addSpy).not.toHaveBeenCalled()
		expect(removeSpy).not.toHaveBeenCalled()
		expect(signalSpy).not.toHaveBeenCalled()
	})

	it('stops watching a signal that outlives the component', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		const controller = new AbortController()
		const signalRemoveSpy = vi.spyOn(controller.signal, 'removeEventListener')
		class Outlived extends Component('outlived') {
			attach(): void {
				this.on(target, 'change', listener, { signal: controller.signal })
			}
		}
		const instance = new Outlived(document.createElement('section'))

		instance.attach()
		teardown(instance)
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
		expect(signalRemoveSpy).toHaveBeenCalledWith('abort', expect.any(Function))
	})

	it('contains errors thrown by asynchronous rejection diagnostics', async () => {
		const diagnosticError = new Error('diagnostic failed')

		await expect(
			observeRejection(Promise.reject(new Error('destroy failed')), () => {
				throw diagnosticError
			})
		).resolves.toBeUndefined()
	})
})

describe('component warning facade', () => {
	it('warns with concrete context and payload without triggering teardown', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const listener = vi.fn()
		const onDestroy = vi.fn()
		const target = new EventTarget()
		const root = document.createElement('section')
		class Warning extends Component('warning') {
			constructor(componentRoot: HTMLElement) {
				super(componentRoot)
				this.on(target, 'active', listener)
			}

			onDestroy(): void {
				onDestroy()
			}
		}
		const instance = new Warning(root)

		instance.warn('careful', { detail: 42 })
		target.dispatchEvent(new Event('active'))

		expect(warnSpy).toHaveBeenCalledOnce()
		expect(warnSpy).toHaveBeenCalledWith('[Nemesia] Component "warning": careful', {
			component: 'warning',
			root,
			detail: 42
		})
		expect(listener).toHaveBeenCalledOnce()
		expect(onDestroy).not.toHaveBeenCalled()
	})

	it('warns with distributed component and scope context', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const scope = document.createDocumentFragment()
		class Warning extends DistributedComponent('distributed-warning') {}
		const instance = new Warning(scope)

		instance.warn('careful', { detail: 'distributed' })

		expect(warnSpy).toHaveBeenCalledOnce()
		expect(warnSpy).toHaveBeenCalledWith('[Nemesia] Component "distributed-warning": careful', {
			component: 'distributed-warning',
			scope,
			detail: 'distributed'
		})
	})

	it.each(['concrete', 'distributed'] as const)('contains a throwing payload getter for a %s warning', kind => {
		const root = document.createElement('section')
		const scope = document.createDocumentFragment()
		class ConcreteWarning extends Component('proxy-concrete') {}
		class DistributedWarning extends DistributedComponent('proxy-distributed') {}
		const instance = kind === 'concrete' ? new ConcreteWarning(root) : new DistributedWarning(scope)
		const payload = new Proxy(
			{ dangerous: true },
			{
				get(): never {
					throw new Error('payload getter failed')
				}
			}
		)
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		expect(() => instance.warn('careful', payload)).not.toThrow()
		expect(warnSpy).not.toHaveBeenCalled()
	})
})

describe('removing a listener early', () => {
	it('returns a function that removes a single listener before destroy', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		const removeSpy = vi.spyOn(target, 'removeEventListener')
		class Early extends Component('early-single') {
			attach(): () => void {
				const off = this.on(target, 'change', listener)
				expectTypeOf(off).toEqualTypeOf<() => void>()
				return off
			}
		}
		const instance = new Early(document.createElement('section'))
		const off = instance.attach()

		target.dispatchEvent(new Event('change'))
		off()
		target.dispatchEvent(new Event('change'))

		expect(listener).toHaveBeenCalledOnce()
		expect(removeSpy).toHaveBeenCalledOnce()

		teardown(instance)

		expect(removeSpy).toHaveBeenCalledOnce()
	})

	it('returns one function that removes every listener of an array registration', () => {
		const calls: number[] = []
		const targets = [new EventTarget(), new EventTarget()] as const
		class EarlyCollection extends DistributedComponent('early-collection') {
			attach(): () => void {
				return this.on(targets, 'change', (_event, _target, index) => calls.push(index))
			}
		}
		const instance = new EarlyCollection(document)
		const off = instance.attach()

		targets.forEach(target => target.dispatchEvent(new Event('change')))
		off()
		targets.forEach(target => target.dispatchEvent(new Event('change')))

		expect(calls).toEqual([0, 1])
	})

	it('can be called again, and after destroy, without effect', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		class Repeated extends Component('early-repeated') {
			attach(): () => void {
				return this.on(target, 'change', listener)
			}
		}
		const instance = new Repeated(document.createElement('section'))
		const off = instance.attach()

		off()
		off()
		teardown(instance)

		expect(() => off()).not.toThrow()
		expect(listener).not.toHaveBeenCalled()
	})

	it('returns a callable function when nothing was attached', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		class Nothing extends Component('early-nothing') {
			attach(options?: AddEventListenerOptions): () => void {
				return this.on(target, 'change', listener, options)
			}
		}
		const instance = new Nothing(document.createElement('section'))
		const aborted = instance.attach({ signal: AbortSignal.abort() })

		teardown(instance)
		const closed = instance.attach()

		expect(() => {
			aborted()
			closed()
		}).not.toThrow()
		target.dispatchEvent(new Event('change'))
		expect(listener).not.toHaveBeenCalled()
	})
})
