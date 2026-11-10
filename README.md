# Nemesia

**Structural sanity for vanilla JS.**

Nemesia is a small DOM-first runtime for server-rendered and CMS-driven websites. Your server owns the HTML. Nemesia finds components in the markup and attaches your behavior to them. No virtual DOM, no hydration, no build step, 5.6 KB gzipped.

It provides typed refs and options, DOM contract validation, lifecycle hooks, component lookup, automatic event cleanup, and optional observation of dynamic DOM changes. Components can talk to each other through typed channels, cancel their work when they are destroyed with an `AbortSignal`, and load their code only when their markup appears. It does not render HTML or introduce a client-side application model.

## Install

### ESM

```sh
npm install nemesia
```

```ts
import { Component, DistributedComponent, createApp, lazy } from 'nemesia'
```

### UMD

```html
<script src="https://cdn.jsdelivr.net/npm/nemesia"></script>
<script>
	const { Component, DistributedComponent, createApp, lazy } = Nemesia
</script>
```

## Quick example

```ts
import { Component, createApp } from 'nemesia'

class Counter extends Component('counter') {
	button = this.ref.button('button')
	value = this.ref.element('value')
	initial = this.option.optional.number('initial', { default: 0 })

	private count = this.initial

	onMount() {
		this.render()
		this.on(this.button, 'click', () => {
			this.count += 1
			this.render()
		})
	}

	private render() {
		this.value.textContent = String(this.count)
	}
}

const app = createApp({ observe: true })
app.register([Counter])
app.mount(document.body)
```

```html
<div data-nemesia="counter" data-option-initial="10">
	<button data-ref="button">+</button>
	<span data-ref="value"></span>
</div>
```

## Guide

The guide is on the **[website](https://nikitekirsha.github.io/nemesia/)**.
