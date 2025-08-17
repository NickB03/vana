// Simple test to verify the test setup works
describe('Test Setup', () => {
  it('basic Jest functionality works', () => {
    expect(1 + 1).toBe(2)
  })

  it('can import TypeScript modules', () => {
    const testString: string = 'Hello, TypeScript!'
    expect(testString).toBe('Hello, TypeScript!')
  })
})