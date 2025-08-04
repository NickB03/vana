/**
 * useAgentNetwork - Hook for managing agent network state and events
 * 
 * Provides a centralized way to manage agent network state, subscribe to
 * real-time updates, and access network metrics and relationships.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSSESubscription } from '@/contexts/SSEContext';
import type { 
  AgentNetworkState, 
  AgentNetworkUpdate, 
  AgentNetworkSnapshot,
  AgentMetrics,
  AgentRelationship
} from '@/types/adk-events';

export interface AgentNetworkHookState {
  /** Current network state */
  networkState: AgentNetworkState | null;
  /** Recent network updates */
  recentUpdates: AgentNetworkUpdate[];
  /** Whether the network is currently active */
  isActive: boolean;
  /** Network statistics */
  stats: {
    totalAgents: number;
    activeAgents: number;
    totalRelationships: number;
    averageSuccessRate: number;
    totalInvocations: number;
  };
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

export interface UseAgentNetworkOptions {
  /** Maximum number of recent updates to keep */
  maxUpdates?: number;
  /** Whether to fetch initial state from API */
  fetchInitialState?: boolean;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
}

export function useAgentNetwork(options: UseAgentNetworkOptions = {}) {
  const {
    maxUpdates = 100,
    fetchInitialState = true,
    refreshInterval,
  } = options;

  // State management
  const [networkState, setNetworkState] = useState<AgentNetworkState | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<AgentNetworkUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(fetchInitialState);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to agent network updates
  useSSESubscription('agent_network_update', useCallback((event) => {
    try {
      const update = event.data as AgentNetworkUpdate;
      setRecentUpdates(prev => [update, ...prev.slice(0, maxUpdates - 1)]);
      setError(null);
    } catch (err) {
      console.error('Error processing agent network update:', err);
      setError('Failed to process network update');
    }
  }, [maxUpdates]), []);

  // Subscribe to agent network snapshots
  useSSESubscription('agent_network_snapshot', useCallback((event) => {
    try {
      const snapshot = event.data as AgentNetworkSnapshot;
      setNetworkState({
        agents: snapshot.agents,
        relationships: snapshot.relationships,
        hierarchy: snapshot.hierarchy,
        execution_stack: snapshot.execution_stack,
        active_agents: snapshot.active_agents,
        data_dependencies: snapshot.data_dependencies,
      });
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error processing agent network snapshot:', err);
      setError('Failed to process network snapshot');
      setIsLoading(false);
    }
  }, []), []);

  // Fetch initial state from API
  useEffect(() => {
    if (!fetchInitialState) {
      setIsLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch current network state
        const stateResponse = await fetch('/api/agent-network/state');
        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          if (stateData.status === 'success' && stateData.data) {
            setNetworkState(stateData.data);
          }
        }

        // Fetch recent events
        const eventsResponse = await fetch('/api/agent-network/events?limit=50');
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          if (eventsData.status === 'success' && eventsData.data) {
            setRecentUpdates(eventsData.data.slice(0, maxUpdates));
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial agent network data:', err);
        setError('Failed to load initial network data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [fetchInitialState, maxUpdates]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/agent-network/state');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.data) {
            setNetworkState(data.data);
          }
        }
      } catch (err) {
        console.warn('Failed to refresh network state:', err);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Calculate network statistics
  const stats = useMemo(() => {
    if (!networkState) {
      return {
        totalAgents: 0,
        activeAgents: 0,
        totalRelationships: 0,
        averageSuccessRate: 0,
        totalInvocations: 0,
      };
    }

    const agents = Object.values(networkState.agents);
    const totalAgents = agents.length;
    const activeAgents = networkState.active_agents.length;
    const totalRelationships = networkState.relationships.length;
    
    const averageSuccessRate = agents.length > 0 
      ? agents.reduce((sum, agent) => sum + agent.success_rate, 0) / agents.length
      : 0;
    
    const totalInvocations = agents.reduce((sum, agent) => sum + agent.invocation_count, 0);

    return {
      totalAgents,
      activeAgents,
      totalRelationships,
      averageSuccessRate,
      totalInvocations,
    };
  }, [networkState]);

  // Check if network is currently active
  const isActive = useMemo(() => {
    return (networkState?.active_agents.length || 0) > 0;
  }, [networkState?.active_agents.length]);

  // Utility functions
  const getAgentMetrics = useCallback((agentName: string): AgentMetrics | undefined => {
    return networkState?.agents[agentName];
  }, [networkState]);

  const getAgentRelationships = useCallback((agentName: string): AgentRelationship[] => {
    if (!networkState) return [];
    return networkState.relationships.filter(
      rel => rel.source === agentName || rel.target === agentName
    );
  }, [networkState]);

  const getAgentChildren = useCallback((agentName: string): string[] => {
    return networkState?.hierarchy[agentName] || [];
  }, [networkState]);

  const getRecentUpdatesForAgent = useCallback((agentName: string): AgentNetworkUpdate[] => {
    return recentUpdates.filter(update => update.agent_name === agentName);
  }, [recentUpdates]);

  const clearRecentUpdates = useCallback(() => {
    setRecentUpdates([]);
  }, []);

  const refreshNetworkState = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/agent-network/state');
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setNetworkState(data.data);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to refresh network state:', err);
      setError('Failed to refresh network state');
    }
  }, []);

  return {
    // State
    networkState,
    recentUpdates,
    isActive,
    stats,
    isLoading,
    error,

    // Utility functions
    getAgentMetrics,
    getAgentRelationships,
    getAgentChildren,
    getRecentUpdatesForAgent,
    clearRecentUpdates,
    refreshNetworkState,
  };
}

// Convenience hook for specific agent data
export function useAgentData(agentName: string) {
  const { networkState, recentUpdates, getAgentMetrics, getAgentRelationships } = useAgentNetwork();
  
  return useMemo(() => {
    const metrics = getAgentMetrics(agentName);
    const relationships = getAgentRelationships(agentName);
    const recentActivity = recentUpdates.filter(update => update.agent_name === agentName);
    const isActive = networkState?.active_agents.includes(agentName) || false;

    return {
      metrics,
      relationships,
      recentActivity,
      isActive,
    };
  }, [agentName, getAgentMetrics, getAgentRelationships, recentUpdates, networkState]);
}

// Hook for network-wide activity monitoring
export function useNetworkActivity() {
  const { recentUpdates, stats, isActive } = useAgentNetwork();

  const activitySummary = useMemo(() => {
    const now = Date.now();
    const last5Minutes = now - 5 * 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;

    const recent5m = recentUpdates.filter(
      update => new Date(update.timestamp).getTime() > last5Minutes
    );
    const recentHour = recentUpdates.filter(
      update => new Date(update.timestamp).getTime() > lastHour
    );

    return {
      activitiesLast5Minutes: recent5m.length,
      activitiesLastHour: recentHour.length,
      currentlyActive: stats.activeAgents,
      totalAgents: stats.totalAgents,
      isActive,
    };
  }, [recentUpdates, stats, isActive]);

  return activitySummary;
}