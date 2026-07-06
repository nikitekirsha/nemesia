export interface StringOptionOptions {
  default?: string
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}

export interface NumberOptionOptions {
  default?: number
  min?: number
  max?: number
}

export interface BooleanOptionOptions {
  default?: boolean
}

export interface JsonOptionOptions<T> {
  default?: T
  validate?: (value: unknown) => value is T
}

export interface DefaultOptionOptions<T> {
  default?: T
}

export type OptionLiteral = string | number | boolean

export type OptionParser<T> = (value: string) => T

export type OptionValidator<T> = (value: T) => boolean

type RequiredDefault<T> = { default: T }

export interface RequiredOptionApi {
  string(name: string, options?: StringOptionOptions): string
  number(name: string, options?: NumberOptionOptions): number
  boolean(name: string, options?: BooleanOptionOptions): boolean
  json<T>(name: string, options?: JsonOptionOptions<T>): T
  enum<T extends readonly string[]>(
    name: string,
    values: T,
    options?: DefaultOptionOptions<T[number]>,
  ): T[number]
  literal<T extends OptionLiteral>(
    name: string,
    value: T,
    options?: DefaultOptionOptions<T>,
  ): T
  custom<T>(
    name: string,
    parser: OptionParser<T>,
    validator?: OptionValidator<T>,
    options?: DefaultOptionOptions<T>,
  ): T
}

export interface OptionalOptionApi {
  string(
    name: string,
    options: StringOptionOptions & RequiredDefault<string>,
  ): string
  string(name: string, options?: StringOptionOptions): string | undefined

  number(
    name: string,
    options: NumberOptionOptions & RequiredDefault<number>,
  ): number
  number(name: string, options?: NumberOptionOptions): number | undefined

  boolean(
    name: string,
    options: BooleanOptionOptions & RequiredDefault<boolean>,
  ): boolean
  boolean(name: string, options?: BooleanOptionOptions): boolean | undefined

  json<T>(
    name: string,
    options: JsonOptionOptions<T> & RequiredDefault<T>,
  ): T
  json<T>(name: string, options?: JsonOptionOptions<T>): T | undefined

  enum<T extends readonly string[]>(
    name: string,
    values: T,
    options: DefaultOptionOptions<T[number]> & RequiredDefault<T[number]>,
  ): T[number]
  enum<T extends readonly string[]>(
    name: string,
    values: T,
    options?: DefaultOptionOptions<T[number]>,
  ): T[number] | undefined

  literal<T extends OptionLiteral>(
    name: string,
    value: T,
    options: DefaultOptionOptions<T> & RequiredDefault<T>,
  ): T
  literal<T extends OptionLiteral>(
    name: string,
    value: T,
    options?: DefaultOptionOptions<T>,
  ): T | undefined

  custom<T>(
    name: string,
    parser: OptionParser<T>,
    validator: OptionValidator<T> | undefined,
    options: DefaultOptionOptions<T> & RequiredDefault<T>,
  ): T
  custom<T>(
    name: string,
    parser: OptionParser<T>,
    validator?: OptionValidator<T>,
    options?: DefaultOptionOptions<T>,
  ): T | undefined
}

export interface OptionApi extends RequiredOptionApi {
  readonly optional: OptionalOptionApi
}
