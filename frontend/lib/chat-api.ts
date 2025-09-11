/**
 * Chat API Integration for Vana AI Research Platform
 * 
 * Real implementation connecting to Google ADK backend via Server-Sent Events.
 * Provides streaming chat responses and message handling.
 */

import { 
  apiService, 
  ApiError, 
  NetworkError, 
  TimeoutError,
  type ChatMessage as ApiChatMessage,
  type CreateChatMessageRequest,
  type StreamingChunk
} from './api-client';

// ============================================================================
// Re-export types for backward compatibility
// ============================================================================

export type ChatMessage = ApiChatMessage;

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  messageId?: string;
  timestamp?: string;
  error?: string;
}

// ============================================================================
// SSE Stream Parser
// ============================================================================

class SSEParser {
  private decoder = new TextDecoder();

  /**
   * Parse Server-Sent Events data
   */
  parseSSEData(chunk: string): StreamingChunk | null {
    try {
      // SSE format: "data: {json}\n\n" or "data: [DONE]\n\n"
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          // Check for completion signal
          if (data === '[DONE]' || data === '') {
            return {
              content: '',
              isComplete: true,
            };
          }
          
          // Try to parse JSON data
          try {
            const parsed = JSON.parse(data);
            return {
              content: parsed.content || parsed.delta || parsed.text || '',
              isComplete: false,
              messageId: parsed.message_id,
              timestamp: parsed.timestamp,
            };
          } catch {
            // If not JSON, treat as plain text
            return {
              content: data,
              isComplete: false,
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('[Chat API] Failed to parse SSE data:', error);
      return null;
    }
  }

  /**
   * Read response stream and yield parsed chunks
   */
  async* readStream(response: Response): AsyncGenerator<StreamingChunk> {
    if (!response.body) {
      throw new ApiError('No response body received');
    }

    const reader = response.body.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode chunk and add to buffer
        const chunk = this.decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE messages (ending with \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (message.trim()) {
            const parsed = this.parseSSEData(message);
            if (parsed) {
              yield parsed;
              
              // Stop if completion signal received
              if (parsed.isComplete) {
                return;
              }
            }
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        const parsed = this.parseSSEData(buffer);
        if (parsed) {
          yield parsed;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError('Stream reading timeout');
      }
      throw new NetworkError('Failed to read stream', error as Error);
    } finally {
      reader.releaseLock();
    }
  }
}

// ============================================================================
// Chat ID Management
// ============================================================================

/**
 * Generate or retrieve chat ID for session persistence
 */
function getChatId(): string {
  if (typeof window === 'undefined') {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  let chatId = sessionStorage.getItem('vana_chat_id');
  if (!chatId) {
    chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('vana_chat_id', chatId);
  }
  return chatId;
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Stream chat response from backend using Server-Sent Events
 * 
 * @param message - User message to send
 * @param options - Optional configuration
 * @returns AsyncGenerator yielding streaming response chunks
 */
export async function* streamChatResponse(
  message: string,
  options?: {
    chatId?: string;
    userId?: string;
    onError?: (error: Error) => void;
  }
): AsyncGenerator<StreamingResponse> {
  const chatId = options?.chatId || getChatId();
  const parser = new SSEParser();

  try {
    // First, send the message to create a task
    const request: CreateChatMessageRequest = {
      message,
      user_id: options?.userId,
    };

    console.log(`[Chat API] Sending message to chat ${chatId}`);
    const createResponse = await apiService.sendChatMessage(chatId, request);
    console.log(`[Chat API] Created task ${createResponse.task_id}`);

    // Then establish SSE stream for the response
    const streamResponse = await apiService.createChatStream(
      chatId, 
      createResponse.task_id
    );

    console.log(`[Chat API] Established SSE stream for task ${createResponse.task_id}`);

    // Process the streaming response
    for await (const chunk of parser.readStream(streamResponse)) {
      // Convert to the format expected by the frontend
      const streamingResponse: StreamingResponse = {
        content: chunk.content,
        isComplete: chunk.isComplete,
        messageId: chunk.messageId || createResponse.message_id,
        timestamp: chunk.timestamp,
      };

      yield streamingResponse;

      if (chunk.isComplete) {
        console.log(`[Chat API] Stream completed for task ${createResponse.task_id}`);
        break;
      }
    }
  } catch (error) {
    console.error('[Chat API] Streaming error:', error);
    
    // Call error handler if provided
    if (options?.onError) {
      options.onError(error as Error);
    }

    // Yield error as streaming response
    let errorMessage = 'An error occurred while processing your request.';
    
    if (error instanceof ApiError) {
      errorMessage = `Server error: ${error.message}`;
    } else if (error instanceof NetworkError) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error instanceof TimeoutError) {
      errorMessage = 'Request timeout. Please try again.';
    }

    yield {
      content: '',
      isComplete: true,
      error: errorMessage,
    };
  }
}

/**
 * Send message to backend (maintains backward compatibility)
 * 
 * @param message - Message to send
 * @param options - Optional configuration
 */
export async function sendMessage(
  message: string, 
  options?: {
    chatId?: string;
    userId?: string;
  }
): Promise<void> {
  const chatId = options?.chatId || getChatId();
  
  try {
    const request: CreateChatMessageRequest = {
      message,
      user_id: options?.userId,
    };

    console.log(`[Chat API] Sending message to backend: ${message}`);
    const response = await apiService.sendChatMessage(chatId, request);
    console.log(`[Chat API] Message sent successfully, task ID: ${response.task_id}`);
  } catch (error) {
    console.error('[Chat API] Failed to send message:', error);
    throw error;
  }
}

/**
 * Check backend health status
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const health = await apiService.healthCheck();
    return health.status === 'healthy' || health.status === 'ok';
  } catch (error) {
    console.error('[Chat API] Health check failed:', error);
    return false;
  }
}

/**
 * Get current chat ID (useful for debugging or session management)
 */
export function getCurrentChatId(): string {
  return getChatId();
}

// ============================================================================
// Error Exports for Component Usage
// ============================================================================

export { ApiError, NetworkError, TimeoutError };