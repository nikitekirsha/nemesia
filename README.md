# Nemesia

A tiny library for binding declarative JS components to existing HTML.

## Installation

```bash
npm i nemesia
```

## Usage (ESM)

```ts
import { createApplication, defineComponent, getOption, getRef } from 'nemesia'

const counter = defineComponent({
  name: 'counter',
  schema: {
    refs: {
      root: getRef('[data-counter]', 'section'),
      plus: getRef('[data-counter-plus]', 'button'),
      value: getRef('[data-counter-value]', 'output')
    },
    options: {
      step: getOption('data-counter-step', { type: 'number', default: 1 })
    }
  },
  state: () => ({ count: 0 }),
  methods: (ctx) => ({
    updateUI() {
      ctx.refs.value.textContent = String(ctx.state.count)
    },
    increment() {
      ctx.state.count += ctx.options.step
    }
  }),
  setup(ctx) {
    ctx.watch('count', ctx.methods.updateUI, { immediate: true })
    ctx.on(ctx.refs.plus, 'click', ctx.methods.increment)
  }
})

const app = createApplication({ observeDomChanges: true })

app.register(counter)
app.mount(document)
```

## Usage (UMD)

```html
<script src="https://cdn.jsdelivr.net/npm/nemesia/dist/nemesia.umd.js"></script>

<script>
  const { createApplication, defineComponent, getRef, getOption } = window.Nemesia
</script>
```

## API

Public methods from `nemesia`:

- `defineComponent(...)`
- `createApplication({ observeDomChanges? })`
- `getRef(selector, tagOrConfig?)`
- `getOption(attribute, typeOrConfig?)`

Application instance methods:

- `register(component)`
- `mount(root?)`
- `reconcile(root?)`
- `refresh(element)`
- `recreate(element)`
- `destroy(root?)`
- `getInstance(element)`

## Examples

See [examples/README.md](./examples/README.md).

## Docs

See [docs/README.md](./docs/README.md).

## License

MIT
