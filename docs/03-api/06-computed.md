# 3.6 computed

```ts
computed: (ctx) => ({ ... })
```

Defines per-instance derived values.

`computed` is built once during mount, and its getters are evaluated on access.

## Context available in `computed(ctx)`

- `ctx.element`
- `ctx.refs`
- `ctx.options`
- `ctx.state`

Not available:

- `ctx.methods`
- `ctx.computed`

`ctx.methods` and `ctx.computed` are intentionally locked in `computed` to avoid circular dependencies and unstable type inference.

## Typical use cases

- derived UI state (`isDisabled`, `label`, `canSubmit`)
- normalized values (`normalizedQuery`, `safeLimit`)
- dynamic DOM lookups based on current refs/state

## Example

```ts
const component = defineComponent({
  name: 'counter',
  schema: {
    refs: {
      root: getRef('[data-counter]', 'section'),
      value: getRef('[data-counter-value]', 'output')
    },
    options: {}
  },
  state: () => ({
    count: 0,
    activeId: ''
  }),
  computed: (ctx) => ({
    get doubled() {
      return ctx.state.count * 2
    },
    get text() {
      return `count=${ctx.state.count}, x2=${ctx.state.count * 2}`
    },
    get activeNode() {
      return ctx.refs.root.querySelector(`[data-item-id="${ctx.state.activeId}"]`)
    }
  }),
  methods: (ctx) => ({
    render() {
      ctx.refs.value.textContent = ctx.computed.text
      ctx.computed.activeNode?.setAttribute('data-active', 'true')
    }
  }),
  setup(ctx) {
    ctx.watch(['count', 'activeId'], ctx.methods.render, { immediate: true })
  }
})
```
