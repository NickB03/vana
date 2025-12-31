import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureMermaidInit, resetMermaidInit } from '../mermaidInit';

// Mock the mermaid module
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
  },
}));

// Import after mock setup
import mermaid from 'mermaid';

describe('mermaidInit', () => {
  beforeEach(() => {
    resetMermaidInit();
    vi.clearAllMocks();
  });

  it('initializes mermaid on first call', () => {
    ensureMermaidInit();

    expect(mermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
    expect(mermaid.initialize).toHaveBeenCalledTimes(1);
  });

  it('does not reinitialize on subsequent calls', () => {
    ensureMermaidInit();
    ensureMermaidInit();
    ensureMermaidInit();

    expect(mermaid.initialize).toHaveBeenCalledTimes(1);
  });

  it('allows reinitialization after reset', () => {
    ensureMermaidInit();
    resetMermaidInit();
    ensureMermaidInit();

    expect(mermaid.initialize).toHaveBeenCalledTimes(2);
  });

  it('logs error and rethrows when initialization fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('Mermaid init failed');
    vi.mocked(mermaid.initialize).mockImplementationOnce(() => {
      throw testError;
    });

    expect(() => ensureMermaidInit()).toThrow('Mermaid init failed');
    expect(consoleSpy).toHaveBeenCalledWith('[mermaidInit] Failed to initialize mermaid:', testError);

    consoleSpy.mockRestore();
  });

  it('prevents retry loops after initialization failure', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(mermaid.initialize).mockImplementationOnce(() => {
      throw new Error('Mermaid init failed');
    });

    // First call throws
    expect(() => ensureMermaidInit()).toThrow('Mermaid init failed');

    // Subsequent calls should be no-ops (initialized flag is set to prevent retries)
    ensureMermaidInit(); // Should not throw
    ensureMermaidInit();

    // Initialize was only called once (the failed attempt)
    expect(mermaid.initialize).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
