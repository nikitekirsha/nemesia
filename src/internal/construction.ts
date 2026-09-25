import type { ComponentCore } from '../component/component-core.js'
import type { NemesiaApp } from '../component/types.js'

type ConstructingComponent = ComponentCore

export interface ComponentConstructionCapture {
	readonly expectedConstructor: Function
	readonly expectedTarget: ParentNode
	readonly app: NemesiaApp
	instance: ConstructingComponent | undefined
}

const captures: ComponentConstructionCapture[] = []

export function beginComponentConstruction(
	expectedConstructor: Function,
	expectedTarget: ParentNode,
	app: NemesiaApp
): ComponentConstructionCapture {
	const capture: ComponentConstructionCapture = {
		expectedConstructor,
		expectedTarget,
		app,
		instance: undefined
	}
	captures.push(capture)
	return capture
}

export function captureConstructingComponent(
	actualConstructor: Function,
	actualTarget: ParentNode,
	instance: ConstructingComponent
): NemesiaApp | undefined {
	for (let index = captures.length - 1; index >= 0; index -= 1) {
		const capture = captures[index]
		if (capture === undefined) continue
		if (
			capture.instance === undefined &&
			capture.expectedConstructor === actualConstructor &&
			capture.expectedTarget === actualTarget
		) {
			capture.instance = instance
			return capture.app
		}
	}
	return undefined
}

export function endComponentConstruction(capture: ComponentConstructionCapture): void {
	const index = captures.lastIndexOf(capture)
	if (index !== -1) captures.splice(index, 1)
}
