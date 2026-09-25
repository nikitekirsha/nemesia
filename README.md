# Nemesia

Nemesia is a small DOM-first runtime for server-rendered and CMS-driven websites. Your server owns the HTML, and Nemesia finds components in your HTML markup then attaches your behavior to them.

It provides typed refs and options, DOM contract validation, lifecycle hooks, component lookup, automatic event cleanup, and optional observation of dynamic DOM changes. It does not render HTML or introduce a client-side application model.

## Install

### ESM

```sh
npm install nemesia
```

```ts
import { Component, DistributedComponent, createApp } from 'nemesia'
```

### UMD

```html
<script src="https://cdn.jsdelivr.net/npm/nemesia/dist/nemesia.umd.js"></script>
<script>
	const { Component, DistributedComponent, createApp } = Nemesia
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

The guide's available on **[the website](https://nikitekirsha.github.io/nemesia/)**.
