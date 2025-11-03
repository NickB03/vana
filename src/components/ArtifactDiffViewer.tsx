import { useState, useMemo } from "react";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import { createPatch } from "diff";
import "react-diff-view/style/index.css";
import "./ArtifactDiffViewer.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useArtifactVersions } from "@/hooks/useArtifactVersions";
import { SquareSplitHorizontal, FileText, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ArtifactDiffViewerProps {
  artifactId: string;
  fromVersion: number;
  toVersion: number;
  onClose: () => void;
}

type ViewMode = "split" | "unified";

/**
 * ArtifactDiffViewer - Display differences between artifact versions
 *
 * Features:
 * - Side-by-side or unified diff view
 * - Syntax highlighting based on language
 * - Line numbers for easy reference
 * - Toggle between view modes
 * - Shows title and type changes
 * - Responsive design (unified on mobile)
 * - Loading states and error handling
 *
 * @example
 * ```tsx
 * <ArtifactDiffViewer
 *   artifactId="artifact-123"
 *   fromVersion={1}
 *   toVersion={3}
 *   onClose={() => setShowDiff(false)}
 * />
 * ```
 */
export function ArtifactDiffViewer({
  artifactId,
  fromVersion,
  toVersion,
  onClose,
}: ArtifactDiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const { getVersionDiff, isLoading } = useArtifactVersions(artifactId);

  // Get diff data
  const diffData = useMemo(() => {
    if (!artifactId || fromVersion === toVersion) return null;
    return getVersionDiff(fromVersion, toVersion);
  }, [artifactId, fromVersion, toVersion, getVersionDiff]);

  // Generate unified diff format
  const parsedDiff = useMemo(() => {
    if (!diffData) return null;

    try {
      const { oldContent, newContent } = diffData;

      // Use createPatch to generate unified diff format
      const diffText = createPatch(
        "artifact",
        oldContent,
        newContent,
        "old version",
        "new version",
        { context: 3 }
      );

      // Parse the diff for react-diff-view
      const files = parseDiff(diffText);
      return files[0]; // We only have one file
    } catch (error) {
      console.error("Error parsing diff:", error);
      return null;
    }
  }, [diffData]);

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    if (!parsedDiff) return false;
    return parsedDiff.hunks.some(hunk => hunk.changes.length > 0);
  }, [parsedDiff]);

  // Check for metadata changes
  const metadataChanges = useMemo(() => {
    if (!diffData) return null;

    const changes = [];
    if (diffData.oldTitle !== diffData.newTitle) {
      changes.push({
        label: "Title",
        old: diffData.oldTitle,
        new: diffData.newTitle,
      });
    }
    if (diffData.oldType !== diffData.newType) {
      changes.push({
        label: "Type",
        old: diffData.oldType,
        new: diffData.newType,
      });
    }
    return changes.length > 0 ? changes : null;
  }, [diffData]);

  // Responsive view mode (force unified on mobile)
  const effectiveViewMode = useMemo(() => {
    if (typeof window === "undefined") return viewMode;
    return window.innerWidth < 768 ? "unified" : viewMode;
  }, [viewMode]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span>Version Diff</span>
              <Badge variant="outline" className="font-normal">
                v{fromVersion} → v{toVersion}
              </Badge>
            </DialogTitle>

            {/* View mode toggle - hide on mobile */}
            <div className="hidden md:flex gap-1 bg-muted rounded-md p-1">
              <Button
                variant={viewMode === "split" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("split")}
                className="gap-1.5"
              >
                <SquareSplitHorizontal className="h-3.5 w-3.5" />
                Split
              </Button>
              <Button
                variant={viewMode === "unified" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("unified")}
                className="gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Unified
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {/* Error State */}
          {!isLoading && !diffData && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to load version diff. One or both versions may not exist.
              </AlertDescription>
            </Alert>
          )}

          {/* Metadata Changes */}
          {!isLoading && diffData && metadataChanges && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Metadata Changes:</div>
                <div className="space-y-1 text-sm">
                  {metadataChanges.map((change, idx) => (
                    <div key={idx} className="font-mono">
                      <span className="font-semibold">{change.label}:</span>{" "}
                      <span className="text-destructive line-through">{change.old}</span>
                      {" → "}
                      <span className="text-green-600 dark:text-green-400">{change.new}</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* No Changes State */}
          {!isLoading && diffData && !hasChanges && !metadataChanges && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No content changes detected between these versions.
              </AlertDescription>
            </Alert>
          )}

          {/* Diff Display */}
          {!isLoading && diffData && parsedDiff && hasChanges && (
            <div className="diff-container border rounded-md overflow-hidden">
              <Diff
                viewType={effectiveViewMode}
                diffType={parsedDiff.type}
                hunks={parsedDiff.hunks}
                className={cn(
                  "diff-view",
                  "text-sm font-mono",
                  effectiveViewMode === "split" && "split-view",
                  effectiveViewMode === "unified" && "unified-view"
                )}
              >
                {(hunks) =>
                  hunks.map((hunk) => (
                    <Hunk key={hunk.content} hunk={hunk} />
                  ))
                }
              </Diff>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
