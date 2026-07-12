/** Validation options for string options read from `data-option-*` attributes. */
export interface StringOptionOptions {
	/** Fallback value used when the option attribute is missing. */
	default?: string

	/** Minimum accepted string length. */
	minLength?: number

	/** Maximum accepted string length. */
	maxLength?: number

	/** Regular expression the string must match. */
	pattern?: RegExp
}

/** Validation options for number options read from `data-option-*` attributes. */
export interface NumberOptionOptions {
	/** Fallback value used when the option attribute is missing. */
	default?: number

	/** Minimum accepted number. */
	min?: number

	/** Maximum accepted number. */
	max?: number
}

/** Options for boolean options read from `data-option-*` attributes. */
export interface BooleanOptionOptions {
	/** Fallback value used when the option attribute is missing. */
	default?: boolean
}

/** Options for JSON options read from `data-option-*` attributes. */
export interface JsonOptionOptions<T> {
	/** Fallback value used when the option attribute is missing. */
	default?: T

	/** Type guard used to validate the parsed JSON value. */
	validate?: (value: unknown) => value is T
}

/** Shared options for APIs that only need a default value. */
export interface DefaultOptionOptions<T> {
	/** Fallback value used when the option attribute is missing. */
	default?: T
}

/** Primitive value allowed by `option.literal(...)`. */
export type OptionLiteral = string | number | boolean

/** Parses a raw string attribute value into a custom option value. */
export type OptionParser<T> = (value: string) => T

/** Validates a parsed custom option value. */
export type OptionValidator<T> = (value: T) => boolean

type RequiredDefault<T> = { default: T }

/** Required option lookup API available as `this.option`. */
export interface RequiredOptionApi {
	/** Reads a required string option. */
	string(name: string, options?: StringOptionOptions): string

	/** Reads a required number option. */
	number(name: string, options?: NumberOptionOptions): number

	/** Reads a required boolean option. */
	boolean(name: string, options?: BooleanOptionOptions): boolean

	/** Reads a required JSON option. */
	json<T>(name: string, options?: JsonOptionOptions<T>): T

	/** Reads a required string option constrained to one of the provided values. */
	enum<T extends readonly string[]>(name: string, values: T, options?: DefaultOptionOptions<T[number]>): T[number]

	/** Reads a required option that must equal one exact primitive value. */
	literal<T extends OptionLiteral>(name: string, value: T, options?: DefaultOptionOptions<T>): T

	/** Reads a required option using custom parsing and optional validation. */
	custom<T>(name: string, parser: OptionParser<T>, validator?: OptionValidator<T>, options?: DefaultOptionOptions<T>): T
}

/** Optional option lookup API available as `this.option.optional`. */
export interface OptionalOptionApi {
	/** Reads an optional string option, using `default` when provided. */
	string(name: string, options: StringOptionOptions & RequiredDefault<string>): string
	/** Reads an optional string option, returning `undefined` when it is missing and has no default. */
	string(name: string, options?: StringOptionOptions): string | undefined

	/** Reads an optional number option, using `default` when provided. */
	number(name: string, options: NumberOptionOptions & RequiredDefault<number>): number
	/** Reads an optional number option, returning `undefined` when it is missing and has no default. */
	number(name: string, options?: NumberOptionOptions): number | undefined

	/** Reads an optional boolean option, using `default` when provided. */
	boolean(name: string, options: BooleanOptionOptions & RequiredDefault<boolean>): boolean
	/** Reads an optional boolean option, returning `undefined` when it is missing and has no default. */
	boolean(name: string, options?: BooleanOptionOptions): boolean | undefined

	/** Reads an optional JSON option, using `default` when provided. */
	json<T>(name: string, options: JsonOptionOptions<T> & RequiredDefault<T>): T
	/** Reads an optional JSON option, returning `undefined` when it is missing and has no default. */
	json<T>(name: string, options?: JsonOptionOptions<T>): T | undefined

	/** Reads an optional enum option, using `default` when provided. */
	enum<T extends readonly string[]>(
		name: string,
		values: T,
		options: DefaultOptionOptions<T[number]> & RequiredDefault<T[number]>
	): T[number]
	/** Reads an optional enum option, returning `undefined` when it is missing and has no default. */
	enum<T extends readonly string[]>(
		name: string,
		values: T,
		options?: DefaultOptionOptions<T[number]>
	): T[number] | undefined

	/** Reads an optional literal option, using `default` when provided. */
	literal<T extends OptionLiteral>(name: string, value: T, options: DefaultOptionOptions<T> & RequiredDefault<T>): T
	/** Reads an optional literal option, returning `undefined` when it is missing and has no default. */
	literal<T extends OptionLiteral>(name: string, value: T, options?: DefaultOptionOptions<T>): T | undefined

	/** Reads an optional custom option, using `default` when provided. */
	custom<T>(
		name: string,
		parser: OptionParser<T>,
		validator: OptionValidator<T> | undefined,
		options: DefaultOptionOptions<T> & RequiredDefault<T>
	): T
	/** Reads an optional custom option, returning `undefined` when it is missing and has no default. */
	custom<T>(
		name: string,
		parser: OptionParser<T>,
		validator?: OptionValidator<T>,
		options?: DefaultOptionOptions<T>
	): T | undefined
}

/** Option lookup API available as `this.option` inside concrete components. */
export interface OptionApi extends RequiredOptionApi {
	/** Optional option lookup API; missing options return `undefined` unless a default is provided. */
	readonly optional: OptionalOptionApi
}
