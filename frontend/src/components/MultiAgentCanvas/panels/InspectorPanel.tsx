/**
 * InspectorPanel - Detailed inspection and debugging panel
 * 
 * This panel provides detailed information about selected agents,
 * debugging information, performance metrics, and system state.
 * Currently a placeholder for Phase 3.
 */

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Bug, 
  Gauge, 
  Clock, 
  FileText, 
  Code, 
  Activity,
  Eye,
  Filter,
  RefreshCw,
  BarChart3,
  Cpu,
  Database,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentMetrics, AgentNetworkUpdate } from '@/types/adk-events';
import '../styles/panel-enhancements.css';

export interface InspectorPanelProps {
  /** Panel ID for identification */
  panelId: string;
  /** Whether the panel is collapsed */
  isCollapsed: boolean;
  /** Whether the panel is in fullscreen mode */
  isFullscreen: boolean;
  /** Selected agent for inspection */
  selectedAgent?: string;
  /** Agent metrics data */
  agentMetrics?: Record<string, AgentMetrics>;
  /** Recent network updates for debugging */
  recentUpdates?: AgentNetworkUpdate[];
  /** Additional CSS classes */
  className?: string;
}

type InspectorTab = 'overview' | 'performance' | 'debug' | 'logs';

export function InspectorPanel({
  panelId,
  isCollapsed,
  isFullscreen,
  selectedAgent,
  agentMetrics = {},
  recentUpdates = [],
  className,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  const [logFilter, setLogFilter] = useState<string>('');

  // Get selected agent data
  const selectedAgentData = useMemo(() => {
    if (!selectedAgent || !agentMetrics[selectedAgent]) {
      return null;
    }
    return agentMetrics[selectedAgent];
  }, [selectedAgent, agentMetrics]);

  // Filter logs based on selected agent and search term
  const filteredLogs = useMemo(() => {
    let logs = recentUpdates;
    
    if (selectedAgent) {
      logs = logs.filter(update => update.agent_name === selectedAgent);
    }
    
    if (logFilter) {
      logs = logs.filter(update => 
        update.agent_name.toLowerCase().includes(logFilter.toLowerCase()) ||
        update.event_type.toLowerCase().includes(logFilter.toLowerCase())
      );
    }
    
    return logs.slice(0, 100); // Limit to 100 most recent
  }, [recentUpdates, selectedAgent, logFilter]);

  const panelContent = useMemo(() => {
    if (isCollapsed) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-4">
            <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Inspector collapsed</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* Enhanced Tab Navigation */}
        <div className="flex border-b border-border bg-muted/20">
          {[
            { id: 'overview', label: 'Overview', icon: Eye, color: 'text-primary' },
            { id: 'performance', label: 'Performance', icon: BarChart3, color: 'text-secondary' },
            { id: 'debug', label: 'Debug', icon: Bug, color: 'text-warning' },
            { id: 'logs', label: 'Logs', icon: Terminal, color: 'text-accent' },
          ].map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as InspectorTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative',
                'hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
                activeTab === id
                  ? `bg-background text-foreground ${color} shadow-sm`
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn("w-4 h-4", activeTab === id && color)} />
              {label}
              {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-current opacity-80" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto panel-content">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {selectedAgent ? (
                <>
                  {/* Agent Header */}
                  <div className="metric-card">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          selectedAgentData?.is_active 
                            ? "bg-green-500/20 text-green-400 border-2 border-green-500/30"
                            : "bg-muted/50 text-muted-foreground border-2 border-border"
                        )}>
                          <Cpu className="w-6 h-6" />
                          {selectedAgentData?.is_active && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">{selectedAgent}</h3>
                        <div className={cn(
                          "status-indicator mt-1",
                          selectedAgentData?.is_active ? "active" : "idle"
                        )}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          {selectedAgentData?.is_active ? 'Currently Active' : 'Idle'}
                        </div>
                      </div>
                    </div>

                    {selectedAgentData && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Invocations</span>
                          </div>
                          <div className="metric-value text-lg">{selectedAgentData.invocation_count}</div>
                          <div className="metric-label">Total calls</div>
                        </div>

                        <div className="bg-background/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-secondary" />
                            <span className="text-sm font-medium">Success Rate</span>
                          </div>
                          <div className="metric-value text-lg">
                            {Math.round(selectedAgentData.success_rate * 100)}%
                          </div>
                          <div className="w-full bg-muted/30 rounded-full h-2 mt-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${selectedAgentData.success_rate * 100}%`,
                                background: selectedAgentData.success_rate > 0.8 ? 'var(--vana-success)' :
                                           selectedAgentData.success_rate > 0.6 ? 'var(--vana-accent)' : 'var(--vana-warning)'
                              }}
                            />
                          </div>
                        </div>

                        <div className="bg-background/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-accent" />
                            <span className="text-sm font-medium">Avg Time</span>
                          </div>
                          <div className="metric-value text-lg">
                            {Math.round(selectedAgentData.average_execution_time)}ms
                          </div>
                          <div className="metric-label">Per execution</div>
                        </div>

                        <div className="bg-background/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4 text-warning" />
                            <span className="text-sm font-medium">Tools</span>
                          </div>
                          <div className="metric-value text-lg">
                            {selectedAgentData.tools_used?.length || 0}
                          </div>
                          <div className="metric-label">Available</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tools Section */}
                  {selectedAgentData?.tools_used && selectedAgentData.tools_used.length > 0 && (
                    <div className="metric-card">
                      <div className="flex items-center gap-2 mb-4">
                        <Code className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold text-foreground">Available Tools</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedAgentData.tools_used.map(tool => (
                          <div 
                            key={tool}
                            className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg"
                          >
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <span className="text-sm font-medium text-primary">{tool}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* System Information */}
                  <div className="metric-card">
                    <div className="flex items-center gap-2 mb-4">
                      <Gauge className="w-5 h-5 text-secondary" />
                      <h4 className="font-semibold text-foreground">System Information</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agent Type:</span>
                        <span className="font-medium">Multi-Agent Processor</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Activity:</span>
                        <span className="font-medium">
                          {filteredLogs.length > 0 
                            ? new Date(filteredLogs[0].timestamp).toLocaleString()
                            : 'No recent activity'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Memory Usage:</span>
                        <span className="font-medium text-accent">Optimized</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                      <Eye className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">No Agent Selected</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Choose an agent from the network panel to view detailed metrics and debugging information
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              {selectedAgent && selectedAgentData ? (
                <>
                  {/* Performance Overview */}
                  <div className="metric-card">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-secondary" />
                      <h4 className="font-semibold text-foreground">Performance Metrics</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* Execution Time Chart */}
                      <div className="bg-background/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Execution Time</span>
                          <span className="text-xs text-muted-foreground">Average: {Math.round(selectedAgentData.average_execution_time)}ms</span>
                        </div>
                        <div className="h-4 bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-1000"
                            style={{ 
                              width: `${Math.min((selectedAgentData.average_execution_time / 5000) * 100, 100)}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Fast (0ms)</span>
                          <span>Slow (5s+)</span>
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="bg-background/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Success Rate</span>
                          <span className="text-xs text-muted-foreground">{Math.round(selectedAgentData.success_rate * 100)}%</span>
                        </div>
                        <div className="h-4 bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-1000"
                            style={{ 
                              width: `${selectedAgentData.success_rate * 100}%`,
                              background: selectedAgentData.success_rate > 0.8 ? 'var(--vana-success)' :
                                         selectedAgentData.success_rate > 0.6 ? 'var(--vana-accent)' : 'var(--vana-warning)'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Activity Level */}
                      <div className="bg-background/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Activity Level</span>
                          <div className={cn(
                            "status-indicator text-xs",
                            selectedAgentData.is_active ? "active" : "idle"
                          )}>
                            {selectedAgentData.is_active ? "High" : "Low"}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-muted/20 rounded p-2">
                            <div className="text-lg font-bold text-primary">{selectedAgentData.invocation_count}</div>
                            <div className="text-xs text-muted-foreground">Total Calls</div>
                          </div>
                          <div className="bg-muted/20 rounded p-2">
                            <div className="text-lg font-bold text-secondary">
                              {selectedAgentData.tools_used?.length || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Tools</div>
                          </div>
                          <div className="bg-muted/20 rounded p-2">
                            <div className="text-lg font-bold text-accent">
                              {selectedAgentData.is_active ? '1' : '0'}
                            </div>
                            <div className="text-xs text-muted-foreground">Active</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-secondary/10 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-secondary" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">Performance Data</p>
                    <p className="text-sm text-muted-foreground">
                      Select an agent to view performance metrics
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="space-y-6">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-warning/10 rounded-full flex items-center justify-center">
                    <Bug className="w-8 h-8 text-warning" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">Debug Console</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Advanced debugging features coming in Phase 3
                  </p>
                  <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Stack trace analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Error reporting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Memory profiling</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Performance bottlenecks</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Enhanced Log Controls */}
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  <Terminal className="w-5 h-5 text-accent" />
                  <h4 className="font-semibold text-foreground">Event Logs</h4>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {filteredLogs.length} entries
                    </span>
                    <div className={cn(
                      "status-indicator text-xs",
                      filteredLogs.length > 0 ? "active" : "idle"
                    )}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      {filteredLogs.length > 0 ? "Active" : "Idle"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search logs by agent name or event type..."
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                    />
                  </div>
                  
                  <button
                    onClick={() => setLogFilter('')}
                    className={cn(
                      "p-2.5 rounded-lg transition-all border",
                      logFilter 
                        ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" 
                        : "bg-muted/50 border-border hover:bg-muted/70 text-muted-foreground"
                    )}
                    title="Clear filter"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  
                  {selectedAgent && (
                    <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary">
                      Filtered: {selectedAgent}
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Log Entries */}
              <div className="activity-feed max-h-96">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => (
                    <div 
                      key={index}
                      className="activity-item"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0 border",
                          log.event_type === 'agent_start' 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-green-500/20 text-green-400 border-green-500/30'
                        )}>
                          {log.event_type === 'agent_start' ? (
                            <Activity className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-foreground text-sm truncate">
                              {log.agent_name}
                            </span>
                            <div className={cn(
                              "status-indicator text-xs",
                              log.event_type === 'agent_start' ? "processing" : "active"
                            )}>
                              {log.event_type === 'agent_start' ? 'Started' : 'Completed'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-mono">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            {log.execution_time && (
                              <>
                                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
                                <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs font-medium">
                                  {log.execution_time}ms
                                </span>
                              </>
                            )}
                          </div>
                          
                          {log.parent_agent && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>→ Triggered by</span>
                              <span className="font-medium text-primary">{log.parent_agent}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center">
                      <Terminal className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      {logFilter ? 'No Matching Logs' : 'No Recent Activity'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {logFilter 
                        ? `No logs found matching "${logFilter}"` 
                        : 'Agent activity logs will appear here as events occur'
                      }
                    </p>
                    {logFilter && (
                      <button
                        onClick={() => setLogFilter('')}
                        className="mt-3 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-sm font-medium transition-all"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [isCollapsed, activeTab, selectedAgent, selectedAgentData, filteredLogs, logFilter]);

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
export const InspectorPanelIcon = () => <Eye className="w-4 h-4" />;

// Export default panel configuration
export const inspectorPanelConfig = {
  id: 'inspector',
  title: 'Inspector',
  component: InspectorPanel,
  icon: InspectorPanelIcon,
  collapsible: true,
  resizable: true,
  minSize: 15,
  defaultSize: 25,
  order: 3,
} as const;