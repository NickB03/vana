'use client';

import { useVanaChat, type Message } from '@/hooks/use-vana-chat';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { vanaClient } from '@/lib/vana-client';
import { VanaDataStreamProvider } from './vana-data-stream-provider';
import type { ChatMessage } from '@/lib/types';
import { extractMessageContent, getMessageCreatedAt } from '@/lib/types';

interface ChatProps {
  id: string;
  initialMessages?: ChatMessage[];
  session: any;
}

// Convert ChatMessage to Message for useVanaChat
function chatMessageToMessage(chatMessage: ChatMessage): Message {
  const content = extractMessageContent(chatMessage);
  const createdAtString = getMessageCreatedAt(chatMessage);
  
  // Ensure we have valid content - if empty, provide a fallback
  const finalContent = content || (chatMessage.content as string) || '';
  
  // Parse the date string safely
  let createdAt: Date;
  try {
    createdAt = new Date(createdAtString);
    // Check if date is valid
    if (Number.isNaN(createdAt.getTime())) {
      createdAt = new Date();
    }
  } catch {
    createdAt = new Date();
  }
  
  return {
    id: chatMessage.id,
    role: chatMessage.role,
    content: finalContent,
    createdAt,
    attachments: [],
  };
}

// Convert Message to ChatMessage for Messages component
function messageToChatMessage(message: Message): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt?.toISOString() || new Date().toISOString(),
    parts: [
      {
        type: 'text',
        text: message.content,
      }
    ],
  } as ChatMessage;
}

export function Chat({ id, initialMessages = [], session }: ChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Convert initial messages to Message format for useVanaChat
  const initialVanaMessages = useMemo(
    () => initialMessages.map(chatMessageToMessage),
    [initialMessages]
  );

  const {
    messages: vanaMessages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    setMessages: setVanaMessages,
  } = useVanaChat({
    initialMessages: initialVanaMessages,
    onError: (error) => {
      console.error('Chat error:', error);
      setConnectionError(error.message);
    },
  });

  // Convert vanaMessages back to ChatMessage format for Messages component
  const chatMessages = useMemo(
    () => vanaMessages.map(messageToChatMessage),
    [vanaMessages]
  );

  // Create setMessages function that converts ChatMessage[] back to Message[]
  const setChatMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (typeof updater === 'function') {
      setVanaMessages(prev => {
        const chatMessages = prev.map(messageToChatMessage);
        const updated = updater(chatMessages);
        return updated.map(chatMessageToMessage);
      });
    } else {
      setVanaMessages(updater.map(chatMessageToMessage));
    }
  }, [setVanaMessages]);

  // Create regenerate function for Messages component
  const regenerate = useCallback(async (options?: { messageId?: string }) => {
    const messageId = options?.messageId;
    if (!messageId) return;
    const messageIndex = chatMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Find the user message before this assistant message
    const userMessageIndex = chatMessages.slice(0, messageIndex).findLastIndex(m => m.role === 'user');
    if (userMessageIndex === -1) return;

    const userMessage = chatMessages[userMessageIndex];
    
    // Remove all messages after the user message
    setChatMessages(prev => prev.slice(0, userMessageIndex + 1));
    
    // Set the input to the user message content and resubmit
    setInput(extractMessageContent(userMessage));
    setTimeout(() => handleSubmit(), 0);
  }, [chatMessages, setChatMessages, setInput, handleSubmit]);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const healthy = await vanaClient.checkHealth();
        setIsConnected(healthy);
        if (!healthy) {
          setConnectionError('Cannot connect to Vana backend. Make sure the server is running on port 8000.');
        }
      } catch (err) {
        setIsConnected(false);
        setConnectionError('Cannot connect to Vana backend. Make sure the server is running on port 8000.');
      }
    };

    checkConnection();
  }, []);

  return (
    <VanaDataStreamProvider>
      <div className="flex flex-col min-w-0 h-dvh bg-background">

        <Messages 
          chatId={id}
          messages={chatMessages}
          setMessages={setChatMessages}
          status={isLoading ? 'streaming' : 'ready'}
          votes={[]}
          regenerate={regenerate}
          isReadonly={false}
          isArtifactVisible={false}
        />

        <div className="sticky bottom-0 flex gap-2 px-4 pb-4 mx-auto w-full bg-background md:pb-6 md:max-w-3xl z-[1] border-t-0">
          <MultimodalInput
            chatId={id}
            input={input}
            setInput={setInput}
            status={isLoading ? 'streaming' : 'ready'}
            stop={stop}
            attachments={[]}
            setAttachments={() => {}}
            messages={chatMessages}
            setMessages={setChatMessages}
            sendMessage={async (message) => {
              if (message) {
                const content = extractMessageContent(message as ChatMessage);
                if (content) {
                  setInput(content);
                }
                await handleSubmit();
              } else {
                await handleSubmit();
              }
            }}
            selectedVisibilityType="public"
          />
          
          {error && (
            <div className="mt-2 text-red-600 text-sm text-center w-full">
              Error: {error.message}
              <button 
                type="button"
                onClick={reload}
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </VanaDataStreamProvider>
  );
}