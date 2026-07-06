import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { Nemesia } from '../src/index.js'
import { SkipComponentMountError } from '../src/internal/errors.js'
import { createRefApi } from '../src/ref/create-ref-api.js'

// @ts-expect-error Ref internals are not package-root API.
type HiddenRefApi = import('../src/index.js').RefApi
// @ts-expect-error Controlled mount errors are internal.
type HiddenSkipComponentMountError = import('../src/index.js').SkipComponentMountError

function createRoot(component = 'example'): HTMLElement {
  const root = document.createElement('section')
  root.dataset.nemesia = component
  document.body.append(root)
  return root
}

function appendRef<TElement extends Element>(
  root: Element,
  element: TElement,
  name: string,
): TElement {
  element.setAttribute('data-ref', name)
  root.append(element)
  return element
}

function expectControlledError(
  operation: () => unknown,
  reason: string,
  payload: Record<string, unknown>,
): void {
  let thrown: unknown

  try {
    operation()
  } catch (error) {
    thrown = error
  }

  expect(thrown).toBeInstanceOf(SkipComponentMountError)
  expect(thrown).toMatchObject({
    name: 'SkipComponentMountError',
    message: reason,
    reason,
    payload,
  })
}

describe('ref façade', () => {
  it('resolves all required single tag helpers with precise public types', () => {
    const root = createRoot()
    const element = appendRef(root, document.createElement('div'), 'element')
    const button = appendRef(root, document.createElement('button'), 'button')
    const input = appendRef(root, document.createElement('input'), 'input')
    const textarea = appendRef(root, document.createElement('textarea'), 'textarea')
    const select = appendRef(root, document.createElement('select'), 'select')
    const form = appendRef(root, document.createElement('form'), 'form')
    const ref = createRefApi(root, 'example')

    expect(ref.element('element')).toBe(element)
    expect(ref.button('button')).toBe(button)
    expect(ref.input('input')).toBe(input)
    expect(ref.textarea('textarea')).toBe(textarea)
    expect(ref.select('select')).toBe(select)
    expect(ref.form('form')).toBe(form)
    expectTypeOf(ref.element('element')).toEqualTypeOf<HTMLElement>()
    expectTypeOf(ref.button('button')).toEqualTypeOf<HTMLButtonElement>()
    expectTypeOf(ref.input('input')).toEqualTypeOf<HTMLInputElement>()
    expectTypeOf(ref.textarea('textarea')).toEqualTypeOf<HTMLTextAreaElement>()
    expectTypeOf(ref.select('select')).toEqualTypeOf<HTMLSelectElement>()
    expectTypeOf(ref.form('form')).toEqualTypeOf<HTMLFormElement>()
  })

  it('resolves all optional single tag helpers and returns null when absent', () => {
    const root = createRoot()
    const element = appendRef(root, document.createElement('div'), 'element')
    const button = appendRef(root, document.createElement('button'), 'button')
    const input = appendRef(root, document.createElement('input'), 'input')
    const textarea = appendRef(root, document.createElement('textarea'), 'textarea')
    const select = appendRef(root, document.createElement('select'), 'select')
    const form = appendRef(root, document.createElement('form'), 'form')
    const ref = createRefApi(root, 'example')

    expect(ref.optional.element('element')).toBe(element)
    expect(ref.optional.button('button')).toBe(button)
    expect(ref.optional.input('input')).toBe(input)
    expect(ref.optional.textarea('textarea')).toBe(textarea)
    expect(ref.optional.select('select')).toBe(select)
    expect(ref.optional.form('form')).toBe(form)
    expect(ref.optional.element('missing')).toBeNull()
    expectTypeOf(ref.optional.element('element')).toEqualTypeOf<HTMLElement | null>()
    expectTypeOf(ref.optional.button('button')).toEqualTypeOf<HTMLButtonElement | null>()
    expectTypeOf(ref.optional.input('input')).toEqualTypeOf<HTMLInputElement | null>()
    expectTypeOf(ref.optional.textarea('textarea')).toEqualTypeOf<HTMLTextAreaElement | null>()
    expectTypeOf(ref.optional.select('select')).toEqualTypeOf<HTMLSelectElement | null>()
    expectTypeOf(ref.optional.form('form')).toEqualTypeOf<HTMLFormElement | null>()
  })

  it('resolves all required many tag helpers as ordered arrays', () => {
    const root = createRoot()
    const firstElement = appendRef(root, document.createElement('div'), 'element')
    const secondElement = appendRef(root, document.createElement('span'), 'element')
    const button = appendRef(root, document.createElement('button'), 'button')
    const input = appendRef(root, document.createElement('input'), 'input')
    const textarea = appendRef(root, document.createElement('textarea'), 'textarea')
    const select = appendRef(root, document.createElement('select'), 'select')
    const form = appendRef(root, document.createElement('form'), 'form')
    const ref = createRefApi(root, 'example')

    expect(ref.many.element('element')).toEqual([firstElement, secondElement])
    expect(ref.many.button('button')).toEqual([button])
    expect(ref.many.input('input')).toEqual([input])
    expect(ref.many.textarea('textarea')).toEqual([textarea])
    expect(ref.many.select('select')).toEqual([select])
    expect(ref.many.form('form')).toEqual([form])
    expectTypeOf(ref.many.element('element')).toEqualTypeOf<HTMLElement[]>()
    expectTypeOf(ref.many.button('button')).toEqualTypeOf<HTMLButtonElement[]>()
    expectTypeOf(ref.many.input('input')).toEqualTypeOf<HTMLInputElement[]>()
    expectTypeOf(ref.many.textarea('textarea')).toEqualTypeOf<HTMLTextAreaElement[]>()
    expectTypeOf(ref.many.select('select')).toEqualTypeOf<HTMLSelectElement[]>()
    expectTypeOf(ref.many.form('form')).toEqualTypeOf<HTMLFormElement[]>()
  })

  it('resolves all optional many tag helpers and returns an empty array when absent', () => {
    const root = createRoot()
    const element = appendRef(root, document.createElement('div'), 'element')
    const button = appendRef(root, document.createElement('button'), 'button')
    const input = appendRef(root, document.createElement('input'), 'input')
    const textarea = appendRef(root, document.createElement('textarea'), 'textarea')
    const select = appendRef(root, document.createElement('select'), 'select')
    const form = appendRef(root, document.createElement('form'), 'form')
    const ref = createRefApi(root, 'example')

    expect(ref.optional.many.element('element')).toEqual([element])
    expect(ref.optional.many.button('button')).toEqual([button])
    expect(ref.optional.many.input('input')).toEqual([input])
    expect(ref.optional.many.textarea('textarea')).toEqual([textarea])
    expect(ref.optional.many.select('select')).toEqual([select])
    expect(ref.optional.many.form('form')).toEqual([form])
    expect(ref.optional.many.element('missing')).toEqual([])
    expectTypeOf(ref.optional.many.element('element')).toEqualTypeOf<HTMLElement[]>()
    expectTypeOf(ref.optional.many.button('button')).toEqualTypeOf<HTMLButtonElement[]>()
    expectTypeOf(ref.optional.many.input('input')).toEqualTypeOf<HTMLInputElement[]>()
    expectTypeOf(ref.optional.many.textarea('textarea')).toEqualTypeOf<HTMLTextAreaElement[]>()
    expectTypeOf(ref.optional.many.select('select')).toEqualTypeOf<HTMLSelectElement[]>()
    expectTypeOf(ref.optional.many.form('form')).toEqualTypeOf<HTMLFormElement[]>()
  })

  it('supports generic required and optional refs for HTML and SVG elements', () => {
    const root = createRoot()
    const html = appendRef(root, document.createElement('article'), 'html')
    const svg = appendRef(
      root,
      document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      'svg',
    )
    const ref = createRefApi(root, 'example')

    expect(ref.one('html')).toBe(html)
    expect(ref.optional.one('html')).toBe(html)
    expect(ref.many.of('html')).toEqual([html])
    expect(ref.optional.many.of('html')).toEqual([html])
    expect(ref.one<SVGSVGElement>('svg')).toBe(svg)
    expect(ref.optional.one<SVGSVGElement>('svg')).toBe(svg)
    expect(ref.many.of<SVGSVGElement>('svg')).toEqual([svg])
    expect(ref.optional.many.of<SVGSVGElement>('svg')).toEqual([svg])
    expectTypeOf(ref.one('html')).toEqualTypeOf<HTMLElement>()
    expectTypeOf(ref.optional.one('html')).toEqualTypeOf<HTMLElement | null>()
    expectTypeOf(ref.many.of('html')).toEqualTypeOf<HTMLElement[]>()
    expectTypeOf(ref.optional.many.of('html')).toEqualTypeOf<HTMLElement[]>()
    expectTypeOf(ref.one<SVGSVGElement>('svg')).toEqualTypeOf<SVGSVGElement>()
    expectTypeOf(ref.optional.one<SVGSVGElement>('svg')).toEqualTypeOf<SVGSVGElement | null>()
    expectTypeOf(ref.many.of<SVGSVGElement>('svg')).toEqualTypeOf<SVGSVGElement[]>()
    expectTypeOf(ref.optional.many.of<SVGSVGElement>('svg')).toEqualTypeOf<SVGSVGElement[]>()
  })
})

describe('ref discovery and ownership', () => {
  it('resolves valid elements created by another Window realm', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const foreignDocument = iframe.contentDocument

    expect(foreignDocument).not.toBeNull()
    expect(foreignDocument?.defaultView).not.toBe(window)

    const root = foreignDocument!.createElement('section')
    root.dataset.nemesia = 'foreign'
    foreignDocument!.body.append(root)
    const container = appendRef(
      root,
      foreignDocument!.createElement('div'),
      'container',
    )
    const button = appendRef(
      root,
      foreignDocument!.createElement('button'),
      'button',
    )
    const svg = appendRef(
      root,
      foreignDocument!.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      'drawing',
    )
    const ref = createRefApi(root, 'foreign')

    expect(ref.element('container')).toBe(container)
    expect(ref.button('button')).toBe(button)
    expect(ref.one<SVGSVGElement>('drawing')).toBe(svg)
    expect(() => ref.element('drawing')).toThrow(SkipComponentMountError)
  })

  it('compares special-character ref names exactly without selector interpolation', () => {
    const root = createRoot()
    const name = 'item\"]:not([data-ref]) \\ slash'
    const target = appendRef(root, document.createElement('button'), name)
    const decoy = appendRef(root, document.createElement('button'), 'item')
    const ref = createRefApi(root, 'example')

    expect(ref.button(name)).toBe(target)
    expect(ref.button('item')).toBe(decoy)
  })

  it('excludes refs owned by nested registered-looking and unregistered roots', () => {
    const root = createRoot('parent')
    const direct = appendRef(root, document.createElement('button'), 'item')
    const registeredLooking = document.createElement('div')
    registeredLooking.dataset.nemesia = 'child'
    const unregistered = document.createElement('div')
    unregistered.dataset.nemesia = 'not-registered-anywhere'
    root.append(registeredLooking, unregistered)
    appendRef(registeredLooking, document.createElement('button'), 'item')
    appendRef(unregistered, document.createElement('button'), 'item')

    expect(createRefApi(root, 'parent').many.button('item')).toEqual([direct])
  })
})

describe('controlled ref mount failures', () => {
  it('reports an exact controlled error for a missing required single ref', () => {
    const root = createRoot('slider')

    expectControlledError(
      () => createRefApi(root, 'slider').button('swiper'),
      'missing required ref "swiper"',
      {
        component: 'slider',
        root,
        ref: 'swiper',
        selector: '[data-ref="swiper"]',
      },
    )
  })

  it('reports an exact controlled error for a missing required many ref', () => {
    const root = createRoot('list')

    expectControlledError(
      () => createRefApi(root, 'list').many.element('item'),
      'missing required ref "item"',
      {
        component: 'list',
        root,
        ref: 'item',
        selector: '[data-ref="item"]',
      },
    )
  })

  it('reports duplicate required and optional single refs as controlled errors', () => {
    const root = createRoot('toolbar')
    appendRef(root, document.createElement('button'), 'action')
    appendRef(root, document.createElement('button'), 'action')
    const payload = {
      component: 'toolbar',
      root,
      ref: 'action',
      selector: '[data-ref="action"]',
      expected: 'one element',
      received: 2,
    }

    expectControlledError(
      () => createRefApi(root, 'toolbar').button('action'),
      'duplicate ref "action": expected one element, received 2',
      payload,
    )
    expectControlledError(
      () => createRefApi(root, 'toolbar').optional.button('action'),
      'duplicate ref "action": expected one element, received 2',
      payload,
    )
  })

  it('reports exact expected and received types for invalid refs', () => {
    const root = createRoot('form-controls')
    appendRef(root, document.createElement('input'), 'submit')

    expectControlledError(
      () => createRefApi(root, 'form-controls').button('submit'),
      'invalid ref "submit": expected HTMLButtonElement, received <input> in namespace "http://www.w3.org/1999/xhtml"',
      {
        component: 'form-controls',
        root,
        ref: 'submit',
        selector: '[data-ref="submit"]',
        expected: 'HTMLButtonElement',
        received: '<input> in namespace "http://www.w3.org/1999/xhtml"',
      },
    )
  })

  it('rejects SVG elements through the HTMLElement helper', () => {
    const root = createRoot('graphics')
    appendRef(
      root,
      document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      'drawing',
    )

    expectControlledError(
      () => createRefApi(root, 'graphics').element('drawing'),
      'invalid ref "drawing": expected HTMLElement, received <svg> in namespace "http://www.w3.org/2000/svg"',
      {
        component: 'graphics',
        root,
        ref: 'drawing',
        selector: '[data-ref="drawing"]',
        expected: 'HTMLElement',
        received: '<svg> in namespace "http://www.w3.org/2000/svg"',
      },
    )
  })

  it('validates optional single, required many, and optional many ref types', () => {
    const root = createRoot('form-controls')
    appendRef(root, document.createElement('input'), 'control')
    const ref = createRefApi(root, 'form-controls')

    expect(() => ref.optional.button('control')).toThrow(SkipComponentMountError)
    expect(() => ref.many.button('control')).toThrow(SkipComponentMountError)
    expect(() => ref.optional.many.button('control')).toThrow(SkipComponentMountError)
  })

  it('makes no console warning while resolving refs', () => {
    const root = createRoot()
    const warn = vi.spyOn(console, 'warn')

    expect(() => createRefApi(root, 'example').button('missing')).toThrow(
      SkipComponentMountError,
    )
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('BaseComponent ref initialization', () => {
  it('makes ref available during subclass field initialization', () => {
    const root = createRoot('field-initializer')
    const button = appendRef(root, document.createElement('button'), 'submit')

    class FieldInitializer extends Nemesia.Component('field-initializer') {
      public readonly submit = this.ref.button('submit')
    }

    const instance = new FieldInitializer(root)

    expect(instance.submit).toBe(button)
    expect(instance.ref.button('submit')).toBe(button)
  })
})
