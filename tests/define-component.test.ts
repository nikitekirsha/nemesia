import { defineComponent, getOption, getRef } from '../index'

function validDefinition() {
  return {
    name: 'valid',
    schema: {
      refs: {
        root: getRef('[data-valid]', 'div')
      },
      options: {
        endpoint: getOption('data-endpoint')
      }
    }
  }
}

describe('defineComponent', () => {
  it('returns the same definition object for valid input', () => {
    const definition = validDefinition()
    expect(defineComponent(definition)).toBe(definition)
  })

  it('validates shape and root ref constraints', () => {
    expect(() => defineComponent(null as never)).toThrow('must be an object')
    expect(() => defineComponent({ ...(validDefinition() as any), name: '' })).toThrow('non-empty string')
    expect(() => defineComponent({ name: 'x' } as never)).toThrow('requires a schema')
    expect(() => defineComponent({ name: 'x', schema: { options: {} } } as never)).toThrow('requires schema.refs')
    expect(() => defineComponent({ name: 'x', schema: { refs: {}, options: null } } as never)).toThrow('schema.options must be an object')

    const missingRoot = {
      ...validDefinition(),
      schema: {
        refs: {},
        options: { endpoint: getOption('data-endpoint') }
      }
    }

    expect(() => defineComponent(missingRoot as never)).toThrow('schema.refs.root')

    const optionalRoot = {
      ...validDefinition(),
      schema: {
        refs: { root: getRef('[data-valid]', { optional: true }) },
        options: { endpoint: getOption('data-endpoint') }
      }
    }

    expect(() => defineComponent(optionalRoot as never)).toThrow('required single')
  })

  it('allows missing schema.options and normalizes it to empty object', () => {
    const definition = {
      name: 'without-options',
      schema: {
        refs: {
          root: getRef('[data-without-options]', 'div')
        }
      }
    }

    const result = defineComponent(definition)

    expect(result).toBe(definition)
    expect(result.schema.options).toEqual({})
  })
})
