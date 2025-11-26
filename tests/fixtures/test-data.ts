/**
 * Test Data Fixtures
 *
 * Provides reusable test data for E2E tests including:
 * - Test user credentials
 * - Sample messages and prompts
 * - Artifact examples
 * - Expected UI text and selectors
 */

export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
} as const;

export const SAMPLE_MESSAGES = {
  simple: 'Hello, how are you?',
  codeRequest: 'Create a React component that displays a counter with increment and decrement buttons',
  imageRequest: 'Generate an image of a sunset over mountains',
  diagramRequest: 'Create a flowchart showing the user authentication process',
  htmlRequest: 'Create an HTML page with a form that has name and email fields',
} as const;

export const SAMPLE_ARTIFACTS = {
  react: `export default function Counter() {
  const { useState } = React;
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Counter: {count}</h2>
      <div className="flex gap-2">
        <button
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Decrement
        </button>
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Increment
        </button>
      </div>
    </div>
  );
}`,
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
  mermaid: `graph TD
    A[User] --> B{Authenticated?}
    B -->|Yes| C[Dashboard]
    B -->|No| D[Login Page]
    D --> E[Enter Credentials]
    E --> F{Valid?}
    F -->|Yes| C
    F -->|No| D`,
} as const;

export const UI_SELECTORS = {
  // Auth page
  auth: {
    emailInput: '[data-testid="email-input"], input[type="email"]',
    passwordInput: '[data-testid="password-input"], input[type="password"]',
    loginButton: '[data-testid="login-button"], button[type="submit"]',
    signInButton: 'text=Sign in, text=Login',
    // Note: App uses automatic guest mode - no explicit "Continue as Guest" button
    // Guests can directly use the chat input on the home page
    continueAsGuestButton: '[data-testid="chat-input"]',
  },

  // Chat interface
  chat: {
    messageInput: '[data-testid="chat-input"]',
    sendButton: '[data-testid="send-button"]',
    messageList: '[data-testid="message-list"]',
    message: '[data-testid="chat-message"]',
    newChatButton: '[data-testid="new-chat-button"]',
    sidebarToggle: '[data-testid="sidebar-toggle"]',
  },

  // Sidebar
  sidebar: {
    sessionItem: '[data-testid="session-item"]',
    deleteButton: '[data-testid="delete-session"]',
    newChatButton: '[data-testid="new-chat-button"]',
  },

  // Artifacts
  artifact: {
    container: '[data-testid="artifact-container"]',
    iframe: 'iframe',
    exportButton: 'text=Export',
    versionButton: 'text=Version',
    openButton: 'text=Open',
    closeButton: 'text=Close',
  },

  // Rate limiting
  rateLimit: {
    message: 'text=/rate limit/i',
    upgradePrompt: 'text=/sign in/i',
  },
} as const;

export const TIMEOUTS = {
  // Short timeout for fast UI interactions
  short: 2000,

  // Medium timeout for typical async operations
  medium: 5000,

  // Long timeout for streaming responses
  streaming: 30000,

  // Extra long for slow operations (image generation, etc.)
  extraLong: 60000,
} as const;

export const EXPECTED_TEXT = {
  auth: {
    pageTitle: /sign in|login/i,
    welcomeMessage: /welcome/i,
  },

  chat: {
    emptyState: /start a conversation|new chat/i,
    streamingIndicator: /thinking|generating/i,
  },

  rateLimit: {
    guestLimitMessage: /rate limit|limit reached|too many requests/i,
    upgradePrompt: /sign in|create account/i,
  },

  artifact: {
    generatedMessage: /created|generated|here/i,
    errorMessage: /error|failed/i,
  },
} as const;

/**
 * Helper function to generate unique test identifiers
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Helper function to wait with exponential backoff
 */
export async function waitWithBackoff(
  attempts: number = 3,
  baseDelay: number = 1000
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
  }
}
