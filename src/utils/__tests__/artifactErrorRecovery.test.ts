/**
 * Tests for Artifact Error Recovery System
 */

import { describe, it, expect } from 'vitest';
import {
  classifyError,
  shouldAttemptRecovery,
  getFallbackRenderer,
  generateErrorDisplay,
} from '../artifactErrorRecovery';

describe('classifyError', () => {
  it('should classify syntax errors correctly', () => {
    const error = classifyError('SyntaxError: Unexpected token }');
    expect(error.type).toBe('syntax');
    expect(error.canAutoFix).toBe(true);
    expect(error.retryStrategy).toBe('with-fix');
  });

  it('should classify import errors correctly', () => {
    const error = classifyError('Failed to resolve module specifier "@radix-ui/react-dialog"');
    expect(error.type).toBe('import');
    expect(error.canAutoFix).toBe(false);
    expect(error.fallbackRenderer).toBe('sandpack');
    expect(error.retryStrategy).toBe('different-renderer');
  });

  it('should classify React errors correctly', () => {
    const error = classifyError('Cannot read properties of null (reading \'useRef\')');
    expect(error.type).toBe('react');
    expect(error.canAutoFix).toBe(true);
    expect(error.retryStrategy).toBe('with-fix');
  });

  it('should classify timeout errors correctly', () => {
    const error = classifyError('Bundle timeout exceeded');
    expect(error.type).toBe('timeout');
    expect(error.canAutoFix).toBe(false);
    expect(error.fallbackRenderer).toBe('sandpack');
    expect(error.retryStrategy).toBe('different-renderer');
  });

  it('should classify bundling errors correctly', () => {
    const error = classifyError('Failed to fetch bundle: 500 Internal Server Error');
    expect(error.type).toBe('bundling');
    expect(error.canAutoFix).toBe(false);
    expect(error.fallbackRenderer).toBe('sandpack');
  });

  it('should classify runtime errors correctly', () => {
    const error = classifyError('TypeError: myFunction is not a function');
    expect(error.type).toBe('runtime');
    expect(error.canAutoFix).toBe(true);
    expect(error.retryStrategy).toBe('with-fix');
  });

  it('should classify unknown errors correctly', () => {
    const error = classifyError('Some random error message');
    expect(error.type).toBe('unknown');
    expect(error.canAutoFix).toBe(true);
    expect(error.retryStrategy).toBe('with-fix');
  });

  it('should handle null error message gracefully', () => {
    const error = classifyError(null as any);
    expect(error.type).toBe('unknown');
    expect(error.message).toBe('An error occurred but no details were provided');
    expect(error.canAutoFix).toBe(false);
    expect(error.retryStrategy).toBe('none');
  });

  it('should handle undefined error message gracefully', () => {
    const error = classifyError(undefined as any);
    expect(error.type).toBe('unknown');
    expect(error.message).toBe('An error occurred but no details were provided');
    expect(error.canAutoFix).toBe(false);
    expect(error.retryStrategy).toBe('none');
  });

  it('should handle empty string error message gracefully', () => {
    const error = classifyError('');
    expect(error.type).toBe('unknown');
    expect(error.message).toBe('An error occurred but no details were provided');
    expect(error.canAutoFix).toBe(false);
    expect(error.retryStrategy).toBe('none');
  });

  it('should handle whitespace-only error message gracefully', () => {
    const error = classifyError('   \n\t   ');
    expect(error.type).toBe('unknown');
    expect(error.message).toBe('An error occurred but no details were provided');
    expect(error.canAutoFix).toBe(false);
    expect(error.retryStrategy).toBe('none');
  });

  it('should handle non-string error message gracefully', () => {
    const error = classifyError(123 as any);
    expect(error.type).toBe('unknown');
    expect(error.message).toBe('An error occurred but no details were provided');
    expect(error.canAutoFix).toBe(false);
    expect(error.retryStrategy).toBe('none');
  });
});

describe('shouldAttemptRecovery', () => {
  it('should allow recovery within max attempts', () => {
    const error = classifyError('SyntaxError: Unexpected token }');
    expect(shouldAttemptRecovery(error, 0, 2)).toBe(true);
    expect(shouldAttemptRecovery(error, 1, 2)).toBe(true);
  });

  it('should prevent recovery after max attempts', () => {
    const error = classifyError('SyntaxError: Unexpected token }');
    expect(shouldAttemptRecovery(error, 2, 2)).toBe(false);
    expect(shouldAttemptRecovery(error, 3, 2)).toBe(false);
  });

  it('should allow one attempt for renderer-switch errors', () => {
    const error = classifyError('Failed to resolve module');
    expect(shouldAttemptRecovery(error, 0, 2)).toBe(true);
    expect(shouldAttemptRecovery(error, 1, 2)).toBe(false);
  });

  it('should not allow recovery for non-fixable errors after first attempt', () => {
    const error = classifyError('Bundle timeout exceeded');
    expect(shouldAttemptRecovery(error, 0, 2)).toBe(true);
    expect(shouldAttemptRecovery(error, 1, 2)).toBe(false);
  });
});

describe('getFallbackRenderer', () => {
  // Note: 'babel' renderer was removed in December 2025 (Sucrase-only architecture)
  // All fallbacks now go to 'sandpack' since it can handle both simple and complex artifacts

  it('should return sandpack for timeout errors', () => {
    const error = classifyError('Bundle timeout exceeded');
    expect(getFallbackRenderer(error, 'bundle')).toBe('sandpack');
  });

  it('should return sandpack for import errors', () => {
    const error = classifyError('Failed to resolve module');
    expect(getFallbackRenderer(error, 'bundle')).toBe('sandpack');
  });

  it('should return sandpack for React errors from bundle', () => {
    const error = classifyError('Cannot read properties of null (reading \'useRef\')');
    expect(getFallbackRenderer(error, 'bundle')).toBe('sandpack');
  });

  it('should return null when already on sandpack (no better option)', () => {
    const error = classifyError('Failed to resolve module');
    // Import errors from sandpack have no better option
    expect(getFallbackRenderer(error, 'sandpack')).toBeNull();
  });

  it('should return null for syntax errors (no renderer change needed)', () => {
    const error = classifyError('SyntaxError: Unexpected token }');
    expect(getFallbackRenderer(error, 'bundle')).toBeNull();
  });
});

describe('generateErrorDisplay', () => {
  it('should generate correct display for syntax errors', () => {
    const error = classifyError('SyntaxError: Unexpected token }');
    const display = generateErrorDisplay(error, false);
    expect(display.title).toBe('Syntax Error');
    expect(display.emoji).toBe('🔴');
    expect(display.color).toBe('red');
  });

  it('should generate correct display for runtime errors', () => {
    const error = classifyError('TypeError: x is not a function');
    const display = generateErrorDisplay(error, false);
    expect(display.title).toBe('Runtime Error');
    expect(display.emoji).toBe('🟠');
    expect(display.color).toBe('orange');
  });

  it('should generate correct display for import errors', () => {
    const error = classifyError('Failed to resolve module');
    const display = generateErrorDisplay(error, false);
    expect(display.title).toBe('Import Error');
    expect(display.emoji).toBe('🟡');
    expect(display.color).toBe('yellow');
  });

  it('should include recovering status in description', () => {
    const error = classifyError('SyntaxError: Unexpected token }');
    const display = generateErrorDisplay(error, true);
    expect(display.description).toContain('Attempting to fix');
  });

  it('should generate correct display for React errors', () => {
    const error = classifyError('Invalid hook call');
    const display = generateErrorDisplay(error, false);
    expect(display.title).toBe('React Error');
    expect(display.emoji).toBe('⚛️');
    expect(display.color).toBe('orange');
  });
});
