# 3. Applications and registration

An application owns component registrations, mounted instances, and observers.

## Creating an app

```ts
import { createApp } from 'nemesia'

const app = createApp()
const observedApp = createApp({ observe: true })
```

The only application option is:

```ts
interface CreateAppOptions {
	observe?: boolean
}
```

## Registration

Pass an array of component constructors:

```ts
app.register([Header, Gallery, ContactForm])
app.register([CookieBanner])
```

Passing a constructor directly is rejected by TypeScript and throws an error in JavaScript.

An entry that is not a component class also throws, and nothing from that array is registered. An `undefined` entry usually comes from a circular import between component modules.

Names are unique within an app. Registering another constructor with the same name logs a warning and replaces the registration for future mounts. Existing instances are not replaced automatically.

## Lazy components

A component that only some pages use can stay out of the main bundle. Register it by name with `lazy`, and its module is loaded the first time a root with that name appears:

```ts
import { createApp, lazy } from 'nemesia'

const app = createApp({ observe: true })

app.register([
	Header,
	Modals,
	lazy('gallery', () => import('./gallery')),
	lazy('cart', () => import('./cart')),
	lazy('cart-item', () => import('./cart-item'))
])
app.mount()
```

The loader resolves to the component class or to the module that exports it. From a module, Nemesia takes the one export that is a component with that name.

A module is requested once, when `mount` or the observer first finds a root for it. A page without that root never downloads it. Markup that arrives later triggers the load in an observed app; without observation, the next `mount` call does.

Components found in the same pass load in parallel and then mount together, nested components before their parents, exactly as if they had been registered from the start.

A component that is already loaded does not wait for lazy ones. A parent mounts right away, and its lazy children mount when their modules arrive, so look children up when they are needed rather than in `onMount`.

A module that fails to load is reported with `console.error` and is not requested again. Other components are unaffected.

`lazy` is for components with a root. A distributed component has no root to wait for, so register it directly.

## Mounting

```ts
app.mount(document.body)
```

`mount(scope)`:

- includes the scope itself when it is a matching component root;
- finds registered component roots below the scope;
- skips roots already mounted by this app;
- mounts distributed components once for that exact scope;
- starts an observer when `observe: true`.

When omitted, the scope defaults to `document.body`. Calling `mount()` before the body is parsed, for example from a script in `<head>`, mounts nothing and logs a warning.

An app never mounts two component names on the same root. If code changes `data-nemesia` while an instance is active, the new component waits until the old instance is destroyed.

## Destroying

```ts
app.destroy(document.body)
```

`destroy(scope)` destroys concrete instances mounted on or below the scope and distributed instances associated with that exact scope. Repeated calls are safe.

Destroy does not stop observation. This is useful when a container is cleared and later receives fresh server-rendered markup.

## Finding instances

```ts
const cart = app.find(Cart) // Cart | null
const items = app.findAll(CartItem, container) // CartItem[]
```

`find` and `findAll` return mounted instances of a component class on or inside the given node, which defaults to `document`. Distributed instances are found by the scope they were mounted for.

## Disconnecting observers

```ts
app.disconnect(container) // one exact observed scope
app.disconnect() // all observers owned by the app
```

Disconnecting only stops observation. It does not destroy existing instances or remove their listeners.

## Multiple apps

State belongs to an app instance. Two apps can mount the same DOM root independently, although doing so is rarely useful because both instances may react to the same events.

[Previous: HTML contract](02-html-contract.md) · [Guide index](README.md) · [Next: Components](04-components.md)
