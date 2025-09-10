"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  Square,
  Eye,
  EyeOff,
  Zap,
  Users,
  FileSearch,
  PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AgentType
} from '../../src/types/chat';

// Define connection status type
type SSEConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

interface AgentProgress {
  id: string;
  type: AgentType;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  currentTask?: string;
  startTime?: Date;
  endTime?: Date;
  confidence?: number;
  estimatedDuration?: number;
}

interface ChatProgressProps {
  isVisible?: boolean;
  isProcessing?: boolean;
  connectionStatus?: SSEConnectionStatus;
  totalProgress?: number;
  currentPhase?: string;
  agentsProgress?: AgentProgress[];
  estimatedTimeRemaining?: number;
  onToggleVisibility?: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  showDetailedView?: boolean;
  queryId?: string;
  events?: any[];
}

export function ChatProgress({
  isVisible = true,
  isProcessing = false,
  connectionStatus = 'disconnected',
  totalProgress = 0,
  currentPhase = 'initializing',
  agentsProgress = [],
  estimatedTimeRemaining,
  onToggleVisibility,
  onCancel,
  onPause,
  onResume,
  showDetailedView = false,
}: ChatProgressProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time
  useEffect(() => {
    if (isProcessing && !startTime) {
      setStartTime(new Date());
    }
    
    if (!isProcessing) {
      setStartTime(null);
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      if (startTime) {
        setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAgentIcon = (type: AgentType) => {
    const icons = {
      team_leader: Users,
      plan_generator: FileSearch,
      section_planner: FileSearch,
      section_researcher: Brain,
      enhanced_search: Zap,
      research_evaluator: CheckCircle,
      escalation_checker: AlertTriangle,
      report_writer: PenTool,
    };
    return icons[type] || Brain;
  };

  const getAgentColor = (type: AgentType, status: AgentProgress['status']) => {
    if (status === 'failed') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (status === 'completed') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (status === 'active') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getStatusIcon = (status: AgentProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'active':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const toggleAgentDetails = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  const completedAgents = agentsProgress.filter(a => a.status === 'completed').length;
  const activeAgents = agentsProgress.filter(a => a.status === 'active').length;
  const failedAgents = agentsProgress.filter(a => a.status === 'failed').length;

  if (!isVisible && !isProcessing) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mb-4 minimal-surface bg-chat-surface border-chat-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-chat-border">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            connectionStatus === 'connected' ? "bg-green-500 animate-pulse" :
            connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? "bg-yellow-500 animate-pulse" :
            "bg-red-500"
          )} />
          
          <h3 className="font-medium text-sm">
            Research Progress
          </h3>
          
          {isProcessing && (
            <Badge variant="secondary" className="text-xs">
              {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isProcessing && (
            <>
              <div className="flex items-center space-x-4 text-xs text-text-secondary">
                <span>Elapsed: {formatTime(elapsedTime)}</span>
                {estimatedTimeRemaining && (
                  <span>Remaining: ~{formatTime(estimatedTimeRemaining)}</span>
                )}
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCancel}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Square className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cancel research</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleVisibility}
                  className="h-7 w-7 p-0"
                >
                  {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isVisible ? 'Hide progress' : 'Show progress'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isVisible && (
        <div className="p-4 space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>

          {/* Agent Summary */}
          {agentsProgress.length > 0 && (
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <div className="flex items-center space-x-4">
                <span>{completedAgents}/{agentsProgress.length} agents completed</span>
                {activeAgents > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeAgents} active
                  </Badge>
                )}
                {failedAgents > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {failedAgents} failed
                  </Badge>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Agents Progress */}
          {agentsProgress.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-secondary">AI Agents</h4>
              
              <div className="space-y-2">
                {agentsProgress.map((agent) => {
                  const IconComponent = getAgentIcon(agent.type);
                  const isExpanded = expandedAgents.has(agent.id);
                  
                  return (
                    <div key={agent.id} className="space-y-2">
                      {/* Agent Header */}
                      <div
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toggleAgentDetails(agent.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "flex items-center justify-center w-6 h-6 rounded-full",
                            getAgentColor(agent.type, agent.status)
                          )}>
                            <IconComponent className="w-3 h-3" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {agent.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {getStatusIcon(agent.status)}
                            </div>
                            
                            {agent.currentTask && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {agent.currentTask}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {agent.status === 'active' && (
                            <div className="w-16">
                              <Progress value={agent.progress} className="h-1" />
                            </div>
                          )}
                          
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {agent.status === 'completed' && '100%'}
                            {agent.status === 'active' && `${Math.round(agent.progress)}%`}
                            {agent.status === 'failed' && 'Failed'}
                            {agent.status === 'waiting' && 'Waiting'}
                          </span>
                        </div>
                      </div>

                      {/* Agent Details (Expanded) */}
                      {isExpanded && showDetailedView && (
                        <div className="ml-6 p-3 text-xs space-y-2 bg-muted/20 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            {agent.startTime && (
                              <div>
                                <span className="text-muted-foreground">Started:</span>
                                <span className="ml-2">{agent.startTime.toLocaleTimeString()}</span>
                              </div>
                            )}
                            
                            {agent.endTime && (
                              <div>
                                <span className="text-muted-foreground">Completed:</span>
                                <span className="ml-2">{agent.endTime.toLocaleTimeString()}</span>
                              </div>
                            )}
                            
                            {agent.confidence !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Confidence:</span>
                                <span className="ml-2">{Math.round(agent.confidence * 100)}%</span>
                              </div>
                            )}
                            
                            {agent.estimatedDuration && (
                              <div>
                                <span className="text-muted-foreground">Est. Duration:</span>
                                <span className="ml-2">{Math.round(agent.estimatedDuration / 1000)}s</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Processing Message */}
          {isProcessing && agentsProgress.length === 0 && (
            <div className="flex items-center justify-center p-8 text-center">
              <div className="space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Initializing research agents...
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}