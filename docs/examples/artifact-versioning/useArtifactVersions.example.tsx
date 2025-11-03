/**
 * USAGE EXAMPLES: useArtifactVersions Hook
 *
 * This file demonstrates how to use the artifact version control hook
 * in various scenarios within the application.
 */

import { useArtifactVersions } from "./useArtifactVersions";
import { ArtifactData } from "@/components/Artifact";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";

// ============================================================================
// EXAMPLE 1: Basic Usage in Artifact Component
// ============================================================================

export function ArtifactWithVersionControl({
  artifact,
  messageId,
}: {
  artifact: ArtifactData;
  messageId: string;
}) {
  const {
    versions,
    currentVersion,
    versionCount,
    isLoading,
    isCreating,
    createVersion,
    revertToVersion,
  } = useArtifactVersions(artifact.id);

  const handleSaveVersion = async () => {
    try {
      await createVersion(artifact, messageId);
    } catch (error) {
      console.error("Failed to save version:", error);
    }
  };

  const handleRevert = (versionNumber: number) => {
    const version = revertToVersion(versionNumber);
    if (version) {
      // Update artifact with reverted content
      artifact.content = version.artifact_content;
      artifact.title = version.artifact_title;
      // Trigger re-render or update state as needed
    }
  };

  if (isLoading) {
    return <div>Loading version history...</div>;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{artifact.title}</h3>
          <Badge variant="secondary">
            <History className="h-3 w-3 mr-1" />
            {versionCount} versions
          </Badge>
        </div>
        <Button onClick={handleSaveVersion} disabled={isCreating}>
          {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Version
        </Button>
      </div>

      {/* Version History List */}
      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between p-2 border rounded"
          >
            <div>
              <span className="font-mono text-sm">v{version.version_number}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(version.created_at).toLocaleString()}
              </span>
              {version.id === currentVersion?.id && (
                <Badge className="ml-2" variant="default">
                  Current
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRevert(version.version_number)}
            >
              <RotateCcw className="h-4 w-4" />
              Revert
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// EXAMPLE 2: Auto-save on Content Change
// ============================================================================

export function AutoSaveArtifact({
  artifact,
  messageId,
  onContentChange,
}: {
  artifact: ArtifactData;
  messageId: string;
  onContentChange: (content: string) => void;
}) {
  const { createVersion, hasContentChanged, isCreating } =
    useArtifactVersions(artifact.id);

  const handleSave = async (newContent: string) => {
    // Check if content actually changed
    const changed = await hasContentChanged(newContent);

    if (!changed) {
      console.log("No changes detected, skipping save");
      return;
    }

    // Update artifact content
    onContentChange(newContent);

    // Auto-save new version
    await createVersion(
      { ...artifact, content: newContent },
      messageId
    );
  };

  return (
    <div>
      <textarea
        defaultValue={artifact.content}
        onBlur={(e) => handleSave(e.target.value)}
        disabled={isCreating}
        className="w-full h-64 p-2 border rounded"
      />
      {isCreating && (
        <div className="text-xs text-muted-foreground mt-2">
          Saving version...
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Version Diff Viewer
// ============================================================================

export function VersionDiffViewer({ artifactId }: { artifactId: string }) {
  const { versions, getVersionDiff } = useArtifactVersions(artifactId);
  const [selectedVersions, setSelectedVersions] = React.useState({
    from: 1,
    to: 2,
  });

  const diff = getVersionDiff(selectedVersions.from, selectedVersions.to);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <select
          value={selectedVersions.from}
          onChange={(e) =>
            setSelectedVersions((prev) => ({
              ...prev,
              from: parseInt(e.target.value),
            }))
          }
          className="p-2 border rounded"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.version_number}>
              Version {v.version_number}
            </option>
          ))}
        </select>

        <span className="self-center">vs</span>

        <select
          value={selectedVersions.to}
          onChange={(e) =>
            setSelectedVersions((prev) => ({
              ...prev,
              to: parseInt(e.target.value),
            }))
          }
          className="p-2 border rounded"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.version_number}>
              Version {v.version_number}
            </option>
          ))}
        </select>
      </div>

      {diff && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-2">
              Version {selectedVersions.from}
            </h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {diff.oldContent}
            </pre>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-2">
              Version {selectedVersions.to}
            </h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {diff.newContent}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Version Timeline
// ============================================================================

export function VersionTimeline({ artifactId }: { artifactId: string }) {
  const { versions, isLoading, getVersion } = useArtifactVersions(artifactId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading timeline...
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

      {versions.map((version) => (
        <div key={version.id} className="relative mb-6">
          {/* Timeline dot */}
          <div className="absolute left-[-1.625rem] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />

          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                Version {version.version_number}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(version.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{version.artifact_title}</p>
            <div className="mt-2 text-xs">
              <Badge variant="outline">{version.artifact_type}</Badge>
              <span className="ml-2 text-muted-foreground">
                {version.artifact_content.length} chars
              </span>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Integration with ChatInterface
// ============================================================================

export function ChatInterfaceWithVersioning({
  sessionId,
  currentArtifact,
}: {
  sessionId: string;
  currentArtifact: ArtifactData | null;
}) {
  // Call hook unconditionally (React hooks rules)
  // Pass undefined when no artifact is present
  const versionHook = useArtifactVersions(currentArtifact?.id);

  const handleArtifactUpdate = async (
    updatedArtifact: ArtifactData,
    messageId: string
  ) => {
    if (!currentArtifact) return;

    // Check if content changed before creating version
    const hasChanged = await versionHook.hasContentChanged(
      updatedArtifact.content
    );

    if (hasChanged) {
      await versionHook.createVersion(updatedArtifact, messageId);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat messages area */}
      <div className="flex-1 overflow-auto">
        {/* Chat messages rendered here */}
      </div>

      {/* Artifact panel with version control */}
      {currentArtifact && (
        <div className="border-l w-96 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Artifact</h3>
            <Badge>
              {versionHook.versionCount} version
              {versionHook.versionCount !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Artifact content */}
          <div className="mb-4">
            {/* Render artifact here */}
          </div>

          {/* Version controls */}
          <div className="space-y-2">
            <Button
              onClick={() =>
                handleArtifactUpdate(currentArtifact, "current-message-id")
              }
              disabled={versionHook.isCreating}
              className="w-full"
            >
              Save New Version
            </Button>

            {versionHook.currentVersion && (
              <div className="text-xs text-muted-foreground">
                Current: v{versionHook.currentVersion.version_number} •{" "}
                {new Date(
                  versionHook.currentVersion.created_at
                ).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Batch Version Count Display
// ============================================================================

import { useArtifactVersionCounts } from "./useArtifactVersions";

export function ArtifactList({ artifacts }: { artifacts: ArtifactData[] }) {
  const artifactIds = artifacts.map((a) => a.id);
  const { data: versionCounts } = useArtifactVersionCounts(artifactIds);

  return (
    <div className="space-y-2">
      {artifacts.map((artifact) => (
        <Card key={artifact.id} className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{artifact.title}</span>
            <Badge variant="secondary">
              {versionCounts?.[artifact.id] || 0} versions
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Error Handling
// ============================================================================

export function RobustVersionControl({
  artifact,
  messageId,
}: {
  artifact: ArtifactData;
  messageId: string;
}) {
  const { createVersion, error, isCreating } = useArtifactVersions(artifact.id);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleCreateVersion = async () => {
    try {
      setLocalError(null);
      await createVersion(artifact, messageId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setLocalError(errorMessage);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleCreateVersion} disabled={isCreating}>
        {isCreating ? "Saving..." : "Create Version"}
      </Button>

      {/* Display query errors */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded">
          {error}
        </div>
      )}

      {/* Display mutation errors */}
      {localError && (
        <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded">
          {localError}
        </div>
      )}
    </div>
  );
}

// Missing import for React useState
import React from "react";
