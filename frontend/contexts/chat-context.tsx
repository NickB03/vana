"use client";

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useResearchSSE, UseResearchSSEResult } from '@/hooks/use-research-sse';

// ============================================================================
// Type Definitions (simplified - using only research functionality)
// ============================================================================

type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isResearchQuery?: boolean;
  isResearchResult?: boolean;
};

interface StreamingState {
  isStreaming: boolean;
  content: string;
  error?: string;
  connectionState?: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  lastActivity?: Date;
  retryCount?: number;
}

interface ChatContextType {
  // Research-only functionality (chat-api removed)
  messages: ChatMessage[];
  streamingState: StreamingState;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  research: UseResearchSSEResult;
  retryLastMessage: () => void;
  clearError: () => void;
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
    connectionState: 'disconnected',
    lastActivity: new Date(),
    retryCount: 0
  });
  
  // Initialize research SSE functionality with enhanced error handling
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
      // Clear streaming state when complete
      setStreamingState(prev => ({
        isStreaming: false,
        content: '',
        connectionState: 'disconnected',
        lastActivity: new Date(),
        retryCount: 0
      }));
    },
    onError: (error) => {
      console.error('[Chat Context] Research error:', error);
      setStreamingState(prev => ({
        ...prev,
        error: error,
        connectionState: 'failed',
        isStreaming: false,
        lastActivity: new Date(),
        retryCount: (prev.retryCount || 0) + 1
      }));
    },
    onProgress: (progress, phase) => {
      console.log('[Chat Context] Research progress:', progress, phase);
      setStreamingState(prev => ({
        ...prev,
        content: `Research in progress: ${phase} (${Math.round(progress * 100)}%)`,
        connectionState: 'connected',
        lastActivity: new Date(),
        error: undefined // Clear any previous errors on successful progress
      }));
    },
  });
  
  // Enhanced message sending with better error handling and retry logic
  const sendMessage = async (content: string, retryCount: number = 0) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content,
      role: 'user',
      timestamp: new Date(),
      isResearchQuery: true
    };
    
    // Only add the user message if it's not a retry
    if (retryCount === 0) {
      setMessages(prev => [...prev, userMessage]);
    }
    
    try {
      await research.startResearch(content);
      
      // Update streaming state to show research is starting
      setStreamingState(prev => ({
        isStreaming: true,
        content: 'Starting multi-agent research...',
        connectionState: 'connecting',
        lastActivity: new Date(),
        retryCount: 0,
        error: undefined
      }));
    } catch (error) {
      console.error('Error starting research:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start research';
      
      setStreamingState(prev => ({
        isStreaming: false,
        content: '',
        error: errorMessage,
        connectionState: 'failed',
        lastActivity: new Date(),
        retryCount: retryCount + 1
      }));
      
      // Auto-retry for certain types of errors (network issues, etc.)
      if (retryCount < 2 && (errorMessage.includes('network') || errorMessage.includes('timeout'))) {
        console.log(`[Chat Context] Auto-retrying message send (attempt ${retryCount + 2}/3)`);
        setTimeout(() => {
          sendMessage(content, retryCount + 1);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      }
    }
  };

  const clearMessages = () => {
    // Stop any active research
    if (research.isResearchActive) {
      research.stopResearch();
    }
    
    setMessages([]);
    setStreamingState({
      isStreaming: false,
      content: '',
      connectionState: 'disconnected',
      lastActivity: new Date(),
      retryCount: 0,
      error: undefined
    });
  };
  
  // Add retry functionality for failed messages
  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      console.log('[Chat Context] Retrying last message:', lastUserMessage.content);
      sendMessage(lastUserMessage.content, streamingState.retryCount || 0);
    }
  }, [messages, streamingState.retryCount]);
  
  // Enhanced clear error function
  const clearError = useCallback(() => {
    setStreamingState(prev => ({
      ...prev,
      error: undefined,
      retryCount: 0
    }));
  }, []);

  const value: ChatContextType = {
    // Research-only functionality (chat-api removed)
    messages,
    streamingState,
    sendMessage,
    clearMessages,
    connectionStatus: streamingState.connectionState || 'disconnected',
    research,
    retryLastMessage,
    clearError
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}