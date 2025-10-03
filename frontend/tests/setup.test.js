/**
 * Simple test to verify Jest configuration is working properly
 */

describe('Jest Setup Verification', () => {
  test('Jest is working with Next.js 15', () => {
    expect(1 + 1).toBe(2)
  })

  test('Jest mocks are working', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  test('Jest DOM matchers are available', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello World'
    document.body.appendChild(div)
    expect(div).toBeInTheDocument()
    document.body.removeChild(div)
  })
})