/**
 * Artifact Error Recovery System
 *
 * Provides error classification, recovery strategies, and fallback options
 * for artifacts that fail to render.
 */

export type ErrorType = 'syntax' | 'runtime' | 'import' | 'bundling' | 'timeout' | 'react' | 'unknown';
export type FallbackRenderer = 'sandpack' | 'static-preview';
export type RetryStrategy = 'immediate' | 'with-fix' | 'different-renderer' | 'none';

export interface ArtifactError {
  type: ErrorType;
  message: string;
  originalError: string;
  suggestedFix?: string;
  canAutoFix: boolean;
  fallbackRenderer?: FallbackRenderer;
  retryStrategy: RetryStrategy;
  userMessage: string;
}

/**
 * Error classification rules - patterns and their corresponding error configurations
 */
interface ErrorRule {
  patterns: string[];
  /** For React errors, requires both patterns to match */
  requiresAll?: boolean;
  config: Omit<ArtifactError, 'message' | 'originalError'>;
}

/**
 * Error classification rules - patterns and their corresponding error configurations.
 *
 * IMPORTANT: Rules are evaluated in order (first match wins).
 * More specific rules MUST come before generic ones to ensure
 * proper error classification and user-friendly messaging.
 *
 * Example: Duplicate declaration errors contain "syntaxerror" in some messages,
 * so the duplicate-declaration rule must come before the generic syntax rule.
 */
const ERROR_RULES: ErrorRule[] = [
  {
    // Duplicate declaration detection - MUST be before generic syntax error
    // Covers both import duplicates AND variable redeclarations
    // Engine-specific patterns:
    // - Safari: "Cannot declare a lexical variable twice: 'X'"
    // - Chrome: "Identifier 'X' has already been declared"
    // - Firefox: "redeclaration of let X"
    patterns: [
      'cannot declare a lexical variable twice',  // Safari/JSC
      'has already been declared',                // Chrome/V8
      'redeclaration of let',                     // Firefox let
      'redeclaration of const',                   // Firefox const
      'duplicate identifier',                     // TypeScript
    ],
    config: {
      type: 'syntax',
      suggestedFix: 'Remove the duplicate declaration. For imports: each name should appear once. For variables: rename or remove the duplicate.',
      canAutoFix: true,
      retryStrategy: 'with-fix',
      userMessage: 'Duplicate declaration detected. AI can fix this.',
    },
  },
  {
    patterns: ['syntaxerror', 'unexpected token'],
    config: {
      type: 'syntax',
      suggestedFix: 'The code has a syntax error. Check for missing brackets, quotes, or semicolons.',
      canAutoFix: true,
      retryStrategy: 'with-fix',
      userMessage: 'The code contains a syntax error. AI can automatically fix this.',
    },
  },
  {
    patterns: ['failed to resolve', 'module not found', 'cannot find module', 'import error'],
    config: {
      type: 'import',
      suggestedFix: 'Try using a different rendering method that supports npm packages.',
      canAutoFix: false,
      fallbackRenderer: 'sandpack',
      retryStrategy: 'different-renderer',
      userMessage: 'This artifact needs npm packages. Switching to a different renderer.',
    },
  },
  {
    patterns: ['invalid hook call', 'hooks can only be called', 'rendered more hooks than', 'rendered fewer hooks than'],
    config: {
      type: 'react',
      suggestedFix: 'This is usually caused by React instance conflicts or incorrect hook usage.',
      canAutoFix: true,
      retryStrategy: 'with-fix',
      userMessage: 'React hook error detected. AI can fix hook usage issues.',
    },
  },
  {
    // Special case: requires BOTH patterns to match
    patterns: ['cannot read properties of null', 'useref'],
    requiresAll: true,
    config: {
      type: 'react',
      suggestedFix: 'This is usually caused by React instance conflicts or incorrect hook usage.',
      canAutoFix: true,
      retryStrategy: 'with-fix',
      userMessage: 'React hook error detected. AI can fix hook usage issues.',
    },
  },
  {
    patterns: ['timeout', 'bundle timeout'],
    config: {
      type: 'timeout',
      suggestedFix: 'Try using a simpler rendering method without server bundling.',
      canAutoFix: false,
      fallbackRenderer: 'sandpack',
      retryStrategy: 'different-renderer',
      userMessage: 'Loading timed out. Switching to faster rendering method.',
    },
  },
  {
    patterns: ['bundling failed', 'bundle error', 'failed to fetch bundle'],
    config: {
      type: 'bundling',
      suggestedFix: 'Server bundling failed. Try a different rendering approach.',
      canAutoFix: false,
      fallbackRenderer: 'sandpack',
      retryStrategy: 'different-renderer',
      userMessage: 'Server bundling failed. Trying alternative renderer.',
    },
  },
  {
    patterns: ['typeerror', 'referenceerror', 'is not defined', 'is not a function', 'cannot read property', 'cannot read properties of undefined'],
    config: {
      type: 'runtime',
      suggestedFix: 'The code has a runtime error. Variables or functions may be undefined.',
      canAutoFix: true,
      retryStrategy: 'with-fix',
      userMessage: 'Runtime error detected. AI can fix undefined variables or incorrect function calls.',
    },
  },
];

const UNKNOWN_ERROR_CONFIG: Omit<ArtifactError, 'message' | 'originalError'> = {
  type: 'unknown',
  suggestedFix: 'An unexpected error occurred. AI will attempt to fix it.',
  canAutoFix: true,
  retryStrategy: 'with-fix',
  userMessage: 'An error occurred. AI can attempt to fix this.',
};

/**
 * Classifies an error message into a specific error type with recovery options
 */
export function classifyError(errorMessage: string): ArtifactError {
  // Validate input - handle null, undefined, empty
  if (!errorMessage || typeof errorMessage !== 'string' || errorMessage.trim() === '') {
    console.warn('[artifactErrorRecovery] classifyError called with empty/invalid message');
    return {
      type: 'unknown',
      message: 'An error occurred but no details were provided',
      originalError: String(errorMessage || ''),
      suggestedFix: 'Try refreshing the page or regenerating the artifact.',
      canAutoFix: false,  // Don't auto-fix without context
      retryStrategy: 'none',
      userMessage: 'An error occurred. Please try again.',
    };
  }

  const msg = errorMessage.toLowerCase();

  for (const rule of ERROR_RULES) {
    const matches = rule.requiresAll
      ? rule.patterns.every(pattern => msg.includes(pattern))
      : rule.patterns.some(pattern => msg.includes(pattern));

    if (matches) {
      return {
        message: errorMessage,
        originalError: errorMessage,
        ...rule.config,
      };
    }
  }

  return {
    message: errorMessage,
    originalError: errorMessage,
    ...UNKNOWN_ERROR_CONFIG,
  };
}

/**
 * Determines if automatic recovery should be attempted based on error type and attempt count
 */
export function shouldAttemptRecovery(
  error: ArtifactError,
  attemptCount: number,
  maxAttempts: number = 2
): boolean {
  // Never retry more than max attempts
  if (attemptCount >= maxAttempts) {
    return false;
  }

  // Import and bundling errors need renderer switch, not retry
  if (error.type === 'import' || error.type === 'bundling' || error.type === 'timeout') {
    return attemptCount === 0; // Only try once to switch renderer
  }

  // Auto-fixable errors can retry
  return error.canAutoFix;
}

/**
 * Fallback renderer mapping by error type
 * Key: error type, Value: map of current renderer to fallback
 * Note: 'babel' renderer was removed in December 2025 (Sucrase-only architecture)
 */
const FALLBACK_RENDERERS: Partial<Record<ErrorType, Partial<Record<'bundle' | 'sandpack', FallbackRenderer>>>> = {
  timeout: { bundle: 'sandpack' },
  bundling: { bundle: 'sandpack' },
  import: { bundle: 'sandpack' },
  react: { bundle: 'sandpack' },
};

/**
 * Determines the best fallback renderer based on error type and current renderer
 */
export function getFallbackRenderer(
  error: ArtifactError,
  currentRenderer: 'bundle' | 'sandpack'
): FallbackRenderer | null {
  // If error suggests a specific fallback, use it (unless we're already on it)
  if (error.fallbackRenderer && error.fallbackRenderer !== currentRenderer) {
    return error.fallbackRenderer;
  }

  // Look up fallback from mapping
  return FALLBACK_RENDERERS[error.type]?.[currentRenderer] ?? null;
}

/**
 * Generates user-friendly error display content
 */
export function generateErrorDisplay(error: ArtifactError, isRecovering: boolean): {
  title: string;
  description: string;
  emoji: string;
  color: 'red' | 'orange' | 'yellow' | 'blue';
} {
  const baseDisplay = {
    syntax: {
      title: 'Syntax Error',
      emoji: '🔴',
      color: 'red' as const,
      description: error.userMessage,
    },
    runtime: {
      title: 'Runtime Error',
      emoji: '🟠',
      color: 'orange' as const,
      description: error.userMessage,
    },
    import: {
      title: 'Import Error',
      emoji: '🟡',
      color: 'yellow' as const,
      description: error.userMessage,
    },
    bundling: {
      title: 'Bundling Error',
      emoji: '⚙️',
      color: 'blue' as const,
      description: error.userMessage,
    },
    timeout: {
      title: 'Timeout Error',
      emoji: '⏱️',
      color: 'yellow' as const,
      description: error.userMessage,
    },
    react: {
      title: 'React Error',
      emoji: '⚛️',
      color: 'orange' as const,
      description: error.userMessage,
    },
    unknown: {
      title: 'Rendering Error',
      emoji: '⚠️',
      color: 'orange' as const,
      description: error.userMessage,
    },
  };

  const display = baseDisplay[error.type];

  // Add recovery status to description
  if (isRecovering) {
    display.description = `Attempting to fix... ${display.description}`;
  }

  return display;
}
