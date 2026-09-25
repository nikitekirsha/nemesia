# Changelog

All notable changes to Nemesia are documented here.

## 2.2.0 — 2026-09-25

### Added

- `find` and `findAll` on components and apps return mounted instances of a component class, typed from the class.
- A `data-ref` placed on a nested component root belongs to the component above it.

### Breaking changes

- The ESM build exports `Component`, `DistributedComponent` and `createApp` by name. The `Nemesia` namespace object exists only in the UMD build.
- Within one mount, every component is constructed first; `onMount` then runs for nested components before their parents, and for distributed components last.
- `DistributedComponent(name)` no longer takes an options argument.
- `this.ref` and `this.option` methods live on the prototype, so they cannot be destructured.
- When a singleton's `onMount` fails, candidates skipped in its favor mount on the next `mount()` call.

### Performance

- Mounting is about twice as fast and each mounted component uses about 70% less memory.
- Ref lookups use native attribute selectors, which makes components with large subtrees up to eight times faster to mount.

### Fixed

- Number literal options compare with strict equality.

## 2.1.0 — 2026-09-25

### Added

- `this.on` types known DOM events from the target and event name. Custom events receive `Event` unless the listener parameter is annotated.

### Breaking changes

- An empty number option is invalid instead of `0`.
- Required option helpers no longer accept `default`.

### Fixed

- `destroy(scope)` destroys roots that were removed from the scope before the call.
- `disconnect()` processes removals that the observer has not delivered yet.
- An `AbortError` rejected by `onMount` after destroy is not reported.

### Performance

- Mutations that add or remove no elements skip ancestry bookkeeping.

## 2.0.1 — 2026-07-12

- Documentation comments for public methods and properties.

## 2.0.0 — 2026-07-07

- Complete rewrite: class components with typed refs and options, distributed components, DOM contract validation and optional observation of dynamic DOM.

## 1.1.3 — 2026-04-09

- More detailed warnings.
- Optional `schema.options` in `defineComponent`.

## 1.1.2 — 2026-04-09

- Computed values.
- Multiple component instances on a single element.

## 1.0.3 — 2026-04-02

- Untagged refs fall back to `HTMLElement`.
- Best practices chapter in the documentation.

## 1.0.0 — 2026-03-30

- Initial release.
