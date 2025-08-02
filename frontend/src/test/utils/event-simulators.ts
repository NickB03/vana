/**
 * Event Simulators
 * 
 * Utilities for simulating various types of events in tests
 */

import { vi } from 'vitest';
import type { ADKEvent, ADKRequestMessage } from '@/types/adk-service';
import type { ADKSSEEvent, UIEvent } from '@/types/adk-events';
import type { SSEEvent } from '@/types/sse';
import type { AgentMessage, TimelineEvent } from '@/types/session';

// SSE Event Simulation
export const simulateSSEEvent = (
  eventType: string,
  data: any,
  overrides?: Partial<SSEEvent>
): SSEEvent => ({
  id: `sse_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  event: eventType,
  data,
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const simulateSSEConnection = () => {
  const mockEventSource = {
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onopen: null as any,
    onmessage: null as any,
    onerror: null as any,
    readyState: EventSource.OPEN,
    CONNECTING: EventSource.CONNECTING,
    OPEN: EventSource.OPEN,
    CLOSED: EventSource.CLOSED,
    url: 'http://localhost:8081/sse',
    withCredentials: false,
  };

  Object.defineProperty(window, 'EventSource', {
    value: vi.fn(() => mockEventSource),
  });

  return mockEventSource;
};

export const simulateSSEMessage = (mockEventSource: any, eventType: string, data: any) => {
  const event = {
    data: JSON.stringify(data),
    lastEventId: `evt_${Date.now()}`,
    type: eventType,
  };

  if (eventType === 'message') {
    mockEventSource.onmessage?.(event);
  } else {
    // Find the specific event listener for this event type
    const addEventListenerCalls = mockEventSource.addEventListener.mock.calls;
    const listener = addEventListenerCalls.find(call => call[0] === eventType);
    
    if (listener && listener[1]) {
      listener[1](event);
    }
  }
};

// ADK Event Simulation
export const simulateADKEvent = (overrides?: Partial<ADKSSEEvent>): ADKSSEEvent => ({
  author: 'test_agent',
  content: 'Test agent response',
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const simulateADKThinkingEvent = (
  reasoning: string,
  step?: string,
  agent = 'planner_agent'
): ADKSSEEvent => ({
  author: agent,
  content: null,
  actions: [
    {
      function_name: 'thinking',
      function_parameters: JSON.stringify({
        reasoning,
        step: step || 'planning',
      }),
    },
  ],
  timestamp: new Date().toISOString(),
});

export const simulateADKContentEvent = (
  content: string,
  agent = 'researcher_agent'
): ADKSSEEvent => ({
  author: agent,
  content,
  timestamp: new Date().toISOString(),
});

export const simulateADKWorkflowEvent = (
  state: string,
  step?: string
): ADKSSEEvent => ({
  author: 'workflow_manager',
  content: null,
  actions: [
    {
      function_name: 'update_workflow_state',
      function_parameters: JSON.stringify({
        state,
        step: step || 'processing',
      }),
    },
  ],
  timestamp: new Date().toISOString(),
});

export const simulateADKErrorEvent = (
  errorType: string,
  message: string,
  recoverable = true
): ADKSSEEvent => ({
  author: 'error_handler',
  content: null,
  actions: [
    {
      function_name: 'report_error',
      function_parameters: JSON.stringify({
        error_type: errorType,
        message,
        recoverable,
      }),
    },
  ],
  timestamp: new Date().toISOString(),
});

// UI Event Simulation
export const simulateUIEvent = (
  type: string,
  data: any,
  overrides?: Partial<UIEvent>
): UIEvent => ({
  type,
  data,
  ...overrides,
});

export const simulateUserMessage = (
  content: string,
  sessionId = 'session_123',
  userId = 'user_123'
): ADKRequestMessage => ({
  app_name: 'app',
  user_id: userId,
  session_id: sessionId,
  new_message: {
    role: 'user',
    parts: [{ text: content }],
  },
  streaming: true,
  metadata: {
    messageId: `msg_${Date.now()}`,
    timestamp: Date.now(),
    clientVersion: '1.0.0',
  },
});

// Session Event Simulation
export const simulateAgentMessage = (
  content: string,
  role: 'user' | 'assistant' = 'assistant',
  overrides?: Partial<AgentMessage>
): AgentMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  content,
  role,
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const simulateTimelineEvent = (
  type: string,
  title: string,
  overrides?: Partial<TimelineEvent>
): TimelineEvent => ({
  id: `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  type,
  title,
  timestamp: new Date().toISOString(),
  status: 'completed',
  ...overrides,
});

// WebSocket Simulation
export const simulateWebSocketConnection = () => {
  const mockWebSocket = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSED: WebSocket.CLOSED,
    onopen: null as any,
    onmessage: null as any,
    onclose: null as any,
    onerror: null as any,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  Object.defineProperty(window, 'WebSocket', {
    value: vi.fn(() => mockWebSocket),
  });

  return mockWebSocket;
};

export const simulateWebSocketMessage = (mockWebSocket: any, type: string, payload: any, sessionId?: string) => {
  const message = {
    data: JSON.stringify({
      type,
      payload,
      sessionId,
    }),
  };

  mockWebSocket.onmessage?.(message);
};

// Connection Error Simulation
export const simulateConnectionError = (errorType: 'network' | 'timeout' | 'auth' | 'server') => {
  const errors = {
    network: new Error('Network connection failed'),
    timeout: new Error('Request timeout'),
    auth: new Error('Authentication failed'),
    server: new Error('Internal server error'),
  };

  return errors[errorType];
};

// Performance Simulation
export const simulatePerformanceEntry = (overrides?: Partial<PerformanceNavigationTiming>) => {
  const mockEntry = {
    loadEventEnd: 1500,
    loadEventStart: 1300,
    responseStart: 400,
    requestStart: 300,
    domContentLoadedEventEnd: 1000,
    domContentLoadedEventStart: 900,
    ...overrides,
  };

  return mockEntry as PerformanceNavigationTiming;
};

export const simulateMemoryInfo = (overrides?: any) => ({
  usedJSHeapSize: 5000000,
  totalJSHeapSize: 10000000,
  jsHeapSizeLimit: 2147483648,
  ...overrides,
});

// Fetch Response Simulation
export const simulateSSEResponse = (events: string[]) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      events.forEach((event, index) => {
        setTimeout(() => {
          controller.enqueue(encoder.encode(event));
          if (index === events.length - 1) {
            controller.close();
          }
        }, index * 10);
      });
    },
  });

  return {
    ok: true,
    body: stream,
    headers: new Headers({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
    }),
  };
};

export const simulateAPIResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  headers: new Headers({
    'content-type': 'application/json',
  }),
});

// Batch Event Simulation
export const simulateEventSequence = (events: ADKSSEEvent[], intervalMs = 100) => {
  return events.map((event, index) => ({
    event,
    delay: index * intervalMs,
  }));
};

export const simulateResearchWorkflow = () => {
  return [
    simulateADKThinkingEvent('Analyzing the research request...', 'planning'),
    simulateADKWorkflowEvent('research_started', 'initialization'),
    simulateTimelineEvent('research_started', 'Research Phase Started'),
    simulateADKThinkingEvent('Gathering information from sources...', 'research'),
    simulateADKContentEvent('Found relevant information about...'),
    simulateADKWorkflowEvent('research_in_progress', 'data_gathering'),
    simulateADKThinkingEvent('Analyzing findings and preparing synthesis...', 'synthesis'),
    simulateADKContentEvent('Based on the research findings...'),
    simulateADKWorkflowEvent('research_completed', 'finalization'),
    simulateTimelineEvent('research_completed', 'Research Completed'),
  ];
};

// Timing Utilities
export const waitForEvents = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createEventTimer = () => {
  const events: Array<{ timestamp: number; type: string; data: any }> = [];
  
  const recordEvent = (type: string, data: any) => {
    events.push({
      timestamp: Date.now(),
      type,
      data,
    });
  };

  const getEvents = () => [...events];
  const clearEvents = () => events.length = 0;
  
  return {
    recordEvent,
    getEvents,
    clearEvents,
  };
};