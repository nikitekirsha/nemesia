# Changelog

All notable changes to Nemesia are documented here.

## 2.4.3 — 2026-11-10

### Changed

- Every release now has a page on GitHub, and its notes are taken from this changelog. The pages of all earlier versions have been added too.
- The package itself is unchanged: behavior, messages, and types are the same as in 2.4.2.

## 2.4.1 — 2026-11-10

### Changed

- The browser build is about 12% smaller: 5.6 KB gzipped instead of 6.4 KB. Behavior, messages, and types are unchanged.
- `this.ref.optional`, `this.ref.many`, and `this.option.optional` are created when they are read instead of with every component, which also lowers the memory each component uses.

## 2.4.0 — 2026-11-10

### Added

- `this.signal`: an `AbortSignal` that aborts when the component is destroyed.
- `this.on` returns a function that removes the listener before destroy.
- `this.ref.tag(tag, name)` in every ref family: typed from the HTML tag and checked at runtime.
- `this.channel<T>()`: a typed stream of values that a component emits and others listen to with `this.on(channel, listener)`. Both sides are cleaned up automatically.
- `lazy(name, load)`: a component whose module is loaded the first time its root appears. Components found together load in parallel and mount together, children before parents.

### Changed

- `signal` and `channel` are now members of every component. A subclass that defines its own member with either name has to rename it.

## 2.3.0 — 2026-11-10

### Added

- `integer` constraint for number options.
- Guide: an API reference, a migration guide from v1, and recipes for responsive behavior, lazy components, HTML swaps, and testing.

### Changed

- Number options reject `Infinity` and `-Infinity`.
- The Node.js range needed to work on Nemesia is declared in `devEngines`. Installing the package no longer warns or fails on other Node.js versions.
- With `observe: true`, an environment that has no `MutationObserver` at all throws instead of silently not observing.
- Releases are published from GitHub Actions with provenance.

### Fixed

- A listener registered with `once` or `signal` is released when it fires or the signal aborts. It used to stay referenced, together with its target, until the component was destroyed.
- `register` throws a descriptive error for an entry that is not a component class, and names circular imports for an `undefined` entry.
- `mount()` warns when `document.body` does not exist yet instead of silently mounting nothing.
- A mutation record with more than about a hundred thousand nodes no longer overflows the call stack.
- An `onMount` rejection whose value throws when inspected is reported and destroys the instance. It used to be swallowed.

## 2.2.2 — 2026-09-26

### Fixed

- With observation, `find` and `findAll` include markup inserted earlier in the same task and exclude roots removed in it.
- With observation, `destroy(scope)` also destroys roots inserted into the scope earlier in the same task.

## 2.2.1 — 2026-09-26

- Documentation website. The README links to it instead of listing the guide chapters.

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
