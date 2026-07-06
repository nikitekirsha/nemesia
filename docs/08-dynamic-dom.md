# 8. Dynamic DOM observation

Observation is useful when a CMS fragment, partial navigation system, or server-driven widget changes the DOM after initial load.

## Enabling observation

```ts
const app = Nemesia.createApp({ observe: true })

app.register([Gallery, ContactForm])
app.mount(document.body)
```

The initial `mount` still mounts existing components. It also starts one `MutationObserver` for that exact scope.

## Added content

When nodes are added, Nemesia checks:

- the added element itself;
- registered component roots below it.

Normal root, ref, and option validation applies. Already mounted roots are skipped.

```ts
container.insertAdjacentHTML(
	'beforeend',
	'<div data-nemesia="gallery"></div>',
)
```

The new gallery mounts automatically when it is inside an observed scope.

## Removed content

Removing a mounted root or an ancestor subtree destroys every mounted concrete component inside it. `onDestroy` runs and owned listeners are removed.

Mutation records are batched. Removals are processed before additions, which makes moving a root within an observed scope behave as destroy followed by a clean remount.

## Multiple observed scopes

Calling `mount` for another scope observes that exact scope as well. Nested or overlapping observed scopes remain idempotent: a concrete root still has one instance per app.

Distributed components are not created for mutation nodes. They are tied only to scopes passed explicitly to `mount`.

## Destroy versus disconnect

```ts
app.destroy(container)
```

Destroys instances but leaves the observer active. New markup added later can mount again.

```ts
app.disconnect(container)
```

Stops observation for that exact scope but leaves current instances alive.

```ts
app.disconnect()
```

Stops all observers owned by the app. Calling `mount(scope)` later creates a fresh observer when observation remains enabled.

## What is observed

Nemesia watches child-list changes and subtrees. Changing option, ref, or component attributes in place is not an update mechanism. Destroy and remount the relevant root when its contract needs to be re-evaluated.

[Previous: Events and lifecycle](07-events-and-lifecycle.md) · [Guide index](README.md) · [Next: Distributed components](09-distributed-components.md)
