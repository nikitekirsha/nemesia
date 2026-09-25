import { afterEach, expect, vi } from 'vitest'

// DOM nodes are compared by identity; structural equality would hide wrong order or wrong elements.
const isNode = (value: unknown): value is Node =>
	typeof value === 'object' && value !== null && typeof (value as Node).nodeType === 'number'

expect.addEqualityTesters([
	(left: unknown, right: unknown) => (isNode(left) && isNode(right) ? left === right : undefined)
])

afterEach(() => {
	document.body.replaceChildren()
	vi.restoreAllMocks()
})
