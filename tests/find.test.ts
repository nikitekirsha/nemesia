import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Component, DistributedComponent, createApp } from '../src/index.js'
import { flushMutations } from './helpers.js'

function html(markup: string): HTMLElement {
	const scope = document.createElement('main')
	scope.innerHTML = markup
	document.body.append(scope)
	return scope
}

describe('finding component instances', () => {
	it('finds nested instances inside the component root by class', () => {
		class Form extends Component('find-form') {
			get isValid(): boolean {
				return true
			}
		}
		class Item extends Component('find-item') {}
		let cart!: Cart
		class Cart extends Component('find-cart') {
			onMount(): void {
				cart = this
			}
		}
		html(`
			<div data-nemesia="find-cart">
				<form data-nemesia="find-form"></form>
				<div data-nemesia="find-item" id="first"></div>
				<section><div data-nemesia="find-item" id="second"></div></section>
			</div>
			<div data-nemesia="find-item" id="outside"></div>
		`)
		createApp().register([Cart, Form, Item]).mount()

		const form = cart.find(Form)
		const items = cart.findAll(Item)

		expectTypeOf(form).toEqualTypeOf<Form | null>()
		expectTypeOf(items).toEqualTypeOf<Item[]>()
		expect(form).toBeInstanceOf(Form)
		expect(form?.isValid).toBe(true)
		expect(items.map(item => item.root.id)).toEqual(['first', 'second'])
	})

	it('searches on or inside an explicit element, including the element itself', () => {
		class Address extends Component('find-address') {}
		let checkout!: Checkout
		class Checkout extends Component('find-checkout') {
			shipping = this.ref.element('shipping')
			billing = this.ref.element('billing')
			list = this.ref.element('list')

			onMount(): void {
				checkout = this
			}
		}
		html(`
			<div data-nemesia="find-checkout">
				<form data-nemesia="find-address" data-ref="shipping" id="shipping"></form>
				<form data-nemesia="find-address" data-ref="billing" id="billing"></form>
				<div data-ref="list">
					<form data-nemesia="find-address" id="listed"></form>
				</div>
			</div>
		`)
		createApp().register([Checkout, Address]).mount()

		expect(checkout.find(Address, checkout.shipping)?.root.id).toBe('shipping')
		expect(checkout.find(Address, checkout.billing)?.root.id).toBe('billing')
		expect(checkout.findAll(Address, checkout.list).map(address => address.root.id)).toEqual(['listed'])
	})

	it('finds instances inside nested components and never returns the caller', () => {
		class Menu extends Component('find-menu') {}
		const app = createApp().register([Menu])
		const scope = html(`
			<nav data-nemesia="find-menu" id="outer">
				<div data-nemesia="find-menu" id="inner">
					<div data-nemesia="find-menu" id="deepest"></div>
				</div>
			</nav>
		`)
		app.mount(scope)
		const outer = app.find(Menu, scope.querySelector('#outer')!)!

		expect(outer.findAll(Menu).map(menu => menu.root.id)).toEqual(['inner', 'deepest'])
		expect(outer.find(Menu)?.root.id).toBe('inner')
	})

	it('returns only mounted instances of the requested class from the same app', () => {
		class Widget extends Component('find-widget') {}
		class Other extends Component('find-widget') {}
		const scope = html('<div data-nemesia="find-widget"></div>')
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const first = createApp().register([Widget])
		const second = createApp()

		expect(first.find(Widget, scope)).toBeNull()

		first.mount(scope)

		expect(first.find(Widget, scope)).toBeInstanceOf(Widget)
		expect(first.find(Other, scope)).toBeNull()
		expect(second.find(Widget, scope)).toBeNull()

		first.destroy(scope)

		expect(first.find(Widget, scope)).toBeNull()
		expect(first.findAll(Widget, scope)).toEqual([])
		expect(warn).not.toHaveBeenCalled()
	})

	it('finds subclasses through a shared base class', () => {
		abstract class Field extends Component('find-field') {
			abstract get value(): string
		}
		class TextField extends Field {
			get value(): string {
				return 'text'
			}
		}
		html('<div data-nemesia="find-field"></div>')
		const app = createApp().register([TextField])
		app.mount()

		const field = app.find(Field)

		expectTypeOf(field).toEqualTypeOf<Field | null>()
		expect(field?.value).toBe('text')
	})

	it('finds distributed instances by scope and defaults app lookups to the document', () => {
		class Notifier extends DistributedComponent('find-notifier') {
			messages: string[] = []
		}
		let caller!: Caller
		class Caller extends Component('find-caller') {
			onMount(): void {
				caller = this
			}
		}
		const sidebar = html('<div data-nemesia="find-caller"></div>')
		const app = createApp().register([Notifier, Caller])
		app.mount(document.body)
		app.mount(sidebar)

		expect(caller.find(Notifier)).toBeNull()
		expect(caller.find(Notifier, document.body)?.scope).toBe(document.body)
		expect(app.find(Notifier)?.scope).toBe(document.body)
		expect(app.findAll(Notifier).map(notifier => notifier.scope)).toEqual([document.body, sidebar])
		expect(app.findAll(Notifier, sidebar).map(notifier => notifier.scope)).toEqual([sidebar])

		app.destroy(document.body)

		expect(app.findAll(Notifier).map(notifier => notifier.scope)).toEqual([sidebar])
	})

	it('returns distributed instances in document order regardless of mount order', () => {
		class Notifier extends DistributedComponent('find-ordered-notifier') {}
		const first = html('')
		const second = html('')
		const app = createApp().register([Notifier])
		app.mount(second)
		app.mount(first)

		expect(app.findAll(Notifier).map(notifier => notifier.scope)).toEqual([first, second])
	})

	it('lets distributed components find concrete instances in their scope', () => {
		class Item extends Component('find-scoped-item') {}
		let found: Item[] = []
		class Coordinator extends DistributedComponent('find-coordinator') {
			onMount(): void {
				found = this.findAll(Item)
			}
		}
		const scope = html('<div data-nemesia="find-scoped-item"></div><div data-nemesia="find-scoped-item"></div>')
		createApp().register([Coordinator, Item]).mount(scope)

		expect(found).toHaveLength(2)
	})

	it('returns nothing for components constructed outside an app', () => {
		class Standalone extends Component('find-standalone') {}
		const element = document.createElement('div')
		const instance = new Standalone(element)

		expect(instance.find(Standalone, document)).toBeNull()
		expect(instance.findAll(Standalone, document)).toEqual([])
	})
})

describe('mount order', () => {
	it('mounts nested components before parents and distributed components last', () => {
		const order: string[] = []
		class Child extends Component('order-child') {
			onMount(): void {
				order.push(`child:${this.root.id}`)
			}
		}
		class Parent extends Component('order-parent') {
			onMount(): void {
				order.push(`parent sees ${this.findAll(Child).length} children`)
			}
		}
		class Distributed extends DistributedComponent('order-coordinator') {
			onMount(): void {
				order.push('distributed')
			}
		}
		const scope = html(`
			<div data-nemesia="order-parent">
				<div data-nemesia="order-child" id="a"><div data-nemesia="order-child" id="a1"></div></div>
				<div data-nemesia="order-child" id="b"></div>
			</div>
		`)
		createApp().register([Distributed, Parent, Child]).mount(scope)

		expect(order).toEqual(['child:a1', 'child:a', 'child:b', 'parent sees 3 children', 'distributed'])
	})

	it('constructs every component before running hooks so hooks can find later siblings', () => {
		class Target extends Component('order-target') {}
		let found: Target | null = null
		class Seeker extends Component('order-seeker') {
			onMount(): void {
				found = this.find(Target, document.body)
			}
		}
		html('<div data-nemesia="order-seeker"></div><div data-nemesia="order-target"></div>')
		createApp().register([Seeker, Target]).mount()

		expect(found).toBeInstanceOf(Target)
	})

	it('skips the hook of an instance destroyed by an earlier hook in the same mount', () => {
		const order: string[] = []
		const app = createApp()
		class Child extends Component('order-destroyed-child') {
			onMount(): void {
				order.push('child mount')
			}
			onDestroy(): void {
				order.push('child destroy')
			}
		}
		class Sibling extends Component('order-destroyer') {
			onMount(): void {
				order.push('destroyer mount')
				app.destroy(document.querySelector<HTMLElement>('#victim')!)
			}
		}
		html('<div data-nemesia="order-destroyer"></div><div data-nemesia="order-destroyed-child" id="victim"></div>')
		app.register([Child, Sibling]).mount()

		expect(order).toEqual(['destroyer mount', 'child destroy'])
	})

	it('mounts observed additions children-first', async () => {
		const order: string[] = []
		class Observed extends Component('order-observed') {
			onMount(): void {
				order.push(this.root.id)
			}
		}
		const scope = html('')
		createApp({ observe: true }).register([Observed]).mount(scope)

		scope.insertAdjacentHTML(
			'beforeend',
			'<div data-nemesia="order-observed" id="parent"><div data-nemesia="order-observed" id="child"></div></div>'
		)
		scope.insertAdjacentHTML('beforeend', '<div data-nemesia="order-observed" id="sibling"></div>')
		await flushMutations()

		expect(order).toEqual(['child', 'parent', 'sibling'])
	})
})

describe('refs on nested component roots', () => {
	it('assigns a ref on a nested component root to the component above it', () => {
		let parent!: Parent
		class Child extends Component('ref-owned-child') {
			inner = this.ref.element('inner')
			own = this.ref.optional.element('form')
		}
		class Parent extends Component('ref-owner-parent') {
			form = this.ref.form('form')
			inner = this.ref.optional.element('inner')

			onMount(): void {
				parent = this
			}
		}
		html(`
			<div data-nemesia="ref-owner-parent">
				<form data-nemesia="ref-owned-child" data-ref="form">
					<span data-ref="inner"></span>
				</form>
			</div>
		`)
		createApp().register([Parent, Child]).mount()
		const child = parent.find(Child)!

		expect(parent.form).toBe(child.root)
		expect(parent.inner).toBeNull()
		expect(child.inner.tagName).toBe('SPAN')
		expect(child.own).toBeNull()
	})
})
