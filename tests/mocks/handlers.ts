/**
 * MSW Request Handlers for E2E Tests
 *
 * These handlers intercept API requests during E2E testing to provide
 * consistent, predictable responses without requiring a real backend.
 */

import { http, HttpResponse, delay } from 'msw';

// Base URL for Supabase functions (matches VITE_SUPABASE_URL in CI)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mock-project.supabase.co';

// Simulated streaming response chunks
const MOCK_CHAT_RESPONSE = `Hello! I'm an AI assistant. How can I help you today?

I can help you with:
- Writing code and creating artifacts
- Answering questions
- Generating diagrams and visualizations
- And much more!`;

// Mock artifact for code generation requests
const MOCK_REACT_ARTIFACT = `export default function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">Counter: {count}</h2>
      <div className="flex gap-2">
        <button
          onClick={() => setCount(c => c - 1)}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          -
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          +
        </button>
      </div>
    </div>
  );
}`;

/**
 * Creates a Server-Sent Events (SSE) stream for chat responses
 */
function createSSEStream(content: string, includeArtifact: boolean = false): ReadableStream {
  const encoder = new TextEncoder();
  let position = 0;
  const words = content.split(' ');

  return new ReadableStream({
    async pull(controller) {
      if (position < words.length) {
        // Simulate streaming word by word
        const chunk = words[position] + (position < words.length - 1 ? ' ' : '');
        const sseData = `data: {"type":"content","content":"${chunk}"}\n\n`;
        controller.enqueue(encoder.encode(sseData));
        position++;
        await delay(50); // Simulate typing delay
      } else if (includeArtifact && position === words.length) {
        // Send artifact after content
        const artifactData = `data: {"type":"artifact","artifact":{"type":"react","title":"Counter Component","content":${JSON.stringify(MOCK_REACT_ARTIFACT)}}}\n\n`;
        controller.enqueue(encoder.encode(artifactData));
        position++;
      } else {
        // Send done event
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
        controller.close();
      }
    },
  });
}

/**
 * Detects if a message is requesting code/artifact generation
 */
function isArtifactRequest(message: string): boolean {
  const artifactKeywords = [
    'create', 'build', 'generate', 'make', 'write',
    'component', 'function', 'code', 'html', 'react',
    'diagram', 'flowchart', 'counter', 'button'
  ];
  const lowerMessage = message.toLowerCase();
  return artifactKeywords.some(keyword => lowerMessage.includes(keyword));
}

export const handlers = [
  // Chat endpoint - streaming response
  http.post(`${SUPABASE_URL}/functions/v1/chat`, async ({ request }) => {
    const body = await request.json() as { messages?: Array<{ content: string }> };
    const lastMessage = body.messages?.[body.messages.length - 1]?.content || '';
    const includeArtifact = isArtifactRequest(lastMessage);

    // Determine response based on message content
    let responseContent = MOCK_CHAT_RESPONSE;
    if (includeArtifact) {
      responseContent = "I'll create a React component for you. Here's a counter with increment and decrement buttons:";
    }

    const stream = createSSEStream(responseContent, includeArtifact);

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-ID': `mock-${Date.now()}`,
      },
    });
  }),

  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, async () => {
    await delay(100);
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      },
    });
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, async () => {
    await delay(50);
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),

  // Generate title endpoint
  http.post(`${SUPABASE_URL}/functions/v1/generate-title`, async () => {
    await delay(200);
    return HttpResponse.json({
      title: 'Mock Chat Session',
    });
  }),

  // Bundle artifact endpoint
  http.post(`${SUPABASE_URL}/functions/v1/bundle-artifact`, async () => {
    await delay(300);
    return HttpResponse.json({
      url: 'https://mock-storage.supabase.co/artifacts/mock-bundle.html',
      path: 'artifacts/mock-bundle.html',
    });
  }),

  // Generate artifact fix endpoint
  http.post(`${SUPABASE_URL}/functions/v1/generate-artifact-fix`, async () => {
    await delay(500);
    return HttpResponse.json({
      success: true,
      fixedCode: MOCK_REACT_ARTIFACT,
    });
  }),

  // Generate image endpoint
  http.post(`${SUPABASE_URL}/functions/v1/generate-image`, async () => {
    await delay(1000);
    return HttpResponse.json({
      url: 'https://mock-storage.supabase.co/images/mock-image.png',
      path: 'images/mock-image.png',
    });
  }),

  // Health check endpoint
  http.get(`${SUPABASE_URL}/functions/v1/health`, async () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        storage: 'ok',
        ai: 'ok',
      },
    });
  }),

  // Database REST API (for chat sessions, etc.)
  http.get(`${SUPABASE_URL}/rest/v1/chat_sessions`, async () => {
    await delay(100);
    return HttpResponse.json([
      {
        id: 'mock-session-1',
        title: 'Previous Chat',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/chat_sessions`, async () => {
    await delay(100);
    return HttpResponse.json({
      id: `mock-session-${Date.now()}`,
      title: 'New Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  http.get(`${SUPABASE_URL}/rest/v1/chat_messages`, async () => {
    await delay(100);
    return HttpResponse.json([]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/chat_messages`, async () => {
    await delay(50);
    return HttpResponse.json({
      id: `mock-message-${Date.now()}`,
      created_at: new Date().toISOString(),
    });
  }),

  // Rate limit check (for guest users)
  http.get(`${SUPABASE_URL}/rest/v1/guest_rate_limits`, async () => {
    return HttpResponse.json([]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/guest_rate_limits`, async () => {
    return HttpResponse.json({
      id: `mock-rate-${Date.now()}`,
    });
  }),
];
