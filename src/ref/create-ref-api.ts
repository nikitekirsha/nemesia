import type { DiagnosticPayload } from '../internal/diagnostics.js'
import { SkipComponentMountError } from '../internal/errors.js'
import type { RefApi } from './types.js'

interface ExpectedType<TElement extends Element> {
	readonly name: string
	readonly accepts: (element: Element) => boolean
}

interface ResolveOptions<TElement extends Element> {
	readonly required: boolean
	readonly many: boolean
	readonly expected: ExpectedType<TElement> | undefined
}

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

const htmlElementType: ExpectedType<HTMLElement> = {
	name: 'HTMLElement',
	accepts: element => element.namespaceURI === HTML_NAMESPACE
}

const buttonType: ExpectedType<HTMLButtonElement> = {
	name: 'HTMLButtonElement',
	accepts: element => element.namespaceURI === HTML_NAMESPACE && element.localName === 'button'
}

const inputType: ExpectedType<HTMLInputElement> = {
	name: 'HTMLInputElement',
	accepts: element => element.namespaceURI === HTML_NAMESPACE && element.localName === 'input'
}

const textareaType: ExpectedType<HTMLTextAreaElement> = {
	name: 'HTMLTextAreaElement',
	accepts: element => element.namespaceURI === HTML_NAMESPACE && element.localName === 'textarea'
}

const selectType: ExpectedType<HTMLSelectElement> = {
	name: 'HTMLSelectElement',
	accepts: element => element.namespaceURI === HTML_NAMESPACE && element.localName === 'select'
}

const formType: ExpectedType<HTMLFormElement> = {
	name: 'HTMLFormElement',
	accepts: element => element.namespaceURI === HTML_NAMESPACE && element.localName === 'form'
}

function receivedType(element: Element): string {
	return `<${element.localName}> in namespace "${element.namespaceURI ?? 'null'}"`
}

export function createRefApi(root: HTMLElement, componentName: string): RefApi {
	const diagnosticPayload = (name: string, details: DiagnosticPayload = {}): DiagnosticPayload => ({
		component: componentName,
		root,
		ref: name,
		selector: `[data-ref="${name}"]`,
		...details
	})

	const discover = (name: string): Element[] =>
		Array.from(root.querySelectorAll('[data-ref]')).filter(
			element => element.getAttribute('data-ref') === name && element.closest('[data-nemesia]') === root
		)

	const fail = (reason: string, name: string, details?: DiagnosticPayload): never => {
		throw new SkipComponentMountError(reason, diagnosticPayload(name, details))
	}

	function resolve<TElement extends Element>(
		name: string,
		options: ResolveOptions<TElement> & { readonly many: true }
	): TElement[]
	function resolve<TElement extends Element>(
		name: string,
		options: ResolveOptions<TElement> & {
			readonly many: false
			readonly required: true
		}
	): TElement
	function resolve<TElement extends Element>(
		name: string,
		options: ResolveOptions<TElement> & { readonly many: false }
	): TElement | null
	function resolve<TElement extends Element>(
		name: string,
		options: ResolveOptions<TElement>
	): TElement | TElement[] | null {
		const elements = discover(name)

		if (elements.length === 0) {
			if (options.required) {
				return fail(`missing required ref "${name}"`, name)
			}

			return options.many ? [] : null
		}

		if (!options.many && elements.length > 1) {
			return fail(`duplicate ref "${name}": expected one element, received ${elements.length}`, name, {
				expected: 'one element',
				received: elements.length
			})
		}

		const expected = options.expected
		const invalid = expected ? elements.find(element => !expected.accepts(element)) : undefined

		if (invalid && expected) {
			const received = receivedType(invalid)
			return fail(`invalid ref "${name}": expected ${expected.name}, received ${received}`, name, {
				expected: expected.name,
				received
			})
		}

		return options.many ? (elements as TElement[]) : (elements[0] as TElement)
	}

	const requiredOne = <TElement extends Element>(name: string, expected?: ExpectedType<TElement>): TElement =>
		resolve(name, { required: true, many: false, expected })

	const optionalOne = <TElement extends Element>(name: string, expected?: ExpectedType<TElement>): TElement | null =>
		resolve(name, { required: false, many: false, expected })

	const requiredMany = <TElement extends Element>(name: string, expected?: ExpectedType<TElement>): TElement[] =>
		resolve(name, { required: true, many: true, expected })

	const optionalMany = <TElement extends Element>(name: string, expected?: ExpectedType<TElement>): TElement[] =>
		resolve(name, { required: false, many: true, expected })

	const optionalManyApi = {
		of: <TElement extends Element = HTMLElement>(name: string): TElement[] => optionalMany<TElement>(name),
		element: (name: string) => optionalMany(name, htmlElementType),
		button: (name: string) => optionalMany(name, buttonType),
		input: (name: string) => optionalMany(name, inputType),
		textarea: (name: string) => optionalMany(name, textareaType),
		select: (name: string) => optionalMany(name, selectType),
		form: (name: string) => optionalMany(name, formType)
	}

	return {
		one: <TElement extends Element = HTMLElement>(name: string): TElement => requiredOne<TElement>(name),
		element: (name: string) => requiredOne(name, htmlElementType),
		button: (name: string) => requiredOne(name, buttonType),
		input: (name: string) => requiredOne(name, inputType),
		textarea: (name: string) => requiredOne(name, textareaType),
		select: (name: string) => requiredOne(name, selectType),
		form: (name: string) => requiredOne(name, formType),
		optional: {
			one: <TElement extends Element = HTMLElement>(name: string): TElement | null => optionalOne<TElement>(name),
			element: (name: string) => optionalOne(name, htmlElementType),
			button: (name: string) => optionalOne(name, buttonType),
			input: (name: string) => optionalOne(name, inputType),
			textarea: (name: string) => optionalOne(name, textareaType),
			select: (name: string) => optionalOne(name, selectType),
			form: (name: string) => optionalOne(name, formType),
			many: optionalManyApi
		},
		many: {
			of: <TElement extends Element = HTMLElement>(name: string): TElement[] => requiredMany<TElement>(name),
			element: (name: string) => requiredMany(name, htmlElementType),
			button: (name: string) => requiredMany(name, buttonType),
			input: (name: string) => requiredMany(name, inputType),
			textarea: (name: string) => requiredMany(name, textareaType),
			select: (name: string) => requiredMany(name, selectType),
			form: (name: string) => requiredMany(name, formType)
		}
	}
}
