import { ComponentCore } from './component-core.js'

/** Base class for distributed components created with `DistributedComponent(...)`. */
export abstract class BaseDistributedComponent extends ComponentCore {
	/** Scope passed to `app.mount(scope)` for this distributed instance. */
	public readonly scope: ParentNode

	/** Creates a distributed component instance for a mounted scope. */
	public constructor(scope: ParentNode) {
		super(scope, { scope })
		this.scope = scope
	}
}
