# 13. Migrating from v1

Version 2 is a rewrite with a different model. A v1 component was a schema object with reactive state. A v2 component is a class attached to one root element, with the elements and options it needs requested in fields. There is no state layer to replace `state`, `computed`, and `watch`: use plain fields, getters, and a method that updates the DOM.

## The same counter

Version 1:

```html
<section data-counter data-counter-step="2">
	<button data-counter-plus>+</button>
	<output data-counter-value></output>
</section>
```

```ts
const counter = defineComponent({
	name: 'counter',
	schema: {
		refs: {
			root: getRef('[data-counter]', 'section'),
			plus: getRef('[data-counter-plus]', 'button'),
			value: getRef('[data-counter-value]', 'output')
		},
		options: {
			step: getOption('data-counter-step', { type: 'number', default: 1 })
		}
	},
	state: () => ({ count: 0 }),
	setup(ctx) {
		ctx.watch('count', () => (ctx.refs.value.textContent = String(ctx.state.count)), { immediate: true })
		ctx.on(ctx.refs.plus, 'click', () => (ctx.state.count += ctx.options.step))
	}
})

const app = createApplication({ observeDomChanges: true })
app.register(counter)
app.mount(document)
```

Version 2:

```html
<section data-nemesia="counter" data-option-step="2">
	<button data-ref="plus">+</button>
	<output data-ref="value"></output>
</section>
```

```ts
class Counter extends Component('counter', { root: 'section' }) {
	plus = this.ref.button('plus')
	value = this.ref.element('value')
	step = this.option.optional.number('step', { default: 1 })

	private count = 0

	onMount() {
		this.render()
		this.on(this.plus, 'click', () => {
			this.count += this.step
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

## What replaced what

| Version 1                                               | Version 2                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `createApplication({ observeDomChanges })`              | `createApp({ observe })`                                                    |
| `defineComponent({ name, schema, ... })`                | `class X extends Component(name)`                                           |
| `schema.refs.root: getRef(selector, tag)`               | `data-nemesia="name"` on the root, and `Component(name, { root: tag })`     |
| `getRef(selector, tag)`                                 | `this.ref.button(name)` and the other helpers, matched by `data-ref="name"` |
| `getRef(selector, { optional: true })`                  | `this.ref.optional.*`                                                       |
| `getRef(selector, { many: true })`                      | `this.ref.many.*`                                                           |
| `getOption('data-x-step', { type: 'number' })`          | `this.option.number('step')`, read from `data-option-step`                  |
| `getOption(attribute, { optional: true })` or `default` | `this.option.optional.*`, with `{ default }` when needed                    |
| `ctx.refs`, `ctx.options`, `ctx.element`                | Class fields and `this.root`                                                |
| `state`, `ctx.setState`, `ctx.watch`, `computed`        | Removed. Fields, getters, and an explicit render method                     |
| `methods(ctx)`                                          | Class methods                                                               |
| `setup(ctx)`, `ctx.onMount`                             | `onMount()`                                                                 |
| `ctx.onUnmount`, `ctx.cleanup`                          | `onDestroy()`                                                               |
| `ctx.on(...)`, which returned a disposer                | `this.on(...)`. Pass `once` or `signal` to stop a listener early            |
| `app.register(component)`                               | `app.register([Component])`: always an array                                |
| `app.getInstance(element, name)`                        | `app.find(Class, element)`                                                  |
| `app.reconcile`, `app.refresh`, `ctx.onRefresh`         | Removed. An instance never re-reads its markup                              |
| `app.recreate(element, name)`                           | `app.destroy(element)` followed by `app.mount()`                            |

## Behavior that changed

- One attribute contract. Refs are found only by `data-ref` and options only by `data-option-*` on the root. Arbitrary selectors and attribute names are gone, so the markup has to change together with the code.
- Nested components own their refs. A ref belongs to the nearest root above it. A parent no longer sees elements inside a nested component.
- One component per root. Several components can no longer share an element within one app. Nest the roots instead.
- Optional refs are stricter. An optional ref with the wrong tag used to resolve to `null` or `[]`. It now skips the component, the same as a required one.
- Booleans are exact. `true`, `false`, `1`, and `0` are matched as written, without trimming or lowercasing. An empty attribute now means `true`.
- **`mount()` defaults to `document.body`**, where v1 searched the whole document. A component on the `<html>` element needs `app.mount(document.documentElement)`.
- The UMD global is still `Nemesia`, with `Component`, `DistributedComponent`, and `createApp` on it.

Behavior that was spread across a page through selectors, with no single root, fits a [distributed component](09-distributed-components.md).

[Previous: API reference](12-api-reference.md) · [Guide index](README.md)
