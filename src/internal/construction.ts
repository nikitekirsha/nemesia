import type { BaseComponent } from '../component/base-component.js'
import type { BaseDistributedComponent } from '../component/base-distributed-component.js'

type ConstructingComponent = BaseComponent | BaseDistributedComponent

export interface ComponentConstructionCapture {
	readonly expectedConstructor: Function
	readonly expectedTarget: ParentNode
	instance: ConstructingComponent | undefined
}

const captures: ComponentConstructionCapture[] = []

export function beginComponentConstruction(
	expectedConstructor: Function,
	expectedTarget: ParentNode
): ComponentConstructionCapture {
	const capture: ComponentConstructionCapture = {
		expectedConstructor,
		expectedTarget,
		instance: undefined
	}
	captures.push(capture)
	return capture
}

export function captureConstructingComponent(
	actualConstructor: Function,
	actualTarget: ParentNode,
	instance: ConstructingComponent
): void {
	for (let index = captures.length - 1; index >= 0; index -= 1) {
		const capture = captures[index]
		if (capture === undefined) continue
		if (
			capture.instance === undefined &&
			capture.expectedConstructor === actualConstructor &&
			capture.expectedTarget === actualTarget
		) {
			capture.instance = instance
			return
		}
	}
}

export function endComponentConstruction(capture: ComponentConstructionCapture): void {
	const index = captures.lastIndexOf(capture)
	if (index !== -1) captures.splice(index, 1)
}
