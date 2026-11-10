import { BaseComponent } from './base-component.js'
import { BaseDistributedComponent } from './base-distributed-component.js'
import type {
	AbstractConcreteComponentConstructor,
	AbstractDistributedComponentConstructor,
	ConcreteComponentOptions,
	LazyComponent,
	RootFor
} from './types.js'

/** Creates an abstract base class for a concrete component with a typed root element. */
export function Component<TTag extends keyof HTMLElementTagNameMap>(
	name: string,
	options: ConcreteComponentOptions<TTag> & { root: TTag }
): AbstractConcreteComponentConstructor<RootFor<TTag>>
/** Creates an abstract base class for a concrete component matched by `data-nemesia`. */
export function Component(
	name: string,
	options?: ConcreteComponentOptions
): AbstractConcreteComponentConstructor<HTMLElement>
export function Component(
	name: string,
	options: ConcreteComponentOptions = {}
): AbstractConcreteComponentConstructor<HTMLElement> {
	abstract class ConcreteComponentBase extends BaseComponent {
		public static readonly nemesia = {
			kind: 'concrete',
			name,
			root: options.root,
			multiple: options.multiple ?? true
		} as const
	}

	return ConcreteComponentBase
}

/** Creates an abstract base class for a distributed component mounted once per scope. */
export function DistributedComponent(name: string): AbstractDistributedComponentConstructor {
	abstract class DistributedComponentBase extends BaseDistributedComponent {
		public static readonly nemesia = {
			kind: 'distributed',
			name
		} as const
	}

	return DistributedComponentBase
}

/**
 * Describes a concrete component whose module is loaded the first time its root appears in a mounted scope.
 * `load` resolves to the component class or to the module that exports it.
 */
export function lazy(name: string, load: () => Promise<unknown>): LazyComponent {
	return { nemesia: { kind: 'lazy', name }, load }
}
