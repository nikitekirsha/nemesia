# 11. Recipes

These examples show common patterns without adding abstractions on top of Nemesia.

## Accessible disclosure

```html
<section data-nemesia="disclosure">
	<button data-ref="trigger" aria-expanded="false">Details</button>
	<div data-ref="content" hidden>Server-rendered content</div>
</section>
```

```ts
class Disclosure extends Component('disclosure') {
	trigger = this.ref.button('trigger')
	content = this.ref.element('content')

	onMount() {
		this.on(this.trigger, 'click', () => {
			const expanded = this.trigger.getAttribute('aria-expanded') === 'true'
			this.trigger.setAttribute('aria-expanded', String(!expanded))
			this.content.hidden = expanded
		})
	}
}
```

## Configurable tabs

The server renders the roles and the `id` pairs that connect each tab to its panel. The component only moves the selection.

```html
<div data-nemesia="tabs" data-option-active-index="0">
	<div role="tablist" aria-label="Product details">
		<button type="button" role="tab" data-ref="tab" id="tab-specs" aria-controls="panel-specs">Specs</button>
		<button type="button" role="tab" data-ref="tab" id="tab-reviews" aria-controls="panel-reviews">Reviews</button>
	</div>
	<div role="tabpanel" data-ref="panel" id="panel-specs" aria-labelledby="tab-specs">Specs</div>
	<div role="tabpanel" data-ref="panel" id="panel-reviews" aria-labelledby="tab-reviews" hidden>Reviews</div>
</div>
```

```ts
class Tabs extends Component('tabs') {
	tabs = this.ref.many.button('tab')
	panels = this.ref.many.element('panel')
	initial = this.option.optional.number('activeIndex', {
		default: 0,
		min: 0,
		integer: true
	})

	onMount() {
		this.activate(this.initial)
		this.on(this.tabs, 'click', (_event, _tab, index) => this.activate(index))
		this.on(this.tabs, 'keydown', (event, _tab, index) => {
			const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
			if (step === 0) return

			const next = (index + step + this.tabs.length) % this.tabs.length
			this.activate(next)
			this.tabs[next]?.focus()
		})
	}

	private activate(index: number) {
		this.tabs.forEach((tab, current) => {
			tab.setAttribute('aria-selected', String(current === index))
			tab.tabIndex = current === index ? 0 : -1
		})
		this.panels.forEach((panel, current) => {
			panel.hidden = current !== index
		})
	}
}
```

Only the selected tab stays in the tab order, so the arrow keys are what moves between tabs.

## Delegated analytics

Use a distributed component when triggers are scattered throughout a mounted scope:

```html
<a href="/pricing" data-track="pricing-link">Pricing</a> <button data-track="newsletter-submit">Subscribe</button>
```

```ts
class Analytics extends DistributedComponent('analytics') {
	onMount() {
		this.on(this.scope, 'click', event => {
			const target = event.target
			if (!(target instanceof Element)) return

			const tracked = target.closest<HTMLElement>('[data-track]')
			if (tracked === null) return

			this.send(tracked.dataset.track ?? 'unknown')
		})
	}

	private send(name: string) {
		console.log('analytics event', name)
	}
}
```

## Third-party widgets

Create the library instance in `onMount` and release it in `onDestroy`:

```ts
class MapWidget extends Component('map-widget') {
	canvas = this.ref.element('canvas')
	private map: { destroy(): void } | undefined

	onMount() {
		this.map = createMap(this.canvas)
	}

	onDestroy() {
		this.map?.destroy()
		this.map = undefined
	}
}
```

Nemesia owns listeners registered through `this.on`; the component owns external objects such as `map`.

## Responsive behavior

A `MediaQueryList` is an event target, so `this.on` listens to it and removes the listener on destroy:

```ts
class MobileMenu extends Component('mobile-menu') {
	toggle = this.ref.button('toggle')
	panel = this.ref.element('panel')
	breakpoint = this.option.optional.string('breakpoint', { default: '(max-width: 767px)' })

	onMount() {
		const media = window.matchMedia(this.breakpoint)

		this.apply(media.matches)
		this.on(media, 'change', event => this.apply(event.matches)) // MediaQueryListEvent
		this.on(this.toggle, 'click', () => {
			this.panel.hidden = !this.panel.hidden
		})
	}

	private apply(mobile: boolean) {
		this.toggle.hidden = !mobile
		this.panel.hidden = mobile
	}
}
```

## Async onMount

Pass `this.signal` to the request. If the component is destroyed while it waits, the request is aborted and nothing after the `await` runs:

```ts
class ProductPrice extends Component('product-price') {
	value = this.ref.element('value')
	url = this.option.string('url')

	async onMount() {
		const response = await fetch(this.url, { signal: this.signal })
		const { price } = await response.json()

		this.value.textContent = price
	}
}
```

Work that takes no signal can check `this.signal.aborted` after an `await` instead.

## Coordinating components

A parent component reads nested components with `findAll`. Nested components report changes with bubbling events:

```html
<div data-nemesia="cart">
	<div data-nemesia="cart-item" data-option-price="10">
		<input data-ref="quantity" type="number" value="1" />
	</div>
	<div data-nemesia="cart-item" data-option-price="25">
		<input data-ref="quantity" type="number" value="2" />
	</div>
	<span data-ref="total"></span>
</div>
```

```ts
class CartItem extends Component('cart-item') {
	quantity = this.ref.input('quantity')
	price = this.option.number('price')

	get subtotal() {
		return this.price * Number(this.quantity.value)
	}

	onMount() {
		this.on(this.quantity, 'change', () => {
			this.root.dispatchEvent(new CustomEvent('cart:change', { bubbles: true }))
		})
	}
}

class Cart extends Component('cart') {
	total = this.ref.element('total')

	onMount() {
		this.render()
		this.on(this.root, 'cart:change', () => this.render())
	}

	private render() {
		const total = this.findAll(CartItem).reduce((sum, item) => sum + item.subtotal, 0)
		this.total.textContent = String(total)
	}
}
```

When an event carries data, export its name and type from the component that sends it, so both sides share one definition:

```ts
export const CART_ADD = 'cart:add'
export type CartAddEvent = CustomEvent<{ name: string; count: number }>

class Product extends Component('product') {
	add = this.ref.button('add')
	name = this.option.string('name')

	onMount() {
		this.on(this.add, 'click', () => {
			const event: CartAddEvent = new CustomEvent(CART_ADD, {
				bubbles: true,
				detail: { name: this.name, count: 1 }
			})
			this.root.dispatchEvent(event)
		})
	}
}

class Catalog extends Component('catalog') {
	onMount() {
		this.on(this.root, CART_ADD, (event: CartAddEvent) => {
			const { name, count } = event.detail
			const product = this.find(Product, event.target as Element) // Product | null
		})
	}
}
```

`event.target` is the root of the sending component, so `find` returns its instance when the listener needs more than the event data.

## Replacing a server fragment

With observation enabled, replacing markup is enough:

```ts
const app = createApp({ observe: true })
app.register([Disclosure, Tabs])
app.mount(document.body)

fragment.replaceChildren(newServerRenderedNode)
```

Removed component roots are destroyed before newly added roots mount.

## htmx, Turbo, and other HTML swaps

With `observe: true` there is nothing to integrate. Tools that insert server HTML into the page change the observed DOM, and components mount and clean up as the markup comes and goes. That covers htmx, Swup, Barba, Turbo Frames and Streams, and CMS features such as 1C-Bitrix components in AJAX mode.

Turbo Drive is the exception: it replaces the `<body>` element itself, which an observer on the old body cannot see. Mount the document element, so the body is inside the observed scope:

```ts
const app = createApp({ observe: true })
app.register(components)
app.mount(document.documentElement)
```

Without observation, pair the calls around every swap yourself:

```ts
app.destroy(container)
container.innerHTML = html
app.mount()
```

Mount the scope the app already uses, not the container. Roots that are already mounted are skipped, and distributed components are not created a second time for the container.

## Registration module

For larger sites, keep component registration in one application entry point:

```ts
const components = [Analytics, Disclosure, MapWidget, Tabs]

const app = createApp({ observe: true })
app.register(components)
app.mount(document.body)
```

Component modules remain independent and can be loaded by the site's existing bundling strategy.

## Lazy components

Register a component with [`lazy`](03-applications.md#lazy-components) and its module loads the first time its root appears:

```ts
import { createApp, lazy } from 'nemesia'

const app = createApp({ observe: true })

app.register([Header, Menu, lazy('map-widget', () => import('./map-widget'))])
app.mount()
```

When every component lives in its own file named after the component, Vite can list the loaders:

```ts
// ./components/gallery.ts exports the component named "gallery"
const modules = import.meta.glob('./components/*.ts')

app.register(Object.entries(modules).map(([path, load]) => lazy(path.slice(path.lastIndexOf('/') + 1, -3), load)))
```

## Testing a component

A component is a class over plain DOM, so any DOM test environment works. Put the markup on the page, mount a fresh app, act on the elements, and read the result:

```ts
import { createApp } from 'nemesia'
import { expect, test, vi } from 'vitest'
import { Counter } from './counter'

test('counts clicks from the initial value', () => {
	document.body.innerHTML = `
		<div data-nemesia="counter" data-option-initial="10">
			<button data-ref="button">+</button>
			<span data-ref="value"></span>
		</div>`
	const app = createApp().register([Counter])
	app.mount()

	const counter = app.find(Counter)!
	counter.button.click()

	expect(counter.value.textContent).toBe('11')
	app.destroy()
})

test('skips markup without the value element', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	document.body.innerHTML = '<div data-nemesia="counter"><button data-ref="button">+</button></div>'
	const app = createApp().register([Counter])
	app.mount()

	expect(app.find(Counter)).toBeNull()
	expect(warn).toHaveBeenCalledOnce()
})
```

With `observe: true`, call `app.find` or `app.findAll` after changing the DOM. They apply pending changes before searching, so the test does not have to wait.

[Previous: TypeScript and diagnostics](10-typescript-and-diagnostics.md) · [Guide index](README.md) · [Next: API reference](12-api-reference.md)
