import { resolveComponentName } from '../internal/diagnostics.js'
import { createOptionApi } from '../option/create-option-api.js'
import type { OptionApi } from '../option/types.js'
import { createRefApi } from '../ref/create-ref-api.js'
import type { RefApi } from '../ref/types.js'
import { ComponentCore } from './component-core.js'

/** Base class for concrete components created with `Component(...)`. */
export abstract class BaseComponent<TRoot extends HTMLElement = HTMLElement> extends ComponentCore {
	/** Root element matched by `data-nemesia`. */
	public readonly root: TRoot

	/** Ref lookup API scoped to this component root. */
	public readonly ref: RefApi

	/** Option lookup and parsing API scoped to this component root. */
	public readonly option: OptionApi

	/** Creates a component instance for a matched root element. */
	public constructor(root: TRoot) {
		super(root, { root })
		const componentName = resolveComponentName(this)
		this.root = root
		this.ref = createRefApi(root, componentName)
		this.option = createOptionApi(root, componentName)
	}
}
