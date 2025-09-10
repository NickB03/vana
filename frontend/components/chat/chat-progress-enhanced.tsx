"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  PenTool,
  Layout,
  Search,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AgentType
} from '../../src/types/chat';
import { googleAdkAgentMapper } from '../../src/utils/agentMapper';
import { progressCalculator, ProgressContext, ResearchPhase } from '../../src/utils/progressCalculator';
import { researchSourceHandler } from '../../src/utils/sourceHandler';

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
  queryComplexity?: 'simple' | 'moderate' | 'complex' | 'expert';
  researchType?: 'factual' | 'analytical' | 'comparative' | 'comprehensive';
  startTime?: Date;
  events?: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }>;
  agents?: Array<{
    id: string;
    type: string;
    status: string;
    lastUpdate?: Date;
    data?: any;
  }>;
  sources?: Array<{
    id: string;
    url: string;
    title: string;
    relevance: number;
    credibility: number;
  }>;
}

export function EnhancedChatProgress({
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
  queryComplexity = 'moderate',
  researchType = 'comprehensive',
  startTime,
  agents = [],
  sources = [],
}: ChatProgressProps) {
  
  // State
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [localStartTime, setLocalStartTime] = useState<Date | undefined>(undefined);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Convert Google ADK agents using our sophisticated agent mapper
  const convertedAgents = useMemo(() => {
    if (!agents || agents.length === 0) return [];
    
    try {
      // Transform to mapper format
      const rawAgents = agents.map(agent => ({
        id: agent.id,
        type: agent.type,
        status: agent.status,
        lastUpdate: agent.lastUpdate,
        data: {
          currentTask: agent.data?.currentTask,
          progress: agent.data?.progress,
          confidence: agent.data?.confidence,
          startTime: agent.data?.startTime,
          endTime: agent.data?.endTime,
          estimatedDuration: agent.data?.estimatedDuration,
          processingTimeMs: agent.data?.processingTimeMs,
          tokensUsed: agent.data?.tokensUsed,
          sources: agent.data?.sources,
          errors: agent.data?.errors,
          phase: agent.data?.phase
        }
      }));

      return googleAdkAgentMapper.mapAgents(rawAgents);
    } catch (error) {
      console.error('Failed to map agents with sophisticated mapper:', error);
      
      // Fallback to basic conversion
      return agents.map(agent => ({
        id: agent.id,
        type: agent.type as AgentType,
        status: agent.status === 'started' ? 'active' as const : 
                agent.status === 'completed' ? 'completed' as const : 
                agent.status === 'progress' ? 'active' as const : 
                agent.status === 'failed' ? 'failed' as const : 'waiting' as const,
        progress: agent.data?.progress || (agent.status === 'completed' ? 100 : 
                  agent.status === 'active' || agent.status === 'progress' ? 50 : 0),
        currentTask: agent.data?.currentTask || `${agent.type.replace('_', ' ')} processing`,
        startTime: agent.lastUpdate,
        endTime: agent.data?.endTime || (agent.status === 'completed' ? agent.lastUpdate : undefined),
        confidence: agent.data?.confidence,
        estimatedDuration: agent.data?.estimatedDuration
      }));
    }
  }, [agents]);

  // Calculate sophisticated progress metrics
  const progressMetrics = useMemo(() => {
    if (convertedAgents.length === 0) {
      return {
        overallProgress: totalProgress,
        phaseProgress: 0,
        estimatedTimeRemaining: estimatedTimeRemaining || 0,
        currentPhase: currentPhase as ResearchPhase,
        bottlenecks: [],
        completionProbability: 0.5
      };
    }

    try {
      const context: ProgressContext = {
        agents: convertedAgents,
        currentPhase: currentPhase as ResearchPhase,
        startTime: startTime || localStartTime,
        estimatedTotalDuration: estimatedTimeRemaining ? (estimatedTimeRemaining + elapsedTime) : undefined,
        queryComplexity,
        researchType
      };

      const calculation = progressCalculator.calculateProgress(context);
      return {
        overallProgress: calculation.overallProgress,
        phaseProgress: calculation.phaseProgress,
        estimatedTimeRemaining: calculation.estimatedTimeRemaining,
        currentPhase: context.currentPhase,
        bottlenecks: calculation.bottlenecks,
        completionProbability: calculation.completionProbability
      };
    } catch (error) {
      console.error('Failed to calculate sophisticated progress:', error);
      return {
        overallProgress: totalProgress,
        phaseProgress: 0,
        estimatedTimeRemaining: estimatedTimeRemaining || 0,
        currentPhase: currentPhase as ResearchPhase,
        bottlenecks: [],
        completionProbability: 0.5
      };
    }
  }, [convertedAgents, currentPhase, startTime, localStartTime, estimatedTimeRemaining, elapsedTime, queryComplexity, researchType, totalProgress]);
  
  // Use converted agents if available, fallback to agentsProgress
  const displayAgents = convertedAgents.length > 0 ? convertedAgents : agentsProgress;
  
  // Calculate source statistics
  const sourceStats = useMemo(() => {
    const totalSources = sources.length;
    const highQualitySources = sources.filter(s => s.credibility > 0.8).length;
    const averageRelevance = totalSources > 0 
      ? sources.reduce((sum, s) => sum + s.relevance, 0) / totalSources 
      : 0;
    
    return { totalSources, highQualitySources, averageRelevance };
  }, [sources]);

  // Track elapsed time
  useEffect(() => {
    if (isProcessing && !localStartTime) {
      setLocalStartTime(new Date());
    }
    
    if (!isProcessing) {
      setLocalStartTime(undefined);
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const timeToUse = startTime || localStartTime;
      if (timeToUse) {
        setElapsedTime(Math.floor((new Date().getTime() - timeToUse.getTime()) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, localStartTime, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAgentIcon = (type: AgentType) => {
    const icons = {
      team_leader: Users,
      plan_generator: FileSearch,
      section_planner: Layout,
      section_researcher: Brain,
      enhanced_search: Search,
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

  const completedAgents = displayAgents.filter(a => a.status === 'completed').length;
  const activeAgents = displayAgents.filter(a => a.status === 'active').length;
  const failedAgents = displayAgents.filter(a => a.status === 'failed').length;
  const waitingAgents = displayAgents.filter(a => a.status === 'waiting').length;
  
  // Enhanced phase display
  const getPhaseDisplayName = useCallback((phase: string) => {
    const phaseNames: Record<string, string> = {
      initialization: 'Initializing',
      planning: 'Planning Research',
      research: 'Conducting Research',
      evaluation: 'Evaluating Quality',
      synthesis: 'Synthesizing Results',
      finalization: 'Finalizing Report',
      completed: 'Completed'
    };
    return phaseNames[phase] || phase.charAt(0).toUpperCase() + phase.slice(1);
  }, []);
  
  // Get bottleneck display information
  const criticalBottlenecks = progressMetrics.bottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high');

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
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {getPhaseDisplayName(currentPhase)}
              </Badge>
              {criticalBottlenecks.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalBottlenecks.length} issue{criticalBottlenecks.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isProcessing && (
            <>
              <div className="flex items-center space-x-4 text-xs text-text-secondary">
                <span>Elapsed: {formatTime(elapsedTime)}</span>
                {progressMetrics.estimatedTimeRemaining > 0 && (
                  <span>Remaining: ~{formatTime(Math.ceil(progressMetrics.estimatedTimeRemaining))}</span>
                )}
                {progressMetrics.completionProbability && (
                  <span>Success: {Math.round(progressMetrics.completionProbability * 100)}%</span>
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
              <div className="flex items-center space-x-2">
                <span className="font-medium">Overall Progress</span>
                {progressMetrics.phaseProgress > 0 && (
                  <span className="text-xs text-muted-foreground">({getPhaseDisplayName(currentPhase)}: {Math.round(progressMetrics.phaseProgress)}%)</span>
                )}
              </div>
              <span className="text-muted-foreground">{Math.round(progressMetrics.overallProgress)}%</span>
            </div>
            <div className="space-y-1">
              <Progress value={progressMetrics.overallProgress} className="h-2" />
              {progressMetrics.phaseProgress > 0 && (
                <Progress value={progressMetrics.phaseProgress} className="h-1 opacity-60" />
              )}
            </div>
          </div>

          {/* Agent Summary */}
          {displayAgents.length > 0 && (
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <div className="flex items-center space-x-4">
                <span>{completedAgents}/{displayAgents.length} agents completed</span>
                {activeAgents > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeAgents} active
                  </Badge>
                )}
                {waitingAgents > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {waitingAgents} waiting
                  </Badge>
                )}
                {failedAgents > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {failedAgents} failed
                  </Badge>
                )}
              </div>
              {sourceStats.totalSources > 0 && (
                <div className="flex items-center space-x-2">
                  <span>{sourceStats.totalSources} sources</span>
                  {sourceStats.averageRelevance > 0 && (
                    <span>({Math.round(sourceStats.averageRelevance * 100)}% avg relevance)</span>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Critical Bottlenecks */}
          {criticalBottlenecks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Issues Detected</h4>
              <div className="space-y-2">
                {criticalBottlenecks.map((bottleneck, index) => (
                  <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-2 border-red-400">
                    <div className="text-sm text-red-800 dark:text-red-200">
                      <div className="font-medium">{bottleneck.severity.toUpperCase()}: {bottleneck.description}</div>
                      <div className="mt-1 text-xs opacity-80">{bottleneck.suggestedAction}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Agents Progress */}
          {displayAgents.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-secondary">AI Agents</h4>
              
              <div className="space-y-2">
                {displayAgents.map((agent) => {
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
                                <span className="ml-2">{Math.round(agent.estimatedDuration)}s</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Show agent-specific bottlenecks */}
                          {criticalBottlenecks.filter(b => b.agentId === agent.id).map(bottleneck => (
                            <div key={`bottleneck-${bottleneck.agentId}`} className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-2 border-yellow-400">
                              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                                <div className="font-medium">{bottleneck.severity.toUpperCase()}: {bottleneck.description}</div>
                                <div className="mt-1 opacity-80">{bottleneck.suggestedAction}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Processing Message */}
          {isProcessing && displayAgents.length === 0 && (
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