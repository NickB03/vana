/**
 * Sucrase Transpiler for Artifact Code
 *
 * Replaces Babel Standalone with Sucrase for 20x faster transpilation
 * and 96% smaller bundle size.
 *
 * Reference: https://github.com/alangpierce/sucrase
 * Used by: Claude Artifacts, CodeSandbox, Expo
 */
import { transform } from 'sucrase';
import * as Sentry from '@sentry/react';

export interface TranspileResult {
  success: true;
  code: string;
  elapsed: number;
}

export interface TranspileError {
  success: false;
  error: string;
  details?: string;
  line?: number;
  column?: number;
}

/**
 * Transpiles JSX/TypeScript code to browser-compatible JavaScript
 *
 * @param code - Source code with JSX and/or TypeScript
 * @param options - Transpilation options
 * @returns Transpiled code or error
 */
export function transpileCode(
  code: string,
  options?: {
    filename?: string;
    preserveJsxPragma?: boolean;
  }
): TranspileResult | TranspileError {
  const start = performance.now();

  try {
    const result = transform(code, {
      transforms: ['jsx', 'typescript'],
      production: true,
      disableESTransforms: true, // Keep ES modules, don't downlevel
      jsxPragma: 'React.createElement',
      jsxFragmentPragma: 'React.Fragment',
      filePath: options?.filename,
    });

    const elapsed = performance.now() - start;

    // Log success with timing for debugging
    console.log(`[sucraseTranspiler] Transpilation successful in ${elapsed.toFixed(2)}ms (${code.length} chars)`);

    // Add Sentry breadcrumb for success path traceability
    Sentry.addBreadcrumb({
      category: 'transpiler.sucrase',
      message: 'Sucrase transpilation successful',
      level: 'info',
      data: {
        elapsed,
        codeLength: code.length,
        outputLength: result.code.length,
        filename: options?.filename,
      },
    });

    return {
      success: true,
      code: result.code,
      elapsed,
    };
  } catch (error) {
    const elapsed = performance.now() - start;

    // Parse Sucrase error format for line/column info
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lineMatch = errorMessage.match(/\((\d+):(\d+)\)/);

    // Log failure with error details for debugging
    console.warn(`[sucraseTranspiler] Transpilation failed after ${elapsed.toFixed(2)}ms: ${errorMessage}`);

    // Add Sentry breadcrumb for failure path traceability
    Sentry.addBreadcrumb({
      category: 'transpiler.sucrase',
      message: 'Sucrase transpilation failed',
      level: 'warning',
      data: {
        elapsed,
        codeLength: code.length,
        error: errorMessage,
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
        column: lineMatch ? parseInt(lineMatch[2], 10) : undefined,
      },
    });

    // Report to Sentry for monitoring
    Sentry.captureException(error, {
      tags: {
        component: 'sucraseTranspiler',
        action: 'transpile',
      },
      extra: {
        codeLength: code.length,
        elapsed,
      },
    });

    return {
      success: false,
      error: 'Transpilation failed',
      details: errorMessage,
      line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
      column: lineMatch ? parseInt(lineMatch[2], 10) : undefined,
    };
  }
}

/**
 * Checks if Sucrase is available and working
 * Used for feature flag gating and health checks
 */
export function isSucraseAvailable(): boolean {
  try {
    const result = transpileCode('const x: number = 1;');
    return result.success;
  } catch (error) {
    console.warn('[sucraseTranspiler] Availability check failed:', error);

    Sentry.captureException(error, {
      level: 'warning',
      tags: {
        component: 'sucraseTranspiler',
        action: 'availability-check',
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    });

    return false;
  }
}
