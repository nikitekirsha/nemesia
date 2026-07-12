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
class Disclosure extends Nemesia.Component('disclosure') {
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

```html
<div data-nemesia="tabs" data-option-active-index="0">
	<button data-ref="tab">First</button>
	<button data-ref="tab">Second</button>
	<div data-ref="panel">Content</div>
</div>
```

```ts
class Tabs extends Nemesia.Component('tabs') {
	tabs = this.ref.many.button('tab')
	panel = this.ref.element('panel')
	initial = this.option.optional.number('activeIndex', {
		default: 0,
		min: 0
	})

	onMount() {
		this.activate(this.initial)
		this.on(this.tabs, 'click', (_event, _tab, index) => this.activate(index))
	}

	private activate(index: number) {
		this.tabs.forEach((tab, current) => {
			tab.setAttribute('aria-selected', String(current === index))
		})
		this.panel.dataset.activeIndex = String(index)
	}
}
```

## Delegated analytics

Use a distributed component when triggers are scattered throughout a mounted scope:

```html
<a href="/pricing" data-track="pricing-link">Pricing</a> <button data-track="newsletter-submit">Subscribe</button>
```

```ts
class Analytics extends Nemesia.DistributedComponent('analytics') {
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
class MapWidget extends Nemesia.Component('map-widget') {
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

## Replacing a server fragment

With observation enabled, replacing markup is enough:

```ts
const app = Nemesia.createApp({ observe: true })
app.register([Disclosure, Tabs])
app.mount(document.body)

fragment.replaceChildren(newServerRenderedNode)
```

Removed component roots are destroyed before newly added roots mount.

## Registration module

For larger sites, keep component registration in one application entry point:

```ts
const components = [Analytics, Disclosure, MapWidget, Tabs]

const app = Nemesia.createApp({ observe: true })
app.register(components)
app.mount(document.body)
```

Component modules remain independent and can be loaded by the site's existing bundling strategy.

[Previous: TypeScript and diagnostics](10-typescript-and-diagnostics.md) · [Guide index](README.md)
