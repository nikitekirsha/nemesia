import type { ComponentCore } from '../component/component-core.js'
import type { ComponentMetadata, NemesiaApp } from '../component/types.js'

// Components under construction. The base constructor finds its app here
export interface Construction {
	readonly type: Function & { readonly nemesia: ComponentMetadata }
	readonly target: ParentNode
	readonly app: NemesiaApp
	instance?: ComponentCore
}

export const constructions: Construction[] = []

export function captureConstructingComponent(
	type: Function,
	target: ParentNode,
	instance: ComponentCore
): NemesiaApp | undefined {
	const construction = constructions.findLast(
		candidate => candidate.instance === undefined && candidate.type === type && candidate.target === target
	)
	if (construction !== undefined) construction.instance = instance

	return construction?.app
}
