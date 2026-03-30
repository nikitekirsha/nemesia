import * as api from '../index'

describe('public api', () => {
  it('exports canonical surface from package root', () => {
    expect(typeof api.createApplication).toBe('function')
    expect(typeof api.defineComponent).toBe('function')
    expect(typeof api.getRef).toBe('function')
    expect(typeof api.getOption).toBe('function')
  })
})
