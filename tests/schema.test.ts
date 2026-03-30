import { getOption, getRef } from '../index'

describe('schema builders', () => {
  it('builds ref descriptors with defaults and config', () => {
    const required = getRef('[data-x]')
    const typed = getRef('[data-y]', 'button')
    const optionalMany = getRef('[data-z]', { tag: 'a', optional: true, many: true })

    expect(required.kind).toBe('ref')
    expect(required.optional).toBe(false)
    expect(required.many).toBe(false)
    expect(required.tag).toBeUndefined()

    expect(typed.tag).toBe('button')
    expect(typed.optional).toBe(false)

    expect(optionalMany.tag).toBe('a')
    expect(optionalMany.optional).toBe(true)
    expect(optionalMany.many).toBe(true)
  })

  it('builds option descriptors with defaults and config', () => {
    const required = getOption('data-endpoint')
    const typed = getOption('data-limit', 'number')
    const optional = getOption('data-debug', { type: 'boolean', optional: true })
    const withDefault = getOption('data-retries', { type: 'number', default: 3 })
    const withStringDefault = getOption('data-name', { type: 'string', default: 'nemesia' })
    const withBooleanDefault = getOption('data-enabled', { type: 'boolean', default: false })

    expect(required.kind).toBe('option')
    expect(required.type).toBe('string')
    expect(required.optional).toBe(false)
    expect(required.hasDefault).toBe(false)

    expect(typed.type).toBe('number')
    expect(optional.optional).toBe(true)

    expect(withDefault.hasDefault).toBe(true)
    expect(withDefault.defaultValue).toBe(3)
    expect(withStringDefault.defaultValue).toBe('nemesia')
    expect(withBooleanDefault.defaultValue).toBe(false)
  })

  it('throws for invalid builder input', () => {
    expect(() => getRef('')).toThrow('selector')
    expect(() => getOption('')).toThrow('option attribute')
    expect(() => getOption('data-x', 'json' as never)).toThrow('unsupported option type')
    expect(() => getOption('data-x', { type: 'string', default: true as never })).toThrow('option default must be a string')
    expect(() => getOption('data-x', { type: 'number', default: Number.NaN as never })).toThrow(
      'option default must be a finite number'
    )
    expect(() => getOption('data-x', { type: 'boolean', default: 'yes' as never })).toThrow('option default must be a boolean')
  })
})
