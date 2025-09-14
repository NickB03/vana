/**
 * Integration Tests for ResponseStream SSE Integration
 * 
 * Tests the integration between SSE streaming and ResponseStream component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useResponseStreamSSE } from '@/hooks/use-response-stream-sse';
import { ResponseStreamWrapper } from '@/components/chat/response-stream-wrapper';
import { SSEToResponseStreamAdapter } from '@/lib/prompt-kit-sse-adapter';
import type { ResearchProgressEvent } from '@/lib/research-sse-service';

// Mock the research SSE service
jest.mock('@/lib/research-sse-service', () => ({
  researchSSEService: {
    startResearch: jest.fn().mockResolvedValue('test-session-123'),
    stopResearch: jest.fn(),
    disconnect: jest.fn(),
    subscribeToSession: jest.fn(() => () => {}),
    getSessionState: jest.fn(() => null),
  },
}));

// Mock environment variables for feature flag
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  // Clear localStorage
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
});

afterEach(() => {
  process.env = originalEnv;
});

describe('SSE to ResponseStream Integration', () => {
  describe('SSEToResponseStreamAdapter', () => {
    let adapter: SSEToResponseStreamAdapter;

    beforeEach(() => {
      adapter = new SSEToResponseStreamAdapter();
    });

    afterEach(() => {
      adapter.reset();
    });

    it('should create ResponseStream data from session state', () => {
      const sessionState = {
        sessionId: 'test-session-123',
        status: 'running' as const,
        overallProgress: 0.5,
        currentPhase: 'Research Phase',
        agents: [],
        partialResults: null,
        finalReport: null,
        error: null,
        lastUpdate: new Date(),
      };

      const responseStreamData = adapter.createResponseStreamData(sessionState);

      expect(responseStreamData).toHaveProperty('textStream');
      expect(responseStreamData).toHaveProperty('metadata');
      expect(responseStreamData.metadata).toEqual({
        agents: [],
        connectionHealth: 'connected',
        overallProgress: 0.5,
        currentPhase: 'Research Phase',
        sessionId: 'test-session-123',
      });
    });

    it('should process research progress events', async () => {
      const sessionState = {
        sessionId: 'test-session-123',
        status: 'running' as const,
        overallProgress: 0,
        currentPhase: 'Starting',
        agents: [],
        partialResults: null,
        finalReport: null,
        error: null,
        lastUpdate: new Date(),
      };

      const responseStreamData = adapter.createResponseStreamData(sessionState);
      
      // Simulate processing an SSE event
      const progressEvent: ResearchProgressEvent = {
        type: 'research_progress',
        sessionId: 'test-session-123',
        status: 'running',
        overall_progress: 0.3,
        current_phase: 'Analyzing data',
        agents: [
          {
            agent_id: 'agent-1',
            agent_type: 'researcher',
            name: 'Research Agent',
            status: 'current',
            progress: 0.5,
            current_task: 'Gathering information',
            error: null,
          }
        ],
        partial_results: {
          researcher: {
            content: 'Found initial research data...'
          }
        },
        timestamp: new Date().toISOString(),
      };

      adapter.processSSEEvent(progressEvent);

      // Verify metadata is updated
      const metadata = adapter.getMetadata();
      expect(metadata?.overallProgress).toBe(0.3);
      expect(metadata?.currentPhase).toBe('Analyzing data');
      expect(metadata?.agents).toHaveLength(1);
    });

    it('should handle stream completion correctly', () => {
      const sessionState = {
        sessionId: 'test-session-123',
        status: 'running' as const,
        overallProgress: 0.5,
        currentPhase: 'Research Phase',
        agents: [],
        partialResults: null,
        finalReport: null,
        error: null,
        lastUpdate: new Date(),
      };

      adapter.createResponseStreamData(sessionState);
      
      const finalReport = 'Final research report content';
      
      // Complete the stream
      expect(() => {
        adapter.completeStream(finalReport);
      }).not.toThrow();
    });
  });

  describe('useResponseStreamSSE Hook', () => {
    it('should provide both traditional SSE and ResponseStream interfaces', () => {
      const { result } = renderHook(() =>
        useResponseStreamSSE({
          enableResponseStream: false,
        })
      );

      // Traditional SSE interface
      expect(result.current).toHaveProperty('sessionState');
      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('startResearch');
      expect(result.current).toHaveProperty('stopResearch');

      // ResponseStream interface
      expect(result.current).toHaveProperty('responseStreamData');
      expect(result.current).toHaveProperty('isResponseStreamMode');
      expect(result.current).toHaveProperty('switchToResponseStreamMode');
      expect(result.current).toHaveProperty('switchToTraditionalMode');
    });

    it('should switch between modes correctly', () => {
      const { result } = renderHook(() =>
        useResponseStreamSSE({
          enableResponseStream: false,
        })
      );

      // Initially in traditional mode
      expect(result.current.isResponseStreamMode).toBe(false);

      // Switch to ResponseStream mode
      act(() => {
        result.current.switchToResponseStreamMode();
      });

      expect(result.current.isResponseStreamMode).toBe(true);

      // Switch back to traditional mode
      act(() => {
        result.current.switchToTraditionalMode();
      });

      expect(result.current.isResponseStreamMode).toBe(false);
    });
  });

  describe('ResponseStreamWrapper Component', () => {
    it('should render without crashing', () => {
      const mockResponseStreamData = {
        textStream: (async function* () {
          yield 'Test content';
        })(),
        metadata: {
          agents: [],
          connectionHealth: 'connected' as const,
          overallProgress: 0.5,
          currentPhase: 'Testing',
          sessionId: 'test-session-123',
        },
      };

      render(
        <ResponseStreamWrapper responseStreamData={mockResponseStreamData} />
      );

      expect(screen.getByTestId('response-stream-wrapper')).toBeInTheDocument();
    });

    it('should display agent status overlay when agents are present', () => {
      const mockResponseStreamData = {
        textStream: (async function* () {
          yield 'Test content';
        })(),
        metadata: {
          agents: [
            {
              agent_id: 'agent-1',
              agent_type: 'researcher',
              name: 'Test Agent',
              status: 'current' as const,
              progress: 0.7,
              current_task: 'Testing',
              error: null,
            }
          ],
          connectionHealth: 'connected' as const,
          overallProgress: 0.7,
          currentPhase: 'Testing Phase',
          sessionId: 'test-session-123',
        },
      };

      render(
        <ResponseStreamWrapper responseStreamData={mockResponseStreamData} />
      );

      expect(screen.getByText('Testing Phase')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('should display error state correctly', () => {
      const mockResponseStreamData = {
        textStream: (async function* () {
          yield 'Test content';
        })(),
        metadata: {
          agents: [],
          connectionHealth: 'error' as const,
          overallProgress: 0,
          currentPhase: 'Error',
          sessionId: 'test-session-123',
        },
      };

      render(
        <ResponseStreamWrapper
          responseStreamData={mockResponseStreamData}
          error="Connection failed"
        />
      );

      expect(screen.getByText('Failed to stream response')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  describe('Feature Flag Support', () => {
    it('should respect environment variable feature flag', () => {
      process.env.NEXT_PUBLIC_RESPONSESTREAM_ENABLED = 'true';
      
      const { result } = renderHook(() =>
        useResponseStreamSSE()
      );

      // Should start in ResponseStream mode when env var is true
      expect(result.current.isResponseStreamMode).toBe(false); // Default behavior without explicit enable
    });

    it('should respect localStorage feature flag', () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vana_responsestream_enabled', 'true');
      }
      
      const { result } = renderHook(() =>
        useResponseStreamSSE({ enableResponseStream: true })
      );

      expect(result.current.isResponseStreamMode).toBe(true);
    });
  });
});

describe('Integration with Existing SSE System', () => {
  it('should not affect existing SSE functionality when ResponseStream is disabled', () => {
    const { result } = renderHook(() =>
      useResponseStreamSSE({
        enableResponseStream: false,
      })
    );

    // All traditional SSE functionality should be available
    expect(typeof result.current.startResearch).toBe('function');
    expect(typeof result.current.stopResearch).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    
    // ResponseStream functionality should be null/inactive
    expect(result.current.responseStreamData).toBeNull();
    expect(result.current.isResponseStreamMode).toBe(false);
  });
});