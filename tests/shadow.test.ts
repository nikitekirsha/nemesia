import { describe, expect, it } from 'vitest'

import { Component, DistributedComponent, createApp } from '../src/index.js'
import { flushMutations } from './helpers.js'

function shadowHost(html: string): { host: HTMLElement; shadow: ShadowRoot } {
	const host = document.createElement('div')
	const shadow = host.attachShadow({ mode: 'open' })
	shadow.innerHTML = html
	document.body.append(host)
	return { host, shadow }
}

describe('shadow roots as scopes', () => {
	it('mounts components inside a shadow root only when the shadow root is the scope', () => {
		const mounted: string[] = []
		class Card extends Component('shadow-card') {
			onMount(): void {
				mounted.push(this.root.id)
			}
		}
		document.body.innerHTML = '<div id="light" data-nemesia="shadow-card"></div>'
		const { shadow } = shadowHost('<div id="shadowed" data-nemesia="shadow-card"></div>')
		const app = createApp().register([Card])

		app.mount()

		expect(mounted).toEqual(['light'])

		app.mount(shadow)

		expect(mounted).toEqual(['light', 'shadowed'])
	})

	it('resolves refs inside the shadow tree and keeps nested ownership', () => {
		class Inner extends Component('shadow-inner') {
			label = this.ref.element('label')
		}
		class Outer extends Component('shadow-outer') {
			label = this.ref.element('label')
			button = this.ref.button('button')
		}
		const { shadow } = shadowHost(`
			<section data-nemesia="shadow-outer">
				<span id="outer-label" data-ref="label"></span>
				<button data-ref="button"></button>
				<div data-nemesia="shadow-inner"><span id="inner-label" data-ref="label"></span></div>
			</section>`)
		const app = createApp().register([Outer, Inner])

		app.mount(shadow)

		expect(app.find(Outer, shadow)?.label.id).toBe('outer-label')
		expect(app.find(Outer, shadow)?.button).toBe(shadow.querySelector('button'))
		expect(app.find(Inner, shadow)?.label.id).toBe('inner-label')
	})

	it('does not let a light-tree component take refs from a shadow tree below it', () => {
		class Host extends Component('shadow-host') {
			inside = this.ref.optional.element('inside')
		}
		const root = document.createElement('div')
		root.dataset.nemesia = 'shadow-host'
		root.attachShadow({ mode: 'open' }).innerHTML = '<span data-ref="inside"></span>'
		document.body.append(root)
		const app = createApp().register([Host])

		app.mount()

		expect(app.find(Host)?.inside).toBeNull()
	})

	it('finds shadow instances only through the shadow root', () => {
		class Card extends Component('shadow-found') {}
		const { shadow } = shadowHost('<div data-nemesia="shadow-found"></div>')
		const app = createApp().register([Card])

		app.mount(shadow)

		expect(app.findAll(Card)).toEqual([])
		expect(app.findAll(Card, shadow)).toHaveLength(1)
		expect(app.find(Card, shadow)?.root).toBe(shadow.firstElementChild)
	})

	it('mounts a distributed component for a shadow scope and delegates events inside it', () => {
		const clicks: string[] = []
		class Delegation extends DistributedComponent('shadow-delegation') {
			onMount(): void {
				this.on(this.scope, 'click', event => {
					clicks.push((event.target as Element).id)
				})
			}
		}
		const { shadow } = shadowHost('<button id="inside"></button>')
		const app = createApp().register([Delegation])

		app.mount(shadow)
		shadow.querySelector('button')?.click()

		expect(app.find(Delegation, shadow)?.scope).toBe(shadow)
		expect(clicks).toEqual(['inside'])

		app.destroy(shadow)
		shadow.querySelector('button')?.click()

		expect(clicks).toEqual(['inside'])
	})

	it('destroys every instance inside a shadow scope', () => {
		const lifecycle: string[] = []
		class Card extends Component('shadow-destroyed') {
			onDestroy(): void {
				lifecycle.push(`destroy ${this.root.id}`)
			}
		}
		const { shadow } = shadowHost(
			'<div id="outer" data-nemesia="shadow-destroyed"><div id="inner" data-nemesia="shadow-destroyed"></div></div>'
		)
		const app = createApp().register([Card])

		app.mount(shadow)
		app.destroy(shadow)

		expect(lifecycle).toEqual(['destroy inner', 'destroy outer'])
		expect(app.findAll(Card, shadow)).toEqual([])
	})
})

describe('observed shadow roots', () => {
	it('mounts markup added to an observed shadow root and destroys markup removed from it', async () => {
		const lifecycle: string[] = []
		class Card extends Component('shadow-observed') {
			onMount(): void {
				lifecycle.push(`mount ${this.root.id}`)
			}

			onDestroy(): void {
				lifecycle.push(`destroy ${this.root.id}`)
			}
		}
		const { shadow } = shadowHost('<main></main>')
		const app = createApp({ observe: true }).register([Card])
		app.mount(shadow)

		shadow
			.querySelector('main')
			?.insertAdjacentHTML('beforeend', '<div id="added" data-nemesia="shadow-observed"></div>')
		await flushMutations()

		expect(lifecycle).toEqual(['mount added'])

		shadow.querySelector('main')?.replaceChildren()
		await flushMutations()

		expect(lifecycle).toEqual(['mount added', 'destroy added'])

		app.disconnect(shadow)
	})

	it('does not see changes inside a shadow root from an observer on the light tree', async () => {
		const mounted: string[] = []
		class Card extends Component('shadow-unobserved') {
			onMount(): void {
				mounted.push(this.root.id)
			}
		}
		const { shadow } = shadowHost('')
		const app = createApp({ observe: true }).register([Card])
		app.mount()

		shadow.innerHTML = '<div id="hidden" data-nemesia="shadow-unobserved"></div>'
		await flushMutations()

		expect(mounted).toEqual([])

		app.disconnect()
	})

	it('applies pending shadow changes before a lookup in the same task', () => {
		class Card extends Component('shadow-same-task') {}
		const { shadow } = shadowHost('')
		const app = createApp({ observe: true }).register([Card])
		app.mount(shadow)

		shadow.innerHTML = '<div data-nemesia="shadow-same-task"></div>'

		expect(app.findAll(Card, shadow)).toHaveLength(1)

		app.disconnect(shadow)
	})
})
