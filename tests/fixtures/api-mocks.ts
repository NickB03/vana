/**
 * Playwright API Mocking Fixtures
 *
 * Provides route-level API mocking for E2E tests using Playwright's
 * built-in route interception. This is more reliable than MSW for
 * E2E tests as it works at the browser network level.
 */

import { Page, Route } from '@playwright/test';

// Mock Supabase URL pattern
const SUPABASE_URL_PATTERN = /supabase\.co/;

// Mock responses for various endpoints
const MOCK_RESPONSES = {
  chat: {
    simple: `Hello! I'm an AI assistant. I'm happy to help you with any questions or tasks you might have. What would you like to discuss today?`,
    artifact: `I'll create that component for you. Here's a React counter component with increment and decrement buttons:`,
    diagram: `I'll create a flowchart showing the user authentication process:`,
    html: `I'll create an HTML page with a form for you:`,
  },
  artifact: {
    react: `export default function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">Counter: {count}</h2>
      <div className="flex gap-2">
        <button onClick={() => setCount(c => c - 1)} className="px-4 py-2 bg-red-500 text-white rounded">-</button>
        <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 bg-blue-500 text-white rounded">+</button>
      </div>
    </div>
  );
}`,
    mermaid: `graph TD
    A[User] --> B{Authenticated?}
    B -->|Yes| C[Dashboard]
    B -->|No| D[Login Page]
    D --> E[Enter Credentials]
    E --> F{Valid?}
    F -->|Yes| C
    F -->|No| D`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form</title>
</head>
<body>
  <h1>Contact Us</h1>
  <form>
    <input type="text" placeholder="Name" required>
    <input type="email" placeholder="Email" required>
    <button type="submit">Submit</button>
  </form>
</body>
</html>`,
  },
};

/**
 * Creates a Server-Sent Events response body for streaming chat
 *
 * Matches the real edge function format:
 * - Gemini-style: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
 * - OpenAI-style: { choices: [{ delta: { content: "..." } }] }
 * - Reasoning: { type: "reasoning", reasoning: {...} }
 * - Artifacts: Embedded in text as <artifact>...</artifact> XML tags
 */
function createSSEBody(content: string, artifactType: 'react' | 'mermaid' | 'html' | null = null): string {
  const words = content.split(' ');
  let body = '';

  // Stream content word by word using Gemini format
  for (const word of words) {
    const geminiPayload = {
      candidates: [{
        content: {
          parts: [{ text: `${word} ` }]
        }
      }]
    };
    body += `data: ${JSON.stringify(geminiPayload)}\n\n`;
  }

  // Add artifact if requested - embed as XML in text (matches production)
  if (artifactType) {
    let artifactMimeType: string;
    let artifactTitle: string;
    let artifactContent: string;

    switch (artifactType) {
      case 'mermaid':
        artifactMimeType = 'application/vnd.ant.mermaid';
        artifactTitle = 'Authentication Flow';
        artifactContent = MOCK_RESPONSES.artifact.mermaid;
        break;
      case 'html':
        artifactMimeType = 'text/html';
        artifactTitle = 'Contact Form';
        artifactContent = MOCK_RESPONSES.artifact.html;
        break;
      case 'react':
      default:
        artifactMimeType = 'application/vnd.ant.react';
        artifactTitle = 'Counter Component';
        artifactContent = MOCK_RESPONSES.artifact.react;
        break;
    }

    const artifactXML = `<artifact type="${artifactMimeType}" title="${artifactTitle}">
${artifactContent}
</artifact>`;

    const geminiPayload = {
      candidates: [{
        content: {
          parts: [{ text: artifactXML }]
        }
      }]
    };
    body += `data: ${JSON.stringify(geminiPayload)}\n\n`;
  }

  // End stream
  body += `data: [DONE]\n\n`;

  return body;
}

/**
 * Detects if a message requests artifact/code generation
 * Returns the artifact type to generate
 *
 * IMPORTANT: Detection order matters! More specific patterns must be checked first
 * to prevent generic keywords like "create" from matching everything.
 */
function detectArtifactType(body: string): 'react' | 'mermaid' | 'html' | null {
  const lowerBody = body.toLowerCase();

  // 1. Check for diagram/flowchart requests FIRST (most specific)
  // These keywords are unique to diagram requests
  if (lowerBody.includes('diagram') || lowerBody.includes('flowchart') || lowerBody.includes('mermaid')) {
    return 'mermaid';
  }

  // 2. Check for HTML page requests
  // Must have both "html" and page-related keywords
  if (lowerBody.includes('html') && (lowerBody.includes('page') || lowerBody.includes('form'))) {
    return 'html';
  }

  // 3. Check for React/component requests
  // Must have component-specific keywords (not just generic "create")
  const reactSpecificKeywords = ['component', 'counter', 'button', 'react', 'jsx'];
  if (reactSpecificKeywords.some(k => lowerBody.includes(k))) {
    return 'react';
  }

  // 4. Generic code request - default to react if asking to create/build/generate code
  if ((lowerBody.includes('create') || lowerBody.includes('build') || lowerBody.includes('generate')) &&
      (lowerBody.includes('code') || lowerBody.includes('app') || lowerBody.includes('function'))) {
    return 'react';
  }

  return null;
}

/**
 * Sets up API mocking for a Playwright page
 *
 * CRITICAL: Must be called BEFORE page.goto() to register all route handlers
 * synchronously before the first network request fires. Uses Promise.all() to
 * ensure all routes are registered before returning.
 *
 * @param page - Playwright page instance
 * @param options - Mocking options
 */
export async function setupAPIMocks(
  page: Page,
  options: {
    mockChat?: boolean;
    mockAuth?: boolean;
    mockStorage?: boolean;
    mockAll?: boolean;
  } = { mockAll: true }
): Promise<void> {
  console.log('[E2E Mock] Setting up API mocks, CI mode:', !!process.env.CI);

  const shouldMock = (type: keyof typeof options) =>
    options.mockAll || options[type];

  // Collect all route registration promises to ensure they complete before navigation
  const routePromises: Promise<void>[] = [];

  // Mock chat endpoint - use regex for more reliable matching
  if (shouldMock('mockChat')) {
    // Match any URL containing /functions/v1/chat
    const chatPattern = /\/functions\/v1\/chat/;
    console.log('[E2E Mock] Registering chat route handler with regex pattern');
    routePromises.push(
      page.route(chatPattern, async (route: Route) => {
        const request = route.request();
        const url = request.url();
        const postData = request.postData() || '';
        console.log('[E2E Mock] Chat request intercepted:', url.substring(0, 100));
        const artifactType = detectArtifactType(postData);
        console.log('[E2E Mock] Detected artifact type:', artifactType);

        let responseContent: string;
        if (artifactType === 'mermaid') {
          responseContent = MOCK_RESPONSES.chat.diagram;
        } else if (artifactType === 'html') {
          responseContent = MOCK_RESPONSES.chat.html;
        } else if (artifactType === 'react') {
          responseContent = MOCK_RESPONSES.chat.artifact;
        } else {
          responseContent = MOCK_RESPONSES.chat.simple;
        }

        const body = createSSEBody(responseContent, artifactType);

        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Request-ID': `mock-${Date.now()}`,
          },
          body,
        });
      })
    );

    // Mock title generation
    routePromises.push(
      page.route('**/functions/v1/generate-title', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ title: 'Mock Chat Session' }),
        });
      })
    );

    // Mock artifact bundling
    routePromises.push(
      page.route('**/functions/v1/bundle-artifact', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://mock-storage.supabase.co/artifacts/bundle.html',
            path: 'artifacts/bundle.html',
          }),
        });
      })
    );

    // Mock image generation
    routePromises.push(
      page.route('**/functions/v1/generate-image', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://via.placeholder.com/512x512.png?text=Mock+Image',
            path: 'images/mock.png',
          }),
        });
      })
    );
  }

  // Mock auth endpoints
  if (shouldMock('mockAuth')) {
    routePromises.push(
      page.route('**/auth/v1/token*', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-token',
            user: {
              id: 'mock-user-id',
              email: 'test@example.com',
            },
          }),
        });
      })
    );

    routePromises.push(
      page.route('**/auth/v1/user', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-user-id',
            email: 'test@example.com',
          }),
        });
      })
    );

    routePromises.push(
      page.route('**/auth/v1/logout', async (route: Route) => {
        await route.fulfill({ status: 204 });
      })
    );
  }

  // Mock storage/database endpoints
  if (shouldMock('mockStorage')) {
    // Chat sessions
    routePromises.push(
      page.route('**/rest/v1/chat_sessions*', async (route: Route) => {
        const method = route.request().method();

        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        } else if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: `session-${Date.now()}`,
              title: 'New Chat',
              created_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.fulfill({ status: 200 });
        }
      })
    );

    // Chat messages
    routePromises.push(
      page.route('**/rest/v1/chat_messages*', async (route: Route) => {
        const method = route.request().method();

        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: `msg-${Date.now()}` }),
          });
        }
      })
    );

    // Guest rate limits
    routePromises.push(
      page.route('**/rest/v1/guest_rate_limits*', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      })
    );

    // Artifacts table
    routePromises.push(
      page.route('**/rest/v1/artifacts*', async (route: Route) => {
        const method = route.request().method();

        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: `artifact-${Date.now()}`,
              version: 1,
            }),
          });
        }
      })
    );
  }

  // Wait for ALL route registrations to complete before returning
  // This ensures all handlers are active before page.goto() is called
  await Promise.all(routePromises);
  console.log('[E2E Mock] All route handlers registered successfully');
}

/**
 * Removes all route mocks from a page
 */
export async function clearAPIMocks(page: Page): Promise<void> {
  await page.unrouteAll();
}
