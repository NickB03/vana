/**
 * Mermaid initialization singleton
 * Ensures mermaid.initialize() is only called once across the application
 */
import mermaid from 'mermaid';

let initialized = false;

/**
 * Ensures mermaid is initialized with default configuration.
 * Safe to call multiple times - only initializes on first call.
 * Use resetMermaidInit() to reset state for testing purposes.
 */
export function ensureMermaidInit(): void {
  if (initialized) {
    return;
  }

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });
    initialized = true;
  } catch (error) {
    console.error('[mermaidInit] Failed to initialize mermaid:', error);
    // Set initialized to prevent retry loops that spam errors
    initialized = true;
    throw error;
  }
}

/**
 * Resets initialization state (for testing purposes only)
 */
export function resetMermaidInit(): void {
  initialized = false;
}
