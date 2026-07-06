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

export interface NemesiaNamespace {
  readonly createApp: typeof createApp
  readonly Component: typeof Component
  readonly DistributedComponent: typeof DistributedComponent
}

export const Nemesia: NemesiaNamespace = {
  createApp,
  Component,
  DistributedComponent,
}
