import type { InternalComponentInstance } from '../types/entities'

function isScoped(scope: ParentNode, element: Element): boolean {
  if (scope instanceof Document) {
    return true
  }

  if (scope instanceof Element) {
    return scope === element || scope.contains(element)
  }

  return scope.contains(element)
}

export class InstanceRegistry {
  private readonly items = new Map<Element, Map<string, InternalComponentInstance>>()

  set(instance: InternalComponentInstance): void {
    const componentName = instance.component.name
    const byComponent = this.items.get(instance.element)

    if (!byComponent) {
      this.items.set(instance.element, new Map([[componentName, instance]]))

      return
    }

    byComponent.set(componentName, instance)
  }

  get(element: Element, componentName: string): InternalComponentInstance | undefined {
    return this.items.get(element)?.get(componentName)
  }

  has(element: Element, componentName: string): boolean {
    return this.items.get(element)?.has(componentName) ?? false
  }

  delete(element: Element, componentName: string): void {
    const byComponent = this.items.get(element)

    if (!byComponent) {
      return
    }

    byComponent.delete(componentName)

    if (byComponent.size === 0) {
      this.items.delete(element)
    }
  }

  list(): InternalComponentInstance[] {
    return Array.from(this.items.values()).flatMap((byComponent) => Array.from(byComponent.values()))
  }

  listInScope(scope: ParentNode): InternalComponentInstance[] {
    return this.list().filter((instance) => isScoped(scope, instance.element))
  }
}
