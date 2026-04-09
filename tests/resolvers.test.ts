import { getOption, getRef } from '../index'
import { resolveOptions } from '../src/resolver/options'
import { resolveRefs } from '../src/resolver/refs'

function createRoot(): HTMLElement {
  const root = document.createElement('article')
  root.setAttribute('data-root', '')

  root.innerHTML = `
    <button data-btn></button>
    <a data-link></a>
    <li data-item></li>
    <li data-item></li>
  `

  return root
}

describe('resolveRefs', () => {
  it('resolves required, optional and many refs', () => {
    const root = createRoot()

    const schema = {
      root: getRef('[data-root]', 'article'),
      btn: getRef('[data-btn]', 'button'),
      maybe: getRef('[data-missing]', { optional: true }),
      many: getRef('[data-item]', { many: true, tag: 'li' }),
      maybeMany: getRef('[data-missing-many]', { many: true, optional: true })
    }

    const result = resolveRefs('x', root, schema)

    expect(result.ok).toBe(true)
    expect(result.value?.root).toBe(root)
    expect(result.value?.maybe).toBeNull()
    expect((result.value?.many as Element[]).length).toBe(2)
    expect(result.value?.maybeMany).toEqual([])
    expect(result.issues).toEqual([])
  })

  it('collects required ref failures across schema', () => {
    const root = createRoot()

    const result = resolveRefs('x', root, {
      missing: getRef('[not-here]'),
      wrongTag: getRef('[data-link]', 'button'),
      missingMany: getRef('[data-none]', { many: true }),
      mismatchMany: getRef('[data-item]', { many: true, tag: 'button' })
    })

    expect(result.ok).toBe(false)

    expect(result.issues).toEqual([
      { key: 'missing', type: 'missing' },
      { key: 'wrongTag', type: 'tag-mismatch' },
      { key: 'missingMany', type: 'missing' },
      { key: 'mismatchMany', type: 'tag-mismatch' }
    ])
  })

  it('returns empty/null for optional tag mismatch', () => {
    const root = createRoot()
    const single = resolveRefs('x', root, { maybe: getRef('[data-link]', { tag: 'button', optional: true }) })
    const many = resolveRefs('x', root, { maybeMany: getRef('[data-item]', { tag: 'button', optional: true, many: true }) })

    expect(single.ok).toBe(true)
    expect(single.value?.maybe).toBeNull()
    expect(single.issues).toEqual([])
    expect(many.ok).toBe(true)
    expect(many.value?.maybeMany).toEqual([])
    expect(many.issues).toEqual([])
  })

  it('covers many-required edge branches', () => {
    const root = createRoot()

    expect(resolveRefs('x', root, { missingMany: getRef('[data-none]', { many: true }) }).issues).toEqual([
      { key: 'missingMany', type: 'missing' }
    ])

    expect(resolveRefs('x', root, { plainMany: getRef('[data-item]', { many: true }) }).ok).toBe(true)

    expect(resolveRefs('x', root, { mismatchMany: getRef('[data-item]', { many: true, tag: 'button' }) }).issues).toEqual([
      { key: 'mismatchMany', type: 'tag-mismatch' }
    ])
  })
})

describe('resolveOptions', () => {
  it('parses option values and applies defaults', () => {
    const root = document.createElement('div')
    root.setAttribute('data-endpoint', '/api')
    root.setAttribute('data-limit', '10')
    root.setAttribute('data-debug', 'true')
    root.setAttribute('data-enabled', 'false')

    const schema = {
      endpoint: getOption('data-endpoint'),
      limit: getOption('data-limit', 'number'),
      debug: getOption('data-debug', 'boolean'),
      enabled: getOption('data-enabled', 'boolean'),
      retries: getOption('data-retries', { type: 'number', default: 3 }),
      maybe: getOption('data-optional', { optional: true })
    }

    const result = resolveOptions('x', root, schema)

    expect(result.ok).toBe(true)

    expect(result.value).toEqual({
      endpoint: '/api',
      limit: 10,
      debug: true,
      enabled: false,
      retries: 3,
      maybe: undefined
    })

    expect(result.issues).toEqual([])
  })

  it('collects missing required and parse errors', () => {
    const root = document.createElement('div')
    root.setAttribute('data-number', 'NaN')
    root.setAttribute('data-boolean', 'yes')

    const result = resolveOptions('x', root, {
      miss: getOption('data-miss'),
      number: getOption('data-number', 'number'),
      bool: getOption('data-boolean', 'boolean')
    })

    expect(result.ok).toBe(false)

    expect(result.issues).toEqual([
      { key: 'miss', type: 'missing' },
      { key: 'number', type: 'invalid-type' },
      { key: 'bool', type: 'invalid-type' }
    ])
  })
})
