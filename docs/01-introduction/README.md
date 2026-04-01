# 1. Introduction

## What is Nemesia?

Nemesia is a small runtime for attaching JavaScript behavior to existing HTML.
It is useful for SSR/MPA pages where markup already exists, and you want progressive enhancement.

You define components declaratively, then mount them onto matching DOM nodes.

## Installation

```bash
npm i nemesia
```

## Quick Start

### HTML

```html
<section data-counter data-counter-step="1">
  <button data-counter-minus>-</button>
  <output data-counter-value></output>
  <button data-counter-plus>+</button>
</section>
```

### JavaScript / TypeScript

```ts
import { createApplication, defineComponent, getOption, getRef } from 'nemesia'

const counter = defineComponent({
  name: 'counter',
  schema: {
    refs: {
      root: getRef('[data-counter]', 'section'),
      minus: getRef('[data-counter-minus]', 'button'),
      plus: getRef('[data-counter-plus]', 'button'),
      value: getRef('[data-counter-value]', 'output')
    },
    options: {
      step: getOption('data-counter-step', { type: 'number', default: 1 })
    }
  },
  state: () => ({ count: 0 }),
  methods: (ctx) => ({
    render() {
      ctx.refs.value.textContent = String(ctx.state.count)
      ctx.refs.minus.disabled = ctx.state.count <= 0
    },
    increment() {
      ctx.state.count += ctx.options.step
    },
    decrement() {
      ctx.state.count -= ctx.options.step
    }
  }),
  setup(ctx) {
    ctx.watch('count', ctx.methods.render, { immediate: true })
    ctx.on(ctx.refs.plus, 'click', ctx.methods.increment)
    ctx.on(ctx.refs.minus, 'click', ctx.methods.decrement)
  }
})

const app = createApplication()

app.register(counter)
app.mount(document)
```

## What to read next

- [Core Concepts](../02-core-concepts/README.md)
- [API Reference](../03-api/README.md)
