import { ComponentRegistry } from '../registry/component-registry'
import { InstanceRegistry } from '../registry/instance-registry'
import { createDomObserver } from './observer'
import { createOrchestrator } from './orchestrator'
import type { AnyComponentDefinition, Application, CreateApplicationOptions } from '../types/entities'

export function createApplicationRuntime(options: CreateApplicationOptions = {}): Application {
  const components = new ComponentRegistry()
  const instances = new InstanceRegistry()
  const orchestrator = createOrchestrator(components, instances)
  const observer = createDomObserver(Boolean(options.observeDomChanges), orchestrator.reconcile, orchestrator.destroy)

  const ensureObserver = () => {
    observer.start(document)
  }

  return {
    register(component: AnyComponentDefinition) {
      components.register(component)

      return this
    },
    mount(root?: ParentNode) {
      ensureObserver()
      orchestrator.mount(root)
    },
    reconcile(root?: ParentNode) {
      ensureObserver()
      orchestrator.reconcile(root)
    },
    refresh(element: Element) {
      orchestrator.refresh(element)
    },
    recreate(element: Element) {
      orchestrator.recreate(element)
    },
    destroy(root?: ParentNode) {
      orchestrator.destroy(root)

      if (!root || root instanceof Document) {
        observer.stop()
      }
    },
    getInstance(element: Element) {
      return instances.get(element)
    }
  }
}
