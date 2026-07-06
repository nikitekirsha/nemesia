# 1. Getting started

## Installation

```sh
npm install nemesia
```

Nemesia is an ES module for modern browsers. The runtime has no dependencies. Dynamic DOM support uses the browser's `MutationObserver`.

## Define a component

A concrete component extends `Nemesia.Component(name)`. Fields can request refs and options immediately because Nemesia prepares those APIs before subclass field initializers run.

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
```

## Provide matching HTML

```html
<div data-nemesia="counter" data-option-initial="10">
	<button data-ref="button">+</button>
	<span data-ref="value"></span>
</div>
```

The class name is irrelevant to discovery. The string passed to `Component` must match the root's `data-nemesia` value.

## Create and mount an app

```ts
const app = Nemesia.createApp()

app.register([Counter])
app.mount(document.body)
```

Registration always takes an array, including when it contains one component. Mounting the same scope again is safe: existing instances are not duplicated.

Use the named factory if preferred:

```ts
import { createApp } from 'nemesia'

const app = createApp({ observe: true })
app.register([Counter])
app.mount(document.body)
```

`observe` defaults to `false`. When enabled, the mounted scope is also watched for later DOM additions and removals.

## Next steps

Read [the HTML contract](02-html-contract.md), then [applications and registration](03-applications.md).

[Guide index](README.md) · [Next: HTML contract](02-html-contract.md)
