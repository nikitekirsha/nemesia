# 3.1 defineComponent

```ts
defineComponent(definition)
```

Defines a typed component contract.

## Required fields

- `name: string`
- `schema.refs`
- `schema.refs.root`

`root` must be required single ref.

## Optional fields

- `schema.options?: Record<string, OptionDescriptor>`
- `state: () => State`
- `computed: (ctx) => Computed`
- `methods: (ctx) => Methods`
- `setup: (ctx) => void`

## Example

```ts
const component = defineComponent({
  name: 'demo',
  schema: {
    refs: {
      root: getRef('[data-demo]', 'section')
    }
  },
  state: () => ({ open: false }),
  computed: (ctx) => ({
    get rootOpen() {
      return ctx.state.open
    }
  }),
  methods: (ctx) => ({
    toggle() {
      ctx.state.open = !ctx.state.open
    }
  }),
  setup(ctx) {
    ctx.watch('open', () => {
      ctx.refs.root.toggleAttribute('data-open', ctx.computed.rootOpen)
    }, { immediate: true })
  }
})
```
