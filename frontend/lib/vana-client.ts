/**
 * Vana Backend API Client
 * Handles communication with the Google ADK FastAPI backend
 */

export class VanaClient {
  private baseUrl: string;
  private sseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    this.sseUrl = process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost:8000/agent_network_sse';
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Send a chat message to the Vana backend
   */
  async sendMessage(message: string, sessionId: string, attachments?: File[]) {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('session_id', sessionId);
    
    if (attachments) {
      attachments.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create SSE connection for streaming responses
   */
  createSSEConnection(sessionId: string, onMessage: (event: MessageEvent) => void) {
    const eventSource = new EventSource(
      `${this.sseUrl}/${sessionId}${this.token ? `?token=${this.token}` : ''}`
    );

    eventSource.onmessage = onMessage;
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Health check
   */
  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.ok;
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: any) {
    const response = await fetch(`${this.baseUrl}/feedback`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get agent network history
   */
  async getAgentHistory(sessionId?: string) {
    const url = sessionId 
      ? `${this.baseUrl}/agent_network_history?session_id=${sessionId}`
      : `${this.baseUrl}/agent_network_history`;
      
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get agent history: ${response.statusText}`);
    }

    return response.json();
  }
}

export const vanaClient = new VanaClient();