/**
 * Test Utilities and Helpers
 * Shared utilities for testing across the application
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// ===== MOCK DATA GENERATORS =====

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: undefined,
  isVerified: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  lastLoginAt: new Date('2024-01-01T01:00:00Z'),
  ...overrides
});

export const createMockSession = (overrides = {}) => ({
  id: 'session-123',
  title: 'Test Research Session',
  userId: 'user-123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T01:00:00Z'),
  status: 'active' as const,
  messageCount: 0,
  settings: {
    theme: 'system' as const,
    autoScroll: true,
    notifications: true,
    streamingEnabled: true
  },
  metadata: {
    userAgent: 'Mozilla/5.0 (test)',
    lastIpAddress: '127.0.0.1',
    researchContext: 'Test context'
  },
  ...overrides
});

export const createMockQuery = (overrides = {}) => ({
  id: 'query-123',
  sessionId: 'session-123',
  content: 'What are the latest developments in AI?',
  type: 'research' as const,
  priority: 'medium' as const,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  processedAt: new Date('2024-01-01T00:05:00Z'),
  estimatedDuration: 300,
  attachments: [],
  parameters: {
    maxDuration: 300,
    agentSelection: [],
    outputFormat: 'structured' as const,
    detailLevel: 'detailed' as const,
    sourcesRequired: true
  },
  ...overrides
});

export const createMockAgentResponse = (overrides = {}) => ({
  id: 'response-123',
  queryId: 'query-123',
  agentId: 'team_leader-001',
  agentType: 'team_leader' as const,
  content: 'Agent response content',
  status: 'completed' as const,
  confidence: 0.85,
  sources: [],
  createdAt: new Date('2024-01-01T00:02:00Z'),
  processingTimeMs: 120000,
  tokens: {
    inputTokens: 100,
    outputTokens: 200,
    totalTokens: 300,
    cost: 0.015
  },
  metadata: {
    model: 'gemini-2.0-flash-thinking-exp-1219',
    temperature: 0.7,
    maxTokens: 2048
  },
  ...overrides
});

export const createMockSSEEvent = (type: string, data: any, overrides = {}) => ({
  event: type,
  data: JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    ...data
  }),
  id: `event-${Date.now()}`,
  ...overrides
});

export const createMockEventSourceEvent = (data: any) => 
  new MessageEvent('message', {
    data: JSON.stringify(data)
  });

// ===== MOCK API RESPONSES =====

export const createMockApiResponse = (data: any, options = {}) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
  headers: new Map([
    ['Content-Type', 'application/json']
  ]),
  ...options
});

export const createMockApiError = (status: number, message: string, options = {}) => ({
  ok: false,
  status,
  statusText: message,
  json: () => Promise.resolve({
    message,
    error: message,
    status
  }),
  text: () => Promise.resolve(JSON.stringify({ message })),
  headers: new Map([
    ['Content-Type', 'application/json']
  ]),
  ...options
});

// ===== GOOGLE ADK EVENT GENERATORS =====

export const createConnectionEvent = (sessionId: string, status: 'connected' | 'disconnected' = 'connected') => ({
  type: 'connection',
  status,
  sessionId,
  timestamp: new Date().toISOString(),
  authenticated: true,
  userId: 'test-user'
});

export const createHeartbeatEvent = () => ({
  type: 'heartbeat',
  timestamp: new Date().toISOString(),
  connectionId: 'test-connection',
  activeQueries: 1,
  serverLoad: 0.3
});

export const createAgentStartedEvent = (agentType: string, agentId?: string) => ({
  type: 'agent_started',
  queryId: 'query-123',
  agentId: agentId || `${agentType}-001`,
  agentType,
  timestamp: new Date().toISOString(),
  estimatedDuration: 60,
  task: `Executing ${agentType} task`
});

export const createAgentProgressEvent = (agentId: string, progress: number) => ({
  type: 'agent_progress',
  queryId: 'query-123',
  agentId,
  progress,
  timestamp: new Date().toISOString(),
  currentTask: `Processing at ${progress}%`,
  partialResults: progress > 50 ? 'Some intermediate findings...' : undefined
});

export const createAgentCompletedEvent = (agentId: string, success = true) => ({
  type: 'agent_completed',
  queryId: 'query-123',
  agentId,
  timestamp: new Date().toISOString(),
  success,
  processingTimeMs: 30000 + Math.random() * 60000,
  confidence: 0.8 + Math.random() * 0.2,
  resultSummary: `${agentId} completed ${success ? 'successfully' : 'with errors'}`,
  tokensUsed: Math.floor(500 + Math.random() * 1500)
});

export const createPartialResultEvent = (section: string, content: string) => ({
  type: 'partial_result',
  queryId: 'query-123',
  timestamp: new Date().toISOString(),
  content,
  section,
  agentId: 'section_researcher-001',
  confidence: 0.75 + Math.random() * 0.2,
  sources: [
    {
      url: 'https://example.com/source1',
      title: 'Research Source',
      relevance: 0.9
    }
  ]
});

export const createErrorEvent = (errorType: string, message: string, recoverable = true) => ({
  type: 'error',
  queryId: 'query-123',
  timestamp: new Date().toISOString(),
  errorType,
  message,
  errorCode: 'TEST_ERROR',
  recoverable,
  suggestedAction: 'Retry the operation',
  retryAfter: 30,
  details: { testError: true }
});

// ===== ASYNC UTILITIES =====

export const waitFor = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
) => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const result = await condition();
    if (result) return true;
    
    await waitFor(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

export const flushPromises = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// ===== EVENT SOURCE TESTING =====

export class MockEventSource {
  static instances: MockEventSource[] = [];
  
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    MockEventSource.instances.push(this);
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  static reset() {
    MockEventSource.instances = [];
  }

  static getLatest() {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  static getAllInstances() {
    return MockEventSource.instances;
  }

  // Test utilities
  simulateMessage(data: any) {
    if (this.onmessage && this.readyState === 1) {
      this.onmessage(createMockEventSourceEvent(data));
    }
  }

  simulateError() {
    if (this.onerror && this.readyState === 1) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose() {
    this.readyState = 2; // CLOSED
  }
}

// ===== PERFORMANCE TESTING =====

export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const measureMemoryUsage = () => {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};

// ===== COMPONENT TESTING HELPERS =====

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuth?: boolean;
  mockApi?: boolean;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialAuth = false, mockApi = true, ...renderOptions } = options;

  // Mock API client if requested
  if (mockApi) {
    // Set up default API mocks
    global.fetch = jest.fn(() =>
      Promise.resolve(createMockApiResponse({}))
    );
  }

  // Setup authentication state if requested
  if (initialAuth) {
    localStorage.setItem('vana_auth_token', JSON.stringify({
      token: 'test-token',
      type: 'Bearer',
      expiresIn: 3600
    }));
    localStorage.setItem('vana_auth_user', JSON.stringify(createMockUser()));
  }

  return render(ui, renderOptions);
};

// ===== MOCK IMPLEMENTATIONS =====

export const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null
  };
};

export const createMockFetch = (responses: any[] = []) => {
  let responseIndex = 0;
  
  return jest.fn(() => {
    const response = responses[responseIndex] || createMockApiResponse({});
    responseIndex = (responseIndex + 1) % Math.max(responses.length, 1);
    
    if (response instanceof Error) {
      return Promise.reject(response);
    }
    
    return Promise.resolve(response);
  });
};

// ===== VALIDATION HELPERS =====

export const expectToBeWithinRange = (actual: number, expected: number, tolerance: number) => {
  const lower = expected - tolerance;
  const upper = expected + tolerance;
  
  expect(actual).toBeGreaterThanOrEqual(lower);
  expect(actual).toBeLessThanOrEqual(upper);
};

export const expectTimingToBe = (duration: number, expectedMs: number, toleranceMs = 100) => {
  expectToBeWithinRange(duration, expectedMs, toleranceMs);
};

// ===== AGENT TESTING =====

export const createFullAgentWorkflow = (queryId = 'query-123') => {
  const agentTypes = [
    'team_leader',
    'plan_generator', 
    'section_planner',
    'section_researcher',
    'enhanced_search',
    'research_evaluator',
    'escalation_checker',
    'report_writer'
  ];

  const events = [];

  // Processing started
  events.push({
    type: 'processing_started',
    queryId,
    timestamp: new Date().toISOString(),
    totalAgents: agentTypes.length,
    phase: 'planning'
  });

  // Agent workflow
  agentTypes.forEach((agentType, index) => {
    const agentId = `${agentType}-001`;
    const delay = index * 15000; // 15 seconds apart

    // Agent started
    events.push({
      type: 'agent_started',
      queryId,
      agentId,
      agentType,
      timestamp: new Date(Date.now() + delay).toISOString(),
      estimatedDuration: 30,
      task: `Executing ${agentType} task`
    });

    // Agent progress (optional)
    if (index % 2 === 0) {
      events.push({
        type: 'agent_progress',
        queryId,
        agentId,
        progress: 50,
        timestamp: new Date(Date.now() + delay + 15000).toISOString(),
        currentTask: `Processing ${agentType} data`
      });
    }

    // Agent completed
    events.push({
      type: 'agent_completed',
      queryId,
      agentId,
      timestamp: new Date(Date.now() + delay + 30000).toISOString(),
      success: true,
      processingTimeMs: 28000,
      confidence: 0.85 + (index * 0.01),
      resultSummary: `${agentType} completed successfully`,
      tokensUsed: 500 + (index * 100)
    });
  });

  // Final events
  events.push({
    type: 'result_generated',
    queryId,
    resultId: `result-${Date.now()}`,
    timestamp: new Date(Date.now() + agentTypes.length * 15000 + 45000).toISOString(),
    wordCount: 2500,
    readingTimeMinutes: 12,
    qualityScore: 0.92,
    sectionsCount: 6,
    citationsCount: 25,
    summary: 'Comprehensive analysis completed'
  });

  events.push({
    type: 'processing_complete',
    queryId,
    resultId: `result-${Date.now()}`,
    timestamp: new Date(Date.now() + agentTypes.length * 15000 + 50000).toISOString(),
    totalDurationMs: agentTypes.length * 15000 + 50000,
    agentsCompleted: agentTypes.length,
    agentsTotal: agentTypes.length,
    finalQualityScore: 0.94,
    tokensTotal: agentTypes.length * 600,
    costEstimate: 0.45
  });

  return events;
};

// Export all utilities as default object for convenience
export default {
  createMockUser,
  createMockSession,
  createMockQuery,
  createMockAgentResponse,
  createMockSSEEvent,
  createMockEventSourceEvent,
  createMockApiResponse,
  createMockApiError,
  createConnectionEvent,
  createHeartbeatEvent,
  createAgentStartedEvent,
  createAgentProgressEvent,
  createAgentCompletedEvent,
  createPartialResultEvent,
  createErrorEvent,
  waitFor,
  waitForCondition,
  flushPromises,
  MockEventSource,
  measurePerformance,
  measureMemoryUsage,
  renderWithProviders,
  createMockLocalStorage,
  createMockFetch,
  expectToBeWithinRange,
  expectTimingToBe,
  createFullAgentWorkflow
};