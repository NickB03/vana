/**
 * Custom hook to replace Vercel AI SDK's useChat
 * Works with Vana's Google ADK backend
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { vanaClient } from '@/lib/vana-client';
import { nanoid } from 'nanoid';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
  attachments?: any[];
}

interface UseVanaChatOptions {
  initialMessages?: Message[];
  onError?: (error: Error) => void;
  onFinish?: (message: Message) => void;
}

export function useVanaChat(options: UseVanaChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const sessionId = useRef(nanoid());
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentAssistantMessage = useRef<Message | null>(null);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: input,
      createdAt: new Date(),
    };

    // Add user message to the list
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Close existing SSE connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };
      
      currentAssistantMessage.current = assistantMessage;
      setMessages(prev => [...prev, assistantMessage]);

      // Send message to backend
      await vanaClient.sendMessage(input, sessionId.current);

      // Set up SSE connection for streaming response
      eventSourceRef.current = vanaClient.createSSEConnection(
        sessionId.current,
        (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle different event types from Vana backend
            switch (data.type) {
              case 'agent_response_start':
                // Response started
                break;
                
              case 'agent_response_chunk':
                // Append chunk to current message
                if (currentAssistantMessage.current) {
                  currentAssistantMessage.current.content += data.data.content || '';
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === currentAssistantMessage.current?.id 
                        ? { ...currentAssistantMessage.current } 
                        : msg
                    )
                  );
                }
                break;
                
              case 'agent_response_complete':
                // Response completed
                setIsLoading(false);
                if (currentAssistantMessage.current && options.onFinish) {
                  options.onFinish(currentAssistantMessage.current);
                }
                currentAssistantMessage.current = null;
                break;
                
              case 'agent_error':
                throw new Error(data.data.error || 'Agent error occurred');
                
              default:
                console.log('Unknown event type:', data.type);
            }
          } catch (err) {
            console.error('Error parsing SSE data:', err);
          }
        }
      );

      eventSourceRef.current.onerror = (err) => {
        console.error('SSE error:', err);
        setIsLoading(false);
        const error = new Error('Connection to server lost');
        setError(error);
        if (options.onError) {
          options.onError(error);
        }
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      setIsLoading(false);
      if (options.onError) {
        options.onError(error);
      }
    }
  }, [input, isLoading, options]);

  const reload = useCallback(async () => {
    if (messages.length === 0) return;
    
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Remove last assistant message if any
    const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
    if (lastAssistantIndex > -1) {
      setMessages(prev => prev.slice(0, lastAssistantIndex));
    }

    // Resend the last user message
    setInput(lastUserMessage.content);
    setTimeout(() => handleSubmit(), 0);
  }, [messages, handleSubmit]);

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const append = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const setMessagesDirectly = useCallback((messages: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages(messages);
  }, []);

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append,
    setMessages: setMessagesDirectly,
  };
}