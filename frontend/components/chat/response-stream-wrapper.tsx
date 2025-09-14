/**
 * ResponseStream Wrapper for SSE Integration
 * 
 * Wraps the prompt-kit ResponseStream component with agent status overlay
 * and connection health indicators for research streaming.
 */

"use client";

import React, { useMemo } from 'react';
import { ResponseStream, Mode } from '@/components/ui/response-stream';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Bot, Wifi, WifiOff, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentStatus } from '@/lib/research-sse-service';
import { ResponseStreamData } from '@/lib/response-stream-adapter';

export interface ResponseStreamWrapperProps {
  responseStreamData: ResponseStreamData;
  mode?: Mode;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  showAgentOverlay?: boolean;
  showConnectionHealth?: boolean;
  error?: string | null;
}

/**
 * Agent Status Badge Component
 */
interface AgentBadgeProps {
  agent: AgentStatus;
  isActive?: boolean;
}

function AgentBadge({ agent, isActive }: AgentBadgeProps) {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'current':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'waiting':
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'current':
        return 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100';
      case 'completed':
        return 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100';
      case 'waiting':
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200',
        getStatusColor(),
        isActive && 'ring-2 ring-blue-200 dark:ring-blue-800'
      )}
      title={`${agent.name}: ${agent.current_task || agent.status}`}
    >
      {getStatusIcon()}
      <span className="truncate max-w-24">{agent.name}</span>
      {agent.status === 'current' && (
        <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-1">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${Math.round(agent.progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Connection Health Indicator Component
 */
interface ConnectionHealthProps {
  status: ResponseStreamData['metadata']['connectionHealth'];
  sessionId: string;
}

function ConnectionHealth({ status, sessionId }: ConnectionHealthProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-3 h-3 text-green-500" />,
          text: 'Connected',
          className: 'text-green-700 dark:text-green-300'
        };
      case 'connecting':
        return {
          icon: <Wifi className="w-3 h-3 animate-pulse text-blue-500" />,
          text: 'Connecting...',
          className: 'text-blue-700 dark:text-blue-300'
        };
      case 'error':
        return {
          icon: <WifiOff className="w-3 h-3 text-red-500" />,
          text: 'Connection Error',
          className: 'text-red-700 dark:text-red-300'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-3 h-3 text-gray-500" />,
          text: 'Disconnected',
          className: 'text-gray-700 dark:text-gray-300'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', config.className)}>
      {config.icon}
      <span>{config.text}</span>
      <span className="text-gray-500 dark:text-gray-400">({sessionId.slice(-6)})</span>
    </div>
  );
}

/**
 * Agent Status Overlay Component
 */
interface AgentStatusOverlayProps {
  agents: AgentStatus[];
  currentPhase: string;
  overallProgress: number;
}

function AgentStatusOverlay({ agents, currentPhase, overallProgress }: AgentStatusOverlayProps) {
  const activeAgent = agents.find(agent => agent.status === 'current');
  const completedAgents = agents.filter(agent => agent.status === 'completed');
  const errorAgents = agents.filter(agent => agent.status === 'error');

  return (
    <div className="space-y-3">
      {/* Current Phase */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {currentPhase}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {Math.round(overallProgress * 100)}%
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-orange-400 transition-all duration-500"
          style={{ width: `${Math.round(overallProgress * 100)}%` }}
        />
      </div>

      {/* Agent Badges */}
      {agents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agents.map((agent) => (
            <AgentBadge
              key={agent.agent_id}
              agent={agent}
              isActive={agent.agent_id === activeAgent?.agent_id}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span>{completedAgents.length} completed</span>
        {activeAgent && <span>1 active</span>}
        {errorAgents.length > 0 && (
          <span className="text-red-600 dark:text-red-400">{errorAgents.length} error</span>
        )}
      </div>
    </div>
  );
}

/**
 * Main ResponseStreamWrapper Component
 */
export function ResponseStreamWrapper({
  responseStreamData,
  mode = "typewriter",
  speed = 30,
  className,
  onComplete,
  showAgentOverlay = true,
  showConnectionHealth = true,
  error
}: ResponseStreamWrapperProps) {
  const { textStream, metadata } = responseStreamData;

  const hasError = !!error;
  const isStreaming = metadata.connectionHealth === 'connected' && metadata.overallProgress < 1;

  // Memoize the agent overlay to prevent unnecessary re-renders
  const agentOverlay = useMemo(() => {
    if (!showAgentOverlay || metadata.agents.length === 0) return null;

    return (
      <AgentStatusOverlay
        agents={metadata.agents}
        currentPhase={metadata.currentPhase}
        overallProgress={metadata.overallProgress}
      />
    );
  }, [showAgentOverlay, metadata.agents, metadata.currentPhase, metadata.overallProgress]);

  return (
    <div className={cn("flex gap-4 flex-row", className)} data-testid="response-stream-wrapper">
      {/* AI Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-orange-400 text-white">
          <Bot size={18} />
        </div>
      </Avatar>

      {/* Content Container */}
      <div className="flex-1 max-w-[80%] text-left space-y-3">
        {/* Agent Status Overlay (shown above the content) */}
        {agentOverlay && (
          <Card className="p-3 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            {agentOverlay}
          </Card>
        )}

        {/* Main Content Card */}
        <Card className={cn(
          'p-4 border-gray-200 dark:border-gray-800',
          hasError 
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
            : 'bg-gray-50 dark:bg-gray-900'
        )}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {hasError ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="m-0 text-red-700 dark:text-red-300 font-medium">
                    Failed to stream response
                  </p>
                  <p className="m-0 mt-1 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <ResponseStream
                  textStream={textStream}
                  mode={mode}
                  speed={speed}
                  onComplete={onComplete}
                  className="text-gray-900 dark:text-gray-100"
                />
                {isStreaming && mode === "typewriter" && (
                  <span className="absolute inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Connection Health Indicator */}
        {showConnectionHealth && (metadata.connectionHealth !== 'disconnected' || hasError) && (
          <div className="flex items-center justify-between text-xs">
            <ConnectionHealth 
              status={hasError ? 'error' : metadata.connectionHealth}
              sessionId={metadata.sessionId}
            />
            {isStreaming && (
              <div className="text-gray-500 dark:text-gray-400">
                Streaming with ResponseStream...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}