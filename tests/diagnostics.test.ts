import { describe, expect, it, vi } from 'vitest'

import { Nemesia, createApp } from '../src/index.js'

function root(component: string, tag = 'div'): HTMLElement {
	const element = document.createElement(tag)
	element.dataset.nemesia = component
	document.body.append(element)
	return element
}

function ref(rootElement: HTMLElement, name: string, tag: string): HTMLElement {
	const element = document.createElement(tag)
	element.dataset.ref = name
	rootElement.append(element)
	return element
}

describe('exact warnings', () => {
	it('warns on duplicate registration and keeps the latest constructor', () => {
		const mounted: string[] = []
		class Original extends Nemesia.Component('duplicate') {
			onMount(): void {
				mounted.push('original')
			}
		}
		class Latest extends Nemesia.Component('duplicate') {
			onMount(): void {
				mounted.push('latest')
			}
		}
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([Original, Latest]).mount(root('duplicate'))

		expect(warn).toHaveBeenCalledOnce()
		expect(warn).toHaveBeenCalledWith(
			'[Nemesia] Component "duplicate" was registered more than once. The latest registration was used.',
			{ component: 'duplicate' }
		)
		expect(mounted).toEqual(['latest'])
	})

	it('reports missing, duplicate, and wrong-helper refs with exact context', () => {
		class Missing extends Nemesia.Component('missing-ref') {
			value = this.ref.button('submit')
		}
		class Duplicate extends Nemesia.Component('duplicate-ref') {
			value = this.ref.button('action')
		}
		class WrongHelper extends Nemesia.Component('wrong-helper') {
			value = this.ref.button('submit')
		}
		const missing = root('missing-ref')
		const duplicate = root('duplicate-ref')
		ref(duplicate, 'action', 'button')
		ref(duplicate, 'action', 'button')
		const wrong = root('wrong-helper')
		ref(wrong, 'submit', 'input')
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([Missing, Duplicate, WrongHelper]).mount(document.body)

		expect(warn).toHaveBeenCalledTimes(3)
		expect(warn).toHaveBeenNthCalledWith(
			1,
			'[Nemesia] Component "missing-ref" skipped: missing required ref "submit".',
			{
				component: 'missing-ref',
				root: missing,
				ref: 'submit',
				selector: '[data-ref="submit"]'
			}
		)
		expect(warn).toHaveBeenNthCalledWith(
			2,
			'[Nemesia] Component "duplicate-ref" skipped: duplicate ref "action": expected one element, received 2.',
			{
				component: 'duplicate-ref',
				root: duplicate,
				ref: 'action',
				selector: '[data-ref="action"]',
				expected: 'one element',
				received: 2
			}
		)
		expect(warn).toHaveBeenNthCalledWith(
			3,
			'[Nemesia] Component "wrong-helper" skipped: invalid ref "submit": expected HTMLButtonElement, received <input> in namespace "http://www.w3.org/1999/xhtml".',
			{
				component: 'wrong-helper',
				root: wrong,
				ref: 'submit',
				selector: '[data-ref="submit"]',
				expected: 'HTMLButtonElement',
				received: '<input> in namespace "http://www.w3.org/1999/xhtml"'
			}
		)
	})

	it('reports missing and invalid options with exact attribute details', () => {
		class Required extends Nemesia.Component('required-option') {
			value = this.option.number('duration')
		}
		class Invalid extends Nemesia.Component('invalid-option') {
			value = this.option.number('duration')
		}
		const required = root('required-option')
		const invalid = root('invalid-option')
		invalid.setAttribute('data-option-duration', 'three hundred')
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([Required, Invalid]).mount(document.body)

		expect(warn).toHaveBeenCalledTimes(2)
		expect(warn).toHaveBeenNthCalledWith(
			1,
			'[Nemesia] Component "required-option" skipped: missing required option "duration".',
			{
				component: 'required-option',
				root: required,
				option: 'duration',
				attribute: 'data-option-duration',
				expected: 'number',
				received: undefined
			}
		)
		expect(warn).toHaveBeenNthCalledWith(
			2,
			'[Nemesia] Component "invalid-option" skipped: invalid option "duration".',
			{
				component: 'invalid-option',
				root: invalid,
				option: 'duration',
				attribute: 'data-option-duration',
				expected: 'number',
				received: 'three hundred'
			}
		)
	})

	it('reports invalid root tags and singleton duplicates with the skipped root', () => {
		class FormOnly extends Nemesia.Component('form-only', { root: 'form' }) {}
		class Singleton extends Nemesia.Component('singleton', {
			multiple: false
		}) {}
		const invalid = root('form-only')
		root('singleton')
		const duplicate = root('singleton')
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		createApp().register([FormOnly, Singleton]).mount(document.body)

		expect(warn).toHaveBeenCalledTimes(2)
		expect(warn).toHaveBeenNthCalledWith(1, '[Nemesia] Component "form-only" skipped: expected an HTML <form> root.', {
			component: 'form-only',
			root: invalid,
			expected: 'form',
			received: 'div'
		})
		expect(warn).toHaveBeenNthCalledWith(
			2,
			'[Nemesia] Component "singleton" skipped: only one instance may be mounted.',
			{ component: 'singleton', root: duplicate }
		)
	})

	it('merges user warning payloads after concrete and distributed context without changing lifecycle state', () => {
		const replacementRoot = document.createElement('aside')
		const replacementScope = document.createDocumentFragment()
		const mounted = vi.fn()
		const destroyed = vi.fn()
		class Concrete extends Nemesia.Component('user-concrete') {
			onMount(): void {
				this.warn('plain warning', { detail: 1 })
				this.warn('merged warning', {
					component: 'payload-component',
					root: replacementRoot
				})
				mounted()
			}

			onDestroy(): void {
				destroyed()
			}
		}
		class Distributed extends Nemesia.DistributedComponent('user-distributed') {
			onMount(): void {
				this.warn('distributed warning', { detail: 2 })
				this.warn('distributed merge', {
					component: 'payload-distributed',
					scope: replacementScope
				})
				mounted()
			}

			onDestroy(): void {
				destroyed()
			}
		}
		const concreteRoot = root('user-concrete')
		const scope = document.createDocumentFragment()
		scope.append(concreteRoot)
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = createApp().register([Concrete, Distributed])

		app.mount(scope)
		app.mount(scope)

		expect(warn).toHaveBeenNthCalledWith(1, '[Nemesia] Component "user-distributed": distributed warning', {
			component: 'user-distributed',
			scope,
			detail: 2
		})
		expect(warn).toHaveBeenNthCalledWith(2, '[Nemesia] Component "user-distributed": distributed merge', {
			component: 'payload-distributed',
			scope: replacementScope
		})
		expect(warn).toHaveBeenNthCalledWith(3, '[Nemesia] Component "user-concrete": plain warning', {
			component: 'user-concrete',
			root: concreteRoot,
			detail: 1
		})
		expect(warn).toHaveBeenNthCalledWith(4, '[Nemesia] Component "user-concrete": merged warning', {
			component: 'payload-component',
			root: replacementRoot
		})
		expect(mounted).toHaveBeenCalledTimes(2)
		expect(destroyed).not.toHaveBeenCalled()

		app.destroy(scope)
		expect(destroyed).toHaveBeenCalledTimes(2)
	})
})

describe('exact unexpected error diagnostics', () => {
	it('uses console.error for concrete construction, onMount, and onDestroy failures', () => {
		const constructionError = new Error('construction failed')
		const mountError = new Error('mount failed')
		const destroyError = new Error('destroy failed')
		class Construction extends Nemesia.Component('construction-error') {
			failure = (() => {
				throw constructionError
			})()
		}
		class Mount extends Nemesia.Component('mount-error') {
			onMount(): void {
				throw mountError
			}
		}
		class Destroy extends Nemesia.Component('destroy-error') {
			onDestroy(): void {
				throw destroyError
			}
		}
		const constructionRoot = root('construction-error')
		const mountRoot = root('mount-error')
		const destroyRoot = root('destroy-error')
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([Construction, Mount, Destroy])

		app.mount(document.body)
		app.destroy(document.body)

		expect(error).toHaveBeenCalledTimes(3)
		expect(error).toHaveBeenNthCalledWith(1, '[Nemesia] Component "construction-error" failed during construction.', {
			component: 'construction-error',
			root: constructionRoot,
			error: constructionError
		})
		expect(error).toHaveBeenNthCalledWith(2, '[Nemesia] Component "mount-error" failed during onMount.', {
			component: 'mount-error',
			root: mountRoot,
			error: mountError
		})
		expect(error).toHaveBeenNthCalledWith(3, '[Nemesia] Component "destroy-error" failed during onDestroy.', {
			component: 'destroy-error',
			root: destroyRoot,
			error: destroyError
		})
	})

	it('includes the exact distributed scope and original errors', () => {
		const constructionError = new Error('distributed construction failed')
		const mountError = new Error('distributed mount failed')
		const destroyError = new Error('distributed destroy failed')
		class Construction extends Nemesia.DistributedComponent('distributed-construction') {
			failure = (() => {
				throw constructionError
			})()
		}
		class Mount extends Nemesia.DistributedComponent('distributed-mount') {
			onMount(): void {
				throw mountError
			}
		}
		class Destroy extends Nemesia.DistributedComponent('distributed-destroy') {
			onDestroy(): void {
				throw destroyError
			}
		}
		const scope = document.createDocumentFragment()
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const app = createApp().register([Construction, Mount, Destroy])

		app.mount(scope)
		app.destroy(scope)

		expect(error).toHaveBeenCalledTimes(3)
		expect(error).toHaveBeenNthCalledWith(
			1,
			'[Nemesia] Component "distributed-construction" failed during construction.',
			{
				component: 'distributed-construction',
				scope,
				error: constructionError
			}
		)
		expect(error).toHaveBeenNthCalledWith(2, '[Nemesia] Component "distributed-mount" failed during onMount.', {
			component: 'distributed-mount',
			scope,
			error: mountError
		})
		expect(error).toHaveBeenNthCalledWith(3, '[Nemesia] Component "distributed-destroy" failed during onDestroy.', {
			component: 'distributed-destroy',
			scope,
			error: destroyError
		})
	})

	it('keeps warning and error diagnostics observational when console methods throw', () => {
		const mounted: string[] = []
		const constructionError = new Error('broken field')
		class Original extends Nemesia.Component('observational-duplicate') {
			onMount(): void {
				mounted.push('original')
			}
		}
		class Latest extends Nemesia.Component('observational-duplicate') {
			onMount(): void {
				mounted.push('latest')
			}
		}
		class Broken extends Nemesia.Component('observational-broken') {
			failure = (() => {
				throw constructionError
			})()
		}
		class Good extends Nemesia.Component('observational-good') {
			onMount(): void {
				mounted.push('good')
			}
		}
		vi.spyOn(console, 'warn').mockImplementation(() => {
			throw new Error('warning sink failed')
		})
		vi.spyOn(console, 'error').mockImplementation(() => {
			throw new Error('error sink failed')
		})
		root('observational-duplicate')
		root('observational-broken')
		root('observational-good')

		expect(() => createApp().register([Original, Latest, Broken, Good]).mount(document.body)).not.toThrow()
		expect(mounted).toEqual(['latest', 'good'])
	})
})
