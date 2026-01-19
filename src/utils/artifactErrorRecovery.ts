/**
 * Artifact Error Recovery System
 *
 * Provides error classification, recovery strategies, and fallback rendering
 * for artifact display errors. Works with Sandpack's natural error handling.
 */

import type { ArtifactType } from "@/components/ArtifactContainer";

/**
 * Fallback renderer options when primary renderer fails
 */
export type FallbackRenderer = 'sandpack' | 'static-preview';

/**
 * Error types that can occur during artifact rendering
 */
export type ArtifactErrorType =
  | 'syntax'           // Parse/syntax errors in the code
  | 'import'           // Missing or failed imports
  | 'runtime'          // Runtime execution errors
  | 'bundling'         // Server-side bundling failed
  | 'network'          // Network/fetch failures
  | 'timeout'          // Operation timeout
  | 'security'         // Security policy violations
  | 'unknown';         // Catch-all for unclassified errors

/**
 * Retry strategy for error recovery
 */
export type RetryStrategy = 'immediate' | 'delay' | 'fallback' | 'none';

/**
 * Classified error with recovery information
 */
export interface ArtifactError {
  type: ArtifactErrorType;
  originalError: string;
  suggestedFix?: string;
  canAutoFix: boolean;
  retryStrategy: RetryStrategy;
  fallbackRenderer?: FallbackRenderer;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Error display information for the UI
 */
export interface ErrorDisplay {
  title: string;
  description: string;
  color: 'red' | 'orange' | 'yellow' | 'blue';
}

/**
 * Classifies an error message into a structured ArtifactError
 */
export function classifyError(errorMessage: string): ArtifactError {
  const lower = errorMessage.toLowerCase();

  // Import/module resolution errors
  if (lower.includes('cannot find module') ||
      lower.includes('module not found') ||
      lower.includes('failed to resolve') ||
      lower.includes('import')) {
    return {
      type: 'import',
      originalError: errorMessage,
      suggestedFix: 'Check that all imports reference valid npm packages or use relative paths.',
      canAutoFix: true,
      retryStrategy: 'fallback',
      fallbackRenderer: 'sandpack',
      severity: 'medium',
    };
  }

  // Syntax errors
  if (lower.includes('syntax') ||
      lower.includes('unexpected token') ||
      lower.includes('parsing error') ||
      lower.includes('unterminated')) {
    return {
      type: 'syntax',
      originalError: errorMessage,
      suggestedFix: 'Check for missing brackets, quotes, or other syntax issues.',
      canAutoFix: true,
      retryStrategy: 'none',
      severity: 'high',
    };
  }

  // Runtime errors
  if (lower.includes('undefined') ||
      lower.includes('null') ||
      lower.includes('typeerror') ||
      lower.includes('referenceerror')) {
    return {
      type: 'runtime',
      originalError: errorMessage,
      suggestedFix: 'Ensure all variables and functions are properly defined before use.',
      canAutoFix: true,
      retryStrategy: 'immediate',
      severity: 'medium',
    };
  }

  // Bundling errors
  if (lower.includes('bundl') || lower.includes('esbuild') || lower.includes('transpil')) {
    return {
      type: 'bundling',
      originalError: errorMessage,
      suggestedFix: 'The bundling service encountered an issue. Try refreshing or simplifying the code.',
      canAutoFix: false,
      retryStrategy: 'fallback',
      fallbackRenderer: 'sandpack',
      severity: 'medium',
    };
  }

  // Network errors
  if (lower.includes('network') ||
      lower.includes('fetch') ||
      lower.includes('failed to load') ||
      lower.includes('cors')) {
    return {
      type: 'network',
      originalError: errorMessage,
      suggestedFix: 'Check your network connection and try again.',
      canAutoFix: false,
      retryStrategy: 'delay',
      severity: 'low',
    };
  }

  // Timeout errors
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      type: 'timeout',
      originalError: errorMessage,
      suggestedFix: 'The operation took too long. Try simplifying the code or refreshing.',
      canAutoFix: false,
      retryStrategy: 'delay',
      severity: 'low',
    };
  }

  // Security errors
  if (lower.includes('security') ||
      lower.includes('csp') ||
      lower.includes('cross-origin') ||
      lower.includes('blocked')) {
    return {
      type: 'security',
      originalError: errorMessage,
      suggestedFix: 'The code may be violating browser security policies.',
      canAutoFix: false,
      retryStrategy: 'none',
      severity: 'high',
    };
  }

  // Unknown/catch-all
  return {
    type: 'unknown',
    originalError: errorMessage,
    suggestedFix: 'An unexpected error occurred. Try refreshing or modifying the code.',
    canAutoFix: true,
    retryStrategy: 'immediate',
    severity: 'medium',
  };
}

/**
 * Determines if automatic recovery should be attempted
 */
export function shouldAttemptRecovery(
  error: ArtifactError,
  currentAttempts: number,
  maxAttempts: number
): boolean {
  // Don't retry if max attempts reached
  if (currentAttempts >= maxAttempts) return false;

  // Don't retry if strategy is 'none'
  if (error.retryStrategy === 'none') return false;

  // Retry for recoverable error types
  return error.retryStrategy !== 'none';
}

/**
 * Gets the fallback renderer for an error
 */
export function getFallbackRenderer(
  error: ArtifactError | null,
  currentRenderer: string
): FallbackRenderer | null {
  if (!error) return null;

  // If already using sandpack and it failed, try static preview
  if (currentRenderer === 'sandpack' && error.fallbackRenderer === 'sandpack') {
    return 'static-preview';
  }

  return error.fallbackRenderer || null;
}

/**
 * Generates user-friendly error display information
 */
export function generateErrorDisplay(
  error: ArtifactError,
  isRecovering: boolean
): ErrorDisplay {
  if (isRecovering) {
    return {
      title: 'Attempting Recovery',
      description: 'Trying to fix the issue automatically...',
      color: 'blue',
    };
  }

  const titles: Record<ArtifactErrorType, string> = {
    syntax: 'Code Syntax Issue',
    import: 'Import Problem',
    runtime: 'Runtime Error',
    bundling: 'Bundling Issue',
    network: 'Connection Problem',
    timeout: 'Request Timed Out',
    security: 'Security Restriction',
    unknown: 'Something Went Wrong',
  };

  const colors: Record<ArtifactErrorType, ErrorDisplay['color']> = {
    syntax: 'red',
    import: 'orange',
    runtime: 'orange',
    bundling: 'yellow',
    network: 'yellow',
    timeout: 'yellow',
    security: 'red',
    unknown: 'yellow',
  };

  return {
    title: titles[error.type],
    description: error.suggestedFix || 'Please try again or modify the code.',
    color: colors[error.type],
  };
}

/**
 * Creates an ArtifactError for a specific artifact type error
 */
export function handleArtifactTypeError(
  errorMessage: string,
  artifactType: ArtifactType
): ArtifactError {
  const baseError = classifyError(errorMessage);

  // Type-specific enhancements
  switch (artifactType) {
    case 'react':
      if (baseError.type === 'import') {
        baseError.suggestedFix = 'React components must use valid npm packages. Avoid @/ or relative imports to non-existent files.';
      }
      break;
    case 'mermaid':
      baseError.suggestedFix = 'Check Mermaid diagram syntax. Ensure proper diagram type declaration.';
      baseError.canAutoFix = true;
      break;
    case 'svg':
      baseError.suggestedFix = 'Ensure SVG syntax is valid with proper namespaces and attributes.';
      break;
  }

  return baseError;
}
