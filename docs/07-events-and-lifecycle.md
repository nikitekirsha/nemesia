# 7. Events and lifecycle

## Registering events

Use `this.on` for listeners owned by a component:

```ts
this.on(this.button, 'click', event => {
	console.log(event.type)
})
```

The optional fourth argument is passed to `addEventListener`:

```ts
this.on(this.button, 'click', handler, {
	once: true,
	passive: true
})
```

`capture`, `once`, `passive`, and `signal` are supported through `AddEventListenerOptions`.

A listener registered with `once` or `signal` is released as soon as it fires or the signal aborts. It does not keep its target alive until the component is destroyed.

`this.on` returns a function that removes the listener before the component is destroyed. Use it for listeners that only matter for a while, such as the ones that follow a drag:

```ts
this.on(this.handle, 'pointerdown', () => {
	const stopMoving = this.on(window, 'pointermove', event => this.moveTo(event.clientX))

	this.on(window, 'pointerup', stopMoving, { once: true })
})
```

For an array of targets, the one function removes every listener of that call.

## Event types

Known DOM events are typed from the target and event name:

```ts
this.on(this.button, 'click', event => event.clientX) // PointerEvent
this.on(this.input, 'keydown', event => event.key) // KeyboardEvent
this.on(window, 'resize', event => event.view) // UIEvent
```

Other event names receive `Event`. Annotate the listener parameter to type a custom event:

```ts
this.on(this.root, 'cart:update', (event: CustomEvent<{ count: number }>) => {
	console.log(event.detail.count)
})
```

To type a custom event once for the whole project, add it to the DOM's own event map from any module. `this.on` reads that map, so listeners need no annotation:

```ts
declare global {
	interface HTMLElementEventMap {
		'cart:update': CustomEvent<{ count: number }>
	}
}

this.on(this.root, 'cart:update', event => {
	console.log(event.detail.count)
})
```

Use `DocumentEventMap` and `WindowEventMap` for events listened to on `document` and `window`.

## Arrays of targets

Refs returned by `ref.many` can be registered together:

```ts
this.on(this.tabs, 'click', (event, tab, index) => {
	tab.setAttribute('aria-selected', 'true')
	this.panel.dataset.activeTab = String(index)
})
```

Nemesia creates one listener per target. The callback receives the event, current target, and stable array index.

## `onMount`

`onMount` runs after construction and after all field initializers have resolved refs and options.

Within one mount, every component is constructed first. `onMount` then runs for nested components before their parents, and for distributed components last.

```ts
onMount() {
	this.root.setAttribute('data-ready', '')
}
```

Nemesia records the instance before calling the hook, so recursive calls to `mount` do not create duplicates.

If the hook throws, the partial mounted instance is destroyed and other components continue. A returned promise is observed, but `mount()` remains synchronous and does not await it.

If an asynchronous `onMount` later rejects, Nemesia reports the error and destroys that instance.

Singleton candidates skipped in favor of an instance whose `onMount` fails are not retried automatically; call `mount()` again if needed.

## `onDestroy`

Use `onDestroy` for resources Nemesia does not own:

```ts
private timer: number | undefined

onMount() {
	this.timer = window.setInterval(() => {
		this.root.toggleAttribute('data-tick')
	}, 1000)
}

onDestroy() {
	if (this.timer !== undefined) window.clearInterval(this.timer)
}
```

During app destruction, Nemesia:

1. removes the internal instance record;
2. invokes `onDestroy` once;
3. immediately removes every listener registered through `this.on`.

Removing the record first makes recursive destruction safe and allows a replacement to mount from inside `onDestroy`.

`destroy()` does not await a returned promise. Listener cleanup happens immediately after hook invocation, so code after an `await` cannot add another owned listener through `this.on`.

Thrown or rejected cleanup errors are reported without preventing listener removal or cleanup of other instances.

## `this.signal`

Every component has an `AbortSignal` that aborts when the component is destroyed. Hand it to anything that accepts a signal, and that work ends with the component:

```ts
async onMount() {
	const response = await fetch(this.url, { signal: this.signal })
	this.value.textContent = await response.text()
}
```

When the component is destroyed mid-request, `fetch` rejects with an `AbortError`. Nemesia expects that after a destroy and does not report it, and the lines after the `await` never run.

The signal also ends work that has no cleanup of its own:

```ts
onMount() {
	const timer = window.setInterval(() => this.tick(), 1000)

	this.signal.addEventListener('abort', () => window.clearInterval(timer))
}
```

The signal aborts the moment destruction starts, so `this.signal.aborted` is already `true` inside `onDestroy`. A component that is skipped during construction aborts its signal too.

## What you still own

Nemesia cleans the listeners registered through `this.on` and aborts `this.signal`. Everything else is yours to release, either through the signal or in `onDestroy`:

- timers and animation frames;
- custom observers;
- third-party library instances;
- subscriptions outside Nemesia;
- listeners attached directly with `addEventListener` without the signal.

[Previous: Options](06-options.md) · [Guide index](README.md) · [Next: Dynamic DOM](08-dynamic-dom.md)
