/**
 * AgentNetworkPanel - Visual representation of the agent network
 * 
 * This panel will display the agent network graph, relationships,
 * and real-time agent activity. Currently a placeholder for Phase 3.
 */

import { useMemo } from 'react';
import { Network, Activity, Zap, Clock, CheckCircle, TrendingUp, Users, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentNetworkState, AgentNetworkUpdate } from '@/types/adk-events';
import '../styles/panel-enhancements.css';

export interface AgentNetworkPanelProps {
  /** Panel ID for identification */
  panelId: string;
  /** Whether the panel is collapsed */
  isCollapsed: boolean;
  /** Whether the panel is in fullscreen mode */
  isFullscreen: boolean;
  /** Current agent network state */
  networkState?: AgentNetworkState;
  /** Recent network updates */
  recentUpdates?: AgentNetworkUpdate[];
  /** Additional CSS classes */
  className?: string;
}

export function AgentNetworkPanel({
  panelId,
  isCollapsed,
  isFullscreen,
  networkState,
  recentUpdates = [],
  className,
}: AgentNetworkPanelProps) {
  // Calculate network statistics
  const networkStats = useMemo(() => {
    if (!networkState) {
      return {
        totalAgents: 0,
        activeAgents: 0,
        totalRelationships: 0,
        averageSuccessRate: 0,
      };
    }

    const agents = Object.values(networkState.agents);
    const totalAgents = agents.length;
    const activeAgents = networkState.active_agents.length;
    const totalRelationships = networkState.relationships.length;
    const averageSuccessRate = agents.length > 0 
      ? agents.reduce((sum, agent) => sum + agent.success_rate, 0) / agents.length
      : 0;

    return {
      totalAgents,
      activeAgents,
      totalRelationships,
      averageSuccessRate: Math.round(averageSuccessRate * 100),
    };
  }, [networkState]);

  // Get recent activity summary
  const recentActivity = useMemo(() => {
    const last5Minutes = Date.now() - 5 * 60 * 1000;
    return recentUpdates
      .filter(update => new Date(update.timestamp).getTime() > last5Minutes)
      .slice(0, 10);
  }, [recentUpdates]);

  const panelContent = useMemo(() => {
    if (isCollapsed) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-4">
            <Network className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Network collapsed</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col panel-content">
        {/* Network Overview Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Network className="w-6 h-6 text-primary" />
              {networkStats.activeAgents > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Network Status</h2>
              <p className="text-sm text-muted-foreground">
                {networkStats.activeAgents > 0 ? 'Active network detected' : 'Network idle'}
              </p>
            </div>
          </div>
          
          {/* Real-time Activity Indicator */}
          {networkStats.activeAgents > 0 && (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex gap-1">
                <div className="loading-dot" style={{background: 'var(--vana-success)'}}></div>
                <div className="loading-dot" style={{background: 'var(--vana-success)'}}></div>
                <div className="loading-dot" style={{background: 'var(--vana-success)'}}></div>
              </div>
              <span className="text-sm font-medium text-green-400">
                {networkStats.activeAgents} agent{networkStats.activeAgents !== 1 ? 's' : ''} processing
              </span>
            </div>
          )}
        </div>

        {/* Enhanced Network Statistics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-primary" />
              <div className={cn(
                "status-indicator",
                networkStats.activeAgents > 0 ? "active" : "idle"
              )}>
                <div className="w-2 h-2 rounded-full bg-current" />
                {networkStats.activeAgents > 0 ? "Active" : "Idle"}
              </div>
            </div>
            <div className="metric-value">
              {networkStats.activeAgents}<span className="text-muted-foreground">/{networkStats.totalAgents}</span>
            </div>
            <div className="metric-label">Active Agents</div>
            {networkStats.totalAgents > 0 && (
              <div className={cn("metric-change", 
                networkStats.activeAgents > 0 ? "positive" : ""
              )}>
                {Math.round((networkStats.activeAgents / networkStats.totalAgents) * 100)}% utilization
              </div>
            )}
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <div className={cn(
                "status-indicator",
                networkStats.averageSuccessRate > 80 ? "active" : 
                networkStats.averageSuccessRate > 60 ? "processing" : "error"
              )}>
                {networkStats.averageSuccessRate > 80 ? "Excellent" : 
                 networkStats.averageSuccessRate > 60 ? "Good" : "Poor"}
              </div>
            </div>
            <div className="metric-value">{networkStats.averageSuccessRate}%</div>
            <div className="metric-label">Success Rate</div>
            <div className="w-full bg-muted/30 rounded-full h-2 mt-2">
              <div 
                className="h-2 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${networkStats.averageSuccessRate}%`,
                  background: networkStats.averageSuccessRate > 80 ? 'var(--vana-success)' :
                             networkStats.averageSuccessRate > 60 ? 'var(--vana-accent)' : 'var(--vana-warning)'
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-xs text-muted-foreground">Connections</span>
            </div>
            <div className="metric-value">{networkStats.totalRelationships}</div>
            <div className="metric-label">Relationships</div>
            {networkStats.totalAgents > 1 && (
              <div className="metric-change">
                {Math.round(networkStats.totalRelationships / Math.max(networkStats.totalAgents - 1, 1) * 100)}% connectivity
              </div>
            )}
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Timer className="w-5 h-5 text-warning" />
              <span className="text-xs text-muted-foreground">Recent</span>
            </div>
            <div className="metric-value">{recentActivity.length}</div>
            <div className="metric-label">Events (5m)</div>
            {recentActivity.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Last: {new Date(recentActivity[0]?.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Active Agents Section */}
        {networkState && networkState.active_agents.length > 0 && (
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-green-400" />
              <h4 className="text-sm font-semibold text-foreground">Currently Active</h4>
              <div className="status-indicator active ml-auto">
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {networkState.active_agents.length} Running
              </div>
            </div>
            <div className="grid gap-2">
              {networkState.active_agents.map((agentName, index) => (
                <div key={agentName} className="flex items-center gap-3 p-2 bg-background/50 rounded-md">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-30" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{agentName}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Activity Feed */}
        {recentActivity.length > 0 ? (
          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Activity
              </h4>
              <span className="text-xs text-muted-foreground">Last 5 minutes</span>
            </div>
            <div className="activity-feed">
              {recentActivity.map((update, index) => (
                <div key={index} className="activity-item">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0",
                      update.event_type === 'agent_start' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-green-500/20 text-green-400'
                    )}>
                      {update.event_type === 'agent_start' ? (
                        <Activity className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground text-sm truncate">
                          {update.agent_name}
                        </span>
                        <div className={cn(
                          "status-indicator text-xs",
                          update.event_type === 'agent_start' ? "processing" : "active"
                        )}>
                          {update.event_type === 'agent_start' ? 'Started' : 'Completed'}
                        </div>
                      </div>
                      <div className="activity-timestamp">
                        {new Date(update.timestamp).toLocaleTimeString()}
                        {update.execution_time && (
                          <span className="ml-2 px-1.5 py-0.5 bg-muted/50 rounded text-xs">
                            {update.execution_time}ms
                          </span>
                        )}
                      </div>
                      {update.parent_agent && (
                        <div className="text-xs text-muted-foreground mt-1">
                          → Triggered by {update.parent_agent}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">No recent activity</p>
              <p className="text-xs text-muted-foreground">
                Agent events will appear here as they occur
              </p>
            </div>
          </div>
        )}

        {/* Placeholder for future network visualization */}
        <div className="bg-muted/20 rounded-lg p-4 flex-1 min-h-32 flex items-center justify-center">
          <div className="text-center">
            <Network className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Network visualization
            </p>
            <p className="text-xs text-muted-foreground">
              Coming in Phase 3
            </p>
          </div>
        </div>
      </div>
    );
  }, [isCollapsed, networkStats, networkState, recentActivity]);

  return (
    <div 
      className={cn(
        'multi-agent-panel h-full w-full flex flex-col',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
      data-panel-id={panelId}
    >
      {panelContent}
    </div>
  );
}

// Export icon component for use in layout configuration
export const AgentNetworkPanelIcon = () => <Network className="w-4 h-4" />;

// Export default panel configuration
export const agentNetworkPanelConfig = {
  id: 'agent-network',
  title: 'Agent Network',
  component: AgentNetworkPanel,
  icon: AgentNetworkPanelIcon,
  collapsible: true,
  resizable: true,
  minSize: 20,
  defaultSize: 35,
  order: 2,
} as const;