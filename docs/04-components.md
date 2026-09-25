# 4. Concrete components

Concrete components attach behavior to elements carrying `data-nemesia`.

## Basic shape

```ts
import { Component } from 'nemesia'

class Search extends Component('search') {
	input = this.ref.input('query')
	results = this.ref.element('results')

	onMount() {
		this.on(this.input, 'input', () => {
			this.results.toggleAttribute('data-empty', this.input.value === '')
		})
	}
}
```

Every concrete instance exposes:

- `root` — the matched root element;
- `ref` — typed element lookup;
- `option` — typed root-attribute parsing;
- `on` — event registration with automatic cleanup;
- `warn` — a contextual warning helper;
- `find` and `findAll` — lookup of other mounted components;
- optional `onMount` and `onDestroy` hooks.

## Root tag constraints

Use `root` when a component requires a specific HTML element:

```ts
class SearchForm extends Component('search-form', {
	root: 'form'
}) {
	onMount() {
		this.root.method = 'get' // HTMLFormElement
	}
}
```

The option affects both TypeScript and runtime validation. A matching name on the wrong tag is skipped with a warning.

Without a tag constraint, `root` is an `HTMLElement`.

## Singleton components

```ts
class CookieBanner extends Component('cookie-banner', {
	multiple: false
}) {}
```

`multiple` defaults to `true`. With `false`, one active instance may exist per app at a time. Nemesia mounts the first valid candidate in discovery order and warns for additional roots.

Invalid candidates do not consume the slot. Destroying the active instance releases it, allowing another candidate to mount later.

## Field initialization

Refs and options are intentionally requested in fields:

```ts
class Video extends Component('video') {
	player = this.ref.element('player')
	autoplay = this.option.optional.boolean('autoplay', { default: false })
}
```

This keeps the markup contract beside the behavior that needs it.

If construction fails after listeners were registered, Nemesia aborts the partial instance and removes those listeners without calling `onDestroy`.

## Finding components

`find` and `findAll` return mounted instances of a component class on or inside an element, which defaults to the component root. The result is typed from the class:

```ts
class Cart extends Component('cart') {
	submit = this.ref.button('submit')

	get form() {
		return this.find(CheckoutForm) // CheckoutForm | null
	}

	get items() {
		return this.findAll(CartItem) // CartItem[]
	}

	onMount() {
		this.on(this.submit, 'click', () => {
			if (!this.form?.isValid) return
			console.log(this.items.length)
		})
	}
}
```

Pass an element to search in a specific place, for example to tell apart two instances of the same class:

```ts
shipping = this.ref.form('shipping')

get shippingForm() {
	return this.find(AddressForm, this.shipping)
}
```

Look instances up when they are needed instead of storing them in fields: nested components can be destroyed and mounted again.

## Stored base classes

The factory result can be stored and extended:

```ts
const FormComponent = Component('newsletter', { root: 'form' })

class Newsletter extends FormComponent {}
```

[Previous: Applications](03-applications.md) · [Guide index](README.md) · [Next: Refs](05-refs.md)
