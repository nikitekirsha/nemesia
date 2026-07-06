# 3. Applications and registration

An application owns component registrations, mounted instances, and observers.

## Creating an app

Both forms create the same application type:

```ts
import { Nemesia, createApp } from 'nemesia'

const app = Nemesia.createApp()
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

Names are unique within an app. Registering another constructor with the same name logs a warning and replaces the registration for future mounts. Existing instances are not replaced automatically.

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

When omitted, the scope defaults to `document.body` if it exists.

An app never mounts two component names on the same root. If code changes `data-nemesia` while an instance is active, the new component waits until the old instance is destroyed.

## Destroying

```ts
app.destroy(document.body)
```

`destroy(scope)` destroys concrete instances on or below the scope and distributed instances associated with that exact scope. Repeated calls are safe.

Destroy does not stop observation. This is useful when a container is cleared and later receives fresh server-rendered markup.

## Disconnecting observers

```ts
app.disconnect(container) // one exact observed scope
app.disconnect()          // all observers owned by the app
```

Disconnecting only stops observation. It does not destroy existing instances or remove their listeners.

## Multiple apps

State belongs to an app instance. Two apps can mount the same DOM root independently, although doing so is rarely useful because both instances may react to the same events.

[Previous: HTML contract](02-html-contract.md) · [Guide index](README.md) · [Next: Components](04-components.md)
