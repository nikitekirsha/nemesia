import { bindEvent } from '../events/binder'
import { resolveOptions } from '../resolver/options'
import { resolveRefs } from '../resolver/refs'
import { createStateStore } from '../state/store'
import { runDisposers, runHooks } from './hooks'
import { reportWarning } from '../runtime/errors'

import type {
  AnyComponentDefinition,
  ComponentContext,
  ComputedContext,
  ComputedMap,
  InternalComponentInstance,
  MethodsMap,
  StateMap
} from '../types/entities'

export function instantiateComponent(component: AnyComponentDefinition, element: Element): InternalComponentInstance | null {
  const refsResult = resolveRefs(component.name, element, component.schema.refs)

  if (!refsResult.ok || !refsResult.value) {
    return null
  }

  const optionsResult = resolveOptions(component.name, element, component.schema.options ?? {})

  if (!optionsResult.ok || !optionsResult.value) {
    return null
  }

  const initialState: StateMap = createInitialState(component)
  const store = createStateStore(initialState)

  const computedCtx: ComputedContext<Record<string, unknown>, Record<string, unknown>, StateMap> = {
    element,
    refs: refsResult.value,
    options: optionsResult.value,
    state: store.state
  }

  let computed: ComputedMap = {}

  if (component.computed) {
    try {
      computed = (component.computed(computedCtx as never) ?? {}) as ComputedMap
    } catch (e) {
      reportWarning(component.name, 'computed factory failed', e)
      store.teardown()

      return null
    }
  }

  const mountHooks: Array<() => void> = []
  const refreshHooks: Array<() => void> = []
  const unmountHooks: Array<() => void> = []
  const disposers: Array<() => void> = []

  const on: ComponentContext<Record<string, unknown>, Record<string, unknown>, StateMap, MethodsMap>['on'] = (
    target: EventTarget,
    event: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions | boolean
  ) => {
    const dispose = bindEvent(target, event, handler, options)
    disposers.push(dispose)

    return dispose
  }

  const ctx: ComponentContext<Record<string, unknown>, Record<string, unknown>, StateMap, MethodsMap, ComputedMap> = {
    element,
    refs: refsResult.value,
    options: optionsResult.value,
    state: store.state,
    computed,
    methods: {},
    setState(patch) {
      store.setState(patch)
    },
    on,
    watch(keys, handler, config) {
      const unwatch = store.watch(keys as Array<string> | string, handler, config)
      disposers.push(unwatch)

      return unwatch
    },
    onMount(handler) {
      mountHooks.push(handler)
    },
    onRefresh(handler) {
      refreshHooks.push(handler)
    },
    onUnmount(handler) {
      unmountHooks.push(handler)
    },
    cleanup(dispose) {
      disposers.push(dispose)
    }
  }

  if (component.methods) {
    try {
      ctx.methods = component.methods(ctx as never) as MethodsMap
    } catch (e) {
      reportWarning(component.name, 'methods factory failed', e)
      store.teardown()

      return null
    }
  }

  if (component.setup) {
    try {
      component.setup(ctx as never)
    } catch (e) {
      reportWarning(component.name, 'setup failed', e)
      runDisposers(component.name, disposers)
      store.teardown()

      return null
    }
  }

  runHooks(component.name, 'mount', mountHooks)

  let active = true

  const instance: InternalComponentInstance = {
    component,
    element,
    ctx,
    refresh() {
      if (!active) {
        return
      }

      runHooks(component.name, 'refresh', refreshHooks)
    },
    unmount() {
      if (!active) {
        return
      }

      active = false
      runHooks(component.name, 'unmount', unmountHooks)
      runDisposers(component.name, disposers)
      store.teardown()
    }
  }

  return instance
}

function createInitialState(component: AnyComponentDefinition): StateMap {
  if (!component.state) {
    return {}
  }

  try {
    return component.state()
  } catch (e) {
    reportWarning(component.name, 'state factory failed', e)
    return {}
  }
}
