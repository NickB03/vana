// hooks/useGLMChat.ts
// Complete React hook for GLM 4.6 streaming with reasoning/thinking support

import { useState, useCallback, useRef, useEffect } from 'react';

// ============ Types ============

export interface ThinkingState {
  isThinking: boolean;
  content: string;
  status: string;
  duration: number;
}

export interface ToolCall {
  index: number;
  name: string;
  arguments: string;
  isComplete: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: {
    content: string;
    duration: number;
  };
  toolCalls?: ToolCall[];
  timestamp: Date;
}

export interface UseGLMChatOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  enableThinking?: boolean;
  enableToolStream?: boolean;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  onThinkingStart?: () => void;
  onThinkingEnd?: (duration: number) => void;
  onError?: (error: Error) => void;
}

export interface UseGLMChatReturn {
  messages: Message[];
  thinking: ThinkingState;
  toolCalls: ToolCall[];
  isStreaming: boolean;
  currentResponse: string;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

// ============ Hook Implementation ============

export function useGLMChat(options: UseGLMChatOptions): UseGLMChatReturn {
  const {
    supabaseUrl,
    supabaseAnonKey,
    enableThinking = true,
    enableToolStream = false,
    tools = [],
    onThinkingStart,
    onThinkingEnd,
    onError,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState<ThinkingState>({
    isThinking: false,
    content: '',
    status: 'Thinking...',
    duration: 0,
  });
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Reset streaming state
    setIsStreaming(true);
    setCurrentResponse('');
    setToolCalls([]);
    setThinking({
      isThinking: enableThinking,
      content: '',
      status: 'Thinking...',
      duration: 0,
    });

    // Start duration timer
    startTimeRef.current = Date.now();
    if (enableThinking) {
      durationIntervalRef.current = setInterval(() => {
        setThinking(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);
    }

    abortControllerRef.current = new AbortController();

    let thinkingContent = '';
    let responseContent = '';
    let currentToolCalls: ToolCall[] = [];
    let thinkingDuration = 0;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          enableThinking,
          enableToolStream,
          tools: tools.length > 0 ? tools : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data:'));

        for (const line of lines) {
          const jsonStr = line.slice(5).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case 'thinking_start':
                onThinkingStart?.();
                setThinking(prev => ({ ...prev, isThinking: true }));
                break;

              case 'status':
                setThinking(prev => ({
                  ...prev,
                  status: event.description || prev.status,
                }));
                break;

              case 'thinking_delta':
                thinkingContent += event.content || '';
                setThinking(prev => ({
                  ...prev,
                  content: thinkingContent,
                }));
                break;

              case 'thinking_end':
                thinkingDuration = event.duration || Math.floor((Date.now() - startTimeRef.current) / 1000);
                if (durationIntervalRef.current) {
                  clearInterval(durationIntervalRef.current);
                  durationIntervalRef.current = null;
                }
                setThinking(prev => ({
                  ...prev,
                  isThinking: false,
                  duration: thinkingDuration,
                }));
                onThinkingEnd?.(thinkingDuration);
                break;

              case 'thinking_complete':
                thinkingContent = event.thinking || thinkingContent;
                thinkingDuration = event.duration || thinkingDuration;
                if (durationIntervalRef.current) {
                  clearInterval(durationIntervalRef.current);
                  durationIntervalRef.current = null;
                }
                setThinking(prev => ({
                  ...prev,
                  isThinking: false,
                  content: thinkingContent,
                  duration: thinkingDuration,
                }));
                break;

              case 'text_delta':
                responseContent += event.content || '';
                setCurrentResponse(responseContent);
                break;

              case 'tool_call_start':
                currentToolCalls.push({
                  index: event.index,
                  name: event.name || '',
                  arguments: '',
                  isComplete: false,
                });
                setToolCalls([...currentToolCalls]);
                break;

              case 'tool_call_delta':
                const deltaIndex = currentToolCalls.findIndex(t => t.index === event.index);
                if (deltaIndex !== -1) {
                  currentToolCalls[deltaIndex].arguments += event.arguments || '';
                  setToolCalls([...currentToolCalls]);
                }
                break;

              case 'tool_call_end':
                const endIndex = currentToolCalls.findIndex(t => t.index === event.index);
                if (endIndex !== -1) {
                  currentToolCalls[endIndex].isComplete = true;
                  currentToolCalls[endIndex].arguments = event.arguments || currentToolCalls[endIndex].arguments;
                  setToolCalls([...currentToolCalls]);
                }
                break;
            }
          } catch (e) {
            // Skip malformed events
            console.warn('Failed to parse event:', jsonStr);
          }
        }
      }

      // Add assistant message to history
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      if (thinkingContent) {
        assistantMessage.thinking = {
          content: thinkingContent,
          duration: thinkingDuration,
        };
      }

      if (currentToolCalls.length > 0) {
        assistantMessage.toolCalls = currentToolCalls;
      }

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled - still save partial response if any
        if (responseContent) {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'assistant',
            content: responseContent + '\n\n[Generation stopped]',
            timestamp: new Date(),
            thinking: thinkingContent ? { content: thinkingContent, duration: thinkingDuration } : undefined,
          }]);
        }
      } else {
        console.error('Stream error:', error);
        onError?.(error as Error);
      }
    } finally {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setIsStreaming(false);
      setCurrentResponse('');
      setToolCalls([]);
      setThinking(prev => ({ ...prev, isThinking: false }));
    }
  }, [messages, isStreaming, supabaseUrl, supabaseAnonKey, enableThinking, enableToolStream, tools, onThinkingStart, onThinkingEnd, onError]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentResponse('');
    setThinking({
      isThinking: false,
      content: '',
      status: 'Thinking...',
      duration: 0,
    });
    setToolCalls([]);
  }, []);

  return {
    messages,
    thinking,
    toolCalls,
    isStreaming,
    currentResponse,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
  };
}

// ============ Usage Example ============
/*

import { useGLMChat } from './hooks/useGLMChat';

function ChatPage() {
  const {
    messages,
    thinking,
    isStreaming,
    currentResponse,
    sendMessage,
    stopGeneration,
  } = useGLMChat({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    enableThinking: true,
    onThinkingStart: () => console.log('Started thinking...'),
    onThinkingEnd: (duration) => console.log(`Thought for ${duration}s`),
    onError: (error) => console.error('Chat error:', error),
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.thinking && <ThinkingPanel {...msg.thinking} />}
          <p>{msg.content}</p>
        </div>
      ))}
      
      {isStreaming && (
        <div>
          {thinking.isThinking && (
            <ThinkingPanel 
              isThinking={true}
              content={thinking.content}
              status={thinking.status}
              duration={thinking.duration}
            />
          )}
          <p>{currentResponse}</p>
        </div>
      )}
    </div>
  );
}

*/
