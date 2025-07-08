/**
 * API Interaction Pattern
 * 
 * This file demonstrates the standard patterns for interacting with the VANA backend
 * from the frontend. It shows best practices for:
 * - Making HTTP requests to the VANA API
 * - Handling authentication with Bearer tokens
 * - Error handling and response processing
 * - TypeScript typing for API responses
 */

// Type definitions for API responses
interface VanaApiResponse {
  success: boolean;
  data?: string;
  error?: string;
  agentId?: string;
  processingTime?: number;
}

interface VanaApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Fetch VANA Response Function
 * 
 * This function demonstrates the standard pattern for making API calls
 * to the VANA backend from the frontend application.
 * 
 * @param prompt - The user's prompt/message to send to VANA agents
 * @param options - Optional configuration for the request
 * @returns Promise<VanaApiResponse> - The response from the VANA API
 */
export async function fetchVanaResponse(
  prompt: string,
  options: {
    agentType?: 'orchestrator' | 'data_science' | 'specialist';
    timeout?: number;
    apiKey?: string;
  } = {}
): Promise<VanaApiResponse> {
  // Request configuration
  const {
    agentType = 'orchestrator',
    timeout = 30000, // 30 second timeout
    apiKey = process.env.VANA_API_KEY || '<YOUR_API_KEY>'
  } = options;

  // Validate input
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty');
  }

  if (!apiKey || apiKey === '<YOUR_API_KEY>') {
    throw new Error('API key is required. Please set VANA_API_KEY environment variable.');
  }

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Make the API request
    const response = await fetch('https://api.vana.com/v1/chat', {
      method: 'POST',
      
      // Set required headers
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'VANA-Chat-UI/1.0.0'
      },
      
      // Request body with VANA-specific parameters
      body: JSON.stringify({
        prompt: prompt.trim(),
        agent_type: agentType,
        stream: false, // Set to true for streaming responses
        max_tokens: 4000,
        temperature: 0.7,
        include_metadata: true
      }),
      
      // Request configuration
      signal: controller.signal
    });

    // Clear the timeout
    clearTimeout(timeoutId);

    // Check if the response is ok
    if (!response.ok) {
      // Handle HTTP error status codes
      const errorData = await response.json().catch(() => ({})) as VanaApiError;
      
      throw new Error(
        `VANA API request failed: ${response.status} ${response.statusText}. ${
          errorData.message || 'Unknown error occurred'
        }`
      );
    }

    // Parse the successful response
    const data: VanaApiResponse = await response.json();

    // Validate response structure
    if (typeof data.success !== 'boolean') {
      throw new Error('Invalid response format from VANA API');
    }

    return data;

  } catch (error) {
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to VANA API');
      }
      
      // Re-throw the original error
      throw error;
    }

    // Handle unknown error types
    throw new Error('An unexpected error occurred while calling VANA API');
  }
}

/**
 * Streaming VANA Response Function
 * 
 * For real-time streaming responses from VANA agents.
 * This pattern is useful for long-running agent tasks.
 */
export async function fetchVanaStreamingResponse(
  prompt: string,
  onChunk: (chunk: string) => void,
  options: {
    agentType?: 'orchestrator' | 'data_science' | 'specialist';
    apiKey?: string;
  } = {}
): Promise<void> {
  const {
    agentType = 'orchestrator',
    apiKey = process.env.VANA_API_KEY || '<YOUR_API_KEY>'
  } = options;

  if (!apiKey || apiKey === '<YOUR_API_KEY>') {
    throw new Error('API key is required for streaming requests');
  }

  try {
    const response = await fetch('https://api.vana.com/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        agent_type: agentType,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Streaming request failed: ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to create stream reader');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Process Server-Sent Events format
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() && data !== '[DONE]') {
              onChunk(data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Streaming error: ${error.message}`);
    }
    throw new Error('Unknown streaming error occurred');
  }
}

/**
 * Helper function for handling API errors in React components
 */
export function handleVanaApiError(error: Error): {
  message: string;
  isRetryable: boolean;
} {
  const message = error.message;
  
  // Determine if the error is retryable
  const isRetryable = 
    message.includes('Network error') ||
    message.includes('timeout') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504');

  return {
    message: message,
    isRetryable
  };
}

/**
 * Usage Examples:
 * 
 * // Basic usage in a React component
 * const handleSendMessage = async (prompt: string) => {
 *   try {
 *     setLoading(true);
 *     const response = await fetchVanaResponse(prompt);
 *     
 *     if (response.success && response.data) {
 *       setAgentResponse(response.data);
 *     } else {
 *       setError(response.error || 'Unknown error');
 *     }
 *   } catch (error) {
 *     const { message, isRetryable } = handleVanaApiError(error as Error);
 *     setError(message);
 *     setCanRetry(isRetryable);
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 * 
 * // Streaming usage
 * const handleStreamingMessage = async (prompt: string) => {
 *   setStreamingResponse('');
 *   
 *   try {
 *     await fetchVanaStreamingResponse(
 *       prompt,
 *       (chunk) => {
 *         setStreamingResponse(prev => prev + chunk);
 *       },
 *       { agentType: 'data_science' }
 *     );
 *   } catch (error) {
 *     console.error('Streaming failed:', error);
 *   }
 * };
 * 
 * // With specific agent type
 * const response = await fetchVanaResponse(
 *   "Analyze this dataset for trends",
 *   { agentType: 'data_science', timeout: 60000 }
 * );
 */

/**
 * Environment Configuration:
 * 
 * Make sure to set these environment variables:
 * - VANA_API_KEY: Your VANA API authentication key
 * - NEXT_PUBLIC_VANA_API_URL: API base URL (optional, defaults to api.vana.com)
 * 
 * For development, create a .env.local file:
 * VANA_API_KEY=your_actual_api_key_here
 * NEXT_PUBLIC_VANA_API_URL=https://dev-api.vana.com
 */

/**
 * Security Notes:
 * 
 * 1. Never expose API keys in client-side code in production
 * 2. Use environment variables for configuration
 * 3. Implement proper CORS handling on the backend
 * 4. Consider implementing request signing for additional security
 * 5. Use HTTPS for all API communications
 * 6. Implement rate limiting and request validation
 */
