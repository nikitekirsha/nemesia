import type { DiagnosticPayload } from '../internal/diagnostics.js'
import { attributeSelector, isHtmlElement } from '../internal/dom.js'
import { SkipComponentMountError } from '../internal/errors.js'
import type { RefApi } from './types.js'

interface ExpectedType<TElement extends Element> {
	readonly name: string
	readonly accepts: (element: Element) => boolean
}

const htmlElementType: ExpectedType<HTMLElement> = {
	name: 'HTMLElement',
	accepts: isHtmlElement
}

const tagType = <TElement extends HTMLElement>(name: string, localName: string): ExpectedType<TElement> => ({
	name,
	accepts: element => isHtmlElement(element) && element.localName === localName
})

const buttonType = tagType<HTMLButtonElement>('HTMLButtonElement', 'button')
const inputType = tagType<HTMLInputElement>('HTMLInputElement', 'input')
const textareaType = tagType<HTMLTextAreaElement>('HTMLTextAreaElement', 'textarea')
const selectType = tagType<HTMLSelectElement>('HTMLSelectElement', 'select')
const formType = tagType<HTMLFormElement>('HTMLFormElement', 'form')

function receivedType(element: Element): string {
	return `<${element.localName}> in namespace "${element.namespaceURI ?? 'null'}"`
}

class RefResolver {
	readonly #root: HTMLElement
	readonly #componentName: string

	public constructor(root: HTMLElement, componentName: string) {
		this.#root = root
		this.#componentName = componentName
	}

	public resolve(
		name: string,
		required: boolean,
		many: boolean,
		expected?: ExpectedType<Element>
	): Element[] | Element | null {
		const elements = this.#discover(name)

		if (elements.length === 0) {
			if (required) {
				return this.#fail(`missing required ref "${name}"`, name)
			}

			return many ? [] : null
		}

		if (!many && elements.length > 1) {
			return this.#fail(`duplicate ref "${name}": expected one element, received ${elements.length}`, name, {
				expected: 'one element',
				received: elements.length
			})
		}

		const invalid = expected ? elements.find(element => !expected.accepts(element)) : undefined

		if (invalid && expected) {
			const received = receivedType(invalid)
			return this.#fail(`invalid ref "${name}": expected ${expected.name}, received ${received}`, name, {
				expected: expected.name,
				received
			})
		}

		return many ? elements : (elements[0] as Element)
	}

	#discover(name: string): Element[] {
		const elements: Element[] = []
		for (const element of this.#root.querySelectorAll(refSelector(name))) {
			if (element.getAttribute('data-ref') === name && owner(element) === this.#root) elements.push(element)
		}
		return elements
	}

	#fail(reason: string, name: string, details: DiagnosticPayload = {}): never {
		throw new SkipComponentMountError(reason, {
			component: this.#componentName,
			root: this.#root,
			ref: name,
			selector: `[data-ref="${name}"]`,
			...details
		})
	}
}

// Ref names repeat across instances, so their selectors are built once.
const refSelectors = new Map<string, string>()

function refSelector(name: string): string {
	let selector = refSelectors.get(name)
	if (selector === undefined) {
		selector = attributeSelector('data-ref', name)
		refSelectors.set(name, selector)
	}
	return selector
}

// A ref on a nested component root belongs to the component above it.
function owner(element: Element): Element | null {
	return (element.hasAttribute('data-nemesia') ? element.parentElement : element)?.closest('[data-nemesia]') ?? null
}

// One lookup family, such as `ref`, `ref.optional`, `ref.many`, or `ref.optional.many`.
class RefQuery {
	readonly #resolver: RefResolver
	readonly #required: boolean
	readonly #many: boolean

	public constructor(resolver: RefResolver, required: boolean, many: boolean) {
		this.#resolver = resolver
		this.#required = required
		this.#many = many
	}

	public one(name: string): unknown {
		return this.#resolve(name)
	}

	public of(name: string): unknown {
		return this.#resolve(name)
	}

	public element(name: string): unknown {
		return this.#resolve(name, htmlElementType)
	}

	public button(name: string): unknown {
		return this.#resolve(name, buttonType)
	}

	public input(name: string): unknown {
		return this.#resolve(name, inputType)
	}

	public textarea(name: string): unknown {
		return this.#resolve(name, textareaType)
	}

	public select(name: string): unknown {
		return this.#resolve(name, selectType)
	}

	public form(name: string): unknown {
		return this.#resolve(name, formType)
	}

	#resolve(name: string, expected?: ExpectedType<Element>): unknown {
		return this.#resolver.resolve(name, this.#required, this.#many, expected)
	}
}

class OptionalRefQuery extends RefQuery {
	public readonly many: RefQuery

	public constructor(resolver: RefResolver) {
		super(resolver, false, false)
		this.many = new RefQuery(resolver, false, true)
	}
}

class RootRefQuery extends RefQuery {
	public readonly optional: OptionalRefQuery
	public readonly many: RefQuery

	public constructor(resolver: RefResolver) {
		super(resolver, true, false)
		this.optional = new OptionalRefQuery(resolver)
		this.many = new RefQuery(resolver, true, true)
	}
}

export function createRefApi(root: HTMLElement, componentName: string): RefApi {
	return new RootRefQuery(new RefResolver(root, componentName)) as unknown as RefApi
}
