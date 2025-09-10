/**
 * Simple Test to Validate Jest Setup
 */

describe('Jest Setup Validation', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to test utilities', () => {
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.createSSEEvent).toBeDefined();
    expect(global.testUtils.waitFor).toBeDefined();
  });

  it('should have EventSource mock available', () => {
    expect(global.EventSource).toBeDefined();
    expect(global.EventSource.reset).toBeDefined();
  });

  it('should have localStorage mock', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
    localStorage.clear();
  });

  it('should have fetch mock', () => {
    expect(fetch).toBeDefined();
    expect(typeof fetch).toBe('function');
  });
});