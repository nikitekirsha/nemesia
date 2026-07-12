import type { BaseComponent } from './base-component.js'
import type { BaseDistributedComponent } from './base-distributed-component.js'

/** Options used when creating a Nemesia app. */
export interface CreateAppOptions {
  /** Watch mounted scopes for later DOM additions and removals. */
  observe?: boolean
}

/** Options for a concrete component created with `Nemesia.Component(...)`. */
export interface ConcreteComponentOptions<
  TTag extends keyof HTMLElementTagNameMap = keyof HTMLElementTagNameMap,
> {
  /** Expected root tag name, used for a narrower `this.root` type. */
  root?: TTag

  /** Allow multiple active instances of this component name in one app. */
  multiple?: boolean
}

/** Reserved options object for distributed components. */
export type DistributedComponentOptions = Record<string, never>

/** Runtime metadata attached to every concrete component constructor. */
export interface ConcreteMetadata {
  /** Metadata kind for concrete components. */
  readonly kind: 'concrete'

  /** Component name matched against `data-nemesia`. */
  readonly name: string

  /** Expected root tag name, when declared. */
  readonly root: keyof HTMLElementTagNameMap | undefined

  /** Whether the app may keep more than one active instance of this component. */
  readonly multiple: boolean
}

/** Runtime metadata attached to every distributed component constructor. */
export interface DistributedMetadata {
  /** Metadata kind for distributed components. */
  readonly kind: 'distributed'

  /** Component name used for registration and diagnostics. */
  readonly name: string
}

/** Metadata attached to any Nemesia component constructor. */
export type ComponentMetadata = ConcreteMetadata | DistributedMetadata

/** Root element type inferred from a declared root tag name. */
export type RootFor<
  TTag extends keyof HTMLElementTagNameMap | undefined,
> = TTag extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[TTag]
  : HTMLElement

/** Constructor type for a concrete component instance. */
export type ConcreteComponentConstructor<
  TRoot extends HTMLElement = HTMLElement,
> = (new (root: TRoot) => BaseComponent<TRoot>) & {
  /** Runtime metadata used by the app. */
  readonly nemesia: ConcreteMetadata
}

/** Constructor type for a distributed component instance. */
export type DistributedComponentConstructor = (new (
  scope: ParentNode,
) => BaseDistributedComponent) & {
  /** Runtime metadata used by the app. */
  readonly nemesia: DistributedMetadata
}

type RegistrableConcreteComponentConstructor = (new (
  root: never,
) => BaseComponent<HTMLElement>) & {
  readonly nemesia: ConcreteMetadata
}

/** Any component constructor that can be registered in an app. */
export type ComponentConstructor =
  | RegistrableConcreteComponentConstructor
  | DistributedComponentConstructor

/** Abstract base constructor returned by `Nemesia.Component(...)`. */
export type AbstractConcreteComponentConstructor<
  TRoot extends HTMLElement = HTMLElement,
> = (abstract new (root: TRoot) => BaseComponent<TRoot>) & {
  /** Runtime metadata inherited by subclasses. */
  readonly nemesia: ConcreteMetadata
}

/** Abstract base constructor returned by `Nemesia.DistributedComponent(...)`. */
export type AbstractDistributedComponentConstructor = (abstract new (
  scope: ParentNode,
) => BaseDistributedComponent) & {
  /** Runtime metadata inherited by subclasses. */
  readonly nemesia: DistributedMetadata
}

/** A Nemesia application instance that owns registrations, mounted instances, and observers. */
export interface NemesiaApp {
  /** Normalized app options. */
  readonly options: Readonly<Required<CreateAppOptions>>

  /** Registers component constructors for future mounts. */
  register(components: ComponentConstructor[]): this

  /** Mounts registered components inside a scope. Defaults to `document.body` when available. */
  mount(scope?: ParentNode): void

  /** Destroys mounted component instances inside a scope. Defaults to `document.body` when available. */
  destroy(scope?: ParentNode): void

  /** Stops observers for one scope, or all observers when no scope is passed. */
  disconnect(scope?: ParentNode): void
}
