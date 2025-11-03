import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, Check, GitCompare } from "lucide-react";
import { useArtifactVersions, ArtifactVersion } from "@/hooks/useArtifactVersions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ArtifactVersionSelectorProps {
  artifactId: string;
  currentVersion?: number;
  onVersionSelect: (version: ArtifactVersion) => void;
  onCompare?: (version: ArtifactVersion) => void;
}

/**
 * ArtifactVersionSelector Component
 *
 * Displays a selectable list of artifact versions with timestamps.
 * Features:
 * - Reverse chronological order (newest first)
 * - Highlighted current version
 * - Relative timestamps (e.g., "2 hours ago")
 * - Loading and empty states
 * - Accessible keyboard navigation
 * - Responsive design (mobile + desktop)
 *
 * @example
 * ```tsx
 * <ArtifactVersionSelector
 *   artifactId="artifact-123"
 *   currentVersion={3}
 *   onVersionSelect={(version) => console.log('Selected:', version)}
 * />
 * ```
 */
export function ArtifactVersionSelector({
  artifactId,
  currentVersion,
  onVersionSelect,
  onCompare,
}: ArtifactVersionSelectorProps) {
  const { versions, isLoading, error } = useArtifactVersions(artifactId);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm">Loading versions...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive">
        <p className="text-sm font-medium">Failed to load versions</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  // Empty state
  if (!versions || versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <Clock className="h-12 w-12 opacity-50" />
        <p className="mt-4 text-sm font-medium">No versions available</p>
        <p className="mt-1 text-xs">Create your first version to see history here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Version History</h2>
        <p className="text-xs text-muted-foreground">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </p>
      </div>

      {/* Version list */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {versions.map((version) => {
            const isSelected = currentVersion === version.version_number;

            return (
              <div
                key={version.id}
                className={cn(
                  "w-full transition-colors",
                  isSelected && "bg-accent/50"
                )}
              >
                <div className="flex items-start gap-2 px-4 py-3">
                  {/* Version info - clickable */}
                  <button
                    onClick={() => onVersionSelect(version)}
                    className={cn(
                      "flex-1 min-w-0 text-left transition-colors",
                      "hover:bg-accent focus:bg-accent focus:outline-none rounded-sm px-2 py-1 -mx-2 -my-1",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                    aria-label={`Select version ${version.version_number}: ${version.artifact_title}`}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className="shrink-0"
                      >
                        v{version.version_number}
                      </Badge>
                      {isSelected && (
                        <Check
                          className="h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <h3 className="mt-1.5 truncate text-sm font-medium">
                      {version.artifact_title}
                    </h3>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <time dateTime={version.created_at}>
                        {formatDistanceToNow(new Date(version.created_at), {
                          addSuffix: true,
                        })}
                      </time>
                    </div>

                    {/* Optional: Show artifact type */}
                    {version.artifact_language && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {version.artifact_language}
                      </p>
                    )}
                  </button>

                  {/* Compare button */}
                  {onCompare && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompare(version);
                      }}
                      title="Compare with current version"
                    >
                      <GitCompare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
