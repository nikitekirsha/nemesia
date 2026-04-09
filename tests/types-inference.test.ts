import { defineComponent, getOption, getRef } from '../index'

const component = defineComponent({
  name: 'types-case',
  schema: {
    refs: {
      root: getRef('[data-types-case]', 'section'),
      btn: getRef('[data-types-case-btn]', 'button'),
      maybe: getRef('[data-types-case-maybe]', { tag: 'a', optional: true }),
      many: getRef('[data-types-case-many]', { tag: 'li', many: true })
    },
    options: {
      endpoint: getOption('data-endpoint'),
      retries: getOption('data-retries', { type: 'number', default: 0 }),
      debug: getOption('data-debug', { type: 'boolean', optional: true })
    }
  },
  state: () => ({
    count: 0,
    loading: false
  }),
  computed(ctx) {
    const endpoint: string = ctx.options.endpoint
    void endpoint

    // @ts-expect-error computed context does not expose methods
    const badMethods = ctx.methods
    void badMethods

    return {
      get doubled() {
        return ctx.state.count * 2
      },
      get endpointLabel() {
        return `${ctx.options.endpoint}:${ctx.state.count}`
      },
      firstItem: ctx.refs.many[0] ?? null
    }
  },
  methods(ctx) {
    const stateCount: number = ctx.state.count
    const doubled: number = ctx.computed.doubled
    const firstItem: HTMLLIElement | null = ctx.computed.firstItem
    // @ts-expect-error computed value is number
    const badComputed: string = ctx.computed.doubled
    void stateCount
    void doubled
    void firstItem
    void badComputed

    return {
      increment() {
        ctx.state.count += 1
      },
      status() {
        return ctx.state.loading ? 'loading' : 'idle'
      }
    }
  },
  setup(ctx) {
    const root: HTMLElementTagNameMap['section'] = ctx.refs.root
    const btn: HTMLButtonElement = ctx.refs.btn
    const endpoint: string = ctx.options.endpoint
    const method: () => void = ctx.methods.increment
    const status: string = ctx.methods.status()
    const endpointLabel: string = ctx.computed.endpointLabel
    // @ts-expect-error status method returns string
    const badStatus: number = ctx.methods.status()

    void root
    void btn
    void endpoint
    void method
    void status
    void endpointLabel
    void badStatus

    ctx.on(document, 'keydown', (event) => {
      const key: string = event.key
      void key
      // @ts-expect-error keydown event is KeyboardEvent, not MouseEvent
      const badMouseX: number = event.clientX
      void badMouseX
    })

    ctx.on(btn, 'click', (event) => {
      const x: number = event.clientX
      void x
      // @ts-expect-error click event on HTMLElement is MouseEvent, not KeyboardEvent
      const badKey: string = event.key
      void badKey
    })

    const fallbackTarget: EventTarget = btn
    ctx.on(fallbackTarget, 'custom-event', (event) => {
      const base: Event = event
      void base
      // @ts-expect-error fallback event is Event
      const badKey: string = event.key
      void badKey
    })

    ctx.watch('count', () => undefined)
  }
})

const componentWithoutOptions = defineComponent({
  name: 'types-no-options',
  schema: {
    refs: {
      root: getRef('[data-types-no-options]', 'section')
    }
  },
  setup(ctx) {
    const options: {} = ctx.options
    void options

    // @ts-expect-error schema.options is omitted, options object has no endpoint key
    const endpoint = ctx.options.endpoint
    void endpoint
  }
})

describe('type inference', () => {
  it('keeps strongly typed schema contracts', () => {
    expect(component.name).toBe('types-case')
    expect(componentWithoutOptions.name).toBe('types-no-options')
  })
})

// @ts-expect-error invalid html tag
getRef('[x]', 'not-a-tag')

if (false) {
  // @ts-expect-error default value must match declared option type
  getOption('data-bad-default', { type: 'string', default: true })
}
