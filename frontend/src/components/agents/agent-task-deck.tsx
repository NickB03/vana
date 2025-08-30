'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// UI Components
import { Card, CardContent, CardHeader, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

// Types and Hooks
import { 
  Agent, 
  AgentStatus, 
  AgentStatusEvent,
  AgentThinkingEvent,
  AgentTask,
  AGENT_PRESETS 
} from '@/types/agents';
import { useSSE } from '@/hooks/use-sse';

interface AgentTaskDeckProps {
  agents?: Agent[];
  onAgentSelect?: (agent: Agent) => void;
  onTaskAssign?: (agentId: string, taskId: string) => void;
  selectedAgentId?: string;
  showPerformanceMetrics?: boolean;
  showConfidenceScores?: boolean;
  className?: string;
  maxAgents?: number;
  gridCols?: 2 | 3 | 4 | 6;
  enableRealTimeUpdates?: boolean;
}

interface ExtendedAgent extends Agent {
  currentTask?: AgentTask;
  confidence?: number;
  progress?: number;
  currentActivityText?: string; // Renamed to avoid conflict
  animation?: {
    type: 'pulse' | 'glow' | 'bounce' | 'shake';
    intensity: number;
  };
}

interface ActivityLog {
  id: string;
  agentId: string;
  timestamp: number;
  activity: string;
  progress?: number;
}

interface ThoughtBubble {
  id: string;
  agentId: string;
  timestamp: number;
  thought: string;
  stage: string;
}

const ANIMATION_VARIANTS = {
  idle: {
    scale: 1,
    opacity: 0.8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  thinking: {
    scale: [1, 1.02, 1],
    opacity: [0.8, 1, 0.8],
    boxShadow: [
      '0 2px 8px rgba(0,0,0,0.1)',
      '0 4px 16px rgba(59, 130, 246, 0.3)',
      '0 2px 8px rgba(0,0,0,0.1)'
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  processing: {
    scale: [1, 1.01, 1],
    opacity: 1,
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  busy: {
    scale: [1, 1.01, 1],
    opacity: 1,
    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  active: {
    scale: 1,
    opacity: 1,
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },
  responding: {
    scale: [1, 1.03, 1],
    opacity: [0.9, 1, 0.9],
    boxShadow: [
      '0 4px 12px rgba(16, 185, 129, 0.3)',
      '0 8px 24px rgba(16, 185, 129, 0.5)',
      '0 4px 12px rgba(16, 185, 129, 0.3)'
    ],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  collaborating: {
    scale: [1, 1.02, 1],
    opacity: [0.9, 1, 0.9],
    boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  waiting: {
    scale: 1,
    opacity: 0.7,
    boxShadow: '0 2px 8px rgba(251, 146, 60, 0.3)',
  },
  completed: {
    scale: 1,
    opacity: 0.9,
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
  },
  offline: {
    scale: 1,
    opacity: 0.5,
    boxShadow: '0 2px 8px rgba(156, 163, 175, 0.2)',
  },
  error: {
    scale: [1, 1.05, 1],
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
    transition: {
      duration: 0.5,
      repeat: 3,
      repeatType: 'reverse' as const
    }
  },
  selected: {
    scale: 1.05,
    opacity: 1,
    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
    borderColor: 'rgb(59 130 246)',
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  }
};

export function AgentTaskDeck({ 
  agents = [],
  onAgentSelect,
  onTaskAssign: _onTaskAssign, // Prefix with underscore to indicate intentionally unused
  selectedAgentId,
  showPerformanceMetrics = true,
  showConfidenceScores = true,
  className,
  maxAgents = 12,
  gridCols = 3,
  enableRealTimeUpdates = true 
}: AgentTaskDeckProps) {
  const [extendedAgents, setExtendedAgents] = useState<ExtendedAgent[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [thoughtBubbles, setThoughtBubbles] = useState<ThoughtBubble[]>([]);

  // SSE for real-time updates
  const { addEventListener } = useSSE({
    autoConnect: enableRealTimeUpdates,
    baseUrl: process.env.NODE_ENV === 'production' ? 'https://your-backend-url' : 'http://localhost:8000'
  });

  // Initialize agents with mock data if empty
  const mockAgents = useMemo(() => {
    if (agents.length > 0) return agents;
    
    const roles = Object.keys(AGENT_PRESETS).slice(0, Math.min(maxAgents, 8));
    return roles.map((role, index) => {
      const preset = AGENT_PRESETS[role as keyof typeof AGENT_PRESETS];
      return {
        id: `agent-${role}-${index}`,
        ...preset,
        status: (['idle', 'busy', 'thinking', 'responding'] as AgentStatus[])[
          Math.floor(Math.random() * 4)
        ],
        lastActivity: Date.now() - Math.random() * 3600000,
        messageCount: Math.floor(Math.random() * 50) + 5,
        isTyping: Math.random() > 0.8, // 20% chance of typing
      };
    });
  }, [agents, maxAgents]);

  // Convert to extended agents with additional properties
  useEffect(() => {
    const enhanced = mockAgents.map((agent) => ({
      ...agent,
      confidence: 0.75 + Math.random() * 0.25, // 75-100%
      progress: agent.status === 'busy' ? Math.random() * 100 : 0,
      currentActivityText: `Working on ${agent.capabilities[0]} task`,
      animation: {
        type: getAnimationType(agent.status || 'idle'),
        intensity: agent.status === 'thinking' ? 0.8 : 0.5,
      }
    })) as ExtendedAgent[];
    
    setExtendedAgents(enhanced);
  }, [mockAgents]);

  // Real-time event handlers
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const unsubscribeStatus = addEventListener('agent_status_update', (event) => {
      const data = event.data as AgentStatusEvent['data'];
      
      setExtendedAgents(prev => 
        prev.map(agent => 
          agent.id === data.agent_id 
            ? {
                ...agent,
                status: data.status,
                progress: data.progress ?? agent.progress,
                currentActivityText: data.activity || agent.currentActivityText,
                animation: {
                  type: getAnimationType(data.status),
                  intensity: data.status === 'thinking' ? 0.8 : 0.5,
                }
              }
            : agent
        )
      );

      // Add to activity log
      if (data.activity) {
        setActivityLog(prev => [{
          id: `activity-${Date.now()}`,
          agentId: data.agent_id,
          timestamp: Date.now(),
          activity: data.activity!,
          progress: data.progress,
        }, ...prev].slice(0, 50));
      }
    });

    const unsubscribeThinking = addEventListener('agent_thinking', (event) => {
      const data = event.data as AgentThinkingEvent['data'];
      
      setThoughtBubbles(prev => [{
        id: `thought-${Date.now()}`,
        agentId: data.agent_id,
        timestamp: Date.now(),
        thought: data.thought,
        stage: data.stage,
      }, ...prev].slice(0, 20));
    });

    return () => {
      unsubscribeStatus();
      unsubscribeThinking();
    };
  }, [addEventListener, enableRealTimeUpdates]);

  const getAnimationType = (status: AgentStatus): 'pulse' | 'glow' | 'bounce' | 'shake' => {
    switch (status) {
      case 'thinking': return 'pulse';
      case 'busy': return 'glow';
      case 'responding': return 'bounce';
      case 'error': return 'shake';
      default: return 'pulse';
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    const colors = {
      idle: 'bg-gray-100 text-gray-800 border-gray-300',
      thinking: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300',
      responding: 'bg-green-100 text-green-800 border-green-300',
      collaborating: 'bg-purple-100 text-purple-800 border-purple-300',
      waiting: 'bg-orange-100 text-orange-800 border-orange-300',
      error: 'bg-red-100 text-red-800 border-red-300',
      offline: 'bg-gray-100 text-gray-600 border-gray-300',
      active: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      busy: 'bg-amber-100 text-amber-800 border-amber-300',
      completed: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[status];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.75) return 'bg-yellow-500';
    if (confidence >= 0.6) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleAgentClick = useCallback((agent: ExtendedAgent) => {
    onAgentSelect?.(agent);
  }, [onAgentSelect]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6'
  }[gridCols];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agent Task Deck</h2>
          <p className="text-muted-foreground">
            {extendedAgents.length} agents • {extendedAgents.filter(a => a.status !== 'idle').length} active
          </p>
        </div>
        
        {enableRealTimeUpdates && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live updates
          </div>
        )}
      </div>

      {/* Agent Grid */}
      <div className={cn(`grid gap-4 ${gridColsClass}`, 'auto-rows-fr')}>
        <AnimatePresence mode="popLayout">
          {extendedAgents.slice(0, maxAgents).map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            const statusColor = getStatusColor(agent.status);
            const recentThought = thoughtBubbles.find(t => t.agentId === agent.id);
            
            return (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={isSelected ? 'selected' : ANIMATION_VARIANTS[agent.status] || 'idle'}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
                className="relative"
              >
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Card 
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-lg',
                        'border-2',
                        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
                        agent.status === 'error' && 'border-red-300',
                      )}
                      onClick={() => handleAgentClick(agent)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback 
                                  className="text-lg font-semibold"
                                  style={{ 
                                    backgroundColor: agent.personality.colors.background,
                                    color: agent.personality.colors.text 
                                  }}
                                >
                                  {agent.personality.emoji}
                                </AvatarFallback>
                              </Avatar>
                              
                              {/* Status indicator */}
                              <div className={cn(
                                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background',
                                agent.status === 'idle' && 'bg-gray-400',
                                agent.status === 'thinking' && 'bg-yellow-400 animate-pulse',
                                agent.status === 'busy' && 'bg-blue-500 animate-pulse',
                                agent.status === 'responding' && 'bg-green-500',
                                agent.status === 'error' && 'bg-red-500',
                              )} />
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <h3 className="font-semibold text-sm truncate">
                                    {agent.name}
                                  </h3>
                                </TooltipTrigger>
                                <TooltipContent>{agent.name}</TooltipContent>
                              </Tooltip>
                              
                              <Badge variant="outline" className={cn('text-xs mt-1', statusColor)}>
                                {agent.status}
                              </Badge>
                            </div>
                          </div>

                          <CardAction>
                            {showConfidenceScores && agent.confidence && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-right">
                                    <div className="text-xs font-medium">
                                      {Math.round(agent.confidence * 100)}%
                                    </div>
                                    <div className={cn(
                                      'w-2 h-2 rounded-full mt-1',
                                      getConfidenceColor(agent.confidence)
                                    )} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Confidence Score</TooltipContent>
                              </Tooltip>
                            )}
                          </CardAction>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-3">
                        {/* Current Activity */}
                        {agent.currentActivityText && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground truncate">
                              {agent.currentActivityText}
                            </p>
                            
                            {agent.progress !== undefined && agent.progress > 0 && (
                              <Progress 
                                value={agent.progress} 
                                className="h-1.5"
                              />
                            )}
                          </div>
                        )}

                        {/* Thought Bubble */}
                        {recentThought && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-blue-50 rounded-lg p-2"
                          >
                            <p className="text-xs italic text-blue-800 truncate">
                              "{recentThought.thought}"
                            </p>
                          </motion.div>
                        )}

                        {/* Performance Metrics */}
                        {showPerformanceMetrics && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Success:</span>
                              <span className="ml-1 font-medium">
                                {Math.round(agent.stats.success_rate * 100)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tasks:</span>
                              <span className="ml-1 font-medium">
                                {agent.stats.tasks_completed}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Capabilities preview */}
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.slice(0, 2).map((capability) => (
                            <Badge 
                              key={capability} 
                              variant="secondary" 
                              className="text-xs px-2 py-0"
                            >
                              {capability.split('-')[0]}
                            </Badge>
                          ))}
                          {agent.capabilities.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              +{agent.capabilities.length - 2}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCardTrigger>
                  
                  <HoverCardContent className="w-80">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback 
                            className="text-xl"
                            style={{ 
                              backgroundColor: agent.personality.colors.background,
                              color: agent.personality.colors.text 
                            }}
                          >
                            {agent.personality.emoji}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {agent.role} • {agent.personality.style}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm">{agent.description}</p>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Statistics</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Success Rate: {Math.round(agent.stats.success_rate * 100)}%</div>
                          <div>Avg Response: {agent.stats.average_response_time}ms</div>
                          <div>Tasks: {agent.stats.tasks_completed}</div>
                          <div>Messages: {agent.stats.messages_sent}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Capabilities</h4>
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.map((capability) => (
                            <Badge key={capability} variant="outline" className="text-xs">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Activity Stream */}
      {activityLog.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {activityLog.slice(0, 10).map((activity) => {
                const agent = extendedAgents.find(a => a.id === activity.agentId);
                if (!agent) return null;
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {agent.personality.emoji}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        <span className="font-medium">{agent.name}</span> {activity.activity}
                      </p>
                      {activity.progress && (
                        <Progress value={activity.progress} className="h-1 mt-1" />
                      )}
                    </div>
                    
                    <span className="text-xs text-muted-foreground">
                      {formatTime(activity.timestamp)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}