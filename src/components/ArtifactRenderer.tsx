import { Suspense, useRef, useEffect, useState, memo, lazy } from "react";
import { ArtifactData } from "./ArtifactContainer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Markdown } from "@/components/ui/markdown";
import { ArtifactSkeleton } from "@/components/ui/artifact-skeleton";
import { ValidationResult } from "@/utils/artifactValidator";

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
  refreshTimestamp: number;
  isEditingCode: boolean;
  editedContent: string;
  isFixingError: boolean;
  onEditedContentChange: (content: string) => void;
  onRefresh: () => void;
  onFullScreen: () => void;
  onEdit?: (suggestion?: string) => void;
  onAIFix: () => void;
  onBundleReactFallback?: (errorMessage: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onPreviewErrorChange: (error: string | null) => void;
  onErrorCategoryChange: (category: 'syntax' | 'runtime' | 'import' | 'unknown') => void;
  previewContentRef?: React.MutableRefObject<string | null>;
}

/**
 * Simplified ArtifactRenderer using vanilla Sandpack for React artifacts.
 *
 * This component delegates React rendering to SandpackArtifactRenderer,
 * which uses @codesandbox/sandpack-react for instant, zero-config previews.
 *
 * For non-React artifacts (markdown, SVG, mermaid, images), it uses simple
 * native rendering without any complex bundling or transpilation.
 */
export const ArtifactRenderer = memo(({
  artifact,
  isLoading,
  previewError,
  errorCategory,
  validation,
  injectedCDNs,
  refreshTimestamp,
  isEditingCode,
  editedContent,
  isFixingError,
  onEditedContentChange,
  onRefresh,
  onFullScreen,
  onEdit,
  onAIFix,
  onBundleReactFallback,
  onLoadingChange,
  onPreviewErrorChange,
  onErrorCategoryChange,
  previewContentRef,
}: ArtifactRendererProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Track loading start time for elapsed logging
  const loadingStartTimeRef = useRef<number>(Date.now());

  // Start loading when artifact changes
  useEffect(() => {
    loadingStartTimeRef.current = Date.now();
    onLoadingChange(true);
    onPreviewErrorChange(null);
  }, [artifact.id, onLoadingChange, onPreviewErrorChange]);

  // Render mermaid diagrams
  useEffect(() => {
    if (artifact.type === "mermaid" && mermaidRef.current) {
      const renderMermaid = async () => {
        try {
          onLoadingChange(true);
          const { ensureMermaidInit } = await import('../utils/mermaidInit');
          ensureMermaidInit();
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
          window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
        } catch (error) {
          console.error('Mermaid render error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to render diagram';
          onPreviewErrorChange(errorMessage);
          onLoadingChange(false);
          window.postMessage({ type: 'artifact-rendered-complete', success: false, error: errorMessage }, '*');
        }
      };
      renderMermaid();
    }
  }, [artifact.content, artifact.type, onLoadingChange, onPreviewErrorChange]);

  // Markdown rendering
  if (artifact.type === "markdown") {
    // Signal ready after initial render
    useEffect(() => {
      onLoadingChange(false);
      window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
    }, [onLoadingChange]);

    return (
      <div className="w-full h-full flex flex-col relative">
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
      <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center relative">
        <img
          src={svgDataUrl}
          alt={artifact.title}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-full object-contain"
          onLoad={() => {
            onPreviewErrorChange(null);
            onLoadingChange(false);
            window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
          }}
          onError={() => {
            const errorMsg = 'The SVG image failed to render. The image data may be corrupted or contain invalid syntax.';
            onPreviewErrorChange(errorMsg);
            onLoadingChange(false);
            window.postMessage({ type: 'artifact-rendered-complete', success: false, error: errorMsg }, '*');
          }}
        />
      </div>
    );
  }

  // Mermaid rendering
  if (artifact.type === "mermaid") {
    return (
      <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
        {isLoading && <ArtifactSkeleton type="mermaid" />}
        {previewError && !isLoading && (
          <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2 rounded flex items-start gap-2">
            <span className="font-semibold shrink-0">Error:</span>
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
      <div className="w-full h-full overflow-auto p-6 bg-muted/30 flex flex-col items-center justify-center gap-4 relative">
        <img
          src={artifact.content}
          alt={artifact.title}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
          onLoad={() => {
            onPreviewErrorChange(null);
            onLoadingChange(false);
            window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
          }}
          onError={() => {
            const errorMsg = 'The image failed to load. This may be due to an invalid URL, network issue, or unsupported format.';
            onPreviewErrorChange(errorMsg);
            onLoadingChange(false);
            window.postMessage({ type: 'artifact-rendered-complete', success: false, error: errorMsg }, '*');
          }}
        />
        {previewError && (
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{previewError}</AlertDescription>
          </Alert>
        )}
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

  // React artifacts - delegate to Sandpack
  if (artifact.type === "react") {
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
              window.postMessage({ type: 'artifact-rendered-complete', success: false, error }, '*');
            }}
            onReady={() => {
              onLoadingChange(false);
              window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
            }}
          />
        </Suspense>
        {previewError && (
          <div className="absolute bottom-4 left-4 right-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="truncate">{previewError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAIFix}
                  disabled={isFixingError}
                  className="ml-2 shrink-0"
                >
                  {isFixingError ? 'Fixing...' : 'Ask AI to Fix'}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    );
  }

  // Code/HTML rendering - simple iframe with srcDoc
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
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
  <script>
    window.addEventListener('error', (e) => {
      window.parent.postMessage({ type: 'artifact-error', message: e.message }, '*');
    });
    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
  </script>
</head>
<body>
${artifact.content}
</body>
</html>`;

    // Store preview content for pop-out functionality
    if (previewContentRef) {
      previewContentRef.current = previewContent;
    }

    // Listen for iframe messages
    useEffect(() => {
      const handleMessage = (e: MessageEvent) => {
        if (e.data?.type === 'artifact-error') {
          onPreviewErrorChange(e.data.message);
          onLoadingChange(false);
        } else if (e.data?.type === 'artifact-ready') {
          onLoadingChange(false);
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onLoadingChange, onPreviewErrorChange]);

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
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 z-10">
              <ArtifactSkeleton type={artifact.type} />
            </div>
          )}
          <iframe
            data-testid="artifact-iframe"
            srcDoc={previewContent}
            key={`${artifact.id}-${refreshTimestamp}`}
            className="w-full h-full border-0 bg-background"
            title={artifact.title}
            sandbox="allow-scripts allow-downloads allow-popups"
          />
        </div>
      </div>
    );
  }

  return null;
});

ArtifactRenderer.displayName = "ArtifactRenderer";
