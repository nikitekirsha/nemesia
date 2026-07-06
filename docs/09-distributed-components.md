# 9. Distributed components

Distributed components attach behavior to an application scope rather than a dedicated root element. They work well for event delegation and singleton-like integrations spread across server-rendered markup.

## Defining one

```ts
import { Nemesia } from 'nemesia'

class ModalDelegation extends Nemesia.DistributedComponent('modal-delegation') {
	onMount() {
		this.on(this.scope, 'click', event => {
			const target = event.target
			if (!(target instanceof Element)) return

			const trigger = target.closest('[data-open-modal]')
			if (trigger !== null) this.open(trigger)
		})
	}

	private open(trigger: Element) {
		this.warn('opening modal', { trigger })
	}
}
```

Register distributed and concrete components together:

```ts
const app = Nemesia.createApp()
app.register([ModalDelegation, Header, ContactForm])
app.mount(document.body)
```

## Instance API

A distributed instance exposes:

- `scope` — the exact `ParentNode` passed to `mount`;
- `on` — listener registration with automatic cleanup;
- `warn` — contextual warnings;
- optional `onMount` and `onDestroy` hooks.

It does not expose `root`, `ref`, or `option` because there is no component root.

## Exact-scope lifetime

One instance of each registered distributed component is mounted per exact scope:

```ts
app.mount(document.body)
app.mount(document.body) // no duplicate
app.mount(sidebar)       // a separate distributed instance
```

`destroy(scope)` destroys only the distributed instances associated with that exact scope. Parent/child containment does not apply to distributed instance ownership.

Concrete components are different: destroying a scope destroys concrete roots throughout its subtree.

## Observation behavior

DOM mutations never create distributed instances for added elements. Only explicit `app.mount(scope)` calls do that. This prevents a delegated handler from being duplicated for every fragment inserted into an observed page.

## When to use a concrete component instead

Prefer a concrete component when behavior has a clear root, needs refs or root options, or can appear several times independently. Use a distributed component when the behavior naturally belongs to a scope and uses delegation or global coordination.

[Previous: Dynamic DOM](08-dynamic-dom.md) · [Guide index](README.md) · [Next: TypeScript and diagnostics](10-typescript-and-diagnostics.md)
