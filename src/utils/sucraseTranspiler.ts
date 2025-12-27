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
  } catch {
    return false;
  }
}
