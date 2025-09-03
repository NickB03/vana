'use client';

import type { DataUIPart } from 'ai';
import type { CustomUIDataTypes, ChatMessage } from '@/lib/types';
import { extractMessageContent, } from '@/lib/types';

export interface VanaStreamEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
  timestamp?: number;
}

export interface VanaAgentProgress {
  agent_id: string;
  task_id: string;
  progress: number;
  status: 'running' | 'completed' | 'failed';
  message?: string;
  data?: any;
}

export interface VanaResponse {
  message_id: string;
  content: string;
  role: 'assistant' | 'user';
  metadata?: {
    agent_id?: string;
    task_id?: string;
    progress?: VanaAgentProgress;
  };
}

export class VanaStreamAdapter {
  private baseUrl: string;
  private eventSource: EventSource | null = null;
  private messageHandlers: Set<(event: VanaStreamEvent) => void> = new Set();
  private progressHandlers: Set<(progress: VanaAgentProgress) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Convert Vana SSE events to AI SDK data parts
   */
  private convertToDataPart(event: VanaStreamEvent): DataUIPart<CustomUIDataTypes> | null {
    switch (event.type) {
      case 'message_delta':
        return {
          type: 'data-textDelta',
          data: event.data.content || '',
        };
      
      case 'message_complete':
        return {
          type: 'data-appendMessage',
          data: JSON.stringify({
            id: event.data.message_id,
            role: event.data.role,
            content: event.data.content,
            createdAt: new Date().toISOString(),
          }),
        };
      
      case 'agent_progress':
        // Convert agent progress to UI data part
        return {
          type: 'data-appendMessage',
          data: JSON.stringify({
            id: `progress-${event.data.task_id}`,
            role: 'assistant',
            content: `Agent ${event.data.agent_id}: ${event.data.message || 'Processing...'}`,
            metadata: {
              type: 'progress',
              progress: event.data.progress,
              status: event.data.status,
            },
            createdAt: new Date().toISOString(),
          }),
        };
      
      case 'tool_call':
        // Handle tool calls similar to existing artifact system
        return {
          type: 'data-textDelta',
          data: `Using tool: ${event.data.tool_name}\n`,
        };
      
      case 'error':
        return {
          type: 'data-textDelta',
          data: `Error: ${event.data.message}\n`,
        };
      
      default:
        console.warn('Unknown Vana event type:', event.type);
        return null;
    }
  }

  /**
   * Start streaming connection to Vana backend
   */
  async startStream(
    chatId: string,
    message: ChatMessage,
    options: {
      model?: string;
      onData?: (dataPart: DataUIPart<CustomUIDataTypes>) => void;
      onProgress?: (progress: VanaAgentProgress) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    } = {}
  ): Promise<void> {
    try {
      // First, send the message to Vana backend
      const response = await fetch(`${this.baseUrl}/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: extractMessageContent(message),
          message_id: message.id,
          model: options.model || 'gemini-pro',
          metadata: {
            role: message.role,
            created_at: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vana API error: ${response.statusText}`);
      }

      const result = await response.json();
      const taskId = result.task_id;

      // Start SSE connection for real-time updates
      const sseUrl = `${this.baseUrl}/chat/${chatId}/stream?task_id=${taskId}`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('Vana stream connected');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const vanaEvent: VanaStreamEvent = JSON.parse(event.data);
          
          // Convert to AI SDK data part
          const dataPart = this.convertToDataPart(vanaEvent);
          if (dataPart && options.onData) {
            options.onData(dataPart);
          }

          // Handle progress updates
          if (vanaEvent.type === 'agent_progress' && options.onProgress) {
            options.onProgress(vanaEvent.data as VanaAgentProgress);
          }

          // Notify message handlers
          this.messageHandlers.forEach(handler => handler(vanaEvent));

          // Check for completion
          if (vanaEvent.type === 'task_complete' && options.onComplete) {
            options.onComplete();
            this.close();
          }

        } catch (error) {
          console.error('Error parsing Vana SSE event:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to parse SSE event';
          if (options.onError) {
            options.onError(new Error(`Failed to parse SSE event: ${errorMessage}`));
          }
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Vana stream error:', error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect to Vana stream (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.startStream(chatId, message, options);
          }, this.reconnectDelay * this.reconnectAttempts);
        } else if (options.onError) {
          options.onError(new Error('Max reconnection attempts reached'));
        }
      };

    } catch (error) {
      console.error('Failed to start Vana stream:', error);
      if (options.onError) {
        options.onError(error as Error);
      }
    }
  }

  /**
   * Add handler for raw Vana events
   */
  onMessage(handler: (event: VanaStreamEvent) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Add handler for agent progress updates
   */
  onProgress(handler: (progress: VanaAgentProgress) => void): () => void {
    this.progressHandlers.add(handler);
    return () => this.progressHandlers.delete(handler);
  }

  /**
   * Close the stream connection
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.messageHandlers.clear();
    this.progressHandlers.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Check if stream is active
   */
  isActive(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export default VanaStreamAdapter;