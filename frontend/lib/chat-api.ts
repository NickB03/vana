// Chat API integration stubs
// This will eventually connect to the backend SSE endpoint

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
}

// Simulate SSE streaming response
export async function* streamChatResponse(_message: string): AsyncGenerator<StreamingResponse> {
  // This will eventually connect to the backend's /api/run_sse endpoint
  const responses = [
    "I'm Vana, your AI research assistant. ",
    "I can help you with complex research questions, ",
    "analyze data, and provide comprehensive insights. ",
    "What would you like to research today?"
  ];
  
  for (const chunk of responses) {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    yield {
      content: chunk,
      isComplete: false
    };
  }
  
  yield {
    content: '',
    isComplete: true
  };
}

// Send message to backend (stub)
export async function sendMessage(message: string): Promise<void> {
  // This will eventually POST to the backend API
  console.log('Sending message to backend:', message);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
}