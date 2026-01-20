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

interface SandpackArtifactRendererProps {
  code: string;
  title: string;
  showEditor?: boolean;
  onError?: (error: string) => void;
  onReady?: () => void;
}

export const SandpackArtifactRenderer = ({
  code,
  title,
  showEditor = false,
  onError,
  onReady,
}: SandpackArtifactRendererProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DEBUG: Log code received for rendering
  console.log('[Sandpack] 🎨 Rendering artifact:');
  console.log('  - Title:', title);
  console.log('  - Code length:', code?.length ?? 0);
  console.log('  - Code is empty:', !code || code.trim() === '');
  console.log('  - Code type:', typeof code);
  console.log('  - Code preview:', code?.substring(0, 150));

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
  console.log('[Sandpack] 📁 Files object:', {
    fileKeys: Object.keys(files),
    appJsLength: files['/App.js']?.code?.length,
    appJsPreview: files['/App.js']?.code?.substring(0, 200),
  });

  return (
    <div className="w-full h-full">
      <SandboxProvider
        key={sandpackKey}
        template="react"
        files={files}
        customSetup={customSetup}
        options={options}
      >
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
              showRefreshButton
              showNavigator={false}
            />
          )}
        </SandboxLayout>
      </SandboxProvider>
    </div>
  );
};

