'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress'; // Temporarily disabled
import { AgentAvatar } from './agent-avatar';
import { 
  Agent, 
  AgentStatus,
  AgentStatusEvent,
  AgentThinkingEvent,
  AgentCollaborationEvent
} from '@/types/agents';
import { useSSE } from '@/hooks/use-sse';

interface AgentActivityProps {
  agents: Agent[];
  showAnimations?: boolean;
  showThoughts?: boolean;
  showCollaborations?: boolean;
  maxItems?: number;
  className?: string;
}

interface ActivityItem {
  id: string;
  agent_id: string;
  agent_name: string;
  type: 'status' | 'thought' | 'collaboration';
  content: string;
  status?: AgentStatus;
  progress?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const ACTIVITY_ICONS = {
  status: '📊',
  thought: '💭',
  collaboration: '🤝'
};

const STATUS_MESSAGES: Record<AgentStatus, string> = {
  active: 'is actively working...',
  idle: 'is ready for new tasks',
  busy: 'is busy with a task...',
  thinking: 'is analyzing the problem...',
  offline: 'is currently offline',
  error: 'encountered an issue',
  completed: 'has completed the task'
};

export function AgentActivity({ 
  agents,
  showAnimations = true,
  showThoughts = true,
  showCollaborations = true,
  maxItems = 20,
  className 
}: AgentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, Agent>>({});

  const { addEventListener } = useSSE({
    autoConnect: true,
    baseUrl: process.env.NODE_ENV === 'production' ? 'https://your-backend-url' : 'http://localhost:8000'
  });

  // Create agent lookup map
  useEffect(() => {
    const map = agents.reduce((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {} as Record<string, Agent>);
    setAgentMap(map);
  }, [agents]);

  // Listen for various agent events
  useEffect(() => {
    const unsubscribeStatus = addEventListener('agent_status_update', (event) => {
      const data = event.data as AgentStatusEvent['data'];
      const agent = agentMap[data.agent_id];
      
      if (!agent) return;

      const activity: ActivityItem = {
        id: `status_${Date.now()}_${data.agent_id}`,
        agent_id: data.agent_id,
        agent_name: agent.name,
        type: 'status',
        content: data.activity || STATUS_MESSAGES[data.status],
        status: data.status,
        ...(data.progress !== undefined && { progress: data.progress }),
        timestamp: Date.now()
      };

      setActivities(prev => [activity, ...prev].slice(0, maxItems));
    });

    const unsubscribeThinking = showThoughts ? addEventListener('agent_thinking', (event) => {
      const data = event.data as AgentThinkingEvent['data'];
      const agent = agentMap[data.agent_id];
      
      if (!agent) return;

      const activity: ActivityItem = {
        id: `thought_${Date.now()}_${data.agent_id}`,
        agent_id: data.agent_id,
        agent_name: agent.name,
        type: 'thought',
        content: data.thought,
        timestamp: Date.now(),
        metadata: { stage: data.stage }
      };

      setActivities(prev => [activity, ...prev].slice(0, maxItems));
    }) : () => {};

    const unsubscribeCollaboration = showCollaborations ? addEventListener('agent_collaboration', (event) => {
      const data = event.data as AgentCollaborationEvent['data'];
      const initiator = agentMap[data.initiator_id];
      const collaborator = agentMap[data.collaborator_id];
      
      if (!initiator || !collaborator) return;

      const getCollaborationMessage = (action: string) => {
        const actions = {
          request_help: `requested help from ${collaborator.name}`,
          share_context: `shared context with ${collaborator.name}`,
          merge_results: `merged results with ${collaborator.name}`
        };
        return actions[action as keyof typeof actions] || `collaborated with ${collaborator.name}`;
      };

      const activity: ActivityItem = {
        id: `collab_${Date.now()}_${data.initiator_id}`,
        agent_id: data.initiator_id,
        agent_name: initiator.name,
        type: 'collaboration',
        content: getCollaborationMessage(data.action),
        timestamp: Date.now(),
        metadata: { 
          action: data.action,
          collaborator_id: data.collaborator_id,
          collaborator_name: collaborator.name,
          context: data.context
        }
      };

      setActivities(prev => [activity, ...prev].slice(0, maxItems));
    }) : () => {};

    return () => {
      unsubscribeStatus();
      unsubscribeThinking();
      unsubscribeCollaboration();
    };
  }, [addEventListener, agentMap, maxItems, showThoughts, showCollaborations]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActivityColor = (type: ActivityItem['type'], status?: AgentStatus) => {
    if (type === 'thought') return 'blue';
    if (type === 'collaboration') return 'purple';
    
    const statusColors: Record<AgentStatus, string> = {
      active: 'green',
      idle: 'gray',
      busy: 'blue',
      thinking: 'yellow',
      offline: 'gray',
      error: 'red',
      completed: 'purple'
    };
    
    return status ? statusColors[status] : 'gray';
  };

  if (activities.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <div className="text-muted-foreground">
          <div className="text-2xl mb-2">🤖</div>
          <div className="text-sm">Waiting for agent activity...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {activities.map((activity, index) => {
              const agent = agentMap[activity.agent_id];
              if (!agent) return null;

              const color = getActivityColor(activity.type, activity.status);
              const isNew = index === 0; // Highlight newest activity

              return (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 p-3 transition-all duration-500",
                    "hover:bg-muted/50",
                    isNew && showAnimations && "bg-blue-50 border-l-4 border-blue-400 animate-fade-in",
                    !isNew && "border-l-4 border-transparent"
                  )}
                >
                  {/* Agent Avatar */}
                  <div className="flex-shrink-0">
                    <AgentAvatar 
                      agent={agent} 
                      size="sm" 
                      showStatus={false}
                      showTooltip={false}
                      animated={showAnimations && isNew}
                    />
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{activity.agent_name}</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            `border-${color}-200 text-${color}-700`
                          )}
                        >
                          {ACTIVITY_ICONS[activity.type]} {activity.type}
                        </Badge>
                        {!!activity.metadata?.['stage'] && (
                          <Badge variant="secondary" className="text-xs">
                            {String(activity.metadata['stage'])}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(activity.timestamp)}
                      </div>
                    </div>

                    <div className="text-sm text-foreground">
                      {activity.type === 'thought' ? (
                        <div className="italic text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          &ldquo;{activity.content}&rdquo;
                        </div>
                      ) : (
                        <div>{activity.content}</div>
                      )}
                    </div>

                    {/* Progress Bar for Processing Activities - Temporarily disabled due to TS strict mode */}
                    {/* {activity.progress && (
                      <div className="space-y-1">
                        <Progress value={Number(activity.progress)} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {activity.progress}% complete
                        </div>
                      </div>
                    )} */}

                    {/* Collaboration Context */}
                    {activity.type === 'collaboration' && activity.metadata?.context && (
                      <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1">
                        Context: {String(activity.metadata.context)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Summary at Bottom */}
        <div className="border-t bg-muted/20 p-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <div>{activities.length} recent activities</div>
            <div>
              {agents.filter(a => a.status !== 'idle' && a.status !== 'offline').length} active agents
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add fade-in animation styles (add to globals.css)
export const activityStyles = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
`;