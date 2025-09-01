'use client';

import React from 'react';
import { ErrorBoundary } from './error-boundary';
import { VanaDataStreamProvider } from './vana-data-stream-provider';
import { EnhancedChat } from './enhanced-chat';
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';
import type { VisibilityType } from './visibility-selector';

interface VanaChatWrapperProps {
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
  // Error handling configuration
  enableErrorBoundary?: boolean;
  maxRetries?: number;
  showConnectionStatus?: boolean;
  baseUrl?: string;
  enableReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Comprehensive wrapper for VANA-enabled chat with error handling
 */
export function VanaChatWrapper({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
  enableVanaIntegration = true,
  vanaOptions = {},
  // Error handling props with sensible defaults
  enableErrorBoundary = true,
  maxRetries = 3,
  showConnectionStatus = true,
  baseUrl = 'http://localhost:8000',
  enableReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
}: VanaChatWrapperProps) {
  
  const chatContent = (
    <VanaDataStreamProvider
      baseUrl={baseUrl}
      enableReconnect={enableReconnect}
      maxReconnectAttempts={maxReconnectAttempts}
      reconnectDelay={reconnectDelay}
    >
      <EnhancedChat
        id={id}
        initialMessages={initialMessages}
        initialChatModel={initialChatModel}
        initialVisibilityType={initialVisibilityType}
        isReadonly={isReadonly}
        session={session}
        autoResume={autoResume}
        enableVanaIntegration={enableVanaIntegration}
        vanaOptions={vanaOptions}
      />
    </VanaDataStreamProvider>
  );

  // Return chat with or without ErrorBoundary based on configuration
  if (enableErrorBoundary) {
    return (
      <ErrorBoundary
        enableRetry={true}
        maxRetries={maxRetries}
        showConnectionStatus={showConnectionStatus}
        onError={(error, errorInfo) => {
          console.error('VANA Chat Error Boundary triggered:', {
            error: error.message,
            name: error.name,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            chatId: id,
            timestamp: new Date().toISOString(),
          });
          
          // Optional: Send to error tracking service
          // analytics.track('chat_error_boundary', { ... });
        }}
      >
        {chatContent}
      </ErrorBoundary>
    );
  }

  return chatContent;
}

/**
 * Simplified wrapper with default error handling for most use cases
 */
export function SimpleVanaChat(props: Omit<VanaChatWrapperProps, keyof {
  enableErrorBoundary: boolean;
  maxRetries: number;
  showConnectionStatus: boolean;
  baseUrl: string;
  enableReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}>) {
  return (
    <VanaChatWrapper
      {...props}
      enableErrorBoundary={true}
      maxRetries={3}
      showConnectionStatus={true}
      enableReconnect={true}
      maxReconnectAttempts={5}
      reconnectDelay={1000}
    />
  );
}

/**
 * High-reliability wrapper with extended retry logic for production
 */
export function ProductionVanaChat(props: Omit<VanaChatWrapperProps, keyof {
  enableErrorBoundary: boolean;
  maxRetries: number;
  showConnectionStatus: boolean;
  baseUrl: string;
  enableReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}>) {
  return (
    <VanaChatWrapper
      {...props}
      enableErrorBoundary={true}
      maxRetries={5}
      showConnectionStatus={true}
      enableReconnect={true}
      maxReconnectAttempts={10}
      reconnectDelay={2000}
    />
  );
}

/**
 * Development wrapper with extensive logging and debugging features
 */
export function DevelopmentVanaChat(props: Omit<VanaChatWrapperProps, keyof {
  enableErrorBoundary: boolean;
  maxRetries: number;
  showConnectionStatus: boolean;
  baseUrl: string;
  enableReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}>) {
  return (
    <VanaChatWrapper
      {...props}
      enableErrorBoundary={true}
      maxRetries={2}
      showConnectionStatus={true}
      enableReconnect={true}
      maxReconnectAttempts={3}
      reconnectDelay={500}
    />
  );
}

export default VanaChatWrapper;