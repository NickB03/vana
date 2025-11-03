/**
 * ArtifactVersionSelector Usage Example
 *
 * This file demonstrates how to integrate the ArtifactVersionSelector
 * component into your artifact management workflow.
 */

import { useState } from "react";
import { ArtifactVersionSelector } from "./ArtifactVersionSelector";
import { ArtifactVersion } from "@/hooks/useArtifactVersions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

/**
 * Example 1: Basic Usage with Sheet (Sidebar)
 *
 * Shows version history in a slide-out panel
 */
export function ArtifactVersionSelectorExample1() {
  const [selectedVersion, setSelectedVersion] = useState<ArtifactVersion | null>(null);
  const artifactId = "example-artifact-123";

  const handleVersionSelect = (version: ArtifactVersion) => {
    setSelectedVersion(version);
    console.log("Selected version:", version);

    // Load the selected version's content into your artifact viewer
    // loadArtifact(version.artifact_content);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          Version History
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <ArtifactVersionSelector
          artifactId={artifactId}
          currentVersion={selectedVersion?.version_number}
          onVersionSelect={handleVersionSelect}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Example 2: Inline Usage in Artifact Panel
 *
 * Shows version selector directly in your artifact interface
 */
export function ArtifactVersionSelectorExample2() {
  const [currentVersion, setCurrentVersion] = useState<number>(3);
  const artifactId = "example-artifact-456";

  const handleVersionChange = (version: ArtifactVersion) => {
    setCurrentVersion(version.version_number);

    // Update your artifact display with the selected version
    console.log("Loading version:", version.version_number);
    console.log("Content:", version.artifact_content);
    console.log("Title:", version.artifact_title);
  };

  return (
    <div className="flex h-screen">
      {/* Main artifact display area */}
      <div className="flex-1 p-4">
        <h2>Artifact Viewer</h2>
        <p>Current version: {currentVersion}</p>
        {/* Your artifact rendering logic here */}
      </div>

      {/* Version selector sidebar */}
      <div className="w-80 border-l">
        <ArtifactVersionSelector
          artifactId={artifactId}
          currentVersion={currentVersion}
          onVersionSelect={handleVersionChange}
        />
      </div>
    </div>
  );
}

/**
 * Example 3: Version Comparison Workflow
 *
 * Select two versions to compare
 */
export function ArtifactVersionSelectorExample3() {
  const [version1, setVersion1] = useState<ArtifactVersion | null>(null);
  const [version2, setVersion2] = useState<ArtifactVersion | null>(null);
  const artifactId = "example-artifact-789";

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div className="border rounded-lg">
        <div className="border-b p-3">
          <h3 className="font-semibold">Version A</h3>
        </div>
        <div className="h-96">
          <ArtifactVersionSelector
            artifactId={artifactId}
            currentVersion={version1?.version_number}
            onVersionSelect={setVersion1}
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="border-b p-3">
          <h3 className="font-semibold">Version B</h3>
        </div>
        <div className="h-96">
          <ArtifactVersionSelector
            artifactId={artifactId}
            currentVersion={version2?.version_number}
            onVersionSelect={setVersion2}
          />
        </div>
      </div>

      {version1 && version2 && (
        <div className="col-span-2 p-4 bg-muted rounded-lg">
          <p>
            Comparing v{version1.version_number} ({version1.artifact_title}) with v
            {version2.version_number} ({version2.artifact_title})
          </p>
          {/* Show diff here */}
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Mobile-Responsive Version Drawer
 *
 * Uses Sheet component for mobile-friendly version history
 */
export function ArtifactVersionSelectorExample4() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const artifactId = "example-artifact-mobile";

  const handleVersionSelect = (version: ArtifactVersion) => {
    setCurrentVersion(version.version_number);
    setIsOpen(false); // Close drawer after selection on mobile

    // Apply the selected version
    console.log("Applying version:", version);
  };

  return (
    <div>
      {/* Mobile: Bottom sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button className="md:hidden" variant="outline">
            <History className="mr-2 h-4 w-4" />
            v{currentVersion}
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[80vh] md:hidden">
          <ArtifactVersionSelector
            artifactId={artifactId}
            currentVersion={currentVersion}
            onVersionSelect={handleVersionSelect}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop: Side panel */}
      <div className="hidden md:block">
        <ArtifactVersionSelector
          artifactId={artifactId}
          currentVersion={currentVersion}
          onVersionSelect={handleVersionSelect}
        />
      </div>
    </div>
  );
}

/**
 * Example 5: Integration with Artifact Toolbar
 *
 * Add version selector to artifact action buttons
 */
export function ArtifactVersionSelectorExample5() {
  const [selectedVersion, setSelectedVersion] = useState<ArtifactVersion | null>(null);
  const artifactId = "example-artifact-toolbar";

  const handleRevert = (version: ArtifactVersion) => {
    setSelectedVersion(version);
    // Revert artifact to selected version
    console.log("Reverting to version:", version.version_number);
  };

  return (
    <div className="space-y-4">
      {/* Artifact toolbar */}
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-lg font-semibold">
          {selectedVersion?.artifact_title || "Untitled Artifact"}
        </h2>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedVersion ? `v${selectedVersion.version_number}` : "Latest"}
          </span>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right">
              <ArtifactVersionSelector
                artifactId={artifactId}
                currentVersion={selectedVersion?.version_number}
                onVersionSelect={handleRevert}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Artifact content */}
      <div className="p-4 border rounded-lg">
        {selectedVersion ? (
          <pre className="text-sm">{selectedVersion.artifact_content}</pre>
        ) : (
          <p className="text-muted-foreground">No version selected</p>
        )}
      </div>
    </div>
  );
}
