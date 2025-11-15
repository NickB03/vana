import { memo } from "react";
import { Markdown } from "@/components/ui/markdown";
import { InlineImage } from "@/components/InlineImage";
import { ArtifactCard } from "@/components/ArtifactCard";
import { parseArtifacts } from "@/utils/artifactParser";
import { ArtifactData } from "@/components/ArtifactContainer";

interface MessageWithArtifactsProps {
  content: string;
  messageId?: string;
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
  onArtifactOpen,
  className = ""
}: MessageWithArtifactsProps) => {
  const { artifacts, cleanContent } = parseArtifacts(content);

  // Separate image artifacts from interactive artifacts
  const imageArtifacts = artifacts.filter(a => a.type === 'image');
  const otherArtifacts = artifacts.filter(a => a.type !== 'image');

  return (
    <>
      {/* Render message text without artifact tags */}
      {/* Prose classes applied directly to Markdown component for proper typography */}
      <div
        className={`flex-1 rounded-lg bg-transparent p-0 pl-3 border-l-4 transition-all duration-150 ${className}`}
        style={{
          borderLeftColor: 'hsl(var(--accent-ai) / 0.4)',
        }}
      >
        <Markdown
          id={messageId}
          className="prose prose-sm max-w-none dark:prose-invert"
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
