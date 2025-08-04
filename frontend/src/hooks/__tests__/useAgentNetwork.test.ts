/**
 * useAgentNetwork Hook Tests
 * 
 * Tests for the agent network state management hook, including
 * SSE integration, state management, and utility functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentNetwork, useAgentData, useNetworkActivity } from '../useAgentNetwork';
import type { AgentNetworkState, AgentNetworkUpdate } from '@/types/adk-events';

// Mock SSE subscription
const mockSubscribe = vi.fn();
const mockUseSSESubscription = vi.fn((eventType, handler) => {
  mockSubscribe(eventType, handler);
});

vi.mock('@/contexts/SSEContext', () => ({
  useSSESubscription: mockUseSSESubscription,
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockNetworkState: AgentNetworkState = {
  agents: {
    'agent1': {
      invocation_count: 5,
      average_execution_time: 150,
      success_rate: 0.8,
      tools_used: ['search', 'compose'],
      is_active: true,
      last_invocation: '2025-08-03T10:00:00Z',
    },
    'agent2': {
      invocation_count: 3,
      average_execution_time: 200,
      success_rate: 1.0,
      tools_used: ['analyze'],
      is_active: false,
      last_invocation: '2025-08-03T09:30:00Z',
    },
  },
  relationships: [
    {
      source: 'agent1',
      target: 'agent2',
      type: 'invokes',
      interaction_count: 2,
      data_flow: ['data1', 'data2'],
      last_interaction: '2025-08-03T10:00:00Z',
    },
  ],
  hierarchy: {
    'agent1': ['agent2'],
  },
  execution_stack: ['agent1'],
  active_agents: ['agent1'],
  data_dependencies: {
    'agent1': ['source1'],
  },
};

const mockNetworkUpdate: AgentNetworkUpdate = {
  event_type: 'agent_start',
  agent_name: 'agent1',
  timestamp: '2025-08-03T10:05:00Z',
  execution_stack: ['agent1'],
  active_agents: ['agent1'],
  parent_agent: 'parent_agent',
  execution_time: 150,
  success: true,
  state_changes: ['change1'],
  metrics: {
    invocation_count: 6,
    average_execution_time: 145,
    success_rate: 0.83,
    tools_used: ['search', 'compose'],
  },
};

describe('useAgentNetwork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: mockNetworkState,
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: false }));

    expect(result.current.networkState).toBeNull();
    expect(result.current.recentUpdates).toEqual([]);
    expect(result.current.isActive).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches initial state when enabled', async () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: true }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.networkState).toEqual(mockNetworkState);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/agent-network/state');
  });

  it('calculates network statistics correctly', async () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: true }));

    await waitFor(() => {
      expect(result.current.stats).toEqual({
        totalAgents: 2,
        activeAgents: 1,
        totalRelationships: 1,
        averageSuccessRate: 0.9, // (0.8 + 1.0) / 2
        totalInvocations: 8, // 5 + 3
      });
    });
  });

  it('handles network updates via SSE', async () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: false }));

    // Simulate SSE event
    const subscriptionCall = mockUseSSESubscription.mock.calls.find(
      call => call[0] === 'agent_network_update'
    );
    expect(subscriptionCall).toBeDefined();

    const handler = subscriptionCall[1];
    act(() => {
      handler({ data: mockNetworkUpdate });
    });

    expect(result.current.recentUpdates).toHaveLength(1);
    expect(result.current.recentUpdates[0]).toEqual(mockNetworkUpdate);
  });

  it('handles network snapshots via SSE', async () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: false }));

    // Simulate SSE snapshot event
    const subscriptionCall = mockUseSSESubscription.mock.calls.find(
      call => call[0] === 'agent_network_snapshot'
    );
    expect(subscriptionCall).toBeDefined();

    const handler = subscriptionCall[1];
    act(() => {
      handler({ data: mockNetworkState });
    });

    expect(result.current.networkState).toEqual(mockNetworkState);
    expect(result.current.isLoading).toBe(false);
  });

  it('limits recent updates to maxUpdates', async () => {
    const { result } = renderHook(() => useAgentNetwork({ 
      fetchInitialState: false, 
      maxUpdates: 2 
    }));

    const subscriptionCall = mockUseSSESubscription.mock.calls.find(
      call => call[0] === 'agent_network_update'
    );
    const handler = subscriptionCall[1];

    // Add 3 updates
    act(() => {
      handler({ data: { ...mockNetworkUpdate, timestamp: '2025-08-03T10:01:00Z' } });
      handler({ data: { ...mockNetworkUpdate, timestamp: '2025-08-03T10:02:00Z' } });
      handler({ data: { ...mockNetworkUpdate, timestamp: '2025-08-03T10:03:00Z' } });
    });

    expect(result.current.recentUpdates).toHaveLength(2);
  });

  it('provides utility functions', async () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: true }));

    await waitFor(() => {
      expect(result.current.networkState).toEqual(mockNetworkState);
    });

    // Test getAgentMetrics
    const agentMetrics = result.current.getAgentMetrics('agent1');
    expect(agentMetrics).toEqual(mockNetworkState.agents['agent1']);

    // Test getAgentRelationships
    const relationships = result.current.getAgentRelationships('agent1');
    expect(relationships).toHaveLength(1);
    expect(relationships[0].source).toBe('agent1');

    // Test getAgentChildren
    const children = result.current.getAgentChildren('agent1');
    expect(children).toEqual(['agent2']);
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: true }));

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load initial network data');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('refreshes network state on demand', async () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: false }));

    await act(async () => {
      await result.current.refreshNetworkState();
    });

    expect(mockFetch).toHaveBeenCalledWith('/agent-network/state');
  });

  it('clears recent updates', () => {
    const { result } = renderHook(() => useAgentNetwork({ fetchInitialState: false }));

    // Add an update first
    const subscriptionCall = mockUseSSESubscription.mock.calls.find(
      call => call[0] === 'agent_network_update'
    );
    const handler = subscriptionCall[1];

    act(() => {
      handler({ data: mockNetworkUpdate });
    });

    expect(result.current.recentUpdates).toHaveLength(1);

    act(() => {
      result.current.clearRecentUpdates();
    });

    expect(result.current.recentUpdates).toHaveLength(0);
  });
});

describe('useAgentData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: mockNetworkState,
      }),
    });
  });

  it('returns agent-specific data', async () => {
    const { result } = renderHook(() => useAgentData('agent1'));

    // Wait for network state to load
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockNetworkState.agents['agent1']);
      expect(result.current.isActive).toBe(true);
    });
  });

  it('handles non-existent agent', async () => {
    const { result } = renderHook(() => useAgentData('nonexistent'));

    await waitFor(() => {
      expect(result.current.metrics).toBeUndefined();
      expect(result.current.isActive).toBe(false);
    });
  });
});

describe('useNetworkActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: mockNetworkState,
      }),
    });
  });

  it('provides activity summary', async () => {
    const { result } = renderHook(() => useNetworkActivity());

    await waitFor(() => {
      expect(result.current.currentlyActive).toBe(1);
      expect(result.current.totalAgents).toBe(2);
      expect(result.current.isActive).toBe(true);
    });
  });

  it('calculates time-based activity correctly', async () => {
    const { result: networkResult } = renderHook(() => useAgentNetwork({ fetchInitialState: false }));
    
    // Add recent updates
    const subscriptionCall = mockUseSSESubscription.mock.calls.find(
      call => call[0] === 'agent_network_update'
    );
    const handler = subscriptionCall[1];

    const now = new Date();
    const recent = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
    const old = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

    act(() => {
      handler({ data: { ...mockNetworkUpdate, timestamp: recent.toISOString() } });
      handler({ data: { ...mockNetworkUpdate, timestamp: old.toISOString() } });
    });

    const { result: activityResult } = renderHook(() => useNetworkActivity());

    expect(activityResult.current.activitiesLast5Minutes).toBe(1);
    expect(activityResult.current.activitiesLastHour).toBe(2);
  });
});