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
  })

  it('fails for missing required refs and required tag mismatch', () => {
    const root = createRoot()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(resolveRefs('x', root, { missing: getRef('[not-here]') }).ok).toBe(false)
    expect(resolveRefs('x', root, { wrongTag: getRef('[data-link]', 'button') }).ok).toBe(false)
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('returns empty/null for optional tag mismatch', () => {
    const root = createRoot()
    const single = resolveRefs('x', root, { maybe: getRef('[data-link]', { tag: 'button', optional: true }) })
    const many = resolveRefs('x', root, { maybeMany: getRef('[data-item]', { tag: 'button', optional: true, many: true }) })

    expect(single.ok).toBe(true)
    expect(single.value?.maybe).toBeNull()
    expect(many.ok).toBe(true)
    expect(many.value?.maybeMany).toEqual([])
  })

  it('covers many-required edge branches', () => {
    const root = createRoot()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(resolveRefs('x', root, { missingMany: getRef('[data-none]', { many: true }) }).ok).toBe(false)
    expect(resolveRefs('x', root, { plainMany: getRef('[data-item]', { many: true }) }).ok).toBe(true)
    expect(resolveRefs('x', root, { mismatchMany: getRef('[data-item]', { many: true, tag: 'button' }) }).ok).toBe(false)
    expect(warn).toHaveBeenCalledTimes(2)
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
  })

  it('fails for missing required and parse errors', () => {
    const root = document.createElement('div')
    root.setAttribute('data-number', 'NaN')
    root.setAttribute('data-boolean', 'yes')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(resolveOptions('x', root, { miss: getOption('data-miss') }).ok).toBe(false)
    expect(resolveOptions('x', root, { number: getOption('data-number', 'number') }).ok).toBe(false)
    expect(resolveOptions('x', root, { bool: getOption('data-boolean', 'boolean') }).ok).toBe(false)
    expect(warn).toHaveBeenCalledTimes(3)
  })
})
