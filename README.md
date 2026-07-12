# Nemesia

Nemesia is a small DOM-first runtime for server-rendered and CMS-driven websites. Your server owns the HTML, and Nemesia finds components in your HTML markup then attaches your behavior to them.

It provides typed refs and options, DOM contract validation, lifecycle hooks, automatic event cleanup, and optional observation of dynamic DOM changes. It does not render HTML or introduce a client-side application model.

## Install

### ESM

```sh
npm install nemesia
```

```ts
import { Nemesia, createApp } from 'nemesia'
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
import { Nemesia } from 'nemesia'

class Counter extends Nemesia.Component('counter') {
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

const app = Nemesia.createApp({ observe: true })
app.register([Counter])
app.mount(document.body)
```

```html
<div data-nemesia="counter" data-option-initial="10">
	<button data-ref="button">+</button>
	<span data-ref="value"></span>
</div>
```

## Documentation

The complete guide lives in [`docs`](docs/README.md):

1. [Getting started](docs/01-getting-started.md)
2. [HTML contract](docs/02-html-contract.md)
3. [Applications and registration](docs/03-applications.md)
4. [Concrete components](docs/04-components.md)
5. [Refs](docs/05-refs.md)
6. [Options](docs/06-options.md)
7. [Events and lifecycle](docs/07-events-and-lifecycle.md)
8. [Dynamic DOM observation](docs/08-dynamic-dom.md)
9. [Distributed components](docs/09-distributed-components.md)
10. [TypeScript and diagnostics](docs/10-typescript-and-diagnostics.md)
11. [Recipes](docs/11-recipes.md)
