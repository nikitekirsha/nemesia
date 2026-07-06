import { describe, expect, it, vi } from 'vitest'

import { Nemesia, createApp } from '../src/index.js'
import { normalizeMutationRoots } from '../src/internal/dom.js'
import { flushMutations } from './helpers.js'

function componentRoot(name: string, tag = 'div'): HTMLElement {
  const element = document.createElement(tag)
  element.dataset.nemesia = name
  return element
}

describe('mutation root normalization', () => {
  it('deduplicates roots, drops descendants, expands fragments, and preserves retained order', () => {
    const parent = document.createElement('section')
    const child = document.createElement('div')
    const sibling = document.createElement('aside')
    const fragment = document.createDocumentFragment()
    const fragmentRoot = document.createElement('article')
    parent.append(child)
    fragment.append(fragmentRoot)

    expect(normalizeMutationRoots([
      child,
      sibling,
      parent,
      child,
      document.createTextNode('ignored'),
      fragment,
    ])).toEqual([sibling, parent, fragmentRoot])
  })

  it('normalizes a large sibling batch without pairwise containment scans', () => {
    const roots = Array.from(
      { length: 250 },
      () => document.createElement('div'),
    )
    const contains = vi.spyOn(Element.prototype, 'contains')

    expect(normalizeMutationRoots(roots)).toEqual(roots)
    expect(contains.mock.calls.length).toBeLessThanOrEqual(roots.length)
  })
})

describe('automatic concrete mounting', () => {
  it('observes before initial hooks, mounts existing concrete and distributed instances, and mounts added roots and descendants', async () => {
    const mounted: Element[] = []
    const distributedScopes: ParentNode[] = []
    const scope = document.createElement('main')
    scope.dataset.nemesia = 'observed'
    const existing = componentRoot('observed')
    scope.append(existing)
    document.body.append(scope)

    class Observed extends Nemesia.Component('observed') {
      onMount(): void {
        mounted.push(this.root)
        if (this.root === existing) scope.append(componentRoot('observed'))
      }
    }
    class Distributed extends Nemesia.DistributedComponent('observer-scope') {
      onMount(): void { distributedScopes.push(this.scope) }
    }
    const app = createApp({ observe: true }).register([Observed, Distributed])

    app.mount(scope)
    await flushMutations()
    const wrapper = document.createElement('section')
    const nested = componentRoot('observed')
    wrapper.append(nested)
    scope.append(wrapper)
    await flushMutations()

    expect(mounted).toEqual([scope, existing, scope.children[1], nested])
    expect(distributedScopes).toEqual([scope])
  })

  it('checks an added root itself and does not duplicate mounts for overlapping records or nested observers', async () => {
    const mounted: Element[] = []
    class Concrete extends Nemesia.Component('nested-observer') {
      onMount(): void { mounted.push(this.root) }
    }
    const outer = document.createElement('section')
    const inner = document.createElement('div')
    outer.append(inner)
    document.body.append(outer)
    const app = createApp({ observe: true }).register([Concrete])
    app.mount(outer)
    app.mount(inner)

    const parent = componentRoot('nested-observer')
    inner.append(parent)
    const child = componentRoot('nested-observer')
    parent.append(child)
    await flushMutations()

    expect(mounted).toEqual([parent, child])
  })

  it('uses normal controlled validation and continues mounting valid roots', async () => {
    const mounted = vi.fn()
    class Invalid extends Nemesia.Component('observed-invalid') {
      required = this.ref.button('required')
    }
    class Valid extends Nemesia.Component('observed-valid') {
      onMount(): void { mounted(this.root) }
    }
    const scope = document.createElement('main')
    document.body.append(scope)
    const invalid = componentRoot('observed-invalid')
    const valid = componentRoot('observed-valid')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createApp({ observe: true }).register([Invalid, Valid]).mount(scope)

    scope.append(invalid, valid)
    await flushMutations()

    expect(warn).toHaveBeenCalledWith(
      '[Nemesia] Component "observed-invalid" skipped: missing required ref "required".',
      expect.objectContaining({ component: 'observed-invalid', root: invalid }),
    )
    expect(mounted).toHaveBeenCalledWith(valid)
  })

  it('rechecks every observer-discovered candidate before constructing it', async () => {
    const secondMounted = vi.fn()
    const secondListener = vi.fn()
    const target = new EventTarget()
    let second!: HTMLElement
    class First extends Nemesia.Component('candidate-first') {
      onMount(): void { document.body.append(second) }
    }
    class Second extends Nemesia.Component('candidate-second') {
      onMount(): void {
        secondMounted()
        this.on(target, 'change', secondListener)
      }
    }
    const scope = document.createElement('main')
    document.body.append(scope)
    const app = createApp({ observe: true }).register([First, Second])
    app.mount(scope)
    const wrapper = document.createElement('section')
    const first = componentRoot('candidate-first')
    second = componentRoot('candidate-second')
    wrapper.append(first, second)

    scope.append(wrapper)
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(second.isConnected).toBe(true)
    expect(scope.contains(second)).toBe(false)
    expect(secondMounted).not.toHaveBeenCalled()
    expect(secondListener).not.toHaveBeenCalled()
  })

  it('aborts an observer candidate that detaches itself during construction', async () => {
    const constructed: Element[] = []
    const mounted: Element[] = []
    const destroyed: Element[] = []
    const listened: Element[] = []
    const target = new EventTarget()
    let stale!: HTMLElement
    class SelfDetaching extends Nemesia.Component(
      'observed-self-detaching',
      { multiple: false },
    ) {
      tracked = (() => { constructed.push(this.root) })()
      listening = (() => {
        this.on(target, 'change', () => listened.push(this.root))
      })()
      detached = (() => {
        if (this.root === stale) this.root.remove()
      })()

      onMount(): void { mounted.push(this.root) }
      onDestroy(): void { destroyed.push(this.root) }
    }
    const scope = document.createElement('main')
    document.body.append(scope)
    const app = createApp({ observe: true }).register([SelfDetaching])
    app.mount(scope)
    stale = componentRoot('observed-self-detaching')

    scope.append(stale)
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(constructed).toEqual([stale])
    expect(mounted).toEqual([])
    expect(destroyed).toEqual([])
    expect(listened).toEqual([])

    const replacement = componentRoot('observed-self-detaching')
    scope.append(replacement)
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(constructed).toEqual([stale, replacement])
    expect(mounted).toEqual([replacement])
    expect(destroyed).toEqual([])
    expect(listened).toEqual([replacement])
  })

  it('does nothing automatically when observation is disabled', async () => {
    const mounted = vi.fn()
    class Manual extends Nemesia.Component('manual-only') {
      onMount(): void { mounted() }
    }
    const scope = document.createElement('main')
    document.body.append(scope)
    createApp({ observe: false }).register([Manual]).mount(scope)

    scope.append(componentRoot('manual-only'))
    await flushMutations()

    expect(mounted).not.toHaveBeenCalled()
  })
})

describe('automatic concrete destruction and batching', () => {
  it('destroys a removed root and cleans its listeners', async () => {
    const destroyed = vi.fn()
    const listened = vi.fn()
    const target = new EventTarget()
    class Removed extends Nemesia.Component('removed-root') {
      onMount(): void { this.on(target, 'change', listened) }
      onDestroy(): void { destroyed(this.root) }
    }
    const scope = document.createElement('main')
    const root = componentRoot('removed-root')
    scope.append(root)
    document.body.append(scope)
    createApp({ observe: true }).register([Removed]).mount(scope)

    root.remove()
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(destroyed).toHaveBeenCalledWith(root)
    expect(listened).not.toHaveBeenCalled()
  })

  it('destroys every mounted root in a detached ancestor subtree deepest-first without duplicates', async () => {
    const lifecycle: string[] = []
    class Parent extends Nemesia.Component('removed-parent') {
      onDestroy(): void { lifecycle.push('parent') }
    }
    class Child extends Nemesia.Component('removed-child') {
      onDestroy(): void { lifecycle.push('child') }
    }
    const scope = document.createElement('main')
    const parent = componentRoot('removed-parent')
    const child = componentRoot('removed-child')
    parent.append(child)
    scope.append(parent)
    document.body.append(scope)
    createApp({ observe: true }).register([Parent, Child]).mount(scope)

    child.remove()
    parent.remove()
    parent.append(child)
    await flushMutations()

    expect(lifecycle).toEqual(['child', 'parent'])
  })

  it('destroys historically nested roots extracted across documents before delivery', async () => {
    const destroyed: string[] = []
    const childMounts: Element[] = []
    const listener = vi.fn()
    const target = new EventTarget()
    class HistoricalParent extends Nemesia.Component('historical-parent') {
      onDestroy(): void { destroyed.push('parent') }
    }
    class HistoricalChild extends Nemesia.Component(
      'historical-child',
      { multiple: false },
    ) {
      onMount(): void {
        childMounts.push(this.root)
        this.on(target, 'change', listener)
      }

      onDestroy(): void { destroyed.push('child') }
    }
    const iframe = document.createElement('iframe')
    const scope = document.createElement('main')
    const parent = componentRoot('historical-parent')
    const child = componentRoot('historical-child')
    parent.append(child)
    scope.append(parent)
    document.body.append(scope, iframe)
    const app = createApp({ observe: true }).register([
      HistoricalParent,
      HistoricalChild,
    ])
    app.mount(scope)

    parent.remove()
    const foreignDocument = iframe.contentDocument!
    foreignDocument.adoptNode(child)
    foreignDocument.body.append(child)
    await flushMutations()
    target.dispatchEvent(new Event('change'))
    const replacement = componentRoot('historical-child')
    document.body.append(replacement)
    app.mount(replacement)

    expect(destroyed).toEqual(['child', 'parent'])
    expect(listener).not.toHaveBeenCalled()
    expect(childMounts).toEqual([child, replacement])
  })

  it('preserves removed root identity after it is reparented under another removed node', async () => {
    const destroyed = vi.fn()
    const mounted: Element[] = []
    const listener = vi.fn()
    const target = new EventTarget()
    class ReparentedRemoval extends Nemesia.Component(
      'reparented-removal',
      { multiple: false },
    ) {
      onMount(): void {
        mounted.push(this.root)
        this.on(target, 'change', listener)
      }

      onDestroy(): void { destroyed(this.root) }
    }
    const scope = document.createElement('main')
    const root = componentRoot('reparented-removal')
    scope.append(root)
    document.body.append(scope)
    const app = createApp({ observe: true }).register([ReparentedRemoval])
    app.mount(scope)

    root.remove()
    const wrapper = document.createElement('section')
    wrapper.append(root)
    scope.append(wrapper)
    wrapper.remove()
    document.body.append(wrapper)
    await flushMutations()
    target.dispatchEvent(new Event('change'))
    const replacement = componentRoot('reparented-removal')
    document.body.append(replacement)
    app.mount(replacement)

    expect(destroyed).toHaveBeenCalledOnce()
    expect(destroyed).toHaveBeenCalledWith(root)
    expect(listener).not.toHaveBeenCalled()
    expect(mounted).toEqual([root, replacement])
  })

  it.each(['observer addition', 'explicit mount'] as const)(
    'rebases an already-mounted detached root after %s',
    async insertionMode => {
      const destroyed = vi.fn()
      const mounted: Element[] = []
      const listener = vi.fn()
      const target = new EventTarget()
      class Rebased extends Nemesia.Component(
        'rebased-root',
        { multiple: false },
      ) {
        onMount(): void {
          mounted.push(this.root)
          this.on(target, 'change', listener)
        }

        onDestroy(): void { destroyed(this.root) }
      }
      const scope = document.createElement('main')
      const ancestor = document.createElement('section')
      const root = componentRoot('rebased-root')
      const iframe = document.createElement('iframe')
      scope.append(ancestor)
      document.body.append(scope, iframe)
      const app = createApp({ observe: true }).register([Rebased])
      app.mount(root)

      if (insertionMode === 'observer addition') {
        app.mount(scope)
        ancestor.append(root)
        await flushMutations()
      } else {
        ancestor.append(root)
        app.mount(scope)
      }

      app.disconnect(root)
      ancestor.remove()
      const foreignDocument = iframe.contentDocument!
      foreignDocument.adoptNode(root)
      foreignDocument.body.append(root)
      await flushMutations()
      target.dispatchEvent(new Event('change'))
      const replacement = componentRoot('rebased-root')
      document.body.append(replacement)
      app.mount(replacement)

      expect(destroyed).toHaveBeenCalledOnce()
      expect(destroyed).toHaveBeenCalledWith(root)
      expect(listener).not.toHaveBeenCalled()
      expect(mounted).toEqual([root, replacement])
    },
  )

  it('drains a pending historical removal before explicit-mount rebasing', async () => {
    const lifecycle: string[] = []
    const listener = vi.fn()
    const target = new EventTarget()
    class PendingRebase extends Nemesia.Component('pending-rebase') {
      onMount(): void {
        lifecycle.push('mount')
        this.on(target, 'change', listener)
      }

      onDestroy(): void { lifecycle.push('destroy') }
    }
    const scope = document.createElement('main')
    const parent = document.createElement('section')
    const root = componentRoot('pending-rebase')
    const iframe = document.createElement('iframe')
    parent.append(root)
    scope.append(parent)
    document.body.append(scope, iframe)
    let markDelivered!: () => void
    const delivered = new Promise<void>(resolve => {
      markDelivered = resolve
    })
    const deliverySignal = new MutationObserver(() => markDelivered())
    deliverySignal.observe(scope, { childList: true, subtree: true })
    const app = createApp({ observe: true }).register([PendingRebase])
    app.mount(scope)

    parent.remove()
    const foreignDocument = iframe.contentDocument!
    foreignDocument.adoptNode(root)
    foreignDocument.body.append(root)
    await delivered
    app.mount(root)
    deliverySignal.disconnect()
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(lifecycle).toEqual(['mount', 'destroy', 'mount'])
    expect(listener).toHaveBeenCalledOnce()
  })

  it('processes removals before additions so a moved root is destroyed then remounted once', async () => {
    const lifecycle: string[] = []
    class Moved extends Nemesia.Component('moved-root') {
      onMount(): void { lifecycle.push('mount') }
      onDestroy(): void { lifecycle.push('destroy') }
    }
    const scope = document.createElement('main')
    const root = componentRoot('moved-root')
    scope.append(root)
    document.body.append(scope)
    createApp({ observe: true }).register([Moved]).mount(scope)

    root.remove()
    scope.append(root)
    await flushMutations()

    expect(lifecycle).toEqual(['mount', 'destroy', 'mount'])
  })

  it('coalesces nested observer callbacks when moving a root from inner to outer scope', async () => {
    const lifecycle: string[] = []
    const listener = vi.fn()
    const target = new EventTarget()
    class MovedAcrossScopes extends Nemesia.Component('moved-across-scopes') {
      onMount(): void {
        lifecycle.push('mount')
        this.on(target, 'change', listener)
      }

      onDestroy(): void { lifecycle.push('destroy') }
    }
    const outer = document.createElement('main')
    const inner = document.createElement('section')
    const root = componentRoot('moved-across-scopes')
    inner.append(root)
    outer.append(inner)
    document.body.append(outer)
    const app = createApp({ observe: true }).register([MovedAcrossScopes])
    app.mount(outer)
    app.mount(inner)

    outer.append(root)
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(lifecycle).toEqual(['mount', 'destroy', 'mount'])
    expect(listener).toHaveBeenCalledOnce()
  })

  it('does not mount a node added and removed before callback delivery', async () => {
    const mounted = vi.fn()
    class Transient extends Nemesia.Component('transient-root') {
      onMount(): void { mounted() }
    }
    const scope = document.createElement('main')
    document.body.append(scope)
    createApp({ observe: true }).register([Transient]).mount(scope)
    const root = componentRoot('transient-root')

    scope.append(root)
    root.remove()
    await flushMutations()

    expect(mounted).not.toHaveBeenCalled()
  })

  it('remounts a still-observed exact scope detached from its observed outer scope', async () => {
    const lifecycle: Array<[string, Element]> = []
    const listener = vi.fn()
    const target = new EventTarget()
    const distributedMounts: ParentNode[] = []
    class DetachedConcrete extends Nemesia.Component('detached-observed') {
      onMount(): void {
        lifecycle.push(['mount', this.root])
        this.on(target, 'change', () => listener(this.root))
      }

      onDestroy(): void { lifecycle.push(['destroy', this.root]) }
    }
    class DetachedDistributed extends Nemesia.DistributedComponent(
      'detached-distributed',
    ) {
      onMount(): void { distributedMounts.push(this.scope) }
    }
    const outer = document.createElement('main')
    const inner = document.createElement('section')
    const existing = componentRoot('detached-observed')
    inner.append(existing)
    outer.append(inner)
    document.body.append(outer)
    const app = createApp({ observe: true }).register([
      DetachedConcrete,
      DetachedDistributed,
    ])
    app.mount(outer)
    app.mount(inner)

    inner.remove()
    await flushMutations()
    target.dispatchEvent(new Event('change'))
    expect(lifecycle).toEqual([
      ['mount', existing],
      ['destroy', existing],
      ['mount', existing],
    ])
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(existing)

    listener.mockClear()
    const added = componentRoot('detached-observed')
    inner.append(added)
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(lifecycle.at(-1)).toEqual(['mount', added])
    expect(listener.mock.calls).toEqual([[existing], [added]])
    expect(distributedMounts).toEqual([outer, inner])
  })
})

describe('observer lifecycle', () => {
  it('creates exactly one real observer per exact scope across repeated mounts', () => {
    const NativeMutationObserver = window.MutationObserver
    let constructed = 0
    vi.spyOn(window, 'MutationObserver').mockImplementation((function (
      callback: MutationCallback,
    ): MutationObserver {
      constructed += 1
      return new NativeMutationObserver(callback)
    }) as unknown as (
      this: MutationObserver,
      callback: MutationCallback,
    ) => MutationObserver)
    const scope = document.createElement('main')
    document.body.append(scope)
    const app = createApp({ observe: true })

    app.mount(scope)
    app.mount(scope)

    expect(constructed).toBe(1)
  })

  it('disconnects one exact scope without destroying it and can observe it again after a later mount', async () => {
    const mounted: Element[] = []
    const destroyed: Element[] = []
    class Scoped extends Nemesia.Component('scoped-observer') {
      onMount(): void { mounted.push(this.root) }
      onDestroy(): void { destroyed.push(this.root) }
    }
    const scope = document.createElement('main')
    const otherScope = document.createElement('aside')
    const existing = componentRoot('scoped-observer')
    scope.append(existing)
    document.body.append(scope, otherScope)
    const app = createApp({ observe: true }).register([Scoped])
    app.mount(scope)
    app.mount(otherScope)

    app.disconnect(scope)
    const disconnectedAddition = componentRoot('scoped-observer')
    const activeAddition = componentRoot('scoped-observer')
    scope.append(disconnectedAddition)
    otherScope.append(activeAddition)
    existing.remove()
    await flushMutations()
    expect(mounted).toEqual([existing, activeAddition])
    expect(destroyed).toEqual([])

    app.mount(scope)
    const reobservedAddition = componentRoot('scoped-observer')
    scope.append(reobservedAddition)
    await flushMutations()
    expect(mounted).toEqual([
      existing,
      activeAddition,
      disconnectedAddition,
      reobservedAddition,
    ])
    expect(destroyed).toEqual([])
  })

  it('flushes an enqueued move batch before disconnecting its observed scope', async () => {
    const lifecycle: string[] = []
    const listener = vi.fn()
    const target = new EventTarget()
    class PendingMove extends Nemesia.Component('pending-move') {
      onMount(): void {
        lifecycle.push('mount')
        this.on(target, 'change', listener)
      }

      onDestroy(): void { lifecycle.push('destroy') }
    }
    const scope = document.createElement('main')
    const destination = document.createElement('section')
    const root = componentRoot('pending-move')
    scope.append(root, destination)
    document.body.append(scope)
    let markDelivered!: () => void
    const delivered = new Promise<void>(resolve => {
      markDelivered = resolve
    })
    const deliverySignal = new MutationObserver(() => markDelivered())
    deliverySignal.observe(scope, { childList: true, subtree: true })
    const app = createApp({ observe: true }).register([PendingMove])
    app.mount(scope)

    destination.append(root)
    await delivered
    app.disconnect(scope)
    deliverySignal.disconnect()
    await flushMutations()
    target.dispatchEvent(new Event('change'))

    expect(lifecycle).toEqual(['mount', 'destroy', 'mount'])
    expect(listener).toHaveBeenCalledOnce()
  })

  it('disconnects every scope without destroying instances', async () => {
    const lifecycle: string[] = []
    class Global extends Nemesia.Component('global-observer') {
      onMount(): void { lifecycle.push('mount') }
      onDestroy(): void { lifecycle.push('destroy') }
    }
    const firstScope = document.createElement('main')
    const secondScope = document.createElement('aside')
    firstScope.append(componentRoot('global-observer'))
    secondScope.append(componentRoot('global-observer'))
    document.body.append(firstScope, secondScope)
    const app = createApp({ observe: true }).register([Global])
    app.mount(firstScope)
    app.mount(secondScope)

    app.disconnect()
    firstScope.replaceChildren(componentRoot('global-observer'))
    secondScope.replaceChildren(componentRoot('global-observer'))
    await flushMutations()

    expect(lifecycle).toEqual(['mount', 'mount'])
  })

  it('keeps an observed scope active after explicit destroy', async () => {
    const lifecycle: string[] = []
    class Persistent extends Nemesia.Component('persistent-observer') {
      onMount(): void { lifecycle.push('mount') }
      onDestroy(): void { lifecycle.push('destroy') }
    }
    const scope = document.createElement('main')
    scope.append(componentRoot('persistent-observer'))
    document.body.append(scope)
    const app = createApp({ observe: true }).register([Persistent])
    app.mount(scope)

    app.destroy(scope)
    scope.append(componentRoot('persistent-observer'))
    await flushMutations()

    expect(lifecycle).toEqual(['mount', 'destroy', 'mount'])
  })
})

describe('distributed observer boundary', () => {
  it('never creates distributed instances for additions or destroys the exact-scope record for removals', async () => {
    const distributedMounts: ParentNode[] = []
    const distributedDestroys: ParentNode[] = []
    const concrete = vi.fn()
    class Distributed extends Nemesia.DistributedComponent('observer-distributed') {
      onMount(): void { distributedMounts.push(this.scope) }
      onDestroy(): void { distributedDestroys.push(this.scope) }
    }
    class Concrete extends Nemesia.Component('observer-concrete') {
      onMount(): void { concrete(this.root) }
    }
    const scope = document.createElement('main')
    document.body.append(scope)
    const app = createApp({ observe: true }).register([Distributed, Concrete])
    app.mount(scope)

    const wrapper = document.createElement('section')
    const root = componentRoot('observer-concrete')
    wrapper.append(root)
    scope.append(wrapper)
    app.mount(wrapper)
    await flushMutations()
    wrapper.remove()
    await flushMutations()

    expect(concrete).toHaveBeenCalledTimes(2)
    expect(concrete).toHaveBeenNthCalledWith(1, root)
    expect(concrete).toHaveBeenNthCalledWith(2, root)
    expect(distributedMounts).toEqual([scope, wrapper])
    expect(distributedDestroys).toEqual([])
    app.destroy(wrapper)
    expect(distributedDestroys).toEqual([wrapper])
    app.destroy(scope)
    expect(distributedDestroys).toEqual([wrapper, scope])
  })
})
