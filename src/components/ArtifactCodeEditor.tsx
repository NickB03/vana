import { memo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArtifactData } from "./ArtifactContainer";
import { ArtifactSkeleton } from "@/components/ui/artifact-skeleton";
import { detectNpmImports } from '@/utils/npmDetection';
import { lazy } from "react";

const SandpackArtifactRenderer = lazy(() =>
  import('./SandpackArtifactRenderer').then(module => ({
    default: module.SandpackArtifactRenderer
  }))
);

interface ArtifactCodeEditorProps {
  artifact: ArtifactData;
  isEditingCode: boolean;
  editedContent: string;
  onEditedContentChange: (content: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onPreviewErrorChange: (error: string | null) => void;
}

export const ArtifactCodeEditor = memo(({
  artifact,
  isEditingCode,
  editedContent,
  onEditedContentChange,
  onCancelEdit,
  onSaveEdit,
  onPreviewErrorChange
}: ArtifactCodeEditorProps) => {
  const needsSandpack = artifact.type === 'react' && detectNpmImports(artifact.content);

  if (needsSandpack) {
    return (
      <Suspense fallback={<ArtifactSkeleton type="react" />}>
        <SandpackArtifactRenderer
          code={editedContent}
          title={artifact.title}
          showEditor={true}
          onError={(error) => onPreviewErrorChange(error)}
        />
      </Suspense>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-muted">
        {isEditingCode ? (
          <textarea
            value={editedContent}
            onChange={(e) => onEditedContentChange(e.target.value)}
            className="w-full h-full p-4 text-sm font-mono bg-muted text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            spellCheck={false}
          />
        ) : (
          <pre className="p-4 text-sm font-mono overflow-auto">
            <code className="text-foreground whitespace-pre-wrap break-words">{artifact.content}</code>
          </pre>
        )}
      </div>
      {isEditingCode && (
        <div className="flex items-center justify-end gap-2 border-t px-4 py-2 bg-muted/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSaveEdit}
          >
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
});

ArtifactCodeEditor.displayName = "ArtifactCodeEditor";
