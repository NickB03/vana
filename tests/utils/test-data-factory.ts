/**
 * Test Data Factory and Mock Utilities
 * Provides consistent test data generation for chat actions testing
 */

import { faker } from '@faker-js/faker';

// Core data types
export interface TestMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  parentId?: string;
  feedback?: 'positive' | 'negative' | null;
  metadata?: Record<string, any>;
}

export interface TestChatSession {
  id: string;
  messages: TestMessage[];
  title?: string;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'premium' | 'enterprise';
  createdAt: number;
  settings: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
  };
}

// Factory configuration
interface FactoryOptions {
  seed?: number;
  locale?: string;
}

class TestDataFactory {
  constructor(options: FactoryOptions = {}) {
    if (options.seed) {
      faker.seed(options.seed);
    }
    if (options.locale) {
      faker.setLocale(options.locale);
    }
  }

  // Message factories
  createUserMessage(overrides: Partial<TestMessage> = {}): TestMessage {
    return {
      id: faker.datatype.uuid(),
      role: 'user',
      content: faker.lorem.sentences(faker.datatype.number({ min: 1, max: 3 })),
      timestamp: faker.date.recent().getTime(),
      ...overrides
    };
  }

  createAssistantMessage(overrides: Partial<TestMessage> = {}): TestMessage {
    return {
      id: faker.datatype.uuid(),
      role: 'assistant',
      content: faker.lorem.paragraphs(faker.datatype.number({ min: 1, max: 3 })),
      timestamp: faker.date.recent().getTime(),
      ...overrides
    };
  }

  createSystemMessage(overrides: Partial<TestMessage> = {}): TestMessage {
    return {
      id: faker.datatype.uuid(),
      role: 'system',
      content: 'System notification: ' + faker.lorem.sentence(),
      timestamp: faker.date.recent().getTime(),
      ...overrides
    };
  }

  // Conversation factories
  createConversationPair(userContent?: string, assistantContent?: string): [TestMessage, TestMessage] {
    const userMessage = this.createUserMessage({
      content: userContent || faker.lorem.sentence()
    });

    const assistantMessage = this.createAssistantMessage({
      content: assistantContent || faker.lorem.paragraph(),
      parentId: userMessage.id,
      timestamp: userMessage.timestamp + faker.datatype.number({ min: 1000, max: 5000 })
    });

    return [userMessage, assistantMessage];
  }

  createConversationChain(length: number = 5): TestMessage[] {
    const messages: TestMessage[] = [];
    let previousMessage: TestMessage | null = null;

    for (let i = 0; i < length; i++) {
      const isUserMessage = i % 2 === 0;
      const baseTimestamp = Date.now() - (length - i) * 60000; // 1 minute apart

      const message: TestMessage = {
        id: faker.datatype.uuid(),
        role: isUserMessage ? 'user' : 'assistant',
        content: isUserMessage
          ? faker.lorem.sentence()
          : faker.lorem.paragraphs(faker.datatype.number({ min: 1, max: 2 })),
        timestamp: baseTimestamp + faker.datatype.number({ min: 0, max: 30000 }),
        parentId: previousMessage?.id
      };

      messages.push(message);
      previousMessage = message;
    }

    return messages;
  }

  createBranchingConversation(): TestMessage[] {
    const messages: TestMessage[] = [];

    // Main conversation trunk
    const [userMsg1, assistantMsg1] = this.createConversationPair(
      'What is React?',
      'React is a JavaScript library for building user interfaces...'
    );
    messages.push(userMsg1, assistantMsg1);

    const [userMsg2, assistantMsg2] = this.createConversationPair(
      'Can you explain hooks?',
      'React Hooks are functions that let you use state and other React features...'
    );
    userMsg2.parentId = assistantMsg1.id;
    assistantMsg2.parentId = userMsg2.id;
    messages.push(userMsg2, assistantMsg2);

    // Branch 1: Alternative response to first question
    const altResponse1 = this.createAssistantMessage({
      content: 'React is a popular front-end framework created by Facebook...',
      parentId: userMsg1.id,
      timestamp: assistantMsg1.timestamp + 1000
    });
    messages.push(altResponse1);

    // Branch 2: Follow-up to alternative response
    const followUp = this.createUserMessage({
      content: 'Tell me more about JSX',
      parentId: altResponse1.id,
      timestamp: altResponse1.timestamp + 2000
    });
    messages.push(followUp);

    return messages;
  }

  // Session factories
  createChatSession(overrides: Partial<TestChatSession> = {}): TestChatSession {
    const messageCount = faker.datatype.number({ min: 2, max: 20 });
    const messages = this.createConversationChain(messageCount);

    return {
      id: faker.datatype.uuid(),
      messages,
      title: faker.lorem.words(faker.datatype.number({ min: 2, max: 6 })),
      createdAt: faker.date.recent(7).getTime(), // Within last week
      updatedAt: faker.date.recent(1).getTime(), // Within last day
      ...overrides
    };
  }

  createLargeSession(messageCount: number = 100): TestChatSession {
    return this.createChatSession({
      messages: this.createConversationChain(messageCount)
    });
  }

  // User factories
  createUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.name.fullName(),
      tier: faker.helpers.arrayElement(['free', 'premium', 'enterprise']),
      createdAt: faker.date.past().getTime(),
      settings: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
        language: 'en',
        notifications: faker.datatype.boolean()
      },
      ...overrides
    };
  }

  // Specialized test scenarios
  createErrorScenario(type: 'timeout' | 'network' | 'server' | 'validation'): any {
    const baseError = {
      timestamp: Date.now(),
      id: faker.datatype.uuid()
    };

    switch (type) {
      case 'timeout':
        return {
          ...baseError,
          type: 'TIMEOUT_ERROR',
          message: 'Request timed out',
          code: 'TIMEOUT',
          retryable: true
        };

      case 'network':
        return {
          ...baseError,
          type: 'NETWORK_ERROR',
          message: 'Network connection failed',
          code: 'NETWORK_ERROR',
          retryable: true
        };

      case 'server':
        return {
          ...baseError,
          type: 'SERVER_ERROR',
          message: 'Internal server error',
          code: 'SERVER_ERROR',
          status: 500,
          retryable: false
        };

      case 'validation':
        return {
          ...baseError,
          type: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          code: 'VALIDATION_ERROR',
          fields: ['content'],
          retryable: false
        };

      default:
        return baseError;
    }
  }

  createPerformanceTestData(messageCount: number = 100): {
    session: TestChatSession;
    metrics: {
      expectedRenderTime: number;
      expectedMemoryUsage: number;
      expectedNetworkRequests: number;
    };
  } {
    return {
      session: this.createLargeSession(messageCount),
      metrics: {
        expectedRenderTime: messageCount * 10, // 10ms per message
        expectedMemoryUsage: messageCount * 1024, // 1KB per message
        expectedNetworkRequests: Math.ceil(messageCount / 20) // Pagination
      }
    };
  }

  // Content generators for specific testing needs
  createLongContent(wordCount: number = 1000): string {
    return faker.lorem.words(wordCount);
  }

  createCodeContent(language: 'javascript' | 'python' | 'html' = 'javascript'): string {
    const codeExamples = {
      javascript: `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(result);
      `.trim(),

      python: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(10)
print(result)
      `.trim(),

      html: `
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a test.</p>
</body>
</html>
      `.trim()
    };

    return codeExamples[language];
  }

  createMarkdownContent(): string {
    return `
# Test Document

This is a **markdown** document with *various* formatting.

## Code Block

\`\`\`javascript
console.log("Hello, world!");
\`\`\`

## List

- Item 1
- Item 2
- Item 3

[Link to example](https://example.com)
    `.trim();
  }

  createMultilanguageContent(): Record<string, string> {
    return {
      en: 'Hello, how can I help you today?',
      es: '¡Hola! ¿Cómo puedo ayudarte hoy?',
      fr: 'Bonjour, comment puis-je vous aider aujourd\'hui ?',
      de: 'Hallo, wie kann ich Ihnen heute helfen?',
      ja: 'こんにちは、今日はどのようにお手伝いできますか？',
      zh: '你好，我今天能为您做些什么？'
    };
  }
}

// Mock API response generators
export class MockAPIFactory {
  static createSuccessResponse<T>(data: T): { success: true; data: T; timestamp: number } {
    return {
      success: true,
      data,
      timestamp: Date.now()
    };
  }

  static createErrorResponse(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status: number = 500
  ): { success: false; error: { message: string; code: string; status: number }; timestamp: number } {
    return {
      success: false,
      error: { message, code, status },
      timestamp: Date.now()
    };
  }

  static createStreamingResponse(chunks: string[]): string {
    return chunks
      .map(chunk => `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
      .join('') + 'data: [DONE]\n\n';
  }

  static createThoughtProcess(thoughts: string[]): string {
    return thoughts
      .map(thought => `data: ${JSON.stringify({ type: 'thought', content: thought })}\n\n`)
      .join('');
  }
}

// Event simulation utilities
export class EventSimulator {
  static createSSEEvent(type: string, data: any): MessageEvent {
    return new MessageEvent('message', {
      data: JSON.stringify({ type, ...data })
    });
  }

  static createWebSocketMessage(type: string, payload: any): MessageEvent {
    return new MessageEvent('message', {
      data: JSON.stringify({ type, payload, timestamp: Date.now() })
    });
  }

  static createNetworkError(): Error {
    const error = new Error('Network request failed');
    (error as any).code = 'NETWORK_ERROR';
    return error;
  }

  static createTimeoutError(): Error {
    const error = new Error('Request timeout');
    (error as any).code = 'TIMEOUT';
    return error;
  }
}

// Test state builders
export class StateBuilder {
  private state: any = {};

  chatSession(session: TestChatSession): this {
    this.state.chatSession = session;
    return this;
  }

  user(user: TestUser): this {
    this.state.user = user;
    return this;
  }

  loading(isLoading: boolean = true): this {
    this.state.isLoading = isLoading;
    return this;
  }

  error(error: any): this {
    this.state.error = error;
    return this;
  }

  streaming(isStreaming: boolean = true): this {
    this.state.isStreaming = isStreaming;
    return this;
  }

  thoughtProcess(thoughts: string[]): this {
    this.state.thoughtProcess = thoughts;
    return this;
  }

  editingMessage(messageId: string | null): this {
    this.state.editingMessageId = messageId;
    return this;
  }

  build(): any {
    return { ...this.state };
  }
}

// Export factory instances
export const testDataFactory = new TestDataFactory();

// Common test data sets
export const commonTestData = {
  simpleConversation: testDataFactory.createConversationChain(4),
  longConversation: testDataFactory.createConversationChain(50),
  branchingConversation: testDataFactory.createBranchingConversation(),

  users: {
    freeUser: testDataFactory.createUser({ tier: 'free' }),
    premiumUser: testDataFactory.createUser({ tier: 'premium' }),
    enterpriseUser: testDataFactory.createUser({ tier: 'enterprise' })
  },

  errors: {
    timeout: testDataFactory.createErrorScenario('timeout'),
    network: testDataFactory.createErrorScenario('network'),
    server: testDataFactory.createErrorScenario('server'),
    validation: testDataFactory.createErrorScenario('validation')
  },

  content: {
    short: 'Brief message',
    medium: testDataFactory.createLongContent(100),
    long: testDataFactory.createLongContent(1000),
    code: testDataFactory.createCodeContent('javascript'),
    markdown: testDataFactory.createMarkdownContent(),
    multilingual: testDataFactory.createMultilanguageContent()
  }
};

// Test utilities
export const testUtils = {
  // Wait for state changes
  async waitForStateChange<T>(
    getValue: () => T,
    expectedValue: T,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (getValue() === expectedValue) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`State did not change to expected value within ${timeout}ms`);
  },

  // Mock delay
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Generate deterministic IDs for consistent testing
  createDeterministicId(seed: string): string {
    return `test-${seed}-${Date.now()}`;
  }
};

export { TestDataFactory, MockAPIFactory, EventSimulator, StateBuilder };