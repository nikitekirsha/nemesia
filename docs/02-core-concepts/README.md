# 2. Core Concepts

## 1) Component = schema + behavior

A Nemesia component is defined by:

- `schema.refs`: DOM references (selectors)
- `schema.options` (optional): values from `data-*` attributes
- `state`: local mutable state
- `computed`: derived values from refs/options/state
- `methods`: reusable logic bound to context
- `setup`: wiring watchers/events/hooks

## 2) Root ref drives mounting

`schema.refs.root` is required.
Nemesia uses `root.selector` to find mount targets for `mount()` and `reconcile()`.

`root` must be required single ref (`optional: false`, `many: false`).

## 3) Refs and options are validated

At mount time, Nemesia resolves schema values for each instance:

- Missing required ref/option -> warning + skip only that instance
- Tag mismatch on required ref -> warning + skip
- Parse error for number/boolean option -> warning + skip

The rest of the app continues working.

## 4) Context (`ctx`)

Inside `methods` and `setup`, you work with `ctx`:

- `ctx.refs`, `ctx.options`, `ctx.state`, `ctx.computed`, `ctx.methods`
- `ctx.on(...)` for events (auto-cleaned on unmount)
- `ctx.watch(...)` for state subscriptions
- `ctx.onMount/onRefresh/onUnmount`
- `ctx.cleanup(...)` for custom disposal

Inside `computed`, context is intentionally narrower:

- `ctx.element`, `ctx.refs`, `ctx.options`, `ctx.state`
- no `ctx.methods`
- no `ctx.computed`

## 5) Application orchestration

`createApplication()` returns runtime methods:

- `mount(root?)`: mount only new instances
- `reconcile(root?)`: mount new + refresh existing
- `refresh(element, componentName)`: refresh one instance
- `recreate(element, componentName)`: unmount + fresh mount
- `destroy(root?)`: unmount/cleanup instances in scope

If `observeDomChanges: true`, added nodes are reconciled and removed nodes are destroyed automatically.
