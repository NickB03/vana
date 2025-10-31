import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, memo } from "react";
import { ChatMessage } from "@/hooks/useChatMessages";
import { Message, MessageAvatar, MessageContent } from "@/components/prompt-kit/message";
import { Markdown } from "@/components/ui/markdown";
import { InlineImage } from "@/components/InlineImage";
import { parseArtifacts } from "@/utils/artifactParser";

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  onArtifactChange: (hasArtifact: boolean) => void;
}

const MessageItem = memo(({ message, onArtifactChange }: { 
  message: ChatMessage;
  onArtifactChange: (hasArtifact: boolean) => void;
}) => {
  const isAssistant = message.role === "assistant";
  const parsedContent = isAssistant ? parseArtifacts(message.content) : null;
  
  if (parsedContent) {
    const hasArtifacts = parsedContent.artifacts && parsedContent.artifacts.length > 0;
    if (hasArtifacts) {
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
      <MessageContent markdown={isAssistant}>
        {parsedContent ? (
          <>
            {parsedContent.cleanContent && <Markdown id={message.id}>{parsedContent.cleanContent}</Markdown>}
            {parsedContent.artifacts?.map((artifact) => 
              artifact.type === "image" ? (
                <InlineImage key={artifact.id} artifact={artifact} />
              ) : null
            )}
          </>
        ) : (
          message.content
        )}
      </MessageContent>
    </Message>
  );
}, (prev, next) => prev.message.id === next.message.id && prev.message.content === next.message.content);

MessageItem.displayName = "MessageItem";

export const VirtualizedMessageList = memo(({ messages, onArtifactChange }: VirtualizedMessageListProps) => {
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
            />
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedMessageList.displayName = "VirtualizedMessageList";
