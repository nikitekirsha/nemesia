# 3.5 Component Context (`ctx`)

`ctx` is available in `methods(ctx)` and `setup(ctx)`.

## Data access

- `ctx.element`
- `ctx.refs`
- `ctx.options`
- `ctx.state`
- `ctx.methods`

## State helpers

### setState(patch)
Applies partial state updates.

### watch(key | keys, handler, config?)
Subscribes to state key changes.
Returns disposer function.

`config.immediate: true` runs handler immediately after subscription.

## Event helpers

### on(target, event, handler, options?)
Subscribes to DOM events and returns disposer.
Listeners are auto-cleaned on unmount.

## Lifecycle helpers

### onMount(handler)
Runs during mount phase.

### onRefresh(handler)
Runs when instance is refreshed (`refresh` / `reconcile`).

### onUnmount(handler)
Runs before teardown.

### cleanup(dispose)
Registers custom cleanup callback for unmount.
