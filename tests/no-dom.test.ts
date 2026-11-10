// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { Component, DistributedComponent, createApp } from '../src/index.js'

describe('an app without a DOM', () => {
	it('has no document to work with', () => {
		expect(typeof document).toBe('undefined')
	})

	it('mounts, destroys, and disconnects nothing without throwing or warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		class Card extends Component('no-dom-card') {}
		class Delegation extends DistributedComponent('no-dom-delegation') {}
		const app = createApp({ observe: true }).register([Card, Delegation])

		expect(() => {
			app.mount()
			app.destroy()
			app.disconnect()
		}).not.toThrow()
		expect(warn).not.toHaveBeenCalled()
	})

	it('finds nothing by default', () => {
		class Card extends Component('no-dom-found') {}
		class Delegation extends DistributedComponent('no-dom-found-delegation') {}
		const app = createApp().register([Card, Delegation])

		expect(app.find(Card)).toBeNull()
		expect(app.findAll(Card)).toEqual([])
		expect(app.findAll(Delegation)).toEqual([])
	})
})
