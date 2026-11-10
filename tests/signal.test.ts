import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Component, DistributedComponent, createApp } from '../src/index.js'

function root(component: string): HTMLElement {
	const element = document.createElement('div')
	element.dataset.nemesia = component
	document.body.append(element)
	return element
}

async function flushMicrotasks(): Promise<void> {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
}

describe('component signal', () => {
	it('stays the same live signal while the component is mounted', () => {
		class Alive extends Component('signal-alive') {}
		root('signal-alive')
		const app = createApp().register([Alive])
		app.mount()
		const instance = app.find(Alive)!

		expectTypeOf(instance.signal).toEqualTypeOf<AbortSignal>()
		expect(instance.signal).toBe(instance.signal)
		expect(instance.signal.aborted).toBe(false)
	})

	it('aborts when the component is destroyed, before onDestroy runs', () => {
		const order: string[] = []
		class Destroyed extends Component('signal-destroyed') {
			onMount(): void {
				this.signal.addEventListener('abort', () => order.push('abort'))
			}

			onDestroy(): void {
				order.push(`onDestroy aborted=${this.signal.aborted}`)
			}
		}
		root('signal-destroyed')
		const app = createApp().register([Destroyed])
		app.mount()
		const instance = app.find(Destroyed)!

		app.destroy()

		expect(order).toEqual(['abort', 'onDestroy aborted=true'])
		expect(instance.signal.aborted).toBe(true)
	})

	it('is already aborted when first asked for after destroy', () => {
		class Late extends Component('signal-late') {}
		root('signal-late')
		const app = createApp().register([Late])
		app.mount()
		const instance = app.find(Late)!

		app.destroy()

		expect(instance.signal.aborted).toBe(true)
	})

	it('is already aborted when first asked for inside onDestroy', () => {
		const seen: boolean[] = []
		class InHook extends Component('signal-in-hook') {
			onDestroy(): void {
				seen.push(this.signal.aborted)
			}
		}
		root('signal-in-hook')
		const app = createApp().register([InHook])
		app.mount()

		app.destroy()

		expect(seen).toEqual([true])
	})

	it('aborts a signal taken during a construction that is then skipped', () => {
		const taken: AbortSignal[] = []
		class Skipped extends Component('signal-skipped') {
			early = taken.push(this.signal)
			missing = this.ref.element('missing')
		}
		root('signal-skipped')
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([Skipped]).mount()

		expect(taken).toHaveLength(1)
		expect(taken[0]?.aborted).toBe(true)
	})

	it('aborts for a distributed component when its scope is destroyed', () => {
		class Delegation extends DistributedComponent('signal-distributed') {}
		const scope = document.createDocumentFragment()
		const app = createApp().register([Delegation])
		app.mount(scope)
		const signal = app.find(Delegation, scope)!.signal

		expect(signal.aborted).toBe(false)

		app.destroy(scope)

		expect(signal.aborted).toBe(true)
	})

	it('stops work that an async onMount is waiting for, without reporting an error', async () => {
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const finished = vi.fn()
		class Loading extends Component('signal-loading') {
			async onMount(): Promise<void> {
				// What fetch(url, { signal }) does: reject with the abort reason once the signal aborts.
				await new Promise<void>((_resolve, reject) => {
					this.signal.addEventListener('abort', () => reject(this.signal.reason as Error))
				})
				finished()
			}
		}
		root('signal-loading')
		const app = createApp().register([Loading])
		app.mount()

		app.destroy()
		await flushMicrotasks()

		expect(finished).not.toHaveBeenCalled()
		expect(report).not.toHaveBeenCalled()
	})

	it('removes a listener registered with it on a foreign target', () => {
		const listener = vi.fn()
		const target = new EventTarget()
		class Owner extends Component('signal-owner') {
			onMount(): void {
				target.addEventListener('change', listener, { signal: this.signal })
			}
		}
		root('signal-owner')
		const app = createApp().register([Owner])
		app.mount()

		target.dispatchEvent(new Event('change'))
		app.destroy()
		target.dispatchEvent(new Event('change'))

		expect(listener).toHaveBeenCalledOnce()
	})
})
