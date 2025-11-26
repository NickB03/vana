import { useState, useEffect, useMemo, useCallback } from "react";
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactContent, ArtifactActions } from '@/components/ai-elements/artifact';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { validateArtifact, ValidationResult, categorizeError } from "@/utils/artifactValidator";
import { Badge } from "@/components/ui/badge";
import mermaid from "mermaid";
import { detectAndInjectLibraries } from "@/utils/libraryDetection";
import { extractNpmDependencies } from '@/utils/npmDetection';
import { supabase } from "@/integrations/supabase/client";
import { ArtifactErrorBoundary } from "./ArtifactErrorBoundary";
import { ArtifactRenderer } from "./ArtifactRenderer";
import { ArtifactToolbar } from "./ArtifactToolbar";
import { ArtifactCodeEditor } from "./ArtifactCodeEditor";
import { generateCompleteIframeStyles } from "@/utils/themeUtils";

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
}

export const ArtifactContainer = ({ artifact, onClose, onEdit, onContentChange }: ArtifactContainerProps) => {
  // State management
  const [isMaximized, setIsMaximized] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<'syntax' | 'runtime' | 'import' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [injectedCDNs, setInjectedCDNs] = useState<string>('');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [themeRefreshKey, setThemeRefreshKey] = useState(0);
  const [isFixingError, setIsFixingError] = useState(false);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });
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

  // Auto-inject libraries
  useEffect(() => {
    if (artifact.type === "html" || artifact.type === "code" || artifact.type === "react") {
      setInjectedCDNs('');
      const cdn = detectAndInjectLibraries(artifact.content);
      setInjectedCDNs(cdn);
    }
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

    const isFullHTML = artifact.content.includes("<!DOCTYPE");
    const popoutContent = isFullHTML
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

  const handleAIFix = async () => {
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
        const error = await response.json();
        throw new Error(error.error || "Failed to generate fix");
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
  };

  // Render functions use extracted components
  const renderPreview = () => {
    return (
      <ArtifactRenderer
        artifact={artifact}
        isLoading={isLoading}
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
        onLoadingChange={setIsLoading}
        onPreviewErrorChange={setPreviewError}
        onErrorCategoryChange={setErrorCategory}
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
    <Artifact className={isMaximized ? "fixed inset-4 z-50" : "h-full"} data-testid="artifact-container">
      <ArtifactHeader>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ArtifactTitle>{artifact.title}</ArtifactTitle>
          {validation && validation.errors.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {validation.errors.length} error{validation.errors.length > 1 ? 's' : ''}
            </Badge>
          )}
          {validation && validation.warnings.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <ArtifactActions>
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
        <Tabs
          defaultValue="preview"
          className="flex-1 flex flex-col min-h-0 overflow-hidden h-full"
          onValueChange={(value) => setIsEditingCode(value === "code")}
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Edit</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="flex-1 m-0 p-0 data-[state=active]:flex flex-col overflow-hidden">
            <ArtifactErrorBoundary>
              {renderPreview()}
            </ArtifactErrorBoundary>
          </TabsContent>
          <TabsContent value="code" className="flex-1 m-0 p-0 data-[state=active]:flex overflow-hidden">
            <ArtifactErrorBoundary>
              {renderCode()}
            </ArtifactErrorBoundary>
          </TabsContent>
        </Tabs>
      </ArtifactContent>
    </Artifact>
  );
};
