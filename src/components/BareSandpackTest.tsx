/**
 * BareSandpackTest - Minimal Sandpack renderer for testing
 *
 * This component tests the hypothesis: "Does Gemini 3 Flash generate code
 * that works with vanilla Sandpack without all our fix layers?"
 *
 * NO:
 * - Server bundling
 * - Export normalizers
 * - CDN fallbacks
 * - React shims
 * - Circuit breakers
 * - Validation layers
 * - Auto-fix logic
 *
 * JUST:
 * - Sandpack with fixed dependencies
 * - Error display
 * - "Ask AI to Fix" button
 */

import { useState, useCallback } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Fixed set of allowed dependencies - these are the ONLY packages available
const ALLOWED_DEPENDENCIES = {
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "recharts": "^2.10.0",
  "framer-motion": "^10.16.0",
  "lucide-react": "^0.294.0",
};

interface BareSandpackTestProps {
  code: string;
  title?: string;
  onAIFix?: (error: string) => void;
}

/**
 * Error display component that lives inside Sandpack context
 */
function SandpackErrorDisplay({ onAIFix }: { onAIFix?: (error: string) => void }) {
  const { sandpack } = useSandpack();

  if (!sandpack.error) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-10">
      <div className="max-w-md bg-destructive/10 border border-destructive rounded-lg p-4 m-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Error</p>
            <pre className="mt-2 text-xs text-destructive/80 whitespace-pre-wrap break-words max-h-32 overflow-auto">
              {sandpack.error.message}
            </pre>
          </div>
        </div>
        {onAIFix && (
          <Button
            onClick={() => onAIFix(sandpack.error?.message || 'Unknown error')}
            className="mt-4 w-full"
            size="sm"
          >
            Ask AI to Fix
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Bare Sandpack renderer - no complexity, just render
 */
export function BareSandpackTest({ code, title, onAIFix }: BareSandpackTestProps) {
  const [key, setKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);

  const handleRefresh = useCallback(() => {
    setKey(k => k + 1);
  }, []);

  // Header height is ~41px, console is 40% when shown
  const headerHeight = 41;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header - fixed height */}
      <div
        className="flex-none flex items-center justify-between px-3 py-2 bg-muted/50 border-b"
        style={{ height: headerHeight }}
      >
        <span className="text-sm font-medium truncate">
          {title || 'Artifact Preview'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsole(!showConsole)}
          >
            {showConsole ? 'Hide' : 'Show'} Console
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sandpack - uses absolute positioning for reliable sizing */}
      <div className="flex-1 relative">
        <SandpackProvider
          key={key}
          template="react"
          files={{
            "/App.js": code,
          }}
          customSetup={{
            dependencies: ALLOWED_DEPENDENCIES,
          }}
          options={{
            externalResources: [
              "https://cdn.tailwindcss.com",
            ],
            recompileMode: "delayed",
            recompileDelay: 500,
          }}
        >
          {/* Preview - absolute positioned to fill container */}
          <div
            className="absolute inset-0"
            style={{
              bottom: showConsole ? '40%' : 0,
            }}
          >
            <SandpackPreview
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              style={{ height: '100%', width: '100%' }}
            />
          </div>

          {/* Console - absolute positioned at bottom */}
          {showConsole && (
            <div
              className="absolute left-0 right-0 bottom-0 border-t bg-background"
              style={{ height: '40%' }}
            >
              <SandpackConsole style={{ height: '100%' }} />
            </div>
          )}

          <SandpackErrorDisplay onAIFix={onAIFix} />
        </SandpackProvider>
      </div>
    </div>
  );
}

/**
 * Test page component - for manual testing
 */
export function BareSandpackTestPage() {
  // Sample test code - a simple counter
  const sampleCode = `
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Counter</h1>
        <p className="text-6xl font-bold text-blue-600 mb-6">{count}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setCount(c => c - 1)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            -1
          </button>
          <button
            onClick={() => setCount(c => c + 1)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            +1
          </button>
        </div>
      </div>
    </div>
  );
}
`;

  const handleAIFix = (error: string) => {
    console.log('AI Fix requested for:', error);
    alert(`Would ask AI to fix: ${error}`);
  };

  return (
    <div className="h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Bare Sandpack Test</h1>
      <p className="text-muted-foreground mb-4">
        Testing vanilla Sandpack without complexity layers.
      </p>
      <div className="h-[600px]">
        <BareSandpackTest
          code={sampleCode}
          title="Sample Counter"
          onAIFix={handleAIFix}
        />
      </div>
    </div>
  );
}
