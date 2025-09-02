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
import { VanaBackendError, SSEConnectionError, isRetryableError } from '@/lib/errors';
import { useErrorHandler } from './error-boundary';

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
    connectionState,
    lastError,
    reconnectAttempts,
    maxReconnectAttempts,
    retryConnection,
    onConnectionStateChange,
    onError,
  } = useVanaDataStream();

  const { handleError: handleErrorWithToast } = useErrorHandler();

  const [input, setInput] = useState<string>('');
  const [useVanaBackend, setUseVanaBackend] = useState(enableVanaIntegration);
  const [vanaAvailable, setVanaAvailable] = useState<boolean | null>(null);
  const [connectionErrors, setConnectionErrors] = useState<Error[]>([]);

  // Enhanced Vana backend availability check
  useEffect(() => {
    const checkVanaAvailability = async () => {
      if (!enableVanaIntegration) {
        setVanaAvailable(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch('/api/chat/vana/status', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new VanaBackendError(
            `VANA status check failed: ${response.status} ${response.statusText}`,
            'STATUS_CHECK_FAILED',
            response.status,
            { retryable: response.status >= 500 }
          );
        }
        
        const status = await response.json();
        setVanaAvailable(status.available);
        
        if (!status.available) {
          console.warn('Vana backend unavailable, falling back to Vercel AI');
          setUseVanaBackend(false);
          toast({
            type: 'warning',
            description: 'VANA backend is currently unavailable. Using fallback AI provider.',
          });
        }
      } catch (error) {
        console.error('Failed to check Vana availability:', error);
        const vanaError = error instanceof VanaBackendError 
          ? error 
          : new VanaBackendError(
              'Failed to check VANA availability',
              'AVAILABILITY_CHECK_FAILED',
              503,
              { retryable: true }
            );
        
        setVanaAvailable(false);
        setUseVanaBackend(false);
        setConnectionErrors(prev => [...prev, vanaError]);
        handleErrorWithToast(vanaError, 'VANA availability check');
      }
    };

    checkVanaAvailability();
  }, [enableVanaIntegration, handleErrorWithToast]);

  // Subscribe to connection state changes and errors
  useEffect(() => {
    const unsubscribeFromConnectionState = onConnectionStateChange((state) => {
      console.log('Connection state changed:', state);
      
      switch (state) {
        case 'connected':
          setConnectionErrors([]);
          break;
        case 'reconnecting':
          toast({
            type: 'warning',
            description: 'Reconnecting to VANA backend...',
          });
          break;
        case 'failed':
          toast({
            type: 'error',
            description: 'Connection to VANA backend failed. Using fallback AI provider.',
          });
          setUseVanaBackend(false);
          break;
      }
    });

    const unsubscribeFromErrors = onError((error) => {
      console.error('VANA error received:', error);
      setConnectionErrors(prev => [...prev.slice(-4), error]); // Keep last 5 errors
      handleErrorWithToast(error, 'VANA backend');
    });

    return () => {
      unsubscribeFromConnectionState();
      unsubscribeFromErrors();
    };
  }, [onConnectionStateChange, onError, handleErrorWithToast]);

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

  // Enhanced send message function with comprehensive error handling
  const sendMessage = async (message?: any, options?: any) => {
    if (!message) {
      console.warn('Attempted to send empty message');
      return;
    }

    if (useVanaBackend && vanaAvailable) {
      try {
        // Add user message to UI immediately
        setMessages((prev) => [...prev, message]);
        
        // Clear previous data stream and errors
        setDataStream([]);
        setConnectionErrors([]);
        
        // Start Vana stream with enhanced error handling
        await startVanaStream(id, message, {
          ...vanaOptions,
          onData: (dataPart) => {
            setDataStream((ds) => [...ds, dataPart]);
          },
          onError: (error) => {
            console.error('Vana stream error:', error);
            setConnectionErrors(prev => [...prev, error]);
            
            // Handle specific error types
            if (error instanceof VanaBackendError) {
              if (error.retryable && reconnectAttempts < maxReconnectAttempts) {
                toast({
                  type: 'warning',
                  description: `VANA error: ${error.message}. Retrying... (${reconnectAttempts + 1}/${maxReconnectAttempts})`,
                });
                return; // Let the retry logic handle it
              } else {
                toast({
                  type: 'error',
                  description: `VANA error: ${error.message}. Switching to fallback AI provider.`,
                });
              }
            } else if (error instanceof SSEConnectionError) {
              if (error.retryable && reconnectAttempts < maxReconnectAttempts) {
                toast({
                  type: 'warning',
                  description: 'Connection lost. Attempting to reconnect...',
                });
                return; // Let the retry logic handle it
              } else {
                toast({
                  type: 'error',
                  description: 'Connection failed after multiple attempts. Switching to fallback AI provider.',
                });
              }
            } else {
              toast({
                type: 'error',
                description: `Unexpected error: ${error.message}. Switching to fallback AI provider.`,
              });
            }
            
            // Fallback to Vercel AI for non-retryable errors
            if (!isRetryableError(error) || reconnectAttempts >= maxReconnectAttempts) {
              setUseVanaBackend(false);
              
              // Remove the user message that was added optimistically
              setMessages(prev => prev.slice(0, -1));
              
              // Send via Vercel AI
              sendVercelMessage(message);
            }
          },
          onProgress: (progress) => {
            console.log('Agent progress:', progress);
          },
          onComplete: () => {
            console.log('VANA stream completed successfully');
            mutate(unstable_serialize(getChatHistoryPaginationKey));
            
            // Clear connection errors on successful completion
            setConnectionErrors([]);
            
            toast({
              type: 'success',
              description: 'Message processed successfully.',
            });
          },
        });
        
      } catch (error) {
        console.error('Failed to send via VANA:', error);
        setConnectionErrors(prev => [...prev, error instanceof Error ? error : new Error('Unknown error')]);
        
        const errorMessage = error instanceof VanaBackendError 
          ? `VANA error: ${error.message}`
          : error instanceof SSEConnectionError
          ? 'Connection error occurred'
          : 'Failed to send message via VANA';
        
        toast({
          type: 'error',
          description: `${errorMessage}. Switching to fallback AI provider.`,
        });
        
        // Fallback to Vercel AI
        setUseVanaBackend(false);
        
        // Remove the user message that was added optimistically
        setMessages(prev => prev.slice(0, -1));
        
        // Send via Vercel AI
        sendVercelMessage(message);
      }
    } else {
      // Use standard Vercel AI
      try {
        await sendVercelMessage(message);
      } catch (error) {
        console.error('Vercel AI send error:', error);
        const errorMessage = error instanceof ChatSDKError 
          ? error.message 
          : 'Failed to send message';
        
        toast({
          type: 'error',
          description: errorMessage,
        });
        
        throw error;
      }
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
  const stopGeneration = async () => {
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

        {/* Connection Status - Only show when there's an issue */}
        {useVanaBackend && connectionState !== 'connected' && connectionState !== 'disconnected' && (
          <div className="border-b border-border">
            {/* Connection Status Bar */}
            <div className={`px-3 py-2 text-xs flex items-center gap-2 ${
              connectionState === 'reconnecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              connectionState === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-gray-50 text-gray-700 border-gray-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionState === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                connectionState === 'failed' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              
              <span className="font-medium">
                {connectionState === 'reconnecting' ? `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})` :
                  connectionState === 'failed' ? 'Connection Failed' :
                  'Connecting...'
                }
              </span>
              
              {lastError && connectionState === 'failed' && (
                <button
                  onClick={async () => {
                    try {
                      await retryConnection();
                    } catch (error) {
                      console.error('Manual retry failed:', error);
                    }
                  }}
                  className="ml-auto px-2 py-1 bg-white border border-current rounded text-xs hover:bg-opacity-80 transition-colors"
                >
                  Retry Connection
                </button>
              )}
            </div>

            {/* Recent Connection Errors - Only show critical errors */}
            {connectionErrors.length > 0 && connectionState === 'failed' && (
              <div className="px-3 py-2 bg-red-50 border-t border-red-200">
                <div className="text-xs text-red-600 space-y-1">
                  <div className="font-medium">Connection Issue:</div>
                  {connectionErrors.slice(-1).map((error, index) => (
                    <div key={index} className="text-xs opacity-75">
                      • {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agent Progress Display */}
        {agentProgress.size > 0 && (
          <div className="border-b border-border bg-muted/50 p-2 space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              VANA Agent Progress:
            </div>
            {Array.from(agentProgress.values()).map((progress) => (
              <div
                key={progress.agent_id}
                className="flex items-center gap-2 text-sm"
              >
                <div className="font-medium text-xs">{progress.agent_id}:</div>
                <div className="flex-1">
                  <div className="bg-background rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(progress.progress)}%
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
          messages={messages}
          setMessages={setMessages}
          status={isVanaConnected ? 'streaming' : status}
          selectedVisibilityType={visibilityType}
        />
      </div>

      <Artifact 
        chatId={id}
        input={input}
        setInput={setInput}
        status={isVanaConnected ? 'streaming' : status}
        stop={stopGeneration}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes || []}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}