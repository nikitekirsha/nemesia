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
    expect(() => defineComponent({ name: 'x', schema: { refs: {} } } as never)).toThrow('requires schema.options')

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
})
