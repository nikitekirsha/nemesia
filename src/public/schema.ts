import type { OptionDescriptor, OptionType, OptionValue, RefDescriptor, RefTag } from '../types/entities'

/**
 * Configuration object for `getRef(...)`.
 */
export interface RefConfig {
  /** Narrow the element type to an HTML tag. */
  tag?: RefTag
  /** Mark ref as optional. Default: `false`. */
  optional?: boolean
  /** Resolve all matches as array. Default: `false`. */
  many?: boolean
}

/**
 * Configuration object for `getOption(...)`.
 */
export interface OptionConfig<Type extends OptionType = 'string'> {
  /** Option value type. Default: `'string'`. */
  type?: Type
  /** Mark option as optional. Default: `false`. */
  optional?: boolean
  /** Fallback value used when attribute is missing. */
  default?: OptionValue<Type>
}

function assertString(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[Nemesia] ${label} must be a non-empty string`)
  }
}

function assertOptionType(value: string): asserts value is OptionType {
  if (value !== 'string' && value !== 'number' && value !== 'boolean') {
    throw new Error(`[Nemesia] unsupported option type: ${value}`)
  }
}

function assertDefaultType(type: OptionType, value: unknown): void {
  if (type === 'string') {
    if (typeof value !== 'string') {
      throw new Error('[Nemesia] option default must be a string for type "string"')
    }

    return
  }

  if (type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('[Nemesia] option default must be a finite number for type "number"')
    }

    return
  }

  if (typeof value !== 'boolean') {
    throw new Error('[Nemesia] option default must be a boolean for type "boolean"')
  }
}

/**
 * Describes a DOM ref resolved relative to component root element.
 *
 * Defaults:
 * - `optional: false`
 * - `many: false`
 *
 * `tag` narrows the resulting element type.
 */
export function getRef(selector: string): RefDescriptor<undefined, false, false>
export function getRef<const Tag extends RefTag>(selector: string, tag: Tag): RefDescriptor<Tag, false, false>
export function getRef<const Config extends RefConfig>(
  selector: string,
  config: Config
): RefDescriptor<
  Config extends { tag: infer Tag } ? (Tag extends RefTag ? Tag : undefined) : undefined,
  Config extends { optional: infer Optional } ? (Optional extends boolean ? Optional : false) : false,
  Config extends { many: infer Many } ? (Many extends boolean ? Many : false) : false
>
export function getRef(selector: string, tagOrConfig?: RefTag | RefConfig): RefDescriptor<RefTag | undefined, boolean, boolean> {
  assertString(selector, 'selector')

  let tag: RefTag | undefined
  let optional = false
  let many = false

  if (typeof tagOrConfig === 'string') {
    tag = tagOrConfig
  } else if (tagOrConfig) {
    tag = tagOrConfig.tag
    optional = Boolean(tagOrConfig.optional)
    many = Boolean(tagOrConfig.many)
  }

  return {
    kind: 'ref',
    selector,
    tag: tag ?? undefined,
    optional,
    many
  }
}

/**
 * Describes an option resolved from a data-attribute.
 *
 * Defaults:
 * - `type: 'string'`
 * - `optional: false`
 *
 * If `default` is provided, the option is always defined.
 */
export function getOption(attribute: string): OptionDescriptor<'string', false, false, never>
export function getOption<Type extends OptionType>(attribute: string, type: Type): OptionDescriptor<Type, false, false, never>
export function getOption<
  const Type extends OptionType,
  const Optional extends boolean | undefined = undefined,
  const Default extends OptionValue<Type> | undefined = undefined
>(
  attribute: string,
  config: { type: Type; optional?: Optional; default?: Default }
): OptionDescriptor<
  Type,
  Optional extends true ? true : false,
  Default extends undefined ? false : true,
  Default extends undefined ? never : Default
>
export function getOption<const Optional extends boolean | undefined = undefined, const Default extends string | undefined = undefined>(
  attribute: string,
  config: { optional?: Optional; default?: Default; type?: undefined }
): OptionDescriptor<
  'string',
  Optional extends true ? true : false,
  Default extends undefined ? false : true,
  Default extends undefined ? never : Default
>
export function getOption<Type extends OptionType = 'string'>(
  attribute: string,
  typeOrConfig?: Type | OptionConfig<OptionType>
): OptionDescriptor<Type, boolean, boolean, unknown> {
  assertString(attribute, 'option attribute')

  let type: OptionType = 'string'
  let optional = false
  let hasDefault = false
  let defaultValue: unknown = undefined

  if (typeof typeOrConfig === 'string') {
    assertOptionType(typeOrConfig)
    type = typeOrConfig
  } else if (typeOrConfig) {
    if (typeOrConfig.type) {
      assertOptionType(typeOrConfig.type)
      type = typeOrConfig.type
    }

    optional = Boolean(typeOrConfig.optional)

    if ('default' in typeOrConfig) {
      hasDefault = true
      defaultValue = typeOrConfig.default
      assertDefaultType(type, defaultValue)
    }
  }

  return {
    kind: 'option',
    attribute,
    type: type as Type,
    optional,
    hasDefault,
    defaultValue
  }
}
