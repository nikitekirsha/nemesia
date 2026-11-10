# 10. TypeScript and diagnostics

## Public runtime exports

```ts
import { BaseComponent, BaseDistributedComponent, Component, DistributedComponent, createApp, lazy } from 'nemesia'
```

Most applications need only `Component`, `DistributedComponent`, `createApp`, and sometimes `lazy`. The base classes are exported for typing and advanced integration; concrete classes should normally extend the factories.

## Public types

The package exports:

- `NemesiaApp`
- `CreateAppOptions`
- `ComponentConstructor`
- `LazyComponent`
- `ConcreteComponentOptions`
- `StringOptionOptions`
- `NumberOptionOptions`
- `BooleanOptionOptions`
- `JsonOptionOptions`
- `DefaultOptionOptions`
- `OptionParser`
- `OptionValidator`

## Common inferred types

```ts
class TypedExample extends Component('typed-example', {
	root: 'form'
}) {
	button = this.ref.button('submit')
	items = this.ref.many.element('item')
	delay = this.option.number('delay')
	label = this.option.optional.string('label')
	columns = this.option.optional.number('columns', { default: 1 })
}
```

The inferred types are:

```ts
root // HTMLFormElement
button // HTMLButtonElement
items // HTMLElement[]
delay // number
label // string | undefined
columns // number
```

## Contract warnings

Invalid HTML contracts produce `console.warn` messages prefixed with `[Nemesia]`. Typical causes include:

- missing or duplicate required refs;
- an element with the wrong tag for a ref helper;
- missing or invalid options;
- a root with the wrong HTML tag;
- a second root for `multiple: false`;
- duplicate component registration;
- `mount()` called before `document.body` exists.

Warnings include structured context such as the component name, root element, ref name, option name, attribute, expected value, and received value where applicable.

Contract failures skip only the invalid instance. Mounting continues for other roots.

## Unexpected errors

Unexpected constructor, `onMount`, and `onDestroy` failures use `console.error`. Nemesia still releases its records and owned listeners and continues processing other components.

## Component warnings

Use `this.warn` for application-level diagnostics:

```ts
this.warn('unsupported layout returned by CMS', {
	layout: this.root.dataset.layout
})
```

The helper adds component and root or scope context. It is informational and does not change lifecycle state.

## ESM

Bundlers should use the package normally:

```ts
import { Component, createApp } from 'nemesia'
```

## UMD

The UMD file is `dist/nemesia.umd.js`. When copied to a public asset path and loaded as a browser script, it creates the global `Nemesia` API:

```html
<script src="https://cdn.jsdelivr.net/npm/nemesia/dist/nemesia.umd.js"></script>
<script>
	class Menu extends Nemesia.Component('menu') {}

	const app = Nemesia.createApp()
	app.register([Menu])
	app.mount(document.body)
</script>
```

## Environment support

The published bundles are built for Chrome 107, Edge 107, Firefox 104, and Safari 16 or newer. They use standard DOM APIs only, and `MutationObserver` is needed only when observation is enabled. Installing the package places no requirement on the Node.js version; only working on Nemesia itself needs Node.js `^20.19.0 || >=22.12.0`.

[Previous: Distributed components](09-distributed-components.md) · [Guide index](README.md) · [Next: Recipes](11-recipes.md)
