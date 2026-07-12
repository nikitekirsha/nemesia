import { afterEach, vi } from 'vitest'

afterEach(() => {
	document.body.replaceChildren()
	vi.restoreAllMocks()
})
