import { SkipComponentMountError } from '../internal/errors.js'
import type {
	BooleanOptionOptions,
	DefaultOptionOptions,
	JsonOptionOptions,
	NumberOptionOptions,
	OptionApi,
	OptionLiteral,
	OptionParser,
	OptionValidator,
	StringOptionOptions
} from './types.js'

type ParseResult<T> = { readonly valid: true; readonly value: T } | { readonly valid: false }

type ParseOption<T> = (raw: string) => ParseResult<T>

const valid = <T>(value: T): ParseResult<T> => ({ valid: true, value })

const invalid = <T>(): ParseResult<T> => ({ valid: false })

const hasDefault = <T>(options: { default?: T } | undefined): options is { default: T } =>
	options !== undefined && 'default' in options

const optionAttribute = (name: string): string =>
	`data-option-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`

const parseNumber = (raw: string): number => (raw.trim() === '' ? Number.NaN : Number(raw))

const parseBoolean = (raw: string): ParseResult<boolean> => {
	if (raw === '' || raw === 'true' || raw === '1') {
		return valid(true)
	}

	if (raw === 'false' || raw === '0') {
		return valid(false)
	}

	return invalid()
}

// One lookup family: `option` (required) or `option.optional`.
class OptionReader {
	readonly #root: HTMLElement
	readonly #componentName: string
	readonly #required: boolean

	public constructor(root: HTMLElement, componentName: string, required: boolean) {
		this.#root = root
		this.#componentName = componentName
		this.#required = required
	}

	public string(name: string, options?: StringOptionOptions): string | undefined {
		return this.#resolve(
			name,
			'string',
			raw => {
				if (options?.minLength !== undefined && raw.length < options.minLength) {
					return invalid()
				}

				if (options?.maxLength !== undefined && raw.length > options.maxLength) {
					return invalid()
				}

				if (options?.pattern !== undefined) {
					const lastIndex = options.pattern.lastIndex
					let matches: boolean

					try {
						options.pattern.lastIndex = 0
						matches = options.pattern.test(raw)
					} finally {
						options.pattern.lastIndex = lastIndex
					}

					if (!matches) {
						return invalid()
					}
				}

				return valid(raw)
			},
			options
		)
	}

	public number(name: string, options?: NumberOptionOptions): number | undefined {
		return this.#resolve(
			name,
			'number',
			raw => {
				const value = parseNumber(raw)

				if (Number.isNaN(value)) {
					return invalid()
				}

				if (options?.min !== undefined && value < options.min) {
					return invalid()
				}

				if (options?.max !== undefined && value > options.max) {
					return invalid()
				}

				return valid(value)
			},
			options
		)
	}

	public boolean(name: string, options?: BooleanOptionOptions): boolean | undefined {
		return this.#resolve(name, 'boolean', parseBoolean, options)
	}

	public json<T>(name: string, options?: JsonOptionOptions<T>): T | undefined {
		return this.#resolve(
			name,
			'valid JSON',
			raw => {
				const value: unknown = JSON.parse(raw)

				if (options?.validate !== undefined && !options.validate(value)) {
					return invalid()
				}

				return valid(value as T)
			},
			options
		)
	}

	public enum<T extends readonly string[]>(
		name: string,
		values: T,
		options?: DefaultOptionOptions<T[number]>
	): T[number] | undefined {
		return this.#resolve(
			name,
			`one of ${values.map(value => JSON.stringify(value)).join(', ')}`,
			raw => (values.includes(raw) ? valid(raw as T[number]) : invalid()),
			options
		)
	}

	public literal<T extends OptionLiteral>(
		name: string,
		literalValue: T,
		options?: DefaultOptionOptions<T>
	): T | undefined {
		return this.#resolve(
			name,
			`literal ${JSON.stringify(literalValue)}`,
			raw => {
				let parsed: string | number | boolean

				if (typeof literalValue === 'string') {
					parsed = raw
				} else if (typeof literalValue === 'number') {
					parsed = parseNumber(raw)

					if (Number.isNaN(parsed)) {
						return invalid()
					}
				} else {
					const booleanResult = parseBoolean(raw)

					if (!booleanResult.valid) {
						return invalid()
					}

					parsed = booleanResult.value
				}

				return parsed === literalValue ? valid(literalValue) : invalid()
			},
			options
		)
	}

	public custom<T>(
		name: string,
		parser: OptionParser<T>,
		validator?: OptionValidator<T>,
		options?: DefaultOptionOptions<T>
	): T | undefined {
		return this.#resolve(
			name,
			'valid custom value',
			raw => {
				const value = parser(raw)

				if (validator !== undefined && !validator(value)) {
					return invalid()
				}

				return valid(value)
			},
			options
		)
	}

	#resolve<T>(name: string, expected: string, parser: ParseOption<T>, options?: { default?: T }): T | undefined {
		const attribute = optionAttribute(name)

		if (!this.#root.hasAttribute(attribute)) {
			if (this.#required) {
				return this.#fail(`missing required option "${name}"`, name, attribute, expected, undefined)
			}

			return hasDefault(options) ? options.default : undefined
		}

		const raw = this.#root.getAttribute(attribute) ?? ''
		let result: ParseResult<T>

		try {
			result = parser(raw)
		} catch {
			return this.#fail(`invalid option "${name}"`, name, attribute, expected, raw)
		}

		if (!result.valid) {
			return this.#fail(`invalid option "${name}"`, name, attribute, expected, raw)
		}

		return result.value
	}

	#fail(reason: string, name: string, attribute: string, expected: string, received: unknown): never {
		throw new SkipComponentMountError(reason, {
			component: this.#componentName,
			root: this.#root,
			option: name,
			attribute,
			expected,
			received
		})
	}
}

class RootOptionReader extends OptionReader {
	public readonly optional: OptionReader

	public constructor(root: HTMLElement, componentName: string) {
		super(root, componentName, true)
		this.optional = new OptionReader(root, componentName, false)
	}
}

export function createOptionApi(root: HTMLElement, componentName: string): OptionApi {
	return new RootOptionReader(root, componentName) as unknown as OptionApi
}
