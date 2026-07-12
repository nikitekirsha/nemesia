import {
  Component,
  DistributedComponent,
} from './component/factories.js'
import { createApp } from './app/create-app.js'

export { BaseComponent } from './component/base-component.js'
export { BaseDistributedComponent } from './component/base-distributed-component.js'
export { createApp } from './app/create-app.js'
export type {
  ComponentConstructor,
  ConcreteComponentOptions,
  CreateAppOptions,
  DistributedComponentOptions,
  NemesiaApp,
} from './component/types.js'
export type {
  BooleanOptionOptions,
  DefaultOptionOptions,
  JsonOptionOptions,
  NumberOptionOptions,
  OptionParser,
  OptionValidator,
  StringOptionOptions,
} from './option/types.js'

/** Global namespace shape exposed by the UMD build and by the `Nemesia` ESM export. */
export interface NemesiaNamespace {
  /** Creates an app that owns component registrations, mounted instances, and observers. */
  readonly createApp: typeof createApp

  /** Creates an abstract base class for a concrete component matched by `data-nemesia`. */
  readonly Component: typeof Component

  /** Creates an abstract base class for a distributed component mounted once per scope. */
  readonly DistributedComponent: typeof DistributedComponent
}

/** Namespace-style API: `Nemesia.Component(...)`, `Nemesia.DistributedComponent(...)`, `Nemesia.createApp(...)`. */
export const Nemesia: NemesiaNamespace = {
  createApp,
  Component,
  DistributedComponent,
}
