# 2. HTML contract

Nemesia uses one explicit attribute contract. There are no alternative modes or arbitrary selectors.

## Component roots

```html
<section data-nemesia="gallery"></section>
```

The value is the component name registered in JavaScript.

## Refs

Refs identify elements used by the component:

```html
<section data-nemesia="gallery">
	<button data-ref="previous">Previous</button>
	<div data-ref="viewport"></div>
	<button data-ref="next">Next</button>
</section>
```

The component requests them by the exact `data-ref` value:

```ts
class Gallery extends Nemesia.Component('gallery') {
	previous = this.ref.button('previous')
	viewport = this.ref.element('viewport')
	next = this.ref.button('next')
}
```

## Options

Options are set on the component root and start with `data-option-`:

```html
<section
	data-nemesia="gallery"
	data-option-autoplay="true"
	data-option-delay="5000"
></section>
```

```ts
autoplay = this.option.boolean('autoplay')
delay = this.option.number('delay')
```

Camel-case option names map to kebab-case attributes. For example, `slidesMobile` reads `data-option-slides-mobile`.

## Nested ownership

A ref belongs to its nearest `[data-nemesia]` ancestor. Parent and child components can reuse ref names without leaking into each other:

```html
<div data-nemesia="toolbar">
	<button data-ref="toggle">Toolbar toggle</button>

	<div data-nemesia="dropdown">
		<button data-ref="toggle">Dropdown toggle</button>
	</div>
</div>
```

`toolbar` resolves the first button. `dropdown` resolves the second. The nested root is an ownership boundary even when its component has not been registered.

## Validation behavior

Refs and options are resolved during construction. If required markup is missing, duplicated, mistyped, or invalid, Nemesia warns and skips that one instance. Other roots continue mounting.

The root element is included in diagnostic payloads so the invalid markup can be inspected directly in browser developer tools.

[Previous: Getting started](01-getting-started.md) · [Guide index](README.md) · [Next: Applications](03-applications.md)
