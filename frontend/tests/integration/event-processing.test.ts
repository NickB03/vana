/**
 * Google ADK Event Processing Tests
 * Tests all 8 agent event types and event transformation logic
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSEClient, useAgentNetwork, useResearchResults } from '../../hooks/useSSEClient';
import { 
  AgentType,
  ProcessingStartedEvent,
  AgentStartedEvent,
  AgentProgressEvent,
  AgentCompletedEvent,
  PartialResultEvent,
  QualityCheckEvent,
  ResultGeneratedEvent,
  ProcessingCompleteEvent
} from '../../types/chat';

describe('Google ADK Event Processing Tests', () => {
  const sessionId = 'event-test-session';
  let cleanup: (() => void)[] = [];

  beforeEach(() => {
    global.EventSource.reset();
  });

  afterEach(() => {
    cleanup.forEach(fn => fn());
    cleanup = [];
    jest.clearAllMocks();
  });

  describe('Connection Events', () => {
    it('should process connection established event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'connection',
          status: 'connected',
          sessionId,
          timestamp: new Date().toISOString(),
          authenticated: true,
          userId: 'test-user'
        }));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionStatus).toBe('connected');
        expect(result.current.error).toBeNull();
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process heartbeat events and update timing', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const heartbeatTime = new Date().toISOString();

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'heartbeat',
          timestamp: heartbeatTime
        }));
      });

      await waitFor(() => {
        expect(result.current.lastHeartbeat).toBeTruthy();
        expect(result.current.isHealthy).toBe(true);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should handle connection disconnection', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'connection',
          status: 'disconnected',
          sessionId,
          timestamp: new Date().toISOString()
        }));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Query Processing Events', () => {
    it('should process query received event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));
      const events: any[] = [];

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Setup event handler
      act(() => {
        result.current.on('onRawEvent', (event) => {
          events.push(JSON.parse(event.data));
        });
      });

      const queryData = {
        type: 'query_received',
        queryId: 'query-123',
        timestamp: new Date().toISOString(),
        estimatedDuration: 180,
        priority: 'medium' as const
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent(queryData));
      });

      await waitFor(() => {
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject(queryData);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process processing started event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const processingData: ProcessingStartedEvent = {
        queryId: 'query-123',
        timestamp: new Date().toISOString(),
        totalAgents: 8,
        phase: 'planning'
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'processing_started',
          ...processingData
        }));
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0]).toMatchObject({
          type: 'processing_started',
          ...processingData
        });
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Agent Events - All 8 Types', () => {
    const agentTypes: AgentType[] = [
      'team_leader',
      'plan_generator', 
      'section_planner',
      'section_researcher',
      'enhanced_search',
      'research_evaluator',
      'escalation_checker',
      'report_writer'
    ];

    it.each(agentTypes)('should process agent_started event for %s', async (agentType) => {
      const { result } = renderHook(() => useAgentNetwork(sessionId));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const agentData: AgentStartedEvent = {
        queryId: 'query-123',
        agentId: `${agentType}-001`,
        agentType,
        timestamp: new Date().toISOString(),
        estimatedDuration: 60,
        task: `Executing ${agentType} task`
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'agent_started',
          ...agentData
        }));
      });

      await waitFor(() => {
        expect(result.current.agents).toHaveLength(1);
        expect(result.current.agents[0]).toMatchObject({
          id: agentData.agentId,
          type: agentType,
          status: 'started'
        });
      });

      cleanup.push(() => result.current.disconnect());
    });

    it.each(agentTypes)('should process agent_progress event for %s', async (agentType) => {
      const { result } = renderHook(() => useAgentNetwork(sessionId));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const agentId = `${agentType}-002`;

      // First send started event
      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'agent_started',
          queryId: 'query-123',
          agentId,
          agentType,
          timestamp: new Date().toISOString(),
          estimatedDuration: 60,
          task: 'Initial task'
        }));
      });

      // Then send progress event
      const progressData: AgentProgressEvent = {
        queryId: 'query-123',
        agentId,
        progress: 45,
        timestamp: new Date().toISOString(),
        currentTask: 'Processing data',
        partialResults: 'Intermediate findings...'
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'agent_progress',
          ...progressData
        }));
      });

      await waitFor(() => {
        const agent = result.current.agents.find(a => a.id === agentId);
        expect(agent).toBeDefined();
        expect(agent?.status).toBe('progress');
        expect(agent?.data).toMatchObject({
          progress: 45,
          currentTask: 'Processing data'
        });
      });

      cleanup.push(() => result.current.disconnect());
    });

    it.each(agentTypes)('should process agent_completed event for %s', async (agentType) => {
      const { result } = renderHook(() => useAgentNetwork(sessionId));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const agentId = `${agentType}-003`;
      const completedData: AgentCompletedEvent = {
        queryId: 'query-123',
        agentId,
        timestamp: new Date().toISOString(),
        success: true,
        processingTimeMs: 45000,
        confidence: 0.92,
        resultSummary: `${agentType} completed successfully`,
        tokensUsed: 1500
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'agent_completed',
          ...completedData
        }));
      });

      await waitFor(() => {
        const agent = result.current.agents.find(a => a.id === agentId);
        expect(agent).toBeDefined();
        expect(agent?.status).toBe('completed');
        expect(agent?.data).toMatchObject({
          success: true,
          confidence: 0.92,
          processingTimeMs: 45000
        });
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Result Events', () => {
    it('should process partial_result event', async () => {
      const { result } = renderHook(() => useResearchResults(sessionId));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const partialData: PartialResultEvent = {
        queryId: 'query-123',
        timestamp: new Date().toISOString(),
        content: 'This is a partial research result...',
        section: 'Introduction',
        agentId: 'section_researcher-001',
        confidence: 0.85,
        sources: [
          {
            url: 'https://example.com/research',
            title: 'Research Paper',
            relevance: 0.9
          }
        ]
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'partial_result',
          ...partialData
        }));
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
        expect(result.current.results[0]).toMatchObject({
          type: 'partial_result',
          content: partialData.content,
          data: expect.objectContaining({
            section: 'Introduction',
            confidence: 0.85
          })
        });
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process quality_check event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const qualityData: QualityCheckEvent = {
        queryId: 'query-123',
        timestamp: new Date().toISOString(),
        qualityScore: 0.88,
        phase: 'completeness_check',
        findings: [
          {
            type: 'improvement',
            message: 'More sources needed for section 2',
            severity: 'medium'
          }
        ],
        recommendedActions: ['Add more recent sources', 'Verify statistics']
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'quality_check',
          ...qualityData
        }));
      });

      await waitFor(() => {
        const qualityEvent = result.current.events.find(e => e.type === 'quality_check');
        expect(qualityEvent).toBeDefined();
        expect(qualityEvent).toMatchObject(qualityData);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process result_generated event', async () => {
      const { result } = renderHook(() => useResearchResults(sessionId));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const resultData: ResultGeneratedEvent = {
        queryId: 'query-123',
        resultId: 'result-456',
        timestamp: new Date().toISOString(),
        wordCount: 2500,
        readingTimeMinutes: 12,
        qualityScore: 0.92,
        sectionsCount: 6,
        citationsCount: 25,
        summary: 'Comprehensive analysis of AI research trends...'
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'result_generated',
          ...resultData
        }));
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
        expect(result.current.results[0]).toMatchObject({
          type: 'result_generated',
          data: expect.objectContaining({
            wordCount: 2500,
            qualityScore: 0.92,
            sectionsCount: 6
          })
        });
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process processing_complete event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const completeData: ProcessingCompleteEvent = {
        queryId: 'query-123',
        resultId: 'result-456',
        timestamp: new Date().toISOString(),
        totalDurationMs: 180000, // 3 minutes
        agentsCompleted: 8,
        agentsTotal: 8,
        finalQualityScore: 0.94,
        tokensTotal: 12500,
        costEstimate: 0.25
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'processing_complete',
          ...completeData
        }));
      });

      await waitFor(() => {
        const completeEvent = result.current.events.find(e => e.type === 'processing_complete');
        expect(completeEvent).toBeDefined();
        expect(completeEvent).toMatchObject(completeData);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Error Events', () => {
    it('should process error_occurred event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const errorData = {
        type: 'error',
        queryId: 'query-123',
        timestamp: new Date().toISOString(),
        errorType: 'agent_error' as const,
        message: 'Agent failed to process request',
        errorCode: 'AGENT_TIMEOUT',
        agentId: 'section_researcher-001',
        recoverable: true,
        suggestedAction: 'Retry with different parameters',
        retryAfter: 30,
        details: { timeout: 60000 }
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent(errorData));
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorData.message);
        const errorEvent = result.current.events.find(e => e.type === 'error');
        expect(errorEvent).toMatchObject(errorData);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process timeout_warning event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const timeoutData = {
        type: 'timeout_warning',
        queryId: 'query-123',
        timestamp: new Date().toISOString(),
        currentDurationMs: 240000, // 4 minutes
        estimatedRemainingMs: 120000, // 2 minutes
        reason: 'Complex query taking longer than expected',
        agentsStillProcessing: [
          {
            agentId: 'section_researcher-002',
            agentType: 'section_researcher',
            currentTask: 'Deep research analysis'
          }
        ]
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent(timeoutData));
      });

      await waitFor(() => {
        const timeoutEvent = result.current.events.find(e => e.type === 'timeout_warning');
        expect(timeoutEvent).toBeDefined();
        expect(timeoutEvent).toMatchObject(timeoutData);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process user_cancelled event', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const cancelData = {
        type: 'user_cancelled',
        queryId: 'query-123',
        timestamp: new Date().toISOString(),
        cancelledBy: 'user-456',
        reason: 'User requested cancellation',
        partialResultsAvailable: true,
        agentsStopped: 5,
        processingTimeMs: 120000 // 2 minutes
      };

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent(cancelData));
      });

      await waitFor(() => {
        const cancelEvent = result.current.events.find(e => e.type === 'user_cancelled');
        expect(cancelEvent).toBeDefined();
        expect(cancelEvent).toMatchObject(cancelData);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Event Transformation and Validation', () => {
    it('should handle malformed events gracefully', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Send malformed JSON
      act(() => {
        const eventSource = global.EventSource.getLatest();
        const malformedEvent = new MessageEvent('message', {
          data: '{ invalid json }'
        });
        eventSource.onmessage(malformedEvent);
      });

      // Should not crash and continue processing
      expect(result.current.isConnected).toBeDefined();
      expect(result.current.events).toHaveLength(0);

      cleanup.push(() => result.current.disconnect());
    });

    it('should add sessionId to events missing it', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Send event without sessionId
      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
          // Missing sessionId
        }));
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].sessionId).toBe(sessionId);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should maintain event history with size limit', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Send 60 events (more than the 50 limit)
      for (let i = 0; i < 60; i++) {
        act(() => {
          const eventSource = global.EventSource.getLatest();
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'heartbeat',
            timestamp: new Date(Date.now() + i).toISOString(),
            messageId: i
          }));
        });
      }

      await waitFor(() => {
        // Should keep only the last 50 events
        expect(result.current.events).toHaveLength(50);
        // Should have the most recent events
        expect(result.current.events[0].messageId).toBeGreaterThanOrEqual(10);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should handle unknown event types gracefully', async () => {
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'unknown_event_type',
          data: 'some data',
          timestamp: new Date().toISOString()
        }));
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          'Unknown SSE event type:',
          'unknown_event_type',
          expect.any(Object)
        );
      });

      consoleLogSpy.mockRestore();
      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Agent Network Coordination', () => {
    it('should track multiple agents simultaneously', async () => {
      const { result } = renderHook(() => useAgentNetwork(sessionId));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const agents = [
        { id: 'team_leader-001', type: 'team_leader' as AgentType },
        { id: 'plan_generator-001', type: 'plan_generator' as AgentType },
        { id: 'section_researcher-001', type: 'section_researcher' as AgentType },
      ];

      // Start all agents
      agents.forEach(agent => {
        act(() => {
          const eventSource = global.EventSource.getLatest();
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'agent_started',
            queryId: 'query-123',
            agentId: agent.id,
            agentType: agent.type,
            timestamp: new Date().toISOString(),
            estimatedDuration: 60,
            task: `${agent.type} task`
          }));
        });
      });

      await waitFor(() => {
        expect(result.current.agents).toHaveLength(3);
        
        agents.forEach(agent => {
          const foundAgent = result.current.agents.find(a => a.id === agent.id);
          expect(foundAgent).toBeDefined();
          expect(foundAgent?.type).toBe(agent.type);
          expect(foundAgent?.status).toBe('started');
        });
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should update agent status throughout lifecycle', async () => {
      const { result } = renderHook(() => useAgentNetwork(sessionId));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const agentId = 'lifecycle-test-agent';
      const agentType: AgentType = 'section_researcher';

      // 1. Agent started
      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'agent_started',
          queryId: 'query-123',
          agentId,
          agentType,
          timestamp: new Date().toISOString(),
          estimatedDuration: 60,
          task: 'Research task'
        }));
      });

      await waitFor(() => {
        const agent = result.current.agentMap.get(agentId);
        expect(agent?.status).toBe('started');
      });

      // 2. Agent progress
      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'agent_progress',
          queryId: 'query-123',
          agentId,
          progress: 50,
          timestamp: new Date().toISOString(),
          currentTask: 'Analyzing sources'
        }));
      });

      await waitFor(() => {
        const agent = result.current.agentMap.get(agentId);
        expect(agent?.status).toBe('progress');
        expect(agent?.data.progress).toBe(50);
      });

      // 3. Agent completed
      act(() => {
        const eventSource = global.EventSource.getLatest();
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'agent_completed',
          queryId: 'query-123',
          agentId,
          timestamp: new Date().toISOString(),
          success: true,
          processingTimeMs: 45000,
          confidence: 0.91
        }));
      });

      await waitFor(() => {
        const agent = result.current.agentMap.get(agentId);
        expect(agent?.status).toBe('completed');
        expect(agent?.data.success).toBe(true);
        expect(agent?.data.confidence).toBe(0.91);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });
});