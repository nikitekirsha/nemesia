# 3.2 getRef

```ts
getRef(selector)
getRef(selector, tag)
getRef(selector, { tag, optional, many })
```

Describes how to resolve DOM nodes for a component instance.

## Defaults

- `optional: false`
- `many: false`

## Behavior

- Required ref missing -> warning + instance skipped
- Required ref tag mismatch -> warning + instance skipped
- Optional single mismatch/missing -> `null`
- Optional many mismatch/missing -> `[]`

## Type examples

- `getRef('[data-x]')` -> `HTMLElement`
- `getRef('[data-x]', 'input')` -> `HTMLInputElement`
- `getRef('[data-x]', { optional: true })` -> `HTMLElement | null`
- `getRef('[data-x]', { many: true })` -> `HTMLElement[]`
- `getRef('[data-x]', { tag: 'a', many: true })` -> `HTMLAnchorElement[]`
