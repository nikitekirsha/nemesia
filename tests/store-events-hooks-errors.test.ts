import { bindEvent } from '../src/events/binder'
import { runDisposers, runHooks } from '../src/lifecycle/hooks'
import { reportWarning } from '../src/runtime/errors'
import { createStateStore } from '../src/state/store'

describe('state store', () => {
  it('watches only changed keys and supports immediate/unwatch/teardown', () => {
    const store = createStateStore({ a: 1, b: 2 })
    const onA = vi.fn()
    const onB = vi.fn()

    const stopA = store.watch('a', onA, { immediate: true })
    const stopGhost = store.watch('a', () => undefined)
    store.watch(['a', 'b', 'a'], onB)

    store.state.a = 2
    store.state.b = 3
    store.state.a = 2

    expect(onA).toHaveBeenCalledTimes(2)
    expect(onB).toHaveBeenCalledTimes(2)

    stopA()
    store.setState({ a: 4, b: 5 })
    expect(onA).toHaveBeenCalledTimes(2)

    store.teardown()
    stopGhost()
    store.state.a = 10
    expect(onB).toHaveBeenCalledTimes(4)
  })
})

describe('events and lifecycle utilities', () => {
  it('binds and unbinds event listeners', () => {
    const button = document.createElement('button')
    const handler = vi.fn()

    const off = bindEvent(button, 'click', handler)
    button.click()
    off()
    button.click()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('runs hooks/disposers and reports warnings when callbacks throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const ok = vi.fn()

    runHooks('comp', 'mount', [() => {
      throw new Error('mount fail')
    }, ok])

    const disposer = vi.fn(() => {
      throw new Error('cleanup fail')
    })

    runDisposers('comp', [disposer, undefined as unknown as () => void])
    reportWarning('comp', 'plain warning')

    expect(ok).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(3)
  })
})
