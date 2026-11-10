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

// What a parser returns for a value it does not accept. No attribute value can produce it.
const INVALID = Symbol()

type Parsed<T> = T | typeof INVALID

const parseNumber = (raw: string): number => (raw.trim() === '' ? NaN : Number(raw))

const parseBoolean = (raw: string): Parsed<boolean> =>
	raw === '' || raw === 'true' || raw === '1' ? true : raw === 'false' || raw === '0' ? false : INVALID

// One lookup family: `option` (required) or `option.optional`.
class OptionReader {
	readonly #root: HTMLElement
	readonly #component: string
	readonly #required: boolean

	public constructor(root: HTMLElement, component: string, required: boolean) {
		this.#root = root
		this.#component = component
		this.#required = required
	}

	public get optional(): OptionReader {
		return new OptionReader(this.#root, this.#component, false)
	}

	public string(name: string, options?: StringOptionOptions): string | undefined {
		return this.#read(name, 'string', options, raw => {
			const pattern = options?.pattern
			let matches = raw.length >= (options?.minLength ?? 0) && raw.length <= (options?.maxLength ?? Infinity)

			if (matches && pattern !== undefined) {
				// A global or sticky pattern must match from the start and keep its own position afterwards.
				const lastIndex = pattern.lastIndex

				try {
					pattern.lastIndex = 0
					matches = pattern.test(raw)
				} finally {
					pattern.lastIndex = lastIndex
				}
			}

			return matches ? raw : INVALID
		})
	}

	public number(name: string, options?: NumberOptionOptions): number | undefined {
		return this.#read(name, options?.integer === true ? 'integer' : 'number', options, raw => {
			const value = parseNumber(raw)

			return Number.isFinite(value) &&
				value >= (options?.min ?? -Infinity) &&
				value <= (options?.max ?? Infinity) &&
				(options?.integer !== true || Number.isInteger(value))
				? value
				: INVALID
		})
	}

	public boolean(name: string, options?: BooleanOptionOptions): boolean | undefined {
		return this.#read(name, 'boolean', options, parseBoolean)
	}

	public json<T>(name: string, options?: JsonOptionOptions<T>): T | undefined {
		return this.#read(name, 'valid JSON', options, raw => {
			const value: unknown = JSON.parse(raw)

			return options?.validate === undefined || options.validate(value) ? (value as T) : INVALID
		})
	}

	public enum<T extends readonly string[]>(
		name: string,
		values: T,
		options?: DefaultOptionOptions<T[number]>
	): T[number] | undefined {
		return this.#read(name, `one of ${values.map(value => JSON.stringify(value)).join(', ')}`, options, raw =>
			values.includes(raw) ? raw : INVALID
		)
	}

	public literal<T extends OptionLiteral>(
		name: string,
		literalValue: T,
		options?: DefaultOptionOptions<T>
	): T | undefined {
		return this.#read(name, `literal ${JSON.stringify(literalValue)}`, options, raw => {
			// The raw value is read as the literal's own type; anything unreadable can never equal the literal.
			const parsed =
				typeof literalValue === 'string' ? raw : typeof literalValue === 'number' ? parseNumber(raw) : parseBoolean(raw)

			return parsed === literalValue ? literalValue : INVALID
		})
	}

	public custom<T>(
		name: string,
		parser: OptionParser<T>,
		validator?: OptionValidator<T>,
		options?: DefaultOptionOptions<T>
	): T | undefined {
		return this.#read(name, 'valid custom value', options, raw => {
			const value = parser(raw)

			return validator === undefined || validator(value) ? value : INVALID
		})
	}

	#read<T>(
		name: string,
		expected: string,
		options: { default?: T } | undefined,
		parse: (raw: string) => Parsed<T>
	): T | undefined {
		const attribute = `data-option-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`
		const raw = this.#root.getAttribute(attribute)
		let value: Parsed<T> | undefined

		if (raw === null) {
			if (!this.#required) return options?.default
		} else {
			try {
				value = parse(raw)
			} catch {
				value = INVALID
			}

			if (value !== INVALID) return value
		}

		throw new SkipComponentMountError(raw === null ? `missing required option "${name}"` : `invalid option "${name}"`, {
			component: this.#component,
			root: this.#root,
			option: name,
			attribute,
			expected,
			received: raw ?? undefined
		})
	}
}

export function createOptionApi(root: HTMLElement, componentName: string): OptionApi {
	return new OptionReader(root, componentName, true) as unknown as OptionApi
}
