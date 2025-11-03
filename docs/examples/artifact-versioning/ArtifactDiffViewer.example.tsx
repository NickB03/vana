/**
 * ArtifactDiffViewer Usage Examples
 *
 * This file demonstrates how to integrate the ArtifactDiffViewer component
 * into your application for displaying version differences.
 */

import { useState } from "react";
import { ArtifactDiffViewer } from "./ArtifactDiffViewer";
import { Button } from "./ui/button";

/**
 * Example 1: Basic Usage
 *
 * Shows how to display a diff between two artifact versions.
 * Typically triggered from a version history list or version dropdown.
 */
export function BasicDiffExample() {
  const [showDiff, setShowDiff] = useState(false);

  const artifactId = "artifact-abc123";
  const fromVersion = 1;
  const toVersion = 3;

  return (
    <div>
      <Button onClick={() => setShowDiff(true)}>
        Compare v{fromVersion} → v{toVersion}
      </Button>

      {showDiff && (
        <ArtifactDiffViewer
          artifactId={artifactId}
          fromVersion={fromVersion}
          toVersion={toVersion}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}

/**
 * Example 2: Version History Integration
 *
 * Shows how to integrate with a version history component
 * where users can select two versions to compare.
 */
export function VersionHistoryWithDiff() {
  const [selectedVersions, setSelectedVersions] = useState<{
    from: number | null;
    to: number | null;
  }>({ from: null, to: null });
  const [showDiff, setShowDiff] = useState(false);

  const artifactId = "artifact-xyz789";
  const versions = [
    { number: 1, timestamp: "2024-01-01" },
    { number: 2, timestamp: "2024-01-02" },
    { number: 3, timestamp: "2024-01-03" },
    { number: 4, timestamp: "2024-01-04" },
  ];

  const handleCompare = () => {
    if (selectedVersions.from && selectedVersions.to) {
      setShowDiff(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Version History</h3>

        {versions.map((version) => (
          <div key={version.number} className="flex items-center gap-2">
            <input
              type="radio"
              name="fromVersion"
              value={version.number}
              onChange={(e) =>
                setSelectedVersions((prev) => ({
                  ...prev,
                  from: Number(e.target.value),
                }))
              }
            />
            <span>From</span>

            <input
              type="radio"
              name="toVersion"
              value={version.number}
              onChange={(e) =>
                setSelectedVersions((prev) => ({
                  ...prev,
                  to: Number(e.target.value),
                }))
              }
            />
            <span>To</span>

            <span>v{version.number} - {version.timestamp}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={handleCompare}
        disabled={!selectedVersions.from || !selectedVersions.to}
      >
        Compare Selected Versions
      </Button>

      {showDiff && selectedVersions.from && selectedVersions.to && (
        <ArtifactDiffViewer
          artifactId={artifactId}
          fromVersion={selectedVersions.from}
          toVersion={selectedVersions.to}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}

/**
 * Example 3: Compare Current with Previous
 *
 * Quick action to compare the current version with the previous one.
 * Useful for "What changed?" buttons in artifact viewers.
 */
export function CompareToPreviousExample() {
  const [showDiff, setShowDiff] = useState(false);

  const artifactId = "artifact-current";
  const currentVersion = 5;
  const previousVersion = currentVersion - 1;

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDiff(true)}
        disabled={currentVersion <= 1}
      >
        Show Changes from v{previousVersion}
      </Button>

      {showDiff && currentVersion > 1 && (
        <ArtifactDiffViewer
          artifactId={artifactId}
          fromVersion={previousVersion}
          toVersion={currentVersion}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}

/**
 * Example 4: Integration with Artifact Component
 *
 * Shows how to add a "View Changes" button to an existing Artifact component.
 */
export function ArtifactWithDiffButton() {
  const [showDiff, setShowDiff] = useState(false);

  const artifact = {
    id: "artifact-123",
    title: "My Component",
    type: "react" as const,
    content: "export default function MyComponent() { return <div>Hello</div>; }",
    currentVersion: 3,
  };

  return (
    <div className="space-y-4">
      {/* Artifact display */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{artifact.title}</h3>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              v{artifact.currentVersion}
            </span>

            {artifact.currentVersion > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiff(true)}
              >
                View Changes
              </Button>
            )}
          </div>
        </div>

        <pre className="bg-muted p-4 rounded">
          <code>{artifact.content}</code>
        </pre>
      </div>

      {/* Diff viewer */}
      {showDiff && artifact.currentVersion > 1 && (
        <ArtifactDiffViewer
          artifactId={artifact.id}
          fromVersion={artifact.currentVersion - 1}
          toVersion={artifact.currentVersion}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}

/**
 * Example 5: Conditional Diff Display
 *
 * Only show the diff viewer if there are multiple versions available.
 */
export function ConditionalDiffExample() {
  const [showDiff, setShowDiff] = useState(false);

  const artifactId = "artifact-conditional";
  const versionCount = 1; // Would come from useArtifactVersions

  if (versionCount < 2) {
    return (
      <div className="text-sm text-muted-foreground">
        No previous versions available for comparison
      </div>
    );
  }

  return (
    <div>
      <Button onClick={() => setShowDiff(true)}>
        Compare Versions
      </Button>

      {showDiff && (
        <ArtifactDiffViewer
          artifactId={artifactId}
          fromVersion={1}
          toVersion={versionCount}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}

/**
 * Integration Notes:
 *
 * 1. The component requires the artifact ID and two version numbers
 * 2. It fetches version data using the useArtifactVersions hook
 * 3. The dialog is modal and handles its own close behavior
 * 4. Responsive: switches to unified view on mobile automatically
 * 5. Shows metadata changes (title, type) separately from content diff
 * 6. Handles edge cases: no changes, loading, errors
 *
 * Performance Considerations:
 *
 * - Diff generation is memoized and only runs when versions change
 * - Large diffs are handled efficiently by react-diff-view
 * - Loading states prevent layout shifts
 *
 * Accessibility:
 *
 * - Dialog is keyboard navigable (ESC to close)
 * - ARIA labels on all interactive elements
 * - Screen reader friendly diff annotations
 * - Color-blind safe: uses icons + colors for changes
 */
