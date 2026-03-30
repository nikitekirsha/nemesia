# 3.1 defineComponent

```ts
defineComponent(definition)
```

Defines a typed component contract.

## Required fields

- `name: string`
- `schema.refs`
- `schema.options`
- `schema.refs.root`

`root` must be required single ref.

## Optional fields

- `state: () => State`
- `methods: (ctx) => Methods`
- `setup: (ctx) => void`

## Example

```ts
const component = defineComponent({
  name: 'demo',
  schema: {
    refs: {
      root: getRef('[data-demo]', 'section')
    },
    options: {}
  },
  state: () => ({ open: false }),
  methods: (ctx) => ({
    toggle() {
      ctx.state.open = !ctx.state.open
    }
  }),
  setup(ctx) {
    ctx.watch('open', () => {
      ctx.refs.root.toggleAttribute('data-open', ctx.state.open)
    }, { immediate: true })
  }
})
```
