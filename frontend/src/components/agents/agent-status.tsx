'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Agent, 
  AgentStatus as AgentStatusType,
  AgentStatusEvent,
  AgentThinkingEvent 
} from '@/types/agents';
import { useSSE } from '@/hooks/use-sse';

interface AgentStatusProps {
  agent: Agent;
  showDetails?: boolean;
  showActivity?: boolean;
  showThoughts?: boolean;
  className?: string;
}

interface ActivityLog {
  id: string;
  timestamp: number;
  activity: string;
  status: AgentStatusType;
  progress?: number;
}

interface ThoughtLog {
  id: string;
  timestamp: number;
  thought: string;
  stage: string;
}

export function AgentStatus({ 
  agent, 
  showDetails = true,
  showActivity = true,
  showThoughts = false,
  className 
}: AgentStatusProps) {
  const [currentAgent, setCurrentAgent] = useState<Agent>(agent);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [thoughtLog, setThoughtLog] = useState<ThoughtLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [lastActivity, setLastActivity] = useState<string>('');

  const { addEventListener } = useSSE({
    autoConnect: true,
    baseUrl: process.env.NODE_ENV === 'production' ? 'https://your-backend-url' : 'http://localhost:8000'
  });

  // Listen for agent status updates
  useEffect(() => {
    const unsubscribeStatus = addEventListener('agent_status_update', (event) => {
      const data = event.data as AgentStatusEvent['data'];
      
      if (data.agent_id === agent.id) {
        setCurrentAgent(prev => ({
          ...prev,
          status: data.status,
          last_active: Date.now()
        }));
        
        if (data.activity) {
          setLastActivity(data.activity);
          
          const newActivity: ActivityLog = {
            id: `activity_${Date.now()}`,
            timestamp: Date.now(),
            activity: data.activity,
            status: data.status,
            progress: data.progress
          };
          
          setActivityLog(prev => [newActivity, ...prev].slice(0, 10)); // Keep last 10
        }
        
        if (data.progress !== undefined) {
          setCurrentProgress(data.progress);
        }
      }
    });

    const unsubscribeThinking = addEventListener('agent_thinking', (event) => {
      const data = event.data as AgentThinkingEvent['data'];
      
      if (data.agent_id === agent.id && showThoughts) {
        const newThought: ThoughtLog = {
          id: `thought_${Date.now()}`,
          timestamp: Date.now(),
          thought: data.thought,
          stage: data.stage
        };
        
        setThoughtLog(prev => [newThought, ...prev].slice(0, 5)); // Keep last 5
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeThinking();
    };
  }, [agent.id, addEventListener, showThoughts]);

  const getStatusColor = (status: AgentStatusType) => {
    const colors = {
      idle: 'gray',
      thinking: 'yellow',
      processing: 'blue',
      responding: 'green',
      collaborating: 'purple',
      waiting: 'orange',
      error: 'red',
      offline: 'gray'
    };
    return colors[status];
  };

  const getStatusIcon = (status: AgentStatusType) => {
    const icons = {
      idle: '💤',
      thinking: '🤔',
      processing: '⚙️',
      responding: '💬',
      collaborating: '🤝',
      waiting: '⏳',
      error: '⚠️',
      offline: '🔌'
    };
    return icons[status];
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{currentAgent.name}</span>
            <Badge variant="outline" className="text-xs">
              {currentAgent.type}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">{getStatusIcon(currentAgent.status)}</span>
            <Badge 
              variant="secondary"
              className={cn(
                "text-xs animate-pulse",
                `bg-${getStatusColor(currentAgent.status)}-100 text-${getStatusColor(currentAgent.status)}-800`
              )}
            >
              {currentAgent.status}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Activity */}
        {lastActivity && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Current Activity</div>
            <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
              {lastActivity}
            </div>
            {currentProgress > 0 && (
              <Progress value={currentProgress} className="h-2" />
            )}
          </div>
        )}

        {/* Agent Details */}
        {showDetails && (
          <div className="space-y-3">
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">Success Rate</div>
                <div className="text-lg font-semibold">
                  {Math.round(currentAgent.stats.success_rate * 100)}%
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Response Time</div>
                <div className="text-lg font-semibold">
                  {currentAgent.stats.average_response_time.toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Messages</div>
                <div className="text-lg font-semibold">
                  {currentAgent.stats.messages_sent}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Tasks</div>
                <div className="text-lg font-semibold">
                  {currentAgent.stats.tasks_completed}
                </div>
              </div>
            </div>
            
            <div>
              <div className="font-medium text-muted-foreground mb-1">Last Active</div>
              <div className="text-sm">
                {getRelativeTime(currentAgent.last_active)}
              </div>
            </div>
          </div>
        )}

        {/* Thought Stream */}
        {showThoughts && thoughtLog.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <div className="text-sm font-medium">Agent Thoughts</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {thoughtLog.map((thought) => (
                <div key={thought.id} className="text-xs p-2 bg-blue-50 rounded">
                  <div className="flex justify-between items-start">
                    <span className="text-blue-800 italic">&ldquo;{thought.thought}&rdquo;</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {thought.stage}
                    </Badge>
                  </div>
                  <div className="text-blue-600 mt-1">{formatTime(thought.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {showActivity && activityLog.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <div className="text-sm font-medium">Recent Activity</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {activityLog.map((log) => (
                <div key={log.id} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <span>{getStatusIcon(log.status)}</span>
                    <span className="text-foreground">{log.activity}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {formatTime(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Capabilities Preview */}
        {showDetails && currentAgent.capabilities.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <div className="text-sm font-medium">Top Capabilities</div>
            <div className="flex flex-wrap gap-1">
              {currentAgent.capabilities.slice(0, 4).map((capability) => (
                <Badge key={capability} variant="outline" className="text-xs">
                  {capability}
                </Badge>
              ))}
              {currentAgent.capabilities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{currentAgent.capabilities.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}