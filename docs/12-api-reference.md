# 12. API reference

Everything Nemesia exports, on one page. The chapters of the guide explain when and why to use each part.

## HTML attributes

| Attribute             | Placed on                | Meaning                                                             |
| --------------------- | ------------------------ | ------------------------------------------------------------------- |
| `data-nemesia="name"` | a component root         | Mounts the component registered under `name`.                       |
| `data-ref="name"`     | an element inside a root | Belongs to the nearest root above it and is requested by this name. |
| `data-option-<name>`  | the root itself          | An option value. `slidesMobile` reads `data-option-slides-mobile`.  |

## `createApp(options?)`

```ts
const app = createApp({ observe: true })
```

| Option    | Type      | Default | Meaning                                                        |
| --------- | --------- | ------- | -------------------------------------------------------------- |
| `observe` | `boolean` | `false` | Watch mounted scopes for elements added or removed afterwards. |

### App methods

| Member                    | Returns     | Notes                                                                                                                           |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `options`                 | object      | The normalized, read-only options.                                                                                              |
| `register(components)`    | the app     | Takes an array. Warns when a name is registered twice; throws for anything that is not a component class.                       |
| `mount(scope?)`           | `void`      | Mounts registered components on and inside `scope`, which defaults to `document.body`. Safe to repeat.                          |
| `destroy(scope?)`         | `void`      | Destroys concrete components on and inside `scope` and distributed components of that exact scope. Defaults to `document.body`. |
| `disconnect(scope?)`      | `void`      | Stops observing one scope, or every scope when omitted. Destroys nothing.                                                       |
| `find(Class, within?)`    | `T \| null` | The first mounted instance on or inside `within`, which defaults to `document`.                                                 |
| `findAll(Class, within?)` | `T[]`       | Every mounted instance on or inside `within`, in document order.                                                                |

## `Component(name, options?)`

```ts
class Search extends Component('search', { root: 'form' }) {}
```

| Option     | Type     | Default | Meaning                                                             |
| ---------- | -------- | ------- | ------------------------------------------------------------------- |
| `root`     | tag name | none    | Required root tag. Narrows the type of `this.root` and is checked.  |
| `multiple` | boolean  | `true`  | With `false`, one instance of this component may be active per app. |

### Instance members

| Member                     | Meaning                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `root`                     | The element carrying `data-nemesia`.                                                                              |
| `ref`                      | Element lookup by `data-ref`; see below.                                                                          |
| `option`                   | Option parsing from `data-option-*`; see below.                                                                   |
| `on(target, type, fn, o?)` | Adds a listener that is removed on destroy. `target` may be an array. Returns a function that removes it earlier. |
| `signal`                   | An `AbortSignal` that aborts when the component is destroyed.                                                     |
| `channel<T>()`             | Creates a typed channel this component emits into. It closes when the component is destroyed.                     |
| `on(channel, fn)`          | Listens to a channel of another component until either side is destroyed. Returns a function that stops earlier.  |
| `warn(message, payload?)`  | Logs a warning with the component name and root attached.                                                         |
| `find(Class, within?)`     | Like `app.find`, but `within` defaults to the root and the caller is never returned.                              |
| `findAll(Class, within?)`  | Like `app.findAll`, with the same defaults.                                                                       |
| `onMount()`                | Optional hook. Runs after construction; may return a promise.                                                     |
| `onDestroy()`              | Optional hook. Runs once before the listeners from `on` are removed.                                              |

### `this.ref`

Four families share the same helpers:

| Family              | Example                              | No match          | Several matches   |
| ------------------- | ------------------------------------ | ----------------- | ----------------- |
| `ref`               | `this.ref.button('save')`            | component skipped | component skipped |
| `ref.optional`      | `this.ref.optional.button('save')`   | `null`            | component skipped |
| `ref.many`          | `this.ref.many.button('tab')`        | component skipped | all returned      |
| `ref.optional.many` | `this.ref.optional.many.button('x')` | `[]`              | all returned      |

| Helper           | Element type              | Checked at runtime       |
| ---------------- | ------------------------- | ------------------------ |
| `element`        | `HTMLElement`             | any HTML element         |
| `button`         | `HTMLButtonElement`       | `<button>`               |
| `input`          | `HTMLInputElement`        | `<input>`                |
| `textarea`       | `HTMLTextAreaElement`     | `<textarea>`             |
| `select`         | `HTMLSelectElement`       | `<select>`               |
| `form`           | `HTMLFormElement`         | `<form>`                 |
| `tag(tag, name)` | the element type of `tag` | that HTML tag            |
| `one<T>`         | `T`                       | no; single families only |
| `of<T>`          | `T`                       | no; many families only   |

An element with the wrong tag skips the component in every family.

### `this.option`

| Helper                             | Result  | Accepts                                                              |
| ---------------------------------- | ------- | -------------------------------------------------------------------- |
| `string(name, constraints?)`       | string  | Any value; `minLength`, `maxLength`, `pattern`.                      |
| `number(name, constraints?)`       | number  | A finite number; `min`, `max`, `integer`.                            |
| `boolean(name)`                    | boolean | `true`, `false`, `1`, `0`, or an empty attribute, which means true.  |
| `json<T>(name, { validate? })`     | `T`     | Anything `JSON.parse` accepts, then the optional type guard.         |
| `enum(name, values)`               | union   | One of the listed strings.                                           |
| `literal(name, value)`             | literal | Exactly that string, number, or boolean.                             |
| `custom(name, parser, validator?)` | `T`     | Whatever `parser` returns without throwing and `validator` approves. |

`this.option.*` requires the attribute. `this.option.optional.*` returns `undefined` when it is absent, or the `default` when one is given:

```ts
this.option.optional.number('delay', { default: 300, min: 0 })
this.option.optional.enum('theme', ['light', 'dark'] as const, { default: 'light' })
this.option.optional.custom('origin', parsePoint, isPoint, { default: { x: 0, y: 0 } })
```

A present but invalid value skips the component in both families.

## `lazy(name, load)`

```ts
app.register([lazy('gallery', () => import('./gallery'))])
```

Registers a concrete component whose module is loaded the first time a root named `name` is found. `load` returns a promise of the component class or of a module that exports exactly one component with that name. Components found in the same pass load in parallel and mount together.

## `DistributedComponent(name)`

```ts
class Analytics extends DistributedComponent('analytics') {}
```

One instance is mounted for each exact scope passed to `app.mount`. It has no `root`, `ref`, or `option`.

| Member                            | Meaning                                                        |
| --------------------------------- | -------------------------------------------------------------- |
| `scope`                           | The node passed to `app.mount`.                                |
| `on`, `signal`, `channel`, `warn` | The same as on a concrete component.                           |
| `find`, `findAll`                 | The same, with `within` defaulting to the scope.               |
| `onMount()`, `onDestroy()`        | The same hooks. `onMount` runs after the concrete components'. |

## Exports

Runtime: `Component`, `DistributedComponent`, `createApp`, `lazy`, `BaseComponent`, `BaseDistributedComponent`.

Types: `NemesiaApp`, `CreateAppOptions`, `ComponentConstructor`, `LazyComponent`, `Channel`, `ConcreteComponentOptions`, `StringOptionOptions`, `NumberOptionOptions`, `BooleanOptionOptions`, `JsonOptionOptions`, `DefaultOptionOptions`, `OptionParser`, `OptionValidator`.

The UMD build exposes `Component`, `DistributedComponent`, `createApp`, and `lazy` on the global `Nemesia`.

## Diagnostics

| Situation                                                      | Output          | Effect                           |
| -------------------------------------------------------------- | --------------- | -------------------------------- |
| Missing, duplicate, or mistyped ref; missing or invalid option | `console.warn`  | That instance is skipped.        |
| Wrong root tag, or a second root of a `multiple: false`        | `console.warn`  | That root is skipped.            |
| A name registered twice                                        | `console.warn`  | The latest registration is used. |
| A lazy component whose module fails to load                    | `console.error` | Its roots stay unmounted.        |
| A channel listener that throws                                 | `console.error` | The other listeners still run.   |
| `mount()` before `document.body` exists                        | `console.warn`  | Nothing is mounted.              |
| An error thrown by a constructor or `onMount`                  | `console.error` | That instance is dropped.        |
| An error thrown by `onDestroy`                                 | `console.error` | Cleanup continues.               |

Every message starts with `[Nemesia]` and carries the component name and the element involved.

[Previous: Recipes](11-recipes.md) · [Guide index](README.md) · [Next: Migrating from v1](13-migrating-from-v1.md)
