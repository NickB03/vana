import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, memo, useState } from "react";
import { ChatMessage } from "@/hooks/useChatMessages";
import { Message, MessageAvatar } from "@/components/prompt-kit/message";
import { MessageWithArtifacts } from "@/components/MessageWithArtifacts";
import { ArtifactData } from "@/components/ArtifactContainer";
import { parseArtifacts } from "@/utils/artifactParser";

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  onArtifactChange: (hasArtifact: boolean) => void;
  onArtifactOpen: (artifact: ArtifactData) => void;
}

const MessageItem = memo(({ message, onArtifactChange, onArtifactOpen }: {
  message: ChatMessage;
  onArtifactChange: (hasArtifact: boolean) => void;
  onArtifactOpen: (artifact: ArtifactData) => void;
}) => {
  const isAssistant = message.role === "assistant";

  // Check for artifacts to update parent state
  if (isAssistant) {
    const { artifacts, warnings } = parseArtifacts(message.content);

    // Log warnings if present
    if (warnings && warnings.length > 0) {
      warnings.forEach(warning => {
        console.warn(`Artifact "${warning.artifactTitle}":`, warning.messages.join(', '));
      });
    }

    if (artifacts.length > 0) {
      onArtifactChange(true);
    }
  }

  return (
    <Message className={isAssistant ? "justify-start" : "justify-end"}>
      {isAssistant && (
        <MessageAvatar
          src="https://storage.googleapis.com/gpt-engineer-file-uploads/OC7fxCsI8GZ5WHrbh3LxjMoliXA3/uploads/1761355340262-nebius.png"
          fallback="AI"
        />
      )}
      {isAssistant ? (
        <MessageWithArtifacts
          content={message.content}
          messageId={message.id}
          onArtifactOpen={onArtifactOpen}
        />
      ) : (
        <div className="prose">{message.content}</div>
      )}
    </Message>
  );
}, (prev, next) => prev.message.id === next.message.id && prev.message.content === next.message.content);

MessageItem.displayName = "MessageItem";

export const VirtualizedMessageList = memo(({ messages, onArtifactChange, onArtifactOpen }: VirtualizedMessageListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MessageItem
              message={messages[virtualItem.index]}
              onArtifactChange={onArtifactChange}
              onArtifactOpen={onArtifactOpen}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedMessageList.displayName = "VirtualizedMessageList";
