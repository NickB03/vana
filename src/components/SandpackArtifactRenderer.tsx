import { useState, useEffect, useMemo } from 'react';
import {
  SandboxProvider,
  SandboxLayout,
  SandboxPreview,
  SandboxCodeEditor
} from '@/components/kibo-ui/sandbox';
import { extractNpmDependencies } from '@/utils/npmDetection';
import { ArtifactSkeleton } from '@/components/ui/artifact-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSandpackBundle } from '@/hooks/useSandpackBundle';
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';
import { sandpackDarkTheme } from '@/utils/sandpackTheme';

interface SandpackArtifactRendererProps {
  code: string;
  title: string;
  showEditor?: boolean;
  onError?: (error: string) => void;
  onReady?: () => void;
  previewContentRef?: React.MutableRefObject<string | null>;
  onBundleError?: (error: Error) => void;
}

interface BundleExtractorProps {
  title: string;
  dependencies: Record<string, string>;
  previewContentRef?: React.MutableRefObject<string | null>;
  onBundleError?: (error: Error) => void;
}

/**
 * Internal component that extracts the transpiled bundle from Sandpack
 * and generates standalone HTML for pop-out windows.
 *
 * MUST be rendered inside SandboxProvider to access Sandpack context.
 */
function BundleExtractor({
  title,
  dependencies,
  previewContentRef,
  onBundleError,
}: BundleExtractorProps) {
  const { bundle, isReady } = useSandpackBundle();

  // DEBUG: Log bundle state changes
  useEffect(() => {
    console.log('[BundleExtractor] State update:', {
      isReady,
      bundleLength: bundle.length,
      hasRef: !!previewContentRef,
      bundlePaths: bundle.map(m => m.path),
    });
  }, [isReady, bundle, previewContentRef]);

  useEffect(() => {
    console.log('[BundleExtractor] Checking conditions:', {
      isReady,
      bundleLength: bundle.length,
      hasRef: !!previewContentRef,
      willGenerate: isReady && bundle.length > 0 && !!previewContentRef,
    });

    if (isReady && bundle.length > 0 && previewContentRef) {
      try {
        const html = generateStandaloneReactHTML({
          title,
          modules: bundle,
          dependencies,
        });
        previewContentRef.current = html;
        if (import.meta.env.DEV) {
          console.log('[BundleExtractor] Generated standalone HTML:', {
            title,
            modulesCount: bundle.length,
            htmlLength: html.length,
          });
        }
      } catch (error) {
        console.error('[BundleExtractor] Failed to generate standalone HTML:', error);
        previewContentRef.current = null;
        onBundleError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [isReady, bundle, title, dependencies, previewContentRef, onBundleError]);

  return null; // This component is invisible, just extracts data
}

export const SandpackArtifactRenderer = ({
  code,
  title,
  showEditor = false,
  onError,
  onReady,
  previewContentRef,
  onBundleError,
}: SandpackArtifactRendererProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DEBUG: Log code received for rendering
  if (import.meta.env.DEV) {
    console.log('[Sandpack] 🎨 Rendering artifact:');
    console.log('  - Title:', title);
    console.log('  - Code length:', code?.length ?? 0);
    console.log('  - Code is empty:', !code || code.trim() === '');
    console.log('  - Code type:', typeof code);
    console.log('  - Code preview:', code?.substring(0, 150));
  }

  // VALIDATION: Check for empty code
  if (!code || code.trim() === '') {
    console.error('[Sandpack] ❌ Empty code provided to renderer');
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No code provided for this artifact. The artifact content is empty.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Generate a stable key from code content to force Sandpack remount on code changes
  // This ensures the sandbox fully reloads when code is updated (cache busting)
  const sandpackKey = useMemo(() => {
    // Simple hash function for generating unique key from code
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `sandpack-${hash}`;
  }, [code]);

  // Extract dependencies from code
  const dependencies = extractNpmDependencies(code);

  // Create files object for Sandpack
  // CRITICAL: Use /App.js (not .jsx) to override the template's default App.js file
  const files = {
    '/App.js': {
      code: code,
      active: true,
    },
  };

  // Setup Sandpack configuration
  const customSetup = {
    dependencies: {
      react: '18.3.0',
      'react-dom': '18.3.0',
      ...dependencies,
    },
  };

  const options = {
    externalResources: ['https://cdn.tailwindcss.com'],
    autorun: true,
    recompileMode: 'delayed' as const,
    recompileDelay: 300,
  };

  // Handle initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
      onReady?.();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onReady]);

  // Handle errors
  const handleError = (err: string) => {
    setError(err);
    onError?.(err);
  };

  // Show loading skeleton during initialization
  if (isInitializing) {
    return <ArtifactSkeleton type="react" className="w-full h-full" />;
  }

  // Show error alert if there's an error
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // DEBUG: Log files object before passing to Sandpack
  if (import.meta.env.DEV) {
    console.log('[Sandpack] 📁 Files object:', {
      fileKeys: Object.keys(files),
      appJsLength: files['/App.js']?.code?.length,
      appJsPreview: files['/App.js']?.code?.substring(0, 200),
    });
  }

  return (
    <div className="w-full h-full">
      <SandboxProvider
        key={sandpackKey}
        template="react"
        files={files}
        customSetup={customSetup}
        options={options}
        theme={sandpackDarkTheme}
      >
        {/* Extract bundle for pop-out windows (invisible component) */}
        <BundleExtractor
          title={title}
          dependencies={dependencies}
          previewContentRef={previewContentRef}
          onBundleError={onBundleError}
        />

        <SandboxLayout>
          {showEditor ? (
            <SandboxCodeEditor
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
            />
          ) : (
            <SandboxPreview
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              showNavigator={false}
            />
          )}
        </SandboxLayout>
      </SandboxProvider>
    </div>
  );
};

