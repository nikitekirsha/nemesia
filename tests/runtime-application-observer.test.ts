import { createApplication, defineComponent, getOption, getRef } from '../index'
import { ComponentRegistry } from '../src/registry/component-registry'
import { InstanceRegistry } from '../src/registry/instance-registry'
import { createDomObserver } from '../src/runtime/observer'
import { createOrchestrator } from '../src/runtime/orchestrator'

function createDemoComponent(name = 'demo', selector = '[data-demo]') {
  return defineComponent({
    name,
    schema: {
      refs: {
        root: getRef(selector, 'section')
      },
      options: {
        endpoint: getOption('data-endpoint', { optional: true })
      }
    },
    state: () => ({ mounted: 0, refreshed: 0, unmounted: 0 }),
    setup(ctx) {
      ctx.onMount(() => {
        ctx.state.mounted += 1
      })
      ctx.onRefresh(() => {
        ctx.state.refreshed += 1
      })
      ctx.onUnmount(() => {
        ctx.state.unmounted += 1
      })
    }
  })
}

describe('component and instance registries', () => {
  it('handles register/get/list and duplicate component registration', () => {
    const components = new ComponentRegistry()
    const component = createDemoComponent('x')

    components.register(component)
    expect(components.list()).toEqual([component])
    expect(() => components.register(component)).toThrow('already registered')
  })

  it('scopes instances by document, element and fragment', () => {
    const instances = new InstanceRegistry()
    const component = createDemoComponent('scope')
    const root = document.createElement('div')
    const section = document.createElement('section')
    root.append(section)

    const instance = {
      component,
      element: section,
      ctx: {} as never,
      refresh: vi.fn(),
      unmount: vi.fn()
    }

    instances.set(instance)

    expect(instances.has(section, component.name)).toBe(true)
    expect(instances.has(section, 'missing')).toBe(false)
    expect(instances.get(section, component.name)).toBe(instance)
    expect(instances.listInScope(document)).toEqual([instance])
    expect(instances.listInScope(root)).toEqual([instance])

    const fragment = document.createDocumentFragment()

    fragment.append(root)
    expect(instances.listInScope(fragment)).toEqual([instance])
    instances.delete(document.createElement('aside'), component.name)
    instances.delete(section, component.name)
    expect(instances.list()).toEqual([])
  })
})

describe('orchestrator + application', () => {
  it('mounts, reconciles, refreshes, recreates and destroys instances', () => {
    document.body.innerHTML = '<section data-demo data-endpoint="/a"></section>'
    const component = createDemoComponent()

    const app = createApplication()
    app.register(component)
    app.mount(document)

    const root = document.querySelector('[data-demo]') as Element
    const first = app.getInstance(root, component.name)
    expect(first).toBeDefined()
    expect((first?.ctx.state as any).mounted).toBe(1)

    app.mount(document)
    expect((app.getInstance(root, component.name)?.ctx.state as any).mounted).toBe(1)

    app.reconcile(document)
    expect((app.getInstance(root, component.name)?.ctx.state as any).refreshed).toBe(1)

    app.refresh(root, component.name)
    expect((app.getInstance(root, component.name)?.ctx.state as any).refreshed).toBe(2)

    app.recreate(root, component.name)
    const recreated = app.getInstance(root, component.name)
    expect(recreated).toBeDefined()
    expect(recreated).not.toBe(first)
    expect((recreated?.ctx.state as any).mounted).toBe(1)

    app.destroy(root)
    expect(app.getInstance(root, component.name)).toBeUndefined()

    app.refresh(root, component.name)
    app.recreate(root, component.name)

    app.mount(document)
    app.destroy()
  })

  it('supports two different components on one element without collisions', () => {
    document.body.innerHTML = '<section data-shared data-endpoint="/shared"></section>'
    const componentA = createDemoComponent('component-a', '[data-shared]')
    const componentB = createDemoComponent('component-b', '[data-shared]')

    const app = createApplication()
    app.register(componentA).register(componentB)
    app.mount(document)

    const root = document.querySelector('[data-shared]') as Element
    const firstA = app.getInstance(root, componentA.name)
    const firstB = app.getInstance(root, componentB.name)
    expect(firstA).toBeDefined()
    expect(firstB).toBeDefined()
    expect(firstA).not.toBe(firstB)
    expect((firstA?.ctx.state as any).mounted).toBe(1)
    expect((firstB?.ctx.state as any).mounted).toBe(1)

    app.mount(document)
    expect((app.getInstance(root, componentA.name)?.ctx.state as any).mounted).toBe(1)
    expect((app.getInstance(root, componentB.name)?.ctx.state as any).mounted).toBe(1)

    app.reconcile(document)
    expect((app.getInstance(root, componentA.name)?.ctx.state as any).refreshed).toBe(1)
    expect((app.getInstance(root, componentB.name)?.ctx.state as any).refreshed).toBe(1)

    app.refresh(root, componentA.name)
    expect((app.getInstance(root, componentA.name)?.ctx.state as any).refreshed).toBe(2)
    expect((app.getInstance(root, componentB.name)?.ctx.state as any).refreshed).toBe(1)

    app.recreate(root, componentB.name)
    const recreatedA = app.getInstance(root, componentA.name)
    const recreatedB = app.getInstance(root, componentB.name)
    expect(recreatedA).toBe(firstA)
    expect(recreatedB).toBeDefined()
    expect(recreatedB).not.toBe(firstB)
    expect((recreatedB?.ctx.state as any).mounted).toBe(1)

    app.destroy(root)
    expect(app.getInstance(root, componentA.name)).toBeUndefined()
    expect(app.getInstance(root, componentB.name)).toBeUndefined()
  })

  it('throws when componentName is missing or blank in element-targeted API', () => {
    const app = createApplication()
    const element = document.createElement('div')

    expect(() => (app.getInstance as any)(element)).toThrow('componentName is required')
    expect(() => app.getInstance(element, '')).toThrow('componentName is required')
    expect(() => app.getInstance(element, '   ')).toThrow('componentName is required')

    expect(() => (app.refresh as any)(element)).toThrow('componentName is required')
    expect(() => app.refresh(element, '')).toThrow('componentName is required')
    expect(() => app.refresh(element, '   ')).toThrow('componentName is required')

    expect(() => (app.recreate as any)(element)).toThrow('componentName is required')
    expect(() => app.recreate(element, '')).toThrow('componentName is required')
    expect(() => app.recreate(element, '   ')).toThrow('componentName is required')
  })

  it('isolates failures and keeps healthy components running', () => {
    document.body.innerHTML = `
      <section data-bad data-endpoint="/a"></section>
      <section data-good data-endpoint="/b"></section>
    `

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const bad = defineComponent({
      name: 'bad',
      schema: {
        refs: { root: getRef('[data-bad]', 'section') },
        options: { endpoint: getOption('data-endpoint') }
      },
      setup() {
        throw new Error('boom')
      }
    })

    const good = defineComponent({
      name: 'good',
      schema: {
        refs: { root: getRef('[data-good]', 'section') },
        options: { endpoint: getOption('data-endpoint') }
      },
      state: () => ({ mounted: 0 }),
      setup(ctx) {
        ctx.onMount(() => {
          ctx.state.mounted += 1
        })
      }
    })

    const app = createApplication()
    app.register(bad).register(good)
    app.mount(document)

    const goodElement = document.querySelector('[data-good]') as Element
    expect(app.getInstance(goodElement, good.name)).toBeDefined()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('supports element/fragment scope in orchestrator listCandidates', () => {
    document.body.innerHTML = '<section data-demo data-endpoint="/a"></section>'
    const component = createDemoComponent()
    const components = new ComponentRegistry()
    const instances = new InstanceRegistry()

    components.register(component)
    const orchestrator = createOrchestrator(components, instances)

    const elementScope = document.querySelector('[data-demo]') as Element
    orchestrator.mount(elementScope)
    expect(instances.get(elementScope, component.name)).toBeDefined()

    instances.delete(elementScope, component.name)
    orchestrator.mount()
    expect(instances.get(elementScope, component.name)).toBeDefined()

    const fragment = document.createDocumentFragment()
    const clone = elementScope.cloneNode(true) as Element
    fragment.append(clone)
    orchestrator.reconcile(fragment)
    expect(instances.get(clone, component.name)).toBeDefined()
  })
})

describe('dom observer', () => {
  it('reconciles added nodes and destroys removed nodes when enabled', async () => {
    const reconcile = vi.fn()
    const destroy = vi.fn()

    const observer = createDomObserver(true, reconcile, destroy)
    const host = document.createElement('div')
    document.body.append(host)

    observer.start(host)
    observer.start(host)

    const added = document.createElement('section')
    host.append(added)
    host.removeChild(added)

    const fragment = document.createDocumentFragment()
    fragment.append(document.createElement('p'))
    host.append(fragment)

    host.append(document.createTextNode('skip'))
    host.removeChild(host.lastChild as ChildNode)

    await Promise.resolve()

    expect(reconcile).toHaveBeenCalled()
    expect(destroy).toHaveBeenCalled()

    observer.stop()
    observer.stop()
  })

  it('does nothing when observer is disabled', () => {
    const reconcile = vi.fn()
    const destroy = vi.fn()

    const observer = createDomObserver(false, reconcile, destroy)
    observer.start(document)

    const node = document.createElement('div')
    document.body.append(node)

    expect(reconcile).not.toHaveBeenCalled()
    expect(destroy).not.toHaveBeenCalled()
  })
})
