/**
 * @jest-environment jsdom
 */

describe('Basic Tests', () => {
  it('basic math test', () => {
    expect(1 + 1).toBe(2)
  })

  it('string concatenation', () => {
    expect("hello world").toBe('hello world')
  })

  it('array operations', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr[0]).toBe(1)
  })
})