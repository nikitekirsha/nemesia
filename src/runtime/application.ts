import { ComponentRegistry } from '../registry/component-registry'
import { InstanceRegistry } from '../registry/instance-registry'
import { createDomObserver } from './observer'
import { createOrchestrator } from './orchestrator'
import type { AnyComponentDefinition, Application, CreateApplicationOptions } from '../types/entities'

function assertComponentName(componentName: string): void {
  if (typeof componentName !== 'string' || componentName.trim() === '') {
    throw new Error('[Nemesia] componentName is required')
  }
}

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
    refresh(element: Element, componentName: string) {
      assertComponentName(componentName)
      orchestrator.refresh(element, componentName)
    },
    recreate(element: Element, componentName: string) {
      assertComponentName(componentName)
      orchestrator.recreate(element, componentName)
    },
    destroy(root?: ParentNode) {
      orchestrator.destroy(root)

      if (!root || root instanceof Document) {
        observer.stop()
      }
    },
    getInstance(element: Element, componentName: string) {
      assertComponentName(componentName)

      return instances.get(element, componentName)
    }
  }
}
