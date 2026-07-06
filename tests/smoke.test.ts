import { describe, expect, it } from 'vitest'

import { Nemesia, createApp } from '../src/index.js'

describe('package exports', () => {
  it('exposes createApp as a function on both public API forms', () => {
    expect(createApp).toBeTypeOf('function')
    expect(Nemesia.createApp).toBe(createApp)
  })
})
