import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { BaseDistributedComponent, Nemesia, createApp } from '../src/index.js'

async function flushMicrotasks(): Promise<void> {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
}

describe('distributed mounting', () => {
	it('mounts once per exact scope and receives each exact scope identity', () => {
		const scopes: ParentNode[] = []
		class Scoped extends Nemesia.DistributedComponent('scoped') {
			onMount(): void {
				scopes.push(this.scope)
			}
		}
		const parent = document.createElement('section')
		const child = document.createElement('div')
		const fragment = document.createDocumentFragment()
		parent.append(child)
		document.body.append(parent)
		const app = createApp().register([Scoped])

		app.mount(parent)
		app.mount(parent)
		app.mount(child)
		app.mount(fragment)
		app.mount(fragment)

		expect(scopes).toEqual([parent, child, fragment])
	})

	it('defaults mount and destroy to the document body', () => {
		const mounted: ParentNode[] = []
		const destroyed: ParentNode[] = []
		class DefaultScope extends Nemesia.DistributedComponent('default-scope') {
			onMount(): void {
				mounted.push(this.scope)
			}
			onDestroy(): void {
				destroyed.push(this.scope)
			}
		}
		const app = createApp().register([DefaultScope])

		app.mount()
		app.mount()
		app.destroy()
		app.destroy()

		expect(mounted).toEqual([document.body])
		expect(destroyed).toEqual([document.body])
	})

	it('exposes scope/on/warn without concrete root/ref/option APIs', () => {
		let instance: PublicSurface | undefined
		class PublicSurface extends Nemesia.DistributedComponent('public-surface') {
			onMount(): void {
				instance = this
			}

			checkTypes(): void {
				expectTypeOf(this.scope).toEqualTypeOf<ParentNode>()
				expectTypeOf(this.on).toBeFunction()
				expectTypeOf(this.warn).toBeFunction()
				// @ts-expect-error Distributed components intentionally have no root.
				void this.root
				// @ts-expect-error Distributed components intentionally have no ref API.
				void this.ref
				// @ts-expect-error Distributed components intentionally have no option API.
				void this.option
			}
		}

		createApp().register([PublicSurface]).mount(document)

		expect(instance).toBeInstanceOf(BaseDistributedComponent)
		expect(instance).not.toHaveProperty('root')
		expect(instance).not.toHaveProperty('ref')
		expect(instance).not.toHaveProperty('option')
	})

	it('mounts distributed components before discovering concrete roots', () => {
		const order: string[] = []
		class Distributed extends Nemesia.DistributedComponent('order-distributed') {
			onMount(): void {
				order.push('distributed')
			}
		}
		class Concrete extends Nemesia.Component('order-concrete') {
			onMount(): void {
				order.push('concrete')
			}
		}
		const concrete = document.createElement('div')
		concrete.dataset.nemesia = 'order-concrete'
		document.body.append(concrete)

		createApp().register([Concrete, Distributed]).mount(document.body)

		expect(order).toEqual(['distributed', 'concrete'])
	})

	it('reserves an exact scope during constructor-time recursive mounting', () => {
		const app = createApp()
		let constructed = 0
		let mounted = 0
		let reentered = false
		class Recursive extends Nemesia.DistributedComponent('recursive-distributed') {
			construction = (() => {
				constructed += 1
				if (!reentered) {
					reentered = true
					app.mount(this.scope)
				}
			})()

			onMount(): void {
				mounted += 1
			}
		}

		app.register([Recursive]).mount(document.body)

		expect({ constructed, mounted }).toEqual({ constructed: 1, mounted: 1 })
	})

	it('records before onMount for recursive mount safety', () => {
		const app = createApp()
		const mounted = vi.fn()
		class Recursive extends Nemesia.DistributedComponent('recursive-mount') {
			onMount(): void {
				mounted()
				app.mount(this.scope)
			}
		}

		app.register([Recursive]).mount(document.body)

		expect(mounted).toHaveBeenCalledOnce()
	})
})

describe('distributed exact-scope destruction', () => {
	it('cleans single and array listeners only when their exact scope is destroyed', () => {
		const singleTarget = new EventTarget()
		const arrayTargets = [new EventTarget(), new EventTarget()] as const
		const calls: string[] = []
		class Listening extends Nemesia.DistributedComponent('listening') {
			onMount(): void {
				this.on(singleTarget, 'change', () => calls.push('single'))
				this.on(arrayTargets, 'change', (_event, _target, index) => {
					calls.push(`array-${index}`)
				})
			}
		}
		const firstScope = document.createElement('section')
		const secondScope = document.createElement('section')
		const app = createApp().register([Listening])
		app.mount(firstScope)
		app.mount(secondScope)

		app.destroy(firstScope)
		singleTarget.dispatchEvent(new Event('change'))
		arrayTargets.forEach(target => target.dispatchEvent(new Event('change')))

		expect(calls).toEqual(['single', 'array-0', 'array-1'])

		calls.length = 0
		app.destroy(secondScope)
		singleTarget.dispatchEvent(new Event('change'))
		arrayTargets.forEach(target => target.dispatchEvent(new Event('change')))

		expect(calls).toEqual([])
	})

	it('does not destroy parent or child distributed instances by containment', () => {
		const destroyed: ParentNode[] = []
		class ExactDestroy extends Nemesia.DistributedComponent('exact-destroy') {
			onDestroy(): void {
				destroyed.push(this.scope)
			}
		}
		const parent = document.createElement('section')
		const child = document.createElement('div')
		parent.append(child)
		document.body.append(parent)
		const app = createApp().register([ExactDestroy])
		app.mount(parent)
		app.mount(child)

		app.destroy(parent)
		expect(destroyed).toEqual([parent])

		app.destroy(parent)
		expect(destroyed).toEqual([parent])

		app.destroy(child)
		expect(destroyed).toEqual([parent, child])
	})

	it('keeps concrete subtree destruction unchanged without consuming child distributed state', () => {
		const concreteDestroyed = vi.fn()
		const distributedDestroyed: ParentNode[] = []
		class Concrete extends Nemesia.Component('distributed-concrete-child') {
			onDestroy(): void {
				concreteDestroyed()
			}
		}
		class Distributed extends Nemesia.DistributedComponent('distributed-neighbor') {
			onDestroy(): void {
				distributedDestroyed.push(this.scope)
			}
		}
		const parent = document.createElement('section')
		const child = document.createElement('div')
		child.dataset.nemesia = 'distributed-concrete-child'
		parent.append(child)
		document.body.append(parent)
		const app = createApp().register([Concrete, Distributed])
		app.mount(parent)
		app.mount(child)

		app.destroy(parent)

		expect(concreteDestroyed).toHaveBeenCalledOnce()
		expect(distributedDestroyed).toEqual([parent])

		app.destroy(child)
		expect(distributedDestroyed).toEqual([parent, child])
	})

	it('contains throwing and rejected onDestroy hooks while cleaning listeners', async () => {
		const syncError = new Error('sync destroy failed')
		const asyncError = new Error('async destroy failed')
		const syncListener = vi.fn()
		const asyncListener = vi.fn()
		const syncTarget = new EventTarget()
		const asyncTarget = new EventTarget()
		const scope = document.createDocumentFragment()
		class SyncDestroy extends Nemesia.DistributedComponent('sync-destroy') {
			onMount(): void {
				this.on(syncTarget, 'change', syncListener)
			}
			onDestroy(): void {
				throw syncError
			}
		}
		class AsyncDestroy extends Nemesia.DistributedComponent('async-destroy-app') {
			onMount(): void {
				this.on(asyncTarget, 'change', asyncListener)
			}
			onDestroy(): Promise<void> {
				return Promise.reject(asyncError)
			}
		}
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([SyncDestroy, AsyncDestroy])

		app.mount(scope)
		expect(() => app.destroy(scope)).not.toThrow()
		syncTarget.dispatchEvent(new Event('change'))
		asyncTarget.dispatchEvent(new Event('change'))
		await flushMicrotasks()

		expect(syncListener).not.toHaveBeenCalled()
		expect(asyncListener).not.toHaveBeenCalled()
		expect(report).toHaveBeenCalledWith('[Nemesia] Component "sync-destroy" failed during onDestroy.', {
			component: 'sync-destroy',
			scope,
			error: syncError
		})
		expect(report).toHaveBeenCalledWith('[Nemesia] Component "async-destroy-app" failed during onDestroy.', {
			component: 'async-destroy-app',
			scope,
			error: asyncError
		})
	})
})

describe('distributed construction and mount failures', () => {
	it('aborts partial constructor listeners without onDestroy and continues', () => {
		const error = new Error('field failed')
		const target = new EventTarget()
		const listener = vi.fn()
		const onDestroy = vi.fn()
		const continued = vi.fn()
		const scope = document.createDocumentFragment()
		class Partial extends Nemesia.DistributedComponent('partial-distributed') {
			attached = (() => {
				this.on(target, 'change', listener)
				return true
			})()

			failed = (() => {
				throw error
			})()

			onDestroy(): void {
				onDestroy()
			}
		}
		class Good extends Nemesia.DistributedComponent('construction-good') {
			onMount(): void {
				continued()
			}
		}
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})

		createApp().register([Partial, Good]).mount(scope)
		target.dispatchEvent(new Event('change'))

		expect(listener).not.toHaveBeenCalled()
		expect(onDestroy).not.toHaveBeenCalled()
		expect(continued).toHaveBeenCalledOnce()
		expect(report).toHaveBeenCalledWith('[Nemesia] Component "partial-distributed" failed during construction.', {
			component: 'partial-distributed',
			scope,
			error
		})
	})

	it('captures by constructor and exact target after a pre-super helper', () => {
		const error = new Error('outer field failed')
		const mainScope = document.createDocumentFragment()
		const helperScope = document.createDocumentFragment()
		const mainTarget = new EventTarget()
		const helperTarget = new EventTarget()
		const mainListener = vi.fn()
		const helperListener = vi.fn()
		let helper: Captured | undefined
		class Captured extends Nemesia.DistributedComponent('captured-distributed') {
			constructor(scope: ParentNode) {
				if (scope === mainScope) helper = new Captured(helperScope)
				super(scope)
			}

			attached = (() => {
				this.on(
					this.scope === mainScope ? mainTarget : helperTarget,
					'change',
					this.scope === mainScope ? mainListener : helperListener
				)
				return true
			})()

			failed =
				this.scope === mainScope
					? (() => {
							throw error
						})()
					: false
		}
		vi.spyOn(console, 'error').mockImplementation(() => {})

		createApp().register([Captured]).mount(mainScope)
		mainTarget.dispatchEvent(new Event('change'))
		helperTarget.dispatchEvent(new Event('change'))

		expect(helper).toBeInstanceOf(Captured)
		expect(mainListener).not.toHaveBeenCalled()
		expect(helperListener).toHaveBeenCalledOnce()
	})

	it('does not let a same-constructor same-scope pre-super helper steal capture', () => {
		const scope = document.createDocumentFragment()
		const helperTarget = new EventTarget()
		const outerTarget = new EventTarget()
		const helperListener = vi.fn()
		const outerListener = vi.fn()
		const helperDestroy = vi.fn()
		const outerDestroy = vi.fn()
		const failure = new Error('outer field failed')
		let constructingHelper = false
		let helper: SameTarget | undefined

		class SameTarget extends Nemesia.DistributedComponent('same-target-distributed') {
			constructor(sameScope: ParentNode) {
				if (!constructingHelper) {
					constructingHelper = true
					try {
						helper = new SameTarget(sameScope)
					} finally {
						constructingHelper = false
					}
				}
				super(sameScope)
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

		createApp().register([SameTarget]).mount(scope)
		helperTarget.dispatchEvent(new Event('change'))
		outerTarget.dispatchEvent(new Event('change'))

		expect(helper).toBeInstanceOf(SameTarget)
		expect(helper?.scope).toBe(scope)
		expect(helperListener).toHaveBeenCalledOnce()
		expect(outerListener).not.toHaveBeenCalled()
		expect(helperDestroy).not.toHaveBeenCalled()
		expect(outerDestroy).not.toHaveBeenCalled()
	})

	it('contains synchronous onMount failure, tears down, and continues distributed and concrete mounting', () => {
		const error = new Error('sync mount failed')
		const target = new EventTarget()
		const listener = vi.fn()
		const destroyed = vi.fn()
		const distributedGood = vi.fn()
		const concreteGood = vi.fn()
		const scope = document.createElement('section')
		const concrete = document.createElement('div')
		concrete.dataset.nemesia = 'sync-concrete-good'
		scope.append(concrete)
		class Broken extends Nemesia.DistributedComponent('sync-distributed-broken') {
			onMount(): void {
				this.on(target, 'change', listener)
				throw error
			}
			onDestroy(): void {
				destroyed()
			}
		}
		class DistributedGood extends Nemesia.DistributedComponent('sync-distributed-good') {
			onMount(): void {
				distributedGood()
			}
		}
		class ConcreteGood extends Nemesia.Component('sync-concrete-good') {
			onMount(): void {
				concreteGood()
			}
		}
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([Broken, DistributedGood, ConcreteGood])

		app.mount(scope)
		target.dispatchEvent(new Event('change'))

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "sync-distributed-broken" failed during onMount.', {
			component: 'sync-distributed-broken',
			scope,
			error
		})
		expect(listener).not.toHaveBeenCalled()
		expect(destroyed).toHaveBeenCalledOnce()
		expect(distributedGood).toHaveBeenCalledOnce()
		expect(concreteGood).toHaveBeenCalledOnce()
	})

	it.each([
		['a rejected Promise', () => Promise.reject(new Error('rejected'))],
		[
			'a rejecting foreign thenable',
			() => ({
				then: (_resolve: unknown, reject: (error: unknown) => void): void => {
					reject(new Error('thenable'))
				}
			})
		]
	])('contains %s from onMount and continues other mounting', async (_label, resultFactory) => {
		const listener = vi.fn()
		const destroyed = vi.fn()
		const continued = vi.fn()
		const target = new EventTarget()
		const scope = document.createDocumentFragment()
		class AsyncBroken extends Nemesia.DistributedComponent('async-distributed-broken') {
			onMount(): Promise<void> {
				this.on(target, 'change', listener)
				return resultFactory() as Promise<void>
			}
			onDestroy(): void {
				destroyed()
			}
		}
		class AsyncGood extends Nemesia.DistributedComponent('async-distributed-good') {
			onMount(): void {
				continued()
			}
		}
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})

		createApp().register([AsyncBroken, AsyncGood]).mount(scope)
		await flushMicrotasks()
		target.dispatchEvent(new Event('change'))

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "async-distributed-broken" failed during onMount.', {
			component: 'async-distributed-broken',
			scope,
			error: expect.any(Error)
		})
		expect(listener).not.toHaveBeenCalled()
		expect(destroyed).toHaveBeenCalledOnce()
		expect(continued).toHaveBeenCalledOnce()
	})

	it('does not let a stale rejection destroy a remounted exact-scope instance', async () => {
		let rejectOld!: (error: unknown) => void
		const oldMount = new Promise<void>((_resolve, reject) => {
			rejectOld = reject
		})
		const target = new EventTarget()
		const listener = vi.fn()
		const destroyed: number[] = []
		const scope = document.createDocumentFragment()
		let generation = 0
		class Remounted extends Nemesia.DistributedComponent('distributed-remounted') {
			currentGeneration = ++generation

			onMount(): void | Promise<void> {
				this.on(target, 'change', () => listener(this.currentGeneration))
				return this.currentGeneration === 1 ? oldMount : undefined
			}

			onDestroy(): void {
				destroyed.push(this.currentGeneration)
			}
		}
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([Remounted])

		app.mount(scope)
		app.destroy(scope)
		app.mount(scope)
		rejectOld(new Error('stale rejection'))
		await flushMicrotasks()
		target.dispatchEvent(new Event('change'))

		expect(report).toHaveBeenCalledWith('[Nemesia] Component "distributed-remounted" failed during onMount.', {
			component: 'distributed-remounted',
			scope,
			error: expect.any(Error)
		})
		expect(listener).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledWith(2)
		expect(destroyed).toEqual([1])

		app.destroy(scope)
		expect(destroyed).toEqual([1, 2])
	})
})

describe('distributed observer boundary', () => {
	it('does not create distributed instances for DOM additions in observe mode', async () => {
		const scopes: ParentNode[] = []
		class Observed extends Nemesia.DistributedComponent('observed-distributed') {
			onMount(): void {
				scopes.push(this.scope)
			}
		}
		const app = createApp({ observe: true }).register([Observed])

		app.mount(document.body)
		const added = document.createElement('div')
		added.dataset.nemesia = 'unrelated-concrete-root'
		document.body.append(added)
		await flushMicrotasks()

		expect(scopes).toEqual([document.body])
		expect(() => app.disconnect(document.body)).not.toThrow()
	})
})
