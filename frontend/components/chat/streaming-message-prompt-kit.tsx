/**
 * Streaming Message Component with Prompt-Kit ResponseStream
 * 
 * Uses ResponseStream for SSE streaming while maintaining agent status display.
 * Provides smooth typewriter effect with connection health indicators.
 */

"use client";

import React from 'react';
import { ResponseStreamWrapper } from './response-stream-wrapper';
import { StreamingMessage } from './streaming-message';
import { useResponseStreamFeatureFlag } from '@/hooks/use-response-stream-sse';
import { ResponseStreamData } from '@/lib/response-stream-adapter';
import { ResearchSessionState } from '@/lib/research-sse-service';
import { Mode } from '@/components/ui/response-stream';

export interface StreamingMessagePromptKitProps {
  content: string;
  isComplete: boolean;
  error?: string;
  connectionState?: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  sessionState?: ResearchSessionState | null;
  responseStreamData?: ResponseStreamData | null;
  
  // ResponseStream customization
  streamMode?: Mode;
  streamSpeed?: number;
  showAgentOverlay?: boolean;
  showConnectionHealth?: boolean;
  
  // Callbacks
  onStreamComplete?: () => void;
}

/**
 * Enhanced streaming message component that can use either:
 * 1. Traditional streaming display (StreamingMessage)
 * 2. Prompt-kit ResponseStream with agent overlay (ResponseStreamWrapper)
 */
export function StreamingMessagePromptKit({
  content,
  isComplete,
  error,
  connectionState = 'disconnected',
  sessionState,
  responseStreamData,
  streamMode = 'typewriter',
  streamSpeed = 30,
  showAgentOverlay = true,
  showConnectionHealth = true,
  onStreamComplete
}: StreamingMessagePromptKitProps) {
  const { isResponseStreamEnabled } = useResponseStreamFeatureFlag();
  
  // Use ResponseStream if enabled and data is available
  const useResponseStream = isResponseStreamEnabled && responseStreamData && responseStreamData.textStream;
  
  if (useResponseStream && responseStreamData) {
    return (
      <ResponseStreamWrapper
        responseStreamData={responseStreamData}
        mode={streamMode}
        speed={streamSpeed}
        showAgentOverlay={showAgentOverlay}
        showConnectionHealth={showConnectionHealth}
        error={error}
        onComplete={onStreamComplete}
        data-testid="streaming-message-responsestream"
      />
    );
  }
  
  // Fall back to traditional streaming message
  return (
    <StreamingMessage
      content={content}
      isComplete={isComplete}
      error={error}
      connectionState={connectionState}
      data-testid="streaming-message-traditional"
    />
  );
}

/**
 * Utility function to determine which streaming approach to use
 */
export function getStreamingComponent(
  hasResponseStreamData: boolean,
  featureFlagEnabled: boolean
): 'responsestream' | 'traditional' {
  return featureFlagEnabled && hasResponseStreamData ? 'responsestream' : 'traditional';
}

export default StreamingMessagePromptKit;