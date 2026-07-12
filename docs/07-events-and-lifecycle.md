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

```ts
onMount() {
	this.root.setAttribute('data-ready', '')
}
```

Nemesia records the instance before calling the hook, so recursive calls to `mount` do not create duplicates.

If the hook throws, the partial mounted instance is destroyed and other components continue. A returned promise is observed, but `mount()` remains synchronous and does not await it.

If an asynchronous `onMount` later rejects, Nemesia reports the error and destroys that instance. Singleton candidates skipped while it was pending are not retried automatically; call `mount()` again if needed.

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

## What you still own

Nemesia only cleans listeners registered through `this.on`. Clean these yourself in `onDestroy`:

- timers and animation frames;
- custom observers;
- third-party library instances;
- subscriptions outside Nemesia;
- listeners attached directly with `addEventListener`.

[Previous: Options](06-options.md) · [Guide index](README.md) · [Next: Dynamic DOM](08-dynamic-dom.md)
