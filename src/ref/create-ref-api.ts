import { attributeSelector, isHtmlElement } from '../internal/dom.js'
import { SkipComponentMountError } from '../internal/errors.js'
import type { RefApi } from './types.js'

// Ref names repeat across instances, so their selectors are built once.
const refSelectors = new Map<string, string>()

// One lookup family: `ref`, `ref.optional`, `ref.many`, or `ref.optional.many`.
class RefQuery {
	readonly #root: HTMLElement
	readonly #component: string
	readonly #required: boolean
	readonly #many: boolean

	public constructor(root: HTMLElement, component: string, required: boolean, many: boolean) {
		this.#root = root
		this.#component = component
		this.#required = required
		this.#many = many
	}

	public get optional(): RefQuery {
		return new RefQuery(this.#root, this.#component, false, this.#many)
	}

	public get many(): RefQuery {
		return new RefQuery(this.#root, this.#component, this.#required, true)
	}

	public one(name: string): unknown {
		return this.#resolve(name)
	}

	public of(name: string): unknown {
		return this.#resolve(name)
	}

	public element(name: string): unknown {
		return this.#resolve(name, 'HTMLElement', '')
	}

	public tag(tag: string, name: string): unknown {
		return this.#resolve(name, `<${tag}>`, tag)
	}

	public button(name: string): unknown {
		return this.#resolve(name, 'HTMLButtonElement', 'button')
	}

	public input(name: string): unknown {
		return this.#resolve(name, 'HTMLInputElement', 'input')
	}

	public textarea(name: string): unknown {
		return this.#resolve(name, 'HTMLTextAreaElement', 'textarea')
	}

	public select(name: string): unknown {
		return this.#resolve(name, 'HTMLSelectElement', 'select')
	}

	public form(name: string): unknown {
		return this.#resolve(name, 'HTMLFormElement', 'form')
	}

	// `expected` names what a mismatch is reported as. `tag` is the required tag, or '' for any HTML element.
	#resolve(name: string, expected?: string, tag?: string): unknown {
		const root = this.#root
		let selector = refSelectors.get(name)
		if (selector === undefined) refSelectors.set(name, (selector = attributeSelector('data-ref', name)))

		// A ref belongs to the nearest root above it; one placed on a nested root belongs to the component above that root.
		const elements = [...root.querySelectorAll(selector)].filter(
			element =>
				(element.hasAttribute('data-nemesia') ? (element.parentElement as Element) : element).closest(
					'[data-nemesia]'
				) === root
		)
		const count = elements.length

		if (count === 0) {
			if (this.#required) this.#fail(name, `missing required ref "${name}"`)
			return this.#many ? elements : null
		}

		if (!this.#many && count > 1) {
			this.#fail(name, `duplicate ref "${name}": expected one element, received ${count}`, {
				expected: 'one element',
				received: count
			})
		}

		if (expected !== undefined) {
			const invalid = elements.find(element => !isHtmlElement(element) || (tag !== '' && element.localName !== tag))

			if (invalid !== undefined) {
				const received = `<${invalid.localName}> in namespace "${invalid.namespaceURI ?? 'null'}"`
				this.#fail(name, `invalid ref "${name}": expected ${expected}, received ${received}`, { expected, received })
			}
		}

		return this.#many ? elements : elements[0]
	}

	#fail(name: string, reason: string, details?: Record<string, unknown>): never {
		throw new SkipComponentMountError(reason, {
			component: this.#component,
			root: this.#root,
			ref: name,
			selector: `[data-ref="${name}"]`,
			...details
		})
	}
}

export function createRefApi(root: HTMLElement, componentName: string): RefApi {
	return new RefQuery(root, componentName, true, false) as unknown as RefApi
}
