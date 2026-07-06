import { BaseComponent } from './base-component.js'
import { BaseDistributedComponent } from './base-distributed-component.js'
import type {
  AbstractConcreteComponentConstructor,
  AbstractDistributedComponentConstructor,
  ConcreteComponentOptions,
  DistributedComponentOptions,
  RootFor,
} from './types.js'

export function Component<TTag extends keyof HTMLElementTagNameMap>(
  name: string,
  options: ConcreteComponentOptions<TTag> & { root: TTag },
): AbstractConcreteComponentConstructor<RootFor<TTag>>
export function Component(
  name: string,
  options?: ConcreteComponentOptions,
): AbstractConcreteComponentConstructor<HTMLElement>
export function Component(
  name: string,
  options: ConcreteComponentOptions = {},
): AbstractConcreteComponentConstructor<HTMLElement> {
  abstract class ConcreteComponentBase extends BaseComponent {
    public static readonly nemesia = {
      kind: 'concrete',
      name,
      root: options.root,
      multiple: options.multiple ?? true,
    } as const
  }

  return ConcreteComponentBase
}

export function DistributedComponent(
  name: string,
  _options: DistributedComponentOptions = {},
): AbstractDistributedComponentConstructor {
  abstract class DistributedComponentBase extends BaseDistributedComponent {
    public static readonly nemesia = {
      kind: 'distributed',
      name,
    } as const
  }

  return DistributedComponentBase
}
