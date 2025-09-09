"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ChatMessage } from '@/lib/chat-api';

interface StreamingState {
  isStreaming: boolean;
  content: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  streamingState: StreamingState;
  isWaitingForResponse: boolean;
  sendMessage: (content: string) => void;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    content: ''
  });
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const sendMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsWaitingForResponse(true);
    
    // Simulate API call with streaming response
    setTimeout(() => {
      setIsWaitingForResponse(false);
      setStreamingState({ isStreaming: true, content: '' });
      
      // Simulate streaming text
      simulateStreamingResponse();
    }, 1000);
  };

  const simulateStreamingResponse = () => {
    const responses = [
      "I'm Vana, your AI research assistant. I can help you with complex research questions, analyze data, and provide comprehensive insights.",
      "Thank you for reaching out! I'm designed to help with in-depth research and analysis. What specific topic would you like to explore together?",
      "Hello! I'm here to assist with your research needs. I can help break down complex questions, find relevant information, and provide detailed analysis.",
      "Great question! Let me help you explore that topic. I specialize in conducting thorough research and providing well-structured insights."
    ];
    
    const fullResponse = responses[Math.floor(Math.random() * responses.length)];
    let currentIndex = 0;
    
    const streamInterval = setInterval(() => {
      if (currentIndex >= fullResponse.length) {
        // Complete the streaming
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          content: fullResponse,
          role: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setStreamingState({ isStreaming: false, content: '' });
        clearInterval(streamInterval);
        return;
      }
      
      // Add characters progressively with realistic timing
      const chunkSize = Math.random() > 0.8 ? 3 : 1;
      const chunk = fullResponse.slice(currentIndex, currentIndex + chunkSize);
      currentIndex += chunkSize;
      
      setStreamingState(prev => ({
        isStreaming: true,
        content: prev.content + chunk
      }));
    }, 30 + Math.random() * 70);
  };

  const value: ChatContextType = {
    messages,
    streamingState,
    isWaitingForResponse,
    sendMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}