import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Artifact, ArtifactHeader, ArtifactContent, ArtifactActions, ArtifactAction } from '@/components/ai-elements/artifact';
import { toast } from "sonner";
import { validateArtifact, ValidationResult } from "@/utils/artifactValidator";
import { ensureMermaidInit } from "@/utils/mermaidInit";
import { detectAndInjectLibraries } from "@/utils/libraryDetection";
import { supabase } from "@/integrations/supabase/client";
import { ArtifactErrorBoundary } from "./ArtifactErrorBoundary";
import { ArtifactRenderer } from "./ArtifactRenderer";
import { ArtifactToolbar } from "./ArtifactToolbar";
import { ArtifactCodeEditor } from "./ArtifactCodeEditor";
import { generateCompleteIframeStyles } from "@/utils/themeUtils";
import { ArtifactViewToggle } from "./ArtifactViewToggle";
import { RefreshCw } from "lucide-react";
import { useMinimumLoadingTime } from "@/hooks/use-minimum-loading-time";
import { motion } from "motion/react";
import { ARTIFACT_ANIMATION } from "@/utils/animationSystem";

export type ArtifactType = "code" | "markdown" | "html" | "svg" | "mermaid" | "react" | "image";

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  bundleUrl?: string;         // Signed URL for server-bundled artifacts
  bundleTime?: number;        // Bundling time in milliseconds
  dependencies?: string[];    // List of npm packages used
  bundlingFailed?: boolean;   // True if server-side bundling failed
  bundleError?: string;       // Error message from bundling failure
  bundleErrorDetails?: string; // Detailed error message
  bundleStatus?: 'idle' | 'bundling' | 'success' | 'error'; // Current bundling state
}

interface ArtifactContainerProps {
  artifact: ArtifactData;
  onClose?: () => void;
  onEdit?: (suggestion?: string) => void;
  onContentChange?: (newContent: string) => void;
  onBundleReactFallback?: (artifact: ArtifactData, errorMessage: string) => void;
}

export const ArtifactContainer = ({
  artifact,
  onClose,
  onEdit,
  onContentChange,
  onBundleReactFallback,
}: ArtifactContainerProps) => {
  // State management
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isMaximized, setIsMaximized] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<'syntax' | 'runtime' | 'import' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [themeRefreshKey, setThemeRefreshKey] = useState(0);
  const [isFixingError, setIsFixingError] = useState(false);

  // Ensure skeleton shows for minimum 300ms to prevent flash on fast loads
  const showLoadingSkeleton = useMinimumLoadingTime(isLoading, 300);

  // Ref to store the generated preview HTML content (for pop-out functionality)
  const previewContentRef = useRef<string | null>(null);

  // Sync viewMode with isEditingCode
  useEffect(() => {
    setIsEditingCode(viewMode === 'code');
  }, [viewMode]);

  // Initialize mermaid
  useEffect(() => {
    ensureMermaidInit();
  }, []);

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeRefreshKey(prev => prev + 1);
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  // Validate artifact
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const validationResult = validateArtifact(artifact.content, artifact.type);
      setValidation(validationResult);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [artifact.content, artifact.type]);

  // Memoize library detection - only recomputes when content/type actually change
  const injectedCDNs = useMemo(() => {
    // Skip detection for types that never need CDN injection
    if (artifact.type === 'mermaid' || artifact.type === 'markdown' || artifact.type === 'image' || artifact.type === 'svg') {
      return '';
    }
    return detectAndInjectLibraries(artifact.content);
  }, [artifact.content, artifact.type]);

  // Handlers
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(artifact.content);
    toast.success("Copied to clipboard");
  }, [artifact.content]);

  const handlePopOut = useCallback(() => {
    const newWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!newWindow) {
      toast.error("Popup blocked - please allow popups for this site");
      return;
    }

    // Use the pre-generated preview content from ArtifactRenderer if available
    // This is essential for React artifacts which need transpilation
    let popoutContent: string;

    if (previewContentRef.current) {
      // Use the properly generated preview HTML (includes React, transpiled code, etc.)
      popoutContent = previewContentRef.current;
    } else {
      // Fallback for artifacts where preview content isn't available yet
      const isFullHTML = artifact.content.includes("<!DOCTYPE");
      popoutContent = isFullHTML
        ? artifact.content
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${artifact.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${injectedCDNs}
  ${generateCompleteIframeStyles()}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
${artifact.content}
</body>
</html>`;
    }

    newWindow.document.open();
    newWindow.document.write(popoutContent);
    newWindow.document.close();
    toast.success("Opened in new window");
  }, [artifact.content, artifact.title, injectedCDNs]);

  // Helper functions
  const handleRefresh = useCallback(() => {
    setThemeRefreshKey(prev => prev + 1);
    toast.success("Preview refreshed");
  }, []);

  const handleFullScreen = useCallback(() => {
    setIsMaximized(true);
  }, []);

  const handleSaveEdit = useCallback(() => {
    onContentChange?.(editedContent);
    toast.success("Code updated");
    setIsEditingCode(false);
  }, [editedContent, onContentChange]);

  const handleCancelEdit = useCallback(() => {
    setEditedContent(artifact.content);
    setIsEditingCode(false);
  }, [artifact.content]);

  // CRITICAL: useCallback prevents BundledArtifactFrame's useEffect from re-running
  // on every parent render, which was causing blob URLs to be revoked prematurely
  const handleAIFix = useCallback(async () => {
    if (!previewError) return;

    setIsFixingError(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Authentication required");
        setIsFixingError(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-artifact-fix`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content: artifact.content,
            type: artifact.type,
            errorMessage: previewError,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        // Handle rate limit errors with specific messaging
        if (errorData.rateLimitExceeded) {
          const resetTime = errorData.resetAt
            ? new Date(errorData.resetAt).toLocaleTimeString()
            : 'shortly';
          toast.error(`Rate limit exceeded. Try again at ${resetTime}.`);
          setIsFixingError(false);
          return;
        }
        throw new Error(errorData.error || "Failed to generate fix");
      }

      const { fixedCode } = await response.json();

      if (fixedCode) {
        // Apply the fix using the parent's content change handler
        onContentChange?.(fixedCode);
        toast.success("Artifact fixed! Check the preview.");
        setPreviewError(null); // Clear error since we fixed it
      } else {
        toast.error("No fix could be generated");
      }
    } catch (error) {
      console.error("AI fix error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fix artifact");
    } finally {
      setIsFixingError(false);
    }
  }, [previewError, artifact.content, artifact.type, onContentChange]);

  const handleBundleReactFallback = useCallback((errorMessage: string) => {
    onBundleReactFallback?.(artifact, errorMessage);
  }, [artifact, onBundleReactFallback]);

  // Render functions use extracted components
  const renderPreview = () => {
    return (
      <ArtifactRenderer
        artifact={artifact}
        isLoading={showLoadingSkeleton}
        previewError={previewError}
        errorCategory={errorCategory}
        validation={validation}
        injectedCDNs={injectedCDNs}
        themeRefreshKey={themeRefreshKey}
        isEditingCode={isEditingCode}
        editedContent={editedContent}
        isFixingError={isFixingError}
        onEditedContentChange={setEditedContent}
        onRefresh={handleRefresh}
        onFullScreen={handleFullScreen}
        onEdit={onEdit}
        onAIFix={handleAIFix}
        onBundleReactFallback={handleBundleReactFallback}
        onLoadingChange={setIsLoading}
        onPreviewErrorChange={setPreviewError}
        onErrorCategoryChange={setErrorCategory}
        previewContentRef={previewContentRef}
      />
    );
  };

  const renderCode = () => {
    return (
      <ArtifactCodeEditor
        artifact={artifact}
        isEditingCode={isEditingCode}
        editedContent={editedContent}
        onEditedContentChange={setEditedContent}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onPreviewErrorChange={setPreviewError}
      />
    );
  };

  // Return JSX (moved old renderPreview/renderCode to extracted components)
  return (
    <motion.div
      {...ARTIFACT_ANIMATION.variant}
      transition={ARTIFACT_ANIMATION.transition}
      className={isMaximized ? "fixed inset-4 z-50" : "h-full"}
    >
      <Artifact className="h-full" data-testid="artifact-container">
      <ArtifactHeader>
        <div className="flex items-center gap-3">
          <ArtifactViewToggle
            value={viewMode}
            onChange={setViewMode}
          />
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <span className="text-gray-200">v1</span>
            <span>•</span>
            <span>Latest</span>
          </div>
        </div>

        <ArtifactActions>
          <ArtifactAction
            icon={RefreshCw}
            tooltip="Refresh preview"
            onClick={handleRefresh}
          />
          <ArtifactToolbar
            artifact={artifact}
            injectedCDNs={injectedCDNs}
            isMaximized={isMaximized}
            onCopy={handleCopy}
            onPopOut={handlePopOut}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onClose={onClose}
          />
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="p-0">
        {viewMode === 'preview' ? (
          <ArtifactErrorBoundary>
            {renderPreview()}
          </ArtifactErrorBoundary>
        ) : (
          <ArtifactErrorBoundary>
            {renderCode()}
          </ArtifactErrorBoundary>
        )}
      </ArtifactContent>
    </Artifact>
    </motion.div>
  );
};
