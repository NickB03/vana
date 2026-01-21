import { useSandpack } from '@codesandbox/sandpack-react';
import type { SandpackBundlerFiles } from '@codesandbox/sandpack-client';
import { useEffect, useState } from 'react';

export interface BundledModule {
  path: string;
  code: string;
}

export interface SandpackBundleResult {
  bundle: BundledModule[];
  isReady: boolean;
}

/**
 * Extracts transpiled JavaScript code from Sandpack's bundler
 * for use in standalone HTML generation (e.g., pop-out windows).
 *
 * This hook monitors the Sandpack bundler state and extracts compiled
 * JavaScript from all transpiled modules once compilation is complete.
 *
 * @returns {SandpackBundleResult} Object containing:
 *   - bundle: Array of modules with path and transpiled code
 *   - isReady: Boolean indicating if bundler has completed compilation
 *
 * @example
 * ```tsx
 * function ArtifactPopout() {
 *   const { bundle, isReady } = useSandpackBundle();
 *
 *   if (!isReady) return <div>Compiling...</div>;
 *
 *   const html = generateHTML(bundle);
 *   return <iframe srcDoc={html} />;
 * }
 * ```
 */
export function useSandpackBundle(): SandpackBundleResult {
  const { sandpack } = useSandpack();
  const [bundle, setBundle] = useState<BundledModule[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if bundler is ready - only 'done' status guarantees transpilation is complete
    const bundlerReady = sandpack.status === 'done';
    const hasModules = bundlerReady &&
      sandpack.bundlerState?.transpiledModules &&
      Object.keys(sandpack.bundlerState.transpiledModules).length > 0;

    // Reset if bundler is not ready or has no modules
    if (!hasModules) {
      setBundle([]);
      setIsReady(false);
      return;
    }

    // Bundler is ready with modules - extract transpiled code
    setIsReady(true);
    const transpiledModules = sandpack.bundlerState.transpiledModules;

    const extractedModules: BundledModule[] = Object.entries(transpiledModules)
      .map(([path, module]) => {
        // Use proper typing for Sandpack's complex module structure
        const typedModule = module as any;
        const code = typedModule?.source?.compiledCode;

        // Skip modules without compiled code
        if (!code) return null;

        return {
          path,
          code,
        };
      })
      .filter((module): module is BundledModule => module !== null);

    setBundle(extractedModules);
  }, [
    sandpack.status,
    sandpack.bundlerState,
  ]);

  return {
    bundle,
    isReady,
  };
}
