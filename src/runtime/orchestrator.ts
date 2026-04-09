import { instantiateComponent } from '../lifecycle/instantiate'
import type { AnyComponentDefinition } from '../types/entities'
import { ComponentRegistry } from '../registry/component-registry'
import { InstanceRegistry } from '../registry/instance-registry'

function asScope(root?: ParentNode): ParentNode {
  return root ?? document
}

function listCandidates(root: ParentNode, selector: string): Element[] {
  if (root instanceof Document) {
    return Array.from(root.querySelectorAll(selector))
  }

  if (root instanceof Element) {
    const matches = Array.from(root.querySelectorAll(selector))

    if (root.matches(selector)) {
      matches.unshift(root)
    }

    return matches
  }

  return Array.from(root.querySelectorAll(selector))
}

function mountOne(component: AnyComponentDefinition, element: Element, instances: InstanceRegistry): void {
  if (instances.has(element, component.name)) {
    return
  }

  const instance = instantiateComponent(component, element)

  if (!instance) {
    return
  }

  instances.set(instance)
}

function refreshOne(element: Element, componentName: string, instances: InstanceRegistry): void {
  const instance = instances.get(element, componentName)

  if (!instance) {
    return
  }

  instance.refresh()
}

export interface Orchestrator {
  mount(root?: ParentNode): void
  reconcile(root?: ParentNode): void
  refresh(element: Element, componentName: string): void
  recreate(element: Element, componentName: string): void
  destroy(root?: ParentNode): void
}

export function createOrchestrator(componentRegistry: ComponentRegistry, instanceRegistry: InstanceRegistry): Orchestrator {
  return {
    mount(root) {
      const scope = asScope(root)

      for (const component of componentRegistry.list()) {
        const selector = component.schema.refs.root.selector

        for (const candidate of listCandidates(scope, selector)) {
          mountOne(component, candidate, instanceRegistry)
        }
      }
    },
    reconcile(root) {
      const scope = asScope(root)

      for (const component of componentRegistry.list()) {
        const selector = component.schema.refs.root.selector

        for (const candidate of listCandidates(scope, selector)) {
          const existing = instanceRegistry.get(candidate, component.name)

          if (!existing) {
            mountOne(component, candidate, instanceRegistry)

            continue
          }

          existing.refresh()
        }
      }
    },
    refresh(element, componentName) {
      refreshOne(element, componentName, instanceRegistry)
    },
    recreate(element, componentName) {
      const current = instanceRegistry.get(element, componentName)

      if (!current) {
        return
      }

      current.unmount()
      instanceRegistry.delete(element, componentName)

      const replacement = instantiateComponent(current.component, element)

      if (replacement) {
        instanceRegistry.set(replacement)
      }
    },
    destroy(root) {
      const scope = asScope(root)

      for (const instance of instanceRegistry.listInScope(scope)) {
        instance.unmount()
        instanceRegistry.delete(instance.element, instance.component.name)
      }
    }
  }
}
