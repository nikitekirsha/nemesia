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
  private readonly items = new Map<Element, InternalComponentInstance>()

  set(instance: InternalComponentInstance): void {
    this.items.set(instance.element, instance)
  }

  get(element: Element): InternalComponentInstance | undefined {
    return this.items.get(element)
  }

  has(element: Element): boolean {
    return this.items.has(element)
  }

  delete(element: Element): void {
    this.items.delete(element)
  }

  list(): InternalComponentInstance[] {
    return Array.from(this.items.values())
  }

  listInScope(scope: ParentNode): InternalComponentInstance[] {
    return this.list().filter((instance) => isScoped(scope, instance.element))
  }
}
