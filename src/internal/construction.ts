import type { ComponentCore } from '../component/component-core.js'
import type { ComponentMetadata, NemesiaApp } from '../component/types.js'

// One entry for every component that is being constructed right now. The base constructor reads it to learn
// which app is constructing it; the app reads it to see what is under construction when a constructor calls back.
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
