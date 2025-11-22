import { memo, useState, useEffect } from "react";
import { Markdown } from "@/components/ui/markdown";
import { InlineImage } from "@/components/InlineImage";
import { ArtifactCard } from "@/components/ArtifactCard";
import { parseArtifacts } from "@/utils/artifactParser";
import { ArtifactData } from "@/components/ArtifactContainer";
import { bundleArtifact, needsBundling } from "@/utils/artifactBundler";
import { toast } from "sonner";

interface MessageWithArtifactsProps {
  content: string;
  messageId?: string;
  sessionId: string;  // CRITICAL: Used for server-side bundling, not messageId
  onArtifactOpen: (artifact: ArtifactData) => void;
  className?: string;
}

/**
 * Reusable component for rendering message content with parsed artifacts.
 *
 * Handles:
 * - Parsing artifact tags from message content
 * - Rendering clean content (text without artifact tags)
 * - Displaying inline images
 * - Showing artifact cards for interactive components
 *
 * Used by both saved messages and streaming messages to ensure
 * consistent rendering behavior.
 */
export const MessageWithArtifacts = memo(({
  content,
  messageId,
  sessionId,
  onArtifactOpen,
  className = ""
}: MessageWithArtifactsProps) => {
  const { artifacts: parsedArtifacts, cleanContent } = parseArtifacts(content);
  const [artifacts, setArtifacts] = useState<ArtifactData[]>(parsedArtifacts);
  const [bundlingStatus, setBundlingStatus] = useState<Record<string, 'idle' | 'bundling' | 'success' | 'error'>>({});

  // Handle server-side bundling for artifacts with npm imports
  useEffect(() => {
    async function handleBundling() {
      for (const artifact of parsedArtifacts) {
        // Skip if already bundled or bundling
        if (artifact.bundleUrl || bundlingStatus[artifact.id] !== undefined) {
          continue;
        }

        // Check if artifact needs bundling
        const shouldBundle = needsBundling(artifact.content, artifact.type);
        console.log(`[MessageWithArtifacts] Artifact ${artifact.id} (${artifact.title}) needsBundling:`, shouldBundle);

        if (!shouldBundle) {
          console.log(`[MessageWithArtifacts] Skipping bundling for ${artifact.id} - no npm imports detected`);
          continue;
        }

        console.log(`[MessageWithArtifacts] Starting server-side bundling for ${artifact.id}...`);

        // Validate sessionId before bundling (CRITICAL: prevent bundling with invalid session)
        if (!sessionId || sessionId.length === 0) {
          console.error(`[MessageWithArtifacts] Cannot bundle ${artifact.id} - invalid session ID`);

          setArtifacts(prev =>
            prev.map(a =>
              a.id === artifact.id
                ? {
                    ...a,
                    bundlingFailed: true,
                    bundleError: "Session expired",
                    bundleErrorDetails: "Please refresh the page to restore your session",
                    bundleStatus: 'error'
                  }
                : a
            )
          );

          toast.error("Unable to bundle artifact", {
            description: "Your session may have expired. Please refresh the page.",
            duration: 10000
          });

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'error' }));
          continue;
        }

        // Mark as bundling
        setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'bundling' }));

        // Show bundling toast
        toast.info(`Bundling ${artifact.title} with npm dependencies...`, {
          id: `bundle-${artifact.id}`,
          duration: 30000 // Long duration since bundling takes time
        });

        // Attempt to bundle (FIXED: Use sessionId, not messageId)
        try {
          const result = await bundleArtifact(
            artifact.content,
            artifact.id,
            sessionId,
            artifact.title
          );

          if (result.success) {
          // Update artifact with bundle URL
          setArtifacts(prev =>
            prev.map(a =>
              a.id === artifact.id
                ? {
                    ...a,
                    bundleUrl: result.bundleUrl,
                    bundleTime: result.bundleTime,
                    dependencies: result.dependencies
                  }
                : a
            )
          );

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'success' }));

          toast.success(`${artifact.title} bundled successfully!`, {
            id: `bundle-${artifact.id}`,
            duration: 3000
          });

          console.log(`[MessageWithArtifacts] Bundled ${artifact.id} in ${result.bundleTime}ms with ${result.dependencies.length} packages`);
        } else {
          // Bundling failed - check if artifact has npm imports
          const hasNpmImports = needsBundling(artifact.content, artifact.type);

          if (hasNpmImports) {
            // Mark artifact as unbundleable - don't try Babel fallback
            setArtifacts(prev =>
              prev.map(a =>
                a.id === artifact.id
                  ? {
                      ...a,
                      bundlingFailed: true,
                      bundleError: result.error,
                      bundleErrorDetails: result.details,
                      bundleStatus: 'error'
                    }
                  : a
              )
            );

            // Show error toast with appropriate message
            if (result.retryable) {
              toast.error(`Bundling failed for ${artifact.title}`, {
                id: `bundle-${artifact.id}`,
                description: `${result.error}. You can try again.`,
                duration: 7000
              });
            } else if (result.requiresAuth) {
              toast.error(result.error, {
                id: `bundle-${artifact.id}`,
                description: result.details || "Please refresh the page",
                duration: 10000
              });
            } else if (result.retryAfter) {
              toast.error(result.error, {
                id: `bundle-${artifact.id}`,
                description: result.details,
                duration: 10000
              });
            } else {
              toast.error(`Bundling failed for ${artifact.title}`, {
                id: `bundle-${artifact.id}`,
                description: result.details || result.error,
                duration: 7000
              });
            }

            console.error(`[MessageWithArtifacts] Bundle failed for ${artifact.id}:`, result.error, result.details);
          } else {
            // No npm imports - safe to fallback to Babel
            toast.warning(`Bundling failed for ${artifact.title}, using fallback renderer`, {
              id: `bundle-${artifact.id}`,
              description: "Artifact will render with limited features",
              duration: 5000
            });

            console.warn(`[MessageWithArtifacts] Bundle failed for ${artifact.id}, falling back to Babel:`, result.error);
          }

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'error' }));
        }
        } catch (error) {
          console.error(`[MessageWithArtifacts] Unexpected bundling error for ${artifact.id}:`, error);

          const errorMessage = error instanceof Error ? error.message : String(error);

          setArtifacts(prev =>
            prev.map(a =>
              a.id === artifact.id
                ? {
                    ...a,
                    bundlingFailed: true,
                    bundleError: "Bundling failed unexpectedly",
                    bundleErrorDetails: errorMessage,
                    bundleStatus: 'error'
                  }
                : a
            )
          );

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'error' }));

          toast.error(`Failed to bundle ${artifact.title}`, {
            id: `bundle-${artifact.id}`,
            description: "An unexpected error occurred. Please try refreshing the page.",
            duration: 10000
          });
        }
      }
    }

    handleBundling();
  }, [parsedArtifacts, sessionId]);

  // Separate image artifacts from interactive artifacts
  const imageArtifacts = artifacts.filter(a => a.type === 'image');
  const otherArtifacts = artifacts.filter(a => a.type !== 'image');

  return (
    <>
      {/* Render message text without artifact tags */}
      {/* Prose classes applied directly to Markdown component for proper typography */}
      {/* Option 10: Thin Vertical Line - ultra subtle 1px left border, no background bubble */}
      <div
        className={`flex-1 transition-all duration-150 ${className}`}
        style={{
          borderLeft: '1px solid hsl(190 88% 62% / 0.3)',
          paddingLeft: '0.75rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
        }}
      >
        <Markdown
          id={messageId}
          className="prose max-w-none dark:prose-invert"
        >
          {cleanContent}
        </Markdown>
      </div>

      {/* Render inline images */}
      {imageArtifacts.map(artifact => (
        <InlineImage
          key={artifact.id}
          artifact={artifact}
        />
      ))}

      {/* Render artifact cards for non-image artifacts */}
      {otherArtifacts.map(artifact => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          onOpen={() => onArtifactOpen(artifact)}
          className="mt-2"
        />
      ))}
    </>
  );
});

MessageWithArtifacts.displayName = 'MessageWithArtifacts';
