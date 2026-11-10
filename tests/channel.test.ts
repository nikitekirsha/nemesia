import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Component, DistributedComponent, createApp, type Channel } from '../src/index.js'

function root(component: string, parent: ParentNode = document.body): HTMLElement {
	const element = document.createElement('div')
	element.dataset.nemesia = component
	parent.append(element)
	return element
}

class Counter extends Component('channel-counter') {
	changed = this.channel<number>()
	reset = this.channel()

	set(value: number): void {
		this.changed.emit(value)
	}
}

describe('channels between components', () => {
	it('delivers emitted values to a component that listens with this.on', () => {
		const seen: number[] = []
		class Total extends Component('channel-total') {
			onMount(): void {
				for (const counter of this.findAll(Counter)) {
					expectTypeOf(counter.changed).toEqualTypeOf<Channel<number>>()
					this.on(counter.changed, value => {
						expectTypeOf(value).toEqualTypeOf<number>()
						seen.push(value)
					})
				}
			}
		}
		root('channel-counter', root('channel-total'))
		const app = createApp().register([Counter, Total])
		app.mount()

		app.find(Counter)?.set(3)
		app.find(Counter)?.set(4)

		expect(seen).toEqual([3, 4])
	})

	it('sends a channel without a value type as a plain notification', () => {
		const listener = vi.fn()
		class Listener extends Component('channel-plain-listener') {
			listen(counter: Counter): void {
				expectTypeOf(counter.reset).toEqualTypeOf<Channel<void>>()
				this.on(counter.reset, listener)
			}
		}
		root('channel-counter')
		root('channel-plain-listener')
		const app = createApp().register([Counter, Listener])
		app.mount()
		const counter = app.find(Counter)!

		app.find(Listener)?.listen(counter)
		counter.reset.emit()

		expect(listener).toHaveBeenCalledOnce()
	})

	it('stops listening when the listening component is destroyed', () => {
		const listener = vi.fn()
		class Listener extends Component('channel-listener') {
			onMount(): void {
				const counter = this.find(Counter, document.body)
				if (counter) this.on(counter.changed, listener)
			}
		}
		root('channel-counter')
		const listenerRoot = root('channel-listener')
		const app = createApp().register([Counter, Listener])
		app.mount()
		const counter = app.find(Counter)!

		counter.set(1)
		app.destroy(listenerRoot)
		counter.set(2)

		expect(listener).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledWith(1)
	})

	it('returns a function that stops listening earlier', () => {
		const listener = vi.fn()
		class Listener extends DistributedComponent('channel-early') {
			listen(counter: Counter): () => void {
				return this.on(counter.changed, listener)
			}
		}
		root('channel-counter')
		const app = createApp().register([Counter, Listener])
		app.mount()
		const counter = app.find(Counter)!
		const off = app.find(Listener, document.body)!.listen(counter)

		counter.set(1)
		off()
		off()
		counter.set(2)
		app.destroy()

		expect(listener).toHaveBeenCalledOnce()
	})

	it('still delivers what the owner emits from onDestroy, then closes the channel', () => {
		const seen: string[] = []
		class Closing extends Component('channel-closing') {
			closed = this.channel<string>()

			onDestroy(): void {
				this.closed.emit('bye')
			}
		}
		class Listener extends Component('channel-closing-listener') {
			onMount(): void {
				const closing = this.find(Closing, document.body)
				if (closing) this.on(closing.closed, value => seen.push(value))
			}
		}
		const closingRoot = root('channel-closing')
		root('channel-closing-listener')
		const app = createApp().register([Closing, Listener])
		app.mount()
		const closing = app.find(Closing)!

		app.destroy(closingRoot)
		closing.closed.emit('after')

		expect(seen).toEqual(['bye'])
	})

	it('does nothing when a destroyed component starts listening', () => {
		const listener = vi.fn()
		class Late extends Component('channel-late') {
			listen(counter: Counter): () => void {
				return this.on(counter.changed, listener)
			}
		}
		root('channel-counter')
		const lateRoot = root('channel-late')
		const app = createApp().register([Counter, Late])
		app.mount()
		const counter = app.find(Counter)!
		const late = app.find(Late)!

		app.destroy(lateRoot)
		const off = late.listen(counter)
		counter.set(1)

		expect(() => off()).not.toThrow()
		expect(listener).not.toHaveBeenCalled()
	})

	it('creates an already closed channel for a destroyed component', () => {
		const listener = vi.fn()
		const onClose = vi.fn()
		class Owner extends Component('channel-dead-owner') {
			open(): Channel<number> {
				return this.channel<number>()
			}
		}
		const ownerRoot = root('channel-dead-owner')
		const app = createApp().register([Owner])
		app.mount()
		const owner = app.find(Owner)!

		app.destroy(ownerRoot)
		const channel = owner.open()
		const off = channel.subscribe(listener, onClose)
		channel.emit(1)

		expect(() => off()).not.toThrow()
		expect(onClose).toHaveBeenCalledOnce()
		expect(listener).not.toHaveBeenCalled()
	})

	it('closes a channel created by a component that is then skipped', () => {
		const channels: Array<Channel<number>> = []
		const onClose = vi.fn()
		class Skipped extends Component('channel-skipped') {
			changed = this.channel<number>()
			remembered = channels.push(this.changed)
			missing = this.ref.element('missing')
		}
		root('channel-skipped')
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([Skipped]).mount()
		channels[0]?.subscribe(() => {}, onClose)

		expect(onClose).toHaveBeenCalledOnce()
	})
})

describe('channel listeners', () => {
	it('reports a listener that throws and still calls the others', () => {
		const error = new Error('listener failed')
		const second = vi.fn()
		const report = vi.spyOn(console, 'error').mockImplementation(() => {})
		const counterRoot = root('channel-counter')
		const app = createApp().register([Counter])
		app.mount()
		const counter = app.find(Counter)!
		counter.changed.subscribe(() => {
			throw error
		})
		counter.changed.subscribe(second)

		expect(() => counter.set(5)).not.toThrow()

		expect(second).toHaveBeenCalledWith(5)
		expect(report).toHaveBeenCalledOnce()
		expect(report).toHaveBeenCalledWith('[Nemesia] A listener of a channel of component "channel-counter" failed.', {
			component: 'channel-counter',
			root: counterRoot,
			error
		})
	})

	it('does not call a listener that an earlier one removed during the same emit', () => {
		const calls: string[] = []
		root('channel-counter')
		const app = createApp().register([Counter])
		app.mount()
		const counter = app.find(Counter)!
		counter.changed.subscribe(() => {
			calls.push('first')
			removeSecond()
		})
		const removeSecond = counter.changed.subscribe(() => calls.push('second'))
		counter.changed.subscribe(() => calls.push('third'))

		counter.set(1)

		expect(calls).toEqual(['first', 'third'])
	})

	it('tells a plain subscriber when the channel closes, unless it left first', () => {
		const stayed = vi.fn()
		const left = vi.fn()
		const counterRoot = root('channel-counter')
		const app = createApp().register([Counter])
		app.mount()
		const counter = app.find(Counter)!
		counter.changed.subscribe(() => {}, stayed)
		counter.changed.subscribe(() => {})
		counter.changed.subscribe(() => {}, left)()

		app.destroy(counterRoot)

		expect(stayed).toHaveBeenCalledOnce()
		expect(left).not.toHaveBeenCalled()
	})

	it('forgets a listener as soon as the channel it listened to closes', () => {
		const removeFromChannel = vi.fn()
		let close: (() => void) | undefined
		const foreign: Channel<number> = {
			emit: () => {},
			subscribe: (_listener, onClose) => {
				close = onClose
				return removeFromChannel
			}
		}
		class Listener extends Component('channel-forgetful') {
			listen(): void {
				this.on(foreign, () => {})
			}
		}
		const listenerRoot = root('channel-forgetful')
		const app = createApp().register([Listener])
		app.mount()
		app.find(Listener)?.listen()

		close?.()
		app.destroy(listenerRoot)

		expect(removeFromChannel).not.toHaveBeenCalled()
	})

	it('removes a listener from a channel that is still open when the listening component is destroyed', () => {
		const removeFromChannel = vi.fn()
		const foreign: Channel<number> = { emit: () => {}, subscribe: () => removeFromChannel }
		class Listener extends Component('channel-leaving') {
			onMount(): void {
				this.on(foreign, () => {})
			}
		}
		const listenerRoot = root('channel-leaving')
		const app = createApp().register([Listener])
		app.mount()

		app.destroy(listenerRoot)

		expect(removeFromChannel).toHaveBeenCalledOnce()
	})
})
