"use client";

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { ChatMessage, streamChatResponse, StreamingResponse } from '@/lib/chat-api';
import { useAuth } from '@/contexts/auth-context';
import { useResearchSSE, UseResearchSSEResult } from '@/hooks/use-research-sse';

interface StreamingState {
  isStreaming: boolean;
  content: string;
  error?: string;
  connectionState?: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
}

interface ChatContextType {
  // Chat functionality
  messages: ChatMessage[];
  streamingState: StreamingState;
  isWaitingForResponse: boolean;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  
  // Research mode functionality
  isResearchMode: boolean;
  setIsResearchMode: (enabled: boolean) => void;
  research: UseResearchSSEResult;
  sendResearchQuery: (query: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    connectionState: 'disconnected'
  });
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  
  // Research mode state
  const [isResearchMode, setIsResearchMode] = useState(false);
  
  // Initialize research SSE functionality
  const research = useResearchSSE({
    onComplete: (finalReport) => {
      console.log('[Chat Context] Research completed:', finalReport);
      // Add final report as a message
      if (finalReport) {
        const researchMessage: ChatMessage = {
          id: `research-${Date.now()}`,
          content: finalReport,
          role: 'assistant',
          timestamp: new Date(),
          isResearchResult: true
        };
        setMessages(prev => [...prev, researchMessage]);
      }
    },
    onError: (error) => {
      console.error('[Chat Context] Research error:', error);
      setStreamingState(prev => ({
        ...prev,
        error: error,
        connectionState: 'failed'
      }));
    },
    onProgress: (progress, phase) => {
      console.log('[Chat Context] Research progress:', progress, phase);
      setStreamingState(prev => ({
        ...prev,
        content: `Research in progress: ${phase} (${Math.round(progress * 100)}%)`,
        connectionState: 'connected'
      }));
    },
  });
  
  // Use refs to track active streaming to prevent memory leaks
  const activeStreamRef = useRef<{ abort: () => void } | null>(null);
  const chatIdRef = useRef<string>('default');

  const sendMessage = async (content: string) => {
    // If in research mode, redirect to research query
    if (isResearchMode) {
      await sendResearchQuery(content);
      return;
    }

    // Abort any existing stream
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsWaitingForResponse(true);
    
    try {
      // Start real SSE streaming
      await handleRealStreamingResponse(content);
    } catch (error) {
      console.error('Error sending message:', error);
      setStreamingState({
        isStreaming: false,
        content: '',
        error: error instanceof Error ? error.message : 'Failed to send message',
        connectionState: 'failed'
      });
      setIsWaitingForResponse(false);
    }
  };

  const sendResearchQuery = async (query: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: query,
      role: 'user',
      timestamp: new Date(),
      isResearchQuery: true
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsWaitingForResponse(false);
    
    try {
      await research.startResearch(query);
      
      // Update streaming state to show research is starting
      setStreamingState({
        isStreaming: true,
        content: 'Starting multi-agent research...',
        connectionState: 'connecting'
      });
    } catch (error) {
      console.error('Error starting research:', error);
      setStreamingState({
        isStreaming: false,
        content: '',
        error: error instanceof Error ? error.message : 'Failed to start research',
        connectionState: 'failed'
      });
    }
  };

  const handleRealStreamingResponse = async (message: string) => {
    let aborted = false;
    let accumulatedContent = '';
    
    // Create abort controller for cleanup
    const abortController = {
      abort: () => {
        aborted = true;
      }
    };
    activeStreamRef.current = abortController;
    
    try {
      setIsWaitingForResponse(false);
      setStreamingState({ 
        isStreaming: true, 
        content: '',
        connectionState: 'connecting'
      });
      
      // Start streaming from the real API
      const streamGenerator = streamChatResponse(message, {
        chatId: chatIdRef.current,
        userId: user?.id, // Pass authenticated user ID
        onError: (error) => {
          console.error('[Chat Context] Streaming error:', error);
        }
      });
      
      setStreamingState(prev => ({ 
        ...prev, 
        connectionState: 'connected' 
      }));
      
      for await (const chunk of streamGenerator) {
        if (aborted) {
          break;
        }
        
        // Error handling is done by the streamChatResponse function itself
        
        if (chunk.isComplete) {
          // Complete the streaming
          const assistantMessage: ChatMessage = {
            id: Date.now().toString(),
            content: accumulatedContent,
            role: 'assistant',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingState({ 
            isStreaming: false, 
            content: '',
            connectionState: 'disconnected'
          });
          return;
        }
        
        // Update streaming content
        if (chunk.content) {
          accumulatedContent += chunk.content;
          setStreamingState(prev => ({
            ...prev,
            content: prev.content + chunk.content
          }));
        }
      }
      
    } catch (error) {
      if (!aborted) {
        console.error('Streaming error:', error);
        setStreamingState({
          isStreaming: false,
          content: accumulatedContent,
          error: error instanceof Error ? error.message : 'Streaming failed',
          connectionState: 'failed'
        });
      }
    } finally {
      if (activeStreamRef.current === abortController) {
        activeStreamRef.current = null;
      }
    }
  };

  const clearMessages = () => {
    // Abort any active streaming
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
    }
    
    // Stop any active research
    if (research.isResearchActive) {
      research.stopResearch();
    }
    
    setMessages([]);
    setStreamingState({
      isStreaming: false,
      content: '',
      connectionState: 'disconnected'
    });
    setIsWaitingForResponse(false);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.abort();
        activeStreamRef.current = null;
      }
    };
  }, []);

  const value: ChatContextType = {
    // Chat functionality
    messages,
    streamingState,
    isWaitingForResponse,
    sendMessage,
    clearMessages,
    connectionStatus: streamingState.connectionState || 'disconnected',
    
    // Research mode functionality
    isResearchMode,
    setIsResearchMode,
    research,
    sendResearchQuery
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}