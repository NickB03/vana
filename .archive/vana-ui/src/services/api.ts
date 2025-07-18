import { ApiErrorHandler } from './errorHandler';
import { RetryService } from './retryService';

// Enhanced API URL detection with debugging
function getApiBaseUrl(): string {
  // Environment variable takes precedence
  if (import.meta.env.VITE_API_URL) {
    console.log('Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Development mode
  if (window.location.hostname === 'localhost') {
    console.log('Using localhost backend');
    return 'http://localhost:8081';
  }
  
  // Production/staging: use same origin
  const sameOrigin = window.location.origin;
  console.log('Using same origin:', sameOrigin);
  return sameOrigin;
}

export const API_BASE_URL = getApiBaseUrl();

interface StreamCallbacks {
  onThinking?: (step: any) => void;
  onContent?: (content: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

// API interface for VANA backend
export const vanaAPI = {
  async sendMessage(message: string, sessionId?: string): Promise<string> {
    try {
      // Debug logging removed for production
      
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          input: message
          // Note: sessionId support will be added when backend implements it
        })
      });
      
      // Response status logging removed for production
      
      if (!response.ok) {
        const errorText = await response.text();
        // Error response logging handled by error handler
        throw new Error(`API Error (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      // API response logging removed for production
      
      // Handle ADK-compliant response format: {result: {output: "...", id: "..."}}
      if (data.result && data.result.output) {
        return data.result.output;
      }
      
      // Fallback for other response formats
      return data.output || data.message || "No response content";
    } catch (error) {
      // Error logging handled by error handler
      
      // Provide helpful error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error("Cannot connect to VANA backend. Please ensure the backend is running on port 8081.");
      }
      
      throw error;
    }
  },

  async streamMessage(message: string, callbacks: StreamCallbacks, sessionId?: string): Promise<void> {
    return RetryService.retryOnCorsError(
      async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              message,
              session_id: sessionId,
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error(`API Error (${response.status}): ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error("No response body");
          }

          let buffer = '';
          let fullContent = '';

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'thinking') {
                    callbacks.onThinking?.(data);
                  } else if (data.type === 'content') {
                    fullContent += data.content;
                    callbacks.onContent?.(data.content);
                  } else if (data.type === 'done') {
                    callbacks.onDone?.();
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
          }
        } catch (error) {
          const apiError = ApiErrorHandler.categorizeError(error as Error);
          callbacks.onError?.(error as Error);
          throw error;
        }
      },
      (attempt) => {
        console.log(`Retrying chat request (attempt ${attempt})...`);
        callbacks.onThinking?.({
          type: 'thinking',
          content: `Connection retry attempt ${attempt}...`,
          status: 'retrying'
        });
      }
    );
  }
};

// Re-export VanaAPIProvider from the provider file for App.tsx
export { VanaAPIProvider } from './VanaAPIProvider';

// Mock APIContextService for backward compatibility
export const APIContextService = {
  // Add any methods that might be expected
};
