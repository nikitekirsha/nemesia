# 5. Runtime Behavior

## Mount pipeline

For each candidate root element:

1. Resolve refs
2. Resolve options
3. Create state store
4. Build computed
5. Build methods
6. Run setup
7. Run mount hooks

If required schema validation fails at steps 1-2, instance is skipped.

## Fault isolation

Errors are isolated per component instance:

- warning is logged
- only failing instance is skipped/aborted
- other components continue running

## Cleanup guarantees

During unmount/destroy:

- `onUnmount` hooks run
- event listeners from `ctx.on` are removed
- watchers from `ctx.watch` are removed
- custom `ctx.cleanup` callbacks run

## Reconcile model

`reconcile(scope)` is safe to call repeatedly:

- missing instances are mounted
- existing instances are refreshed
- already mounted `component + element` pairs are not duplicated
