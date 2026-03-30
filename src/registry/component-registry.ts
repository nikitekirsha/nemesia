import type { AnyComponentDefinition } from '../types/entities'

export class ComponentRegistry {
  private readonly items = new Map<string, AnyComponentDefinition>()

  register(component: AnyComponentDefinition): void {
    if (this.items.has(component.name)) {
      throw new Error(`[Nemesia] component "${component.name}" is already registered`)
    }

    this.items.set(component.name, component)
  }

  list(): AnyComponentDefinition[] {
    return Array.from(this.items.values())
  }
}
