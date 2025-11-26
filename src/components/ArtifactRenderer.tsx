import { Suspense, useRef, useEffect, useState, memo, useMemo } from "react";
import { ArtifactData } from "./ArtifactContainer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Markdown } from "./prompt-kit/markdown";
import { generateCompleteIframeStyles } from "@/utils/themeUtils";
import { ArtifactSkeleton } from "@/components/ui/artifact-skeleton";
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewUrl, WebPreviewNavigationButton } from '@/components/ai-elements/web-preview';
import { RefreshCw, Maximize2, Download, Edit } from "lucide-react";
import { ValidationResult, categorizeError } from "@/utils/artifactValidator";
import { detectNpmImports } from '@/utils/npmDetection';
import { lazy } from "react";

// Lazy load Sandpack component for code splitting
const SandpackArtifactRenderer = lazy(() =>
  import('./SandpackArtifactRenderer').then(module => ({
    default: module.SandpackArtifactRenderer
  }))
);

interface ArtifactRendererProps {
  artifact: ArtifactData;
  isLoading: boolean;
  previewError: string | null;
  errorCategory: 'syntax' | 'runtime' | 'import' | 'unknown';
  validation: ValidationResult | null;
  injectedCDNs: string;
  themeRefreshKey: number;
  isEditingCode: boolean;
  editedContent: string;
  isFixingError: boolean;
  onEditedContentChange: (content: string) => void;
  onRefresh: () => void;
  onFullScreen: () => void;
  onEdit?: (suggestion?: string) => void;
  onAIFix: () => void;
  onLoadingChange: (loading: boolean) => void;
  onPreviewErrorChange: (error: string | null) => void;
  onErrorCategoryChange: (category: 'syntax' | 'runtime' | 'import' | 'unknown') => void;
}

export const ArtifactRenderer = memo(({
  artifact,
  isLoading,
  previewError,
  errorCategory,
  validation,
  injectedCDNs,
  themeRefreshKey,
  isEditingCode,
  editedContent,
  isFixingError,
  onEditedContentChange,
  onRefresh,
  onFullScreen,
  onEdit,
  onAIFix,
  onLoadingChange,
  onPreviewErrorChange,
  onErrorCategoryChange,
}: ArtifactRendererProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Listen for iframe messages
  useEffect(() => {
    onLoadingChange(true);
    onPreviewErrorChange(null);

    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data?.type === 'artifact-error') {
        const errorInfo = categorizeError(e.data.message);
        onPreviewErrorChange(e.data.message);
        onErrorCategoryChange(errorInfo.category);
        onLoadingChange(false);
      } else if (e.data?.type === 'artifact-ready') {
        onLoadingChange(false);
      }
    };

    const loadTimeout = setTimeout(() => {
      onLoadingChange(false);
    }, 3000);

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
      clearTimeout(loadTimeout);
    };
  }, [artifact.content, onLoadingChange, onPreviewErrorChange, onErrorCategoryChange]);

  // Render mermaid diagrams
  useEffect(() => {
    if (artifact.type === "mermaid" && mermaidRef.current) {
      const renderMermaid = async () => {
        try {
          onLoadingChange(true);
          const mermaid = (await import("mermaid")).default;
          const id = `mermaid-${Date.now()}`;
          const { svg } = await mermaid.render(id, artifact.content);
          if (mermaidRef.current) {
            const template = document.createElement('template');
            const cleanSvg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            template.innerHTML = cleanSvg.trim();
            const svgElement = template.content.firstChild;

            mermaidRef.current.textContent = '';
            if (svgElement) {
              mermaidRef.current.appendChild(svgElement);
            }
          }
          onLoadingChange(false);
        } catch (error) {
          console.error('Mermaid render error:', error);
          onPreviewErrorChange(error instanceof Error ? error.message : 'Failed to render diagram');
          onLoadingChange(false);
        }
      };
      renderMermaid();
    }
  }, [artifact.content, artifact.type, onLoadingChange, onPreviewErrorChange]);

  // Check if needs Sandpack (memoized for performance)
  const needsSandpack = useMemo(() => {
    if (artifact.type !== 'react') return false;
    const sandpackEnabled = import.meta.env.VITE_ENABLE_SANDPACK !== 'false';
    if (!sandpackEnabled) return false;
    return detectNpmImports(artifact.content);
  }, [artifact.content, artifact.type]);

  // Code/HTML rendering
  if (artifact.type === "code" || artifact.type === "html") {
    const isFullHTML = artifact.content.includes("<!DOCTYPE");
    const previewContent = isFullHTML
      ? artifact.content
      : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  ${injectedCDNs}
  ${generateCompleteIframeStyles()}
  <script>
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: e.message + ' at ' + e.filename + ':' + e.lineno
      }, '*');
      return true;
    });
    window.addEventListener('unhandledrejection', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: 'Promise rejection: ' + e.reason
      }, '*');
    });
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);
      window.parent.postMessage({
        type: 'artifact-error',
        message: args.join(' ')
      }, '*');
    };
    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
  </script>
</head>
<body>
${artifact.content}
</body>
</html>`;

    return (
      <div className="w-full h-full relative flex flex-col">
        {validation && !validation.isValid && (
          <Alert variant="destructive" className="m-2 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Validation Errors:</strong>
              <ul className="list-disc pl-4 mt-1">
                {validation.errors.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {validation && validation.warnings.length > 0 && (
          <Alert className="m-2 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Warnings:</strong>
              <ul className="list-disc pl-4 mt-1">
                {validation.warnings.slice(0, 3).map((warn, idx) => (
                  <li key={idx}>{warn.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
              <ArtifactSkeleton type={artifact.type} />
            </div>
          )}
          {previewError && !isLoading && (
            <div className={`absolute top-2 left-2 right-2 text-xs p-3 rounded z-10 flex flex-col gap-2 ${
              errorCategory === 'syntax' ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' :
              errorCategory === 'runtime' ? 'bg-orange-50 border border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200' :
              errorCategory === 'import' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200' :
              'bg-destructive/10 border border-destructive text-destructive'
            }`}>
              <div className="flex items-start gap-2">
                <span className="font-semibold shrink-0">
                  {errorCategory === 'syntax' ? '🔴 Syntax Error:' :
                   errorCategory === 'runtime' ? '🟠 Runtime Error:' :
                   errorCategory === 'import' ? '🟡 Import Error:' :
                   '⚠️ Error:'}
                </span>
                <span className="flex-1 break-words font-mono text-xs">{previewError}</span>
              </div>
              {isFixingError && (
                <div className="flex items-center gap-2 pl-6 text-xs">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  <span>AI is fixing the error...</span>
                </div>
              )}
              <div className="flex gap-2 pl-6">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(previewError);
                    toast.success("Error copied to clipboard");
                  }}
                  disabled={isFixingError}
                >
                  Copy Error
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={onAIFix}
                  disabled={isFixingError}
                >
                  {isFixingError ? "Fixing..." : "🤖 Ask AI to Fix"}
                </Button>
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => onEdit(`Fix this error: ${previewError}`)}
                    disabled={isFixingError}
                  >
                    Ask in Chat
                  </Button>
                )}
              </div>
            </div>
          )}
          <WebPreview defaultUrl="about:blank" key={`webpreview-${themeRefreshKey}`}>
            <WebPreviewNavigation>
              <WebPreviewNavigationButton
                tooltip="Refresh preview"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </WebPreviewNavigationButton>
              <WebPreviewUrl />
              <WebPreviewNavigationButton
                tooltip="Full screen"
                onClick={onFullScreen}
              >
                <Maximize2 className="h-4 w-4" />
              </WebPreviewNavigationButton>
            </WebPreviewNavigation>
            <WebPreviewBody
              srcDoc={previewContent}
              key={`${injectedCDNs}-${themeRefreshKey}`}
              loading={isLoading ? <ArtifactSkeleton type={artifact.type} /> : undefined}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
            />
          </WebPreview>
        </div>
      </div>
    );
  }

  // Markdown rendering
  if (artifact.type === "markdown") {
    return (
      <div className="w-full h-full flex flex-col">
        {isEditingCode ? (
          <div className="flex-1 overflow-auto p-4 bg-muted">
            <textarea
              value={editedContent}
              onChange={(e) => onEditedContentChange(e.target.value)}
              className="w-full h-full p-4 text-sm bg-muted text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 bg-background">
            <Markdown>{artifact.content}</Markdown>
          </div>
        )}
      </div>
    );
  }

  // SVG rendering
  if (artifact.type === "svg") {
    const hasViewBox = artifact.content.includes('viewBox');
    const hasWidthHeight = artifact.content.includes('width=') && artifact.content.includes('height=');

    let svgContent = artifact.content.trim();

    if (!hasViewBox && !hasWidthHeight) {
      svgContent = svgContent.replace(
        /<svg([^>]*)>/,
        '<svg$1 viewBox="0 0 800 600" width="800" height="600">'
      );
    }

    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

    return (
      <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
        <img
          src={svgDataUrl}
          alt={artifact.title}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            console.error('SVG rendering error:', artifact.content);
          }}
        />
      </div>
    );
  }

  // Mermaid rendering
  if (artifact.type === "mermaid") {
    return (
      <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Rendering diagram...</p>
          </div>
        )}
        {previewError && !isLoading && (
          <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2 rounded flex items-start gap-2">
            <span className="font-semibold shrink-0">⚠️ Error:</span>
            <span className="flex-1 break-words">{previewError}</span>
          </div>
        )}
        <div ref={mermaidRef} className={isLoading || previewError ? 'hidden' : ''} />
      </div>
    );
  }

  // Image rendering
  if (artifact.type === "image") {
    return (
      <div className="w-full h-full overflow-auto p-6 bg-muted/30 flex flex-col items-center justify-center gap-4">
        <img
          src={artifact.content}
          alt={artifact.title}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const link = document.createElement('a');
              link.href = artifact.content;
              link.download = `${artifact.title.replace(/\s+/g, '_')}.png`;
              link.click();
              toast.success("Image downloaded");
            }}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={() => onEdit?.(`Edit this image: ${artifact.title}. `)}
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Image
          </Button>
        </div>
      </div>
    );
  }

  // React with Sandpack
  if (artifact.type === "react" && needsSandpack) {
    return (
      <div className="w-full h-full relative">
        <Suspense fallback={<ArtifactSkeleton type="react" />}>
          <SandpackArtifactRenderer
            code={artifact.content}
            title={artifact.title}
            showEditor={false}
            onError={(error) => {
              onPreviewErrorChange(error);
              onLoadingChange(false);
            }}
            onReady={() => onLoadingChange(false)}
          />
        </Suspense>
      </div>
    );
  }

  // React without Sandpack - check if server-bundled
  if (artifact.type === "react") {
    // If bundling failed with npm imports, show error
    if (artifact.bundlingFailed && detectNpmImports(artifact.content)) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
          <div className="w-16 h-16 mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Bundling Failed</h3>
          <p className="text-sm text-muted-foreground mb-1 max-w-md">
            {artifact.bundleError || "This component requires npm packages that couldn't be bundled."}
          </p>
          {artifact.bundleErrorDetails && (
            <p className="text-xs text-muted-foreground mb-4 max-w-md">
              {artifact.bundleErrorDetails}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
            >
              Refresh Page
            </Button>
            {onEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onEdit?.(`Fix this bundling error: ${artifact.bundleError}`)}
              >
                Ask AI for Help
              </Button>
            )}
          </div>
        </div>
      );
    }

    // If artifact has a bundle URL, render via signed URL
    if (artifact.bundleUrl) {
      const ALLOWED_BUNDLE_ORIGINS = [
        import.meta.env.VITE_SUPABASE_URL
      ];

      let isValidOrigin = false;
      try {
        const url = new URL(artifact.bundleUrl);
        isValidOrigin = ALLOWED_BUNDLE_ORIGINS.includes(url.origin);
      } catch {
        isValidOrigin = false;
      }

      if (!isValidOrigin) {
        console.error('[ArtifactRenderer] Invalid bundle URL origin:', artifact.bundleUrl);
        return (
          <div className="flex items-center justify-center h-full p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bundle URL failed security validation. Please refresh the page.
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      return (
        <div className="w-full h-full relative flex flex-col">
          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                <ArtifactSkeleton type="react" />
              </div>
            )}
            {previewError && !isLoading && (
              <div className="absolute top-2 left-2 right-2 bg-destructive/10 border border-destructive text-destructive text-xs p-3 rounded z-10 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="font-semibold shrink-0">⚠️ Bundle Error:</span>
                  <span className="flex-1 break-words font-mono">{previewError}</span>
                </div>
                <div className="flex gap-2 pl-6">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(previewError);
                      toast.success("Error copied to clipboard");
                    }}
                  >
                    Copy Error
                  </Button>
                </div>
              </div>
            )}
            {artifact.dependencies && artifact.dependencies.length > 0 && (
              <div className="absolute bottom-2 right-2 bg-primary/10 border border-primary/20 text-xs px-2 py-1 rounded z-10">
                Bundled with {artifact.dependencies.join(', ')}
              </div>
            )}
            <iframe
              src={artifact.bundleUrl}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => onLoadingChange(false)}
              onError={(e) => {
                console.error('Bundle iframe error:', e);
                onPreviewErrorChange('Failed to load bundled artifact');
                onLoadingChange(false);
              }}
            />
          </div>
        </div>
      );
    }

    // Otherwise use client-side Babel rendering
    const processedCode = artifact.content
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```\n?$/gm, '')
      .replace(/^import\s+.*?from\s+['"]react['"];?\s*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]react-dom['"];?\s*$/gm, '')
      .replace(/^import\s+React.*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]lucide-react['"];?\s*$/gm, '')
      .replace(/^import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"];?\s*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]recharts['"];?\s*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]framer-motion['"];?\s*$/gm, '')
      .replace(/^export\s+default\s+/gm, '')
      .trim();

    const componentMatch = artifact.content.match(/(?:export\s+default\s+)?(?:function\s+)?(\w+)(?=\s*\(|\s*=)/);
    const componentName = componentMatch?.[1] || 'App';

    const reactPreviewContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      console.error('React or ReactDOM failed to load');
      window.parent.postMessage({
        type: 'artifact-error',
        message: 'React libraries failed to load. Please refresh the page.'
      }, '*');
    }
    window.react = window.React;
    window.reactDOM = window.ReactDOM;
  </script>
  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.3.1",
        "react-dom": "https://esm.sh/react-dom@18.3.1",
        "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.0.5?deps=react@18.3.1,react-dom@18.3.1",
        "@radix-ui/react-dropdown-menu": "https://esm.sh/@radix-ui/react-dropdown-menu@2.0.6?deps=react@18.3.1,react-dom@18.3.1",
        "@radix-ui/react-popover": "https://esm.sh/@radix-ui/react-popover@1.0.7?deps=react@18.3.1,react-dom@18.3.1",
        "@radix-ui/react-tabs": "https://esm.sh/@radix-ui/react-tabs@1.0.4?deps=react@18.3.1,react-dom@18.3.1",
        "@radix-ui/react-select": "https://esm.sh/@radix-ui/react-select@2.0.0?deps=react@18.3.1,react-dom@18.3.1",
        "@radix-ui/react-slider": "https://esm.sh/@radix-ui/react-slider@1.1.2?deps=react@18.3.1,react-dom@18.3.1",
        "@radix-ui/react-switch": "https://esm.sh/@radix-ui/react-switch@1.0.3?deps=react@18.3.1,react-dom@18.3.1",
        "@radix-ui/react-tooltip": "https://esm.sh/@radix-ui/react-tooltip@1.0.7?deps=react@18.3.1,react-dom@18.3.1",
        "lucide-react": "https://esm.sh/lucide-react@0.263.1?deps=react@18.3.1"
      }
    }
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/recharts@2.5.0/umd/Recharts.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/framer-motion@11.11.11/dist/framer-motion.js"></script>
  ${injectedCDNs}
  ${generateCompleteIframeStyles()}
  <style>
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module" data-presets="react">
    const { useState, useEffect, useReducer, useRef, useMemo, useCallback } = React;

    const LucideIcons = window.LucideReact || window.lucideReact || {};
    const {
      Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
      ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
      Plus, Minus, Edit, Trash, Save, Download, Upload,
      Search, Filter, Settings, User, Menu, MoreVertical,
      Trophy, Star, Heart, Flag, Target, Award,
      PlayCircle, PauseCircle, SkipForward, SkipBack,
      AlertCircle, CheckCircle, XCircle, Info, HelpCircle,
      Loader, Clock, Calendar, Mail, Phone,
      Grid, List, Layout, Sidebar, Maximize, Minimize,
      Copy, Eye, EyeOff, Lock, Unlock, Share, Link
    } = LucideIcons;

    Object.keys(LucideIcons).forEach(iconName => {
      if (typeof window[iconName] === 'undefined') {
        window[iconName] = LucideIcons[iconName];
      }
    });

    const Recharts = window.Recharts || {};
    const {
      BarChart, LineChart, PieChart, AreaChart, ScatterChart,
      Bar, Line, Pie, Area, Scatter, XAxis, YAxis, CartesianGrid,
      Tooltip, Legend, ResponsiveContainer
    } = Recharts;

    const FramerMotion = window.Motion || {};
    const { motion, AnimatePresence } = FramerMotion;

    Object.keys(FramerMotion).forEach(exportName => {
      if (typeof window[exportName] === 'undefined') {
        window[exportName] = FramerMotion[exportName];
      }
    });

    ${processedCode}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const Component = ${componentName};

      if (typeof Component === 'undefined') {
        throw new Error('Component "${componentName}" is not defined. Make sure you have "export default ${componentName}" in your code.');
      }

      root.render(<Component />);
    } catch (error) {
      window.parent.postMessage({
        type: 'artifact-error',
        message: error.message || 'Failed to render component'
      }, '*');
      console.error('Render error:', error);
    }
  </script>
  <script>
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: e.message
      }, '*');
    });
    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
  </script>
</body>
</html>`;

    return (
      <div className="w-full h-full relative flex flex-col">
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
              <ArtifactSkeleton type="react" />
            </div>
          )}
          {previewError && !isLoading && (
            <div className="absolute top-2 left-2 right-2 bg-destructive/10 border border-destructive text-destructive text-xs p-3 rounded z-10 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold shrink-0">⚠️ Error:</span>
                <span className="flex-1 break-words font-mono">{previewError}</span>
              </div>
              {isFixingError && (
                <div className="flex items-center gap-2 pl-6 text-xs">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  <span>AI is fixing the error...</span>
                </div>
              )}
              <div className="flex gap-2 pl-6">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(previewError);
                    toast.success("Error copied to clipboard");
                  }}
                  disabled={isFixingError}
                >
                  Copy Error
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={onAIFix}
                  disabled={isFixingError}
                >
                  {isFixingError ? "Fixing..." : "🤖 Ask AI to Fix"}
                </Button>
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => onEdit(`Fix this error: ${previewError}`)}
                    disabled={isFixingError}
                  >
                    Ask in Chat
                  </Button>
                )}
              </div>
            </div>
          )}
          <WebPreview defaultUrl="about:blank" key={`webpreview-react-${themeRefreshKey}`}>
            <WebPreviewNavigation>
              <WebPreviewNavigationButton
                tooltip="Refresh preview"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </WebPreviewNavigationButton>
              <WebPreviewUrl />
              <WebPreviewNavigationButton
                tooltip="Full screen"
                onClick={onFullScreen}
              >
                <Maximize2 className="h-4 w-4" />
              </WebPreviewNavigationButton>
            </WebPreviewNavigation>
            <WebPreviewBody
              srcDoc={reactPreviewContent}
              key={`${injectedCDNs}-${themeRefreshKey}`}
              loading={isLoading ? <ArtifactSkeleton type={artifact.type} /> : undefined}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
            />
          </WebPreview>
        </div>
      </div>
    );
  }

  return null;
});

ArtifactRenderer.displayName = "ArtifactRenderer";
