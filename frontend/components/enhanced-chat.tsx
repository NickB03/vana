'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useVanaDataStream } from './vana-data-stream-provider';

interface EnhancedChatProps {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
  enableVanaIntegration?: boolean;
  vanaOptions?: {
    agents?: string[];
    model?: string;
    enableProgress?: boolean;
  };
}

export function EnhancedChat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
  enableVanaIntegration = true,
  vanaOptions = {},
}: EnhancedChatProps) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const {
    dataStream,
    setDataStream,
    streamProvider,
    setStreamProvider,
    isVanaConnected,
    startVanaStream,
    stopVanaStream,
    agentProgress,
  } = useVanaDataStream();

  const [input, setInput] = useState<string>('');
  const [useVanaBackend, setUseVanaBackend] = useState(enableVanaIntegration);
  const [vanaAvailable, setVanaAvailable] = useState<boolean | null>(null);

  // Check Vana backend availability
  useEffect(() => {
    const checkVanaAvailability = async () => {
      if (!enableVanaIntegration) {
        setVanaAvailable(false);
        return;
      }

      try {
        const response = await fetch('/api/chat/vana/status');
        const status = await response.json();
        setVanaAvailable(status.available);
        
        if (!status.available) {
          console.warn('Vana backend unavailable, falling back to Vercel AI');
          setUseVanaBackend(false);
        }
      } catch (error) {
        console.error('Failed to check Vana availability:', error);
        setVanaAvailable(false);
        setUseVanaBackend(false);
      }
    };

    checkVanaAvailability();
  }, [enableVanaIntegration]);

  // Standard Vercel AI chat hook
  const {
    messages,
    setMessages,
    sendMessage: sendVercelMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        return {
          body: {
            id,
            message: messages.at(-1),
            selectedChatModel: initialChatModel,
            selectedVisibilityType: visibilityType,
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  // Enhanced send message function with Vana integration
  const sendMessage = async (message: ChatMessage) => {
    if (useVanaBackend && vanaAvailable) {
      try {
        // Add user message to UI immediately
        setMessages((prev) => [...prev, message]);
        
        // Clear previous data stream
        setDataStream([]);
        
        // Start Vana stream
        await startVanaStream(id, message, {
          ...vanaOptions,
          onData: (dataPart) => {
            setDataStream((ds) => [...ds, dataPart]);
          },
          onError: (error) => {
            console.error('Vana stream error, falling back to Vercel AI:', error);
            toast({
              type: 'warning',
              description: 'Switching to fallback AI provider',
            });
            
            // Fallback to Vercel AI
            setUseVanaBackend(false);
            sendVercelMessage(message);
          },
          onComplete: () => {
            mutate(unstable_serialize(getChatHistoryPaginationKey));
          },
        });
        
      } catch (error) {
        console.error('Failed to send via Vana, falling back to Vercel AI:', error);
        toast({
          type: 'warning',
          description: 'Switching to fallback AI provider',
        });
        
        setUseVanaBackend(false);
        sendVercelMessage(message);
      }
    } else {
      // Use standard Vercel AI
      sendVercelMessage(message);
    }
  };

  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      const queryMessage: ChatMessage = {
        id: generateUUID(),
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
        metadata: {
          createdAt: new Date().toISOString(),
        },
      };
      
      sendMessage(queryMessage);
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // Enhanced stop function
  const stopGeneration = () => {
    if (isVanaConnected) {
      stopVanaStream();
    }
    stop();
  };

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
          // Enhanced header props
          useVanaBackend={useVanaBackend}
          vanaAvailable={vanaAvailable}
          isVanaConnected={isVanaConnected}
          onToggleVana={(enabled) => setUseVanaBackend(enabled)}
        />

        {/* Agent Progress Display */}
        {agentProgress.size > 0 && (
          <div className="border-b border-border bg-muted/50 p-2 space-y-1">
            {Array.from(agentProgress.values()).map((progress) => (
              <div
                key={progress.agent_id}
                className="flex items-center gap-2 text-sm"
              >
                <div className="font-medium">{progress.agent_id}:</div>
                <div className="flex-1">
                  <div className="bg-background rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${progress.progress * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(progress.progress * 100)}%
                </div>
                <div
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    progress.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : progress.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {progress.status}
                </div>
              </div>
            ))}
          </div>
        )}

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <MultimodalInput
          chatId={id}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          stop={stopGeneration}
          attachments={attachments}
          setAttachments={setAttachments}
          status={isVanaConnected ? 'streaming' : status}
          isReadonly={isReadonly}
        />
      </div>

      <Artifact />
    </>
  );
}