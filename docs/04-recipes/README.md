# 4. Recipes

## Counter with derived UI

Use `watch(..., { immediate: true })` to render once on mount and then on every state change.

## Optional refs

Use optional refs for elements that may not exist in every template variant:

```ts
subtitle: getRef('[data-subtitle]', { tag: 'p', optional: true })
```

Then guard usage:

```ts
if (ctx.refs.subtitle) {
  ctx.refs.subtitle.textContent = '...'
}
```

## Dynamic DOM (MPA + server updates)

If your page inserts/removes blocks dynamically, enable observer mode:

```ts
createApplication({ observeDomChanges: true })
```

## Global listeners

Global listeners are supported via explicit targets:

```ts
ctx.on(document, 'keydown', onKeyDown)
```

No extra cleanup is needed when using `ctx.on(...)`.
