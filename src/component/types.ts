import type { BaseComponent } from './base-component.js'
import type { BaseDistributedComponent } from './base-distributed-component.js'

export interface CreateAppOptions {
  observe?: boolean
}

export interface ConcreteComponentOptions<
  TTag extends keyof HTMLElementTagNameMap = keyof HTMLElementTagNameMap,
> {
  root?: TTag
  multiple?: boolean
}

export type DistributedComponentOptions = Record<string, never>

export interface ConcreteMetadata {
  readonly kind: 'concrete'
  readonly name: string
  readonly root: keyof HTMLElementTagNameMap | undefined
  readonly multiple: boolean
}

export interface DistributedMetadata {
  readonly kind: 'distributed'
  readonly name: string
}

export type ComponentMetadata = ConcreteMetadata | DistributedMetadata

export type RootFor<
  TTag extends keyof HTMLElementTagNameMap | undefined,
> = TTag extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[TTag]
  : HTMLElement

export type ConcreteComponentConstructor<
  TRoot extends HTMLElement = HTMLElement,
> = (new (root: TRoot) => BaseComponent<TRoot>) & {
  readonly nemesia: ConcreteMetadata
}

export type DistributedComponentConstructor = (new (
  scope: ParentNode,
) => BaseDistributedComponent) & {
  readonly nemesia: DistributedMetadata
}

type RegistrableConcreteComponentConstructor = (new (
  root: never,
) => BaseComponent<HTMLElement>) & {
  readonly nemesia: ConcreteMetadata
}

export type ComponentConstructor =
  | RegistrableConcreteComponentConstructor
  | DistributedComponentConstructor

export type AbstractConcreteComponentConstructor<
  TRoot extends HTMLElement = HTMLElement,
> = (abstract new (root: TRoot) => BaseComponent<TRoot>) & {
  readonly nemesia: ConcreteMetadata
}

export type AbstractDistributedComponentConstructor = (abstract new (
  scope: ParentNode,
) => BaseDistributedComponent) & {
  readonly nemesia: DistributedMetadata
}

export interface NemesiaApp {
  readonly options: Readonly<Required<CreateAppOptions>>
  register(components: ComponentConstructor[]): this
  mount(scope?: ParentNode): void
  destroy(scope?: ParentNode): void
  disconnect(scope?: ParentNode): void
}
