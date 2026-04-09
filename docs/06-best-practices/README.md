# Best Practices

The guidelines help keeping Nemesia components predictable, scalable, and easy to maintain.

## 1. Define schema before behavior

- Start each component by declaring `schema.refs` first, and `schema.options` when runtime options are needed.
- After that implement `methods`, `state` and `setup` based on that definition.
- This keeps component explicit and avoids accidental behavior drift during HTML changes.

**Do**
```ts
defineComponent({
  name: 'cart',
  schema: {
    refs: {
      root: getRef('[data-cart]', { tag: 'section' })
    },
    options: {
      endpoint: getOption('data-cart-endpoint')
    }
  },
  setup(ctx) {
    ctx.on(ctx.refs.root, 'click', () => fetch(ctx.options.endpoint))
  }
})
```

**Don't**
```ts
defineComponent({
  name: 'cart',
  schema: {
    refs: {
      root: getRef('[data-cart]')
    }
  },
  setup(ctx) {
    // Hidden dependency outside schema.
    const endpoint = ctx.refs.root.getAttribute('data-cart-endpoint') ?? '/api/cart'

    ctx.on(ctx.refs.root, 'click', () => fetch(endpoint))
  }
})
```

## 2. Prefer semantic refs

- Prefer `data-*` selectors in `getRef(...)` for component wiring.
- CSS classes are mostly visual concerns and may change during restyling.
- `data-*` attributes are stable logic contracts between HTML and component code.
- You can still use any selector when needed, but `data-*` should be your primary choice.

**Do**
```ts
refs: {
  submit: getRef('[data-checkout-submit]', { tag: 'button' })
}
```

**Don't**
```ts
refs: {
  // Styling class can change during redesign.
  submit: getRef('.btn.btn--green')
}
```

## 3. Be explicit about ref types

- Add `tag` when a ref uses element-specific APIs (`value`, `disabled`, `submit`, `reset`, and so on).
- Without an explicit `tag`, treat the ref as a generic `HTMLElement`.

**Do**
```ts
refs: {
  form: getRef('[data-profile-form]', { tag: 'form' }),
  email: getRef('[data-profile-email]', { tag: 'input' })
}

ctx.refs.form.reset()
ctx.refs.email.value = ''
```

**Don't**
```ts
refs: {
  email: getRef('[data-profile-email]')
}

// Generic HTMLElement: no input-specific API.
ctx.refs.email.value = ''
```

## 4. Keep options runtime

- Read runtime configuration from `schema.options`, not hardcoded constants in setup.
- Use `default` for stable behavior and `optional` only when `undefined` is truly expected.

**Do**
```ts
options: {
  debounceMs: getOption('data-search-debounce-ms', { type: 'number', default: 200 })
}

setup(ctx) {
  setTimeout(() => {}, ctx.options.debounceMs)
}
```

**Don't**
```ts
setup() {
  const debounceMs = 200 // Hardcoded runtime behavior.
  setTimeout(() => {}, debounceMs)
}
```

## 5. Keep methods decoupled

- Prefer independent methods with minimal cross-calls.
- If the logic is a derived value from refs/options/state, prefer moving it into `computed`.
- If your method is used across other methods and is not derived state, move it above your component.
- For one-time logic, inline it where it's used.
- Cross-calling `ctx.methods.*` is allowed, but in non-strict TS projects inference may be weaker inside `methods(...)`.

**Do**
```ts
computed: (ctx) => ({
  get normalizedQuery() {
    return ctx.state.query.trim().toLowerCase()
  }
}),
methods: (ctx) => ({
  search() {
    return ctx.computed.normalizedQuery
  }
})
```

**Don't**
```ts
methods: (ctx) => ({
  normalizeQuery() {
    return ctx.state.query.trim().toLowerCase()
  },
  search() {
    // Works, but can reduce inference quality in non-strict TS.
    return ctx.methods.normalizeQuery()
  }
})
```

## 6. Use setup as wiring layer

- Use `setup(...)` for subscriptions, event bindings, and lifecycle registration.
- Keep heavy transformation logic in methods/helpers, not in setup callbacks.

**Do**
```ts
methods: (ctx) => ({
  rebuildIndex() {
    ctx.state.index = ctx.state.items.map((x) => x.id)
  }
}),
setup(ctx) {
  ctx.on(ctx.refs.root, 'input', ctx.methods.rebuildIndex)
}
```

**Don't**
```ts
setup(ctx) {
  ctx.on(ctx.refs.root, 'input', () => {
    // Heavy logic directly in wiring callback.
    ctx.state.index = ctx.state.items.map((x) => x.id)
  })
}
```

## 7. Always clean up external resources

- Destroy external instances (JS libraries, timers, observers, sockets, etc.) in `onUnmount(...)` or `cleanup(...)`.
- Keep in mind components may be mounted, reconciled, recreated, and destroyed multiple times.

**Do**
```ts
setup(ctx) {
  const timer = window.setInterval(() => {}, 1000)
  ctx.onUnmount(() => window.clearInterval(timer))
}
```

**Don't**
```ts
setup() {
  window.setInterval(() => {}, 1000) // No cleanup -> leak.
}
```

## 8. Use typed event targets when possible

- Pass concrete targets (`document`, `window`, typed elements) to `ctx.on(...)` for better event typing.
- For generic/custom `EventTarget`, rely on fallback `Event` type.

**Do**
```ts
ctx.on(document, 'keydown', (event) => {
  if (event.key === 'Escape') {
    ctx.methods.close()
  }
})
```

**Don't**
```ts
const target: EventTarget = document
ctx.on(target, 'keydown', (event) => {
  // Fallback Event type: key is not typed here.
  console.log(event.type)
})
```
