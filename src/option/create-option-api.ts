import type { DiagnosticPayload } from '../internal/diagnostics.js'
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
	OptionalOptionApi,
	StringOptionOptions
} from './types.js'

interface ParseResult<T> {
	readonly valid: boolean
	readonly value?: T
	readonly expected?: string
}

type ParseOption<T> = (raw: string) => ParseResult<T>

const valid = <T>(value: T): ParseResult<T> => ({ valid: true, value })

const invalid = <T>(expected?: string): ParseResult<T> => ({
	valid: false,
	...(expected === undefined ? {} : { expected })
})

const hasDefault = <T>(options: { default?: T } | undefined): options is { default: T } =>
	options !== undefined && 'default' in options

const optionAttribute = (name: string): string =>
	`data-option-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`

const parseBoolean = (raw: string): ParseResult<boolean> => {
	if (raw === '' || raw === 'true' || raw === '1') {
		return valid(true)
	}

	if (raw === 'false' || raw === '0') {
		return valid(false)
	}

	return invalid()
}

export function createOptionApi(root: HTMLElement, componentName: string): OptionApi {
	const diagnosticPayload = (
		name: string,
		attribute: string,
		expected: string,
		received: unknown
	): DiagnosticPayload => ({
		component: componentName,
		root,
		option: name,
		attribute,
		expected,
		received
	})

	const fail = (reason: string, name: string, attribute: string, expected: string, received: unknown): never => {
		throw new SkipComponentMountError(reason, diagnosticPayload(name, attribute, expected, received))
	}

	const resolve = <T>(
		name: string,
		required: boolean,
		expected: string,
		parser: ParseOption<T>,
		options?: { default?: T }
	): T | undefined => {
		const attribute = optionAttribute(name)

		if (!root.hasAttribute(attribute)) {
			if (required) {
				return fail(`missing required option "${name}"`, name, attribute, expected, undefined)
			}

			return hasDefault(options) ? options.default : undefined
		}

		const raw = root.getAttribute(attribute) ?? ''
		let result: ParseResult<T>

		try {
			result = parser(raw)
		} catch {
			return fail(`invalid option "${name}"`, name, attribute, expected, raw)
		}

		if (!result.valid) {
			return fail(`invalid option "${name}"`, name, attribute, result.expected ?? expected, raw)
		}

		return result.value as T
	}

	const string = (required: boolean, name: string, options?: StringOptionOptions): string | undefined =>
		resolve(
			name,
			required,
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

	const number = (required: boolean, name: string, options?: NumberOptionOptions): number | undefined =>
		resolve(
			name,
			required,
			'number',
			raw => {
				const value = Number(raw)

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

	const boolean = (required: boolean, name: string, options?: BooleanOptionOptions): boolean | undefined =>
		resolve(name, required, 'boolean', parseBoolean, options)

	const json = <T>(required: boolean, name: string, options?: JsonOptionOptions<T>): T | undefined =>
		resolve(
			name,
			required,
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

	const enumOption = <T extends readonly string[]>(
		required: boolean,
		name: string,
		values: T,
		options?: DefaultOptionOptions<T[number]>
	): T[number] | undefined =>
		resolve(
			name,
			required,
			`one of ${values.map(value => JSON.stringify(value)).join(', ')}`,
			raw => (values.includes(raw) ? valid(raw as T[number]) : invalid()),
			options
		)

	const literal = <T extends OptionLiteral>(
		required: boolean,
		name: string,
		literalValue: T,
		options?: DefaultOptionOptions<T>
	): T | undefined => {
		const expected = `literal ${JSON.stringify(literalValue)}`

		return resolve(
			name,
			required,
			expected,
			raw => {
				let parsed: string | number | boolean

				if (typeof literalValue === 'string') {
					parsed = raw
				} else if (typeof literalValue === 'number') {
					parsed = Number(raw)

					if (Number.isNaN(parsed)) {
						return invalid()
					}
				} else {
					const booleanResult = parseBoolean(raw)

					if (!booleanResult.valid) {
						return invalid()
					}

					parsed = booleanResult.value as boolean
				}

				return Object.is(parsed, literalValue) ? valid(literalValue) : invalid()
			},
			options
		)
	}

	const custom = <T>(
		required: boolean,
		name: string,
		parser: OptionParser<T>,
		validator?: OptionValidator<T>,
		options?: DefaultOptionOptions<T>
	): T | undefined =>
		resolve(
			name,
			required,
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

	function optionalString(name: string, options: StringOptionOptions & { default: string }): string
	function optionalString(name: string, options?: StringOptionOptions): string | undefined
	function optionalString(name: string, options?: StringOptionOptions): string | undefined {
		return string(false, name, options)
	}

	function optionalNumber(name: string, options: NumberOptionOptions & { default: number }): number
	function optionalNumber(name: string, options?: NumberOptionOptions): number | undefined
	function optionalNumber(name: string, options?: NumberOptionOptions): number | undefined {
		return number(false, name, options)
	}

	function optionalBoolean(name: string, options: BooleanOptionOptions & { default: boolean }): boolean
	function optionalBoolean(name: string, options?: BooleanOptionOptions): boolean | undefined
	function optionalBoolean(name: string, options?: BooleanOptionOptions): boolean | undefined {
		return boolean(false, name, options)
	}

	function optionalJson<T>(name: string, options: JsonOptionOptions<T> & { default: T }): T
	function optionalJson<T>(name: string, options?: JsonOptionOptions<T>): T | undefined
	function optionalJson<T>(name: string, options?: JsonOptionOptions<T>): T | undefined {
		return json(false, name, options)
	}

	function optionalEnum<T extends readonly string[]>(
		name: string,
		values: T,
		options: DefaultOptionOptions<T[number]> & { default: T[number] }
	): T[number]
	function optionalEnum<T extends readonly string[]>(
		name: string,
		values: T,
		options?: DefaultOptionOptions<T[number]>
	): T[number] | undefined
	function optionalEnum<T extends readonly string[]>(
		name: string,
		values: T,
		options?: DefaultOptionOptions<T[number]>
	): T[number] | undefined {
		return enumOption(false, name, values, options)
	}

	function optionalLiteral<T extends OptionLiteral>(
		name: string,
		value: T,
		options: DefaultOptionOptions<T> & { default: T }
	): T
	function optionalLiteral<T extends OptionLiteral>(
		name: string,
		value: T,
		options?: DefaultOptionOptions<T>
	): T | undefined
	function optionalLiteral<T extends OptionLiteral>(
		name: string,
		value: T,
		options?: DefaultOptionOptions<T>
	): T | undefined {
		return literal(false, name, value, options)
	}

	function optionalCustom<T>(
		name: string,
		parser: OptionParser<T>,
		validator: OptionValidator<T> | undefined,
		options: DefaultOptionOptions<T> & { default: T }
	): T
	function optionalCustom<T>(
		name: string,
		parser: OptionParser<T>,
		validator?: OptionValidator<T>,
		options?: DefaultOptionOptions<T>
	): T | undefined
	function optionalCustom<T>(
		name: string,
		parser: OptionParser<T>,
		validator?: OptionValidator<T>,
		options?: DefaultOptionOptions<T>
	): T | undefined {
		return custom(false, name, parser, validator, options)
	}

	const optional = {
		string: optionalString,
		number: optionalNumber,
		boolean: optionalBoolean,
		json: optionalJson,
		enum: optionalEnum,
		literal: optionalLiteral,
		custom: optionalCustom
	} satisfies OptionalOptionApi

	const api = {
		string: (name, options) => string(true, name, options) as string,
		number: (name, options) => number(true, name, options) as number,
		boolean: (name, options) => boolean(true, name, options) as boolean,
		json: <T>(name: string, options?: JsonOptionOptions<T>) => json(true, name, options) as T,
		enum: <T extends readonly string[]>(name: string, values: T, options?: DefaultOptionOptions<T[number]>) =>
			enumOption(true, name, values, options) as T[number],
		literal: <T extends OptionLiteral>(name: string, value: T, options?: DefaultOptionOptions<T>) =>
			literal(true, name, value, options) as T,
		custom: <T>(
			name: string,
			parser: OptionParser<T>,
			validator?: OptionValidator<T>,
			options?: DefaultOptionOptions<T>
		) => custom(true, name, parser, validator, options) as T,
		optional
	} satisfies OptionApi

	return api
}
