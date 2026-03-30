import { defineComponent, getOption, getRef } from '../index'
import { instantiateComponent } from '../src/lifecycle/instantiate'
import * as refsResolver from '../src/resolver/refs'

function setupDom(): HTMLElement {
  const root = document.createElement('section')
  root.setAttribute('data-demo', '')
  root.innerHTML = '<button data-plus></button><div data-out></div>'

  return root
}

describe('instantiateComponent', () => {
  it('returns null when refs resolver reports empty value', () => {
    const root = document.createElement('div')
    const spy = vi.spyOn(refsResolver, 'resolveRefs').mockReturnValue({ ok: true } as never)

    const component = defineComponent({
      name: 'mocked-refs',
      schema: {
        refs: { root: getRef('[data-mocked]') },
        options: {}
      }
    })

    expect(instantiateComponent(component, root)).toBeNull()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('returns null for schema failures', () => {
    const root = document.createElement('div')
    root.setAttribute('data-broken', '')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const broken = defineComponent({
      name: 'broken',
      schema: {
        refs: { root: getRef('[data-broken]') },
        options: { endpoint: getOption('data-endpoint') }
      }
    })

    expect(instantiateComponent(broken, root)).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('supports setup/methods/state/watch/on/cleanup hooks', () => {
    const root = setupDom()
    root.setAttribute('data-endpoint', '/x')

    const onMount = vi.fn()
    const onRefresh = vi.fn()
    const onUnmount = vi.fn()
    const onCount = vi.fn()

    const component = defineComponent({
      name: 'demo',
      schema: {
        refs: {
          root: getRef('[data-demo]', 'section'),
          plus: getRef('[data-plus]', 'button'),
          out: getRef('[data-out]', 'div')
        },
        options: {
          endpoint: getOption('data-endpoint')
        }
      },
      state: () => ({ count: 0 }),
      methods(ctx) {
        return {
          increment() {
            ctx.state.count += 1
          }
        }
      },
      setup(ctx) {
        ctx.setState({ count: 0 })
        ctx.onMount(onMount)
        ctx.onRefresh(onRefresh)
        ctx.onUnmount(onUnmount)
        ctx.watch('count', onCount, { immediate: true })
        ctx.on(ctx.refs.plus, 'click', ctx.methods.increment)

        ctx.cleanup(() => {
          ctx.refs.out.textContent = 'disposed'
        })
      }
    })

    const instance = instantiateComponent(component, root)
    expect(instance).not.toBeNull()

    root.querySelector('button')?.click()
    expect(onCount).toHaveBeenCalledTimes(2)

    instance?.refresh()
    expect(onRefresh).toHaveBeenCalledTimes(1)

    instance?.unmount()
    instance?.refresh()
    instance?.unmount()

    root.querySelector('button')?.click()

    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onUnmount).toHaveBeenCalledTimes(1)
    expect((root.querySelector('[data-out]') as HTMLElement).textContent).toBe('disposed')
    expect(onCount).toHaveBeenCalledTimes(2)
  })

  it('handles methods/setup/state factory failures', () => {
    const root = setupDom()
    root.setAttribute('data-endpoint', '/x')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const badMethods = defineComponent({
      name: 'bad-methods',
      schema: {
        refs: { root: getRef('[data-demo]', 'section') },
        options: { endpoint: getOption('data-endpoint') }
      },
      methods(): { noop: () => void } {
        throw new Error('x')
      }
    })

    const badSetup = defineComponent({
      name: 'bad-setup',
      schema: {
        refs: { root: getRef('[data-demo]', 'section') },
        options: { endpoint: getOption('data-endpoint') }
      },
      setup(ctx) {
        ctx.cleanup(() => undefined)
        throw new Error('x')
      }
    })

    const badState = defineComponent({
      name: 'bad-state',
      schema: {
        refs: { root: getRef('[data-demo]', 'section') },
        options: { endpoint: getOption('data-endpoint') }
      },
      state(): Record<string, unknown> {
        throw new Error('x')
      },
      setup(ctx) {
        expect(ctx.state).toEqual({})
      }
    })

    expect(instantiateComponent(badMethods, root)).toBeNull()
    expect(instantiateComponent(badSetup, root)).toBeNull()
    expect(instantiateComponent(badState, root)).not.toBeNull()
    expect(warn).toHaveBeenCalledTimes(3)
  })
})
