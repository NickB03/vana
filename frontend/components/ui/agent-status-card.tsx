/**
 * Enhanced Agent Status Card Component
 * 
 * Individual agent status card with real-time progress indicators, task display,
 * and connection health monitoring for the unified chat interface.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle, Loader2, Activity, Zap, X } from "lucide-react";
import { AgentStatus } from "@/lib/research-sse-service";
import { cn } from "@/lib/utils";
import { memo } from "react";

// ============================================================================
// Type Definitions
// ============================================================================

interface AgentStatusCardProps {
  agent: AgentStatus;
  isActive?: boolean;
  isConnected?: boolean;
  streamingStatus?: 'idle' | 'active' | 'error' | 'disconnected';
  compact?: boolean;
  showConnectionHealth?: boolean;
  onDismiss?: () => void;
  className?: string;
}

// ============================================================================
// Configuration and Styling
// ============================================================================

const getAgentStatusConfig = (status: AgentStatus['status']) => {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        progressColor: 'bg-green-500',
        label: 'Completed',
      };
    case 'current':
      return {
        icon: Loader2,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        progressColor: 'bg-blue-500',
        label: 'Active',
        animate: 'animate-spin',
      };
    case 'error':
      return {
        icon: AlertCircle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        progressColor: 'bg-red-500',
        label: 'Error',
      };
    case 'waiting':
    default:
      return {
        icon: Clock,
        iconColor: 'text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-800/20',
        borderColor: 'border-gray-200 dark:border-gray-700',
        badgeColor: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
        progressColor: 'bg-gray-400',
        label: 'Waiting',
      };
  }
};

const getStreamingStatusConfig = (status: AgentStatusCardProps['streamingStatus']) => {
  switch (status) {
    case 'active':
      return {
        icon: Activity,
        color: 'text-green-500',
        label: 'Streaming',
        animate: 'animate-pulse',
      };
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-red-500',
        label: 'Stream Error',
      };
    case 'disconnected':
      return {
        icon: X,
        color: 'text-gray-500',
        label: 'Disconnected',
      };
    case 'idle':
    default:
      return {
        icon: Zap,
        color: 'text-gray-400',
        label: 'Ready',
      };
  }
};

const getAgentTypeIcon = (agentType: string): string => {
  const icons: Record<string, string> = {
    'team_leader': '👑',
    'plan_generator': '📋',
    'section_planner': '🗂️',
    'researcher': '🔍',
    'evaluator': '⚖️',
    'report_writer': '📝',
    'coordinator': '🎯',
    'analyst': '📊',
    'optimizer': '⚡',
  };
  return icons[agentType] || '🤖';
};

// ============================================================================
// Main Agent Status Card Component
// ============================================================================

export const AgentStatusCard = memo(function AgentStatusCard({
  agent,
  isActive = false,
  isConnected = true,
  streamingStatus = 'idle',
  compact = false,
  showConnectionHealth = false,
  onDismiss,
  className,
}: AgentStatusCardProps) {
  const statusConfig = getAgentStatusConfig(agent.status);
  const streamingConfig = getStreamingStatusConfig(streamingStatus);
  const StatusIcon = statusConfig.icon;
  const StreamIcon = streamingConfig.icon;
  const typeIcon = getAgentTypeIcon(agent.agent_type);

  const progressPercentage = Math.round(agent.progress * 100);
  const hasError = agent.status === 'error' || agent.error;

  return (
    <Card
      className={cn(
        // Use custom CSS classes for better performance
        'agent-status-card fade-in-up',
        // Base responsive behavior
        'w-full min-w-0 max-w-full border',
        // Status-based styling
        statusConfig.bgColor,
        statusConfig.borderColor,
        // Active state
        isActive && 'active ring-2 ring-blue-500/50',
        // Connection state
        !isConnected && 'opacity-60 grayscale',
        // Compact sizing
        compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4',
        className
      )}
      role="status"
      aria-label={`Agent ${agent.name} - ${statusConfig.label} - ${progressPercentage}% complete`}
    >
      <CardHeader className={cn(
        'pb-2 sm:pb-3 space-y-1', 
        compact && 'pb-1 sm:pb-2'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg flex-shrink-0">{typeIcon}</span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <CardTitle className={cn(
                'font-medium truncate leading-tight',
                compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
              )}>
                {agent.name}
              </CardTitle>
              <p className={cn(
                'text-gray-500 dark:text-gray-400 capitalize truncate',
                compact ? 'text-2xs' : 'text-xs'
              )}>
                {agent.agent_type.replace('_', ' ')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Connection Health Indicator */}
            {showConnectionHealth && (
              <div className="flex items-center gap-1">
                <StreamIcon
                  className={cn(
                    'h-3 w-3',
                    streamingConfig.color,
                    streamingConfig.animate && streamingConfig.animate
                  )}
                  // Title attribute removed - not supported by Lucide icons
                />
              </div>
            )}
            
            {/* Status Icon */}
            <StatusIcon
              className={cn(
                'h-4 w-4',
                statusConfig.iconColor,
                statusConfig.animate && statusConfig.animate
              )}
            />
            
            {/* Status Badge */}
            <Badge
              className={cn(
                'text-xs font-medium',
                statusConfig.badgeColor
              )}
            >
              {statusConfig.label}
            </Badge>
            
            {/* Dismiss Button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={`Dismiss ${agent.name} status card`}
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={cn(
        'space-y-2 sm:space-y-3', 
        compact && 'space-y-1 sm:space-y-2'
      )}>
        {/* Progress Section */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
            <span>Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="relative">
            <Progress
              value={agent.progress * 100}
              className={cn('h-2', compact && 'h-1.5')}
              aria-label={`${agent.name} progress: ${progressPercentage}%`}
            />
            {agent.status === 'current' && (
              <div 
                className="absolute top-0 left-0 h-full bg-blue-400 rounded-full animate-pulse opacity-50"
                style={{ width: `${progressPercentage}%` }}
              />
            )}
          </div>
        </div>
        
        {/* Current Task */}
        {agent.current_task && !compact && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Current Task
            </div>
            <div className="text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800/50 p-2 rounded border text-wrap break-words">
              {agent.current_task}
            </div>
          </div>
        )}
        
        {/* Compact Task Display */}
        {agent.current_task && compact && (
          <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={agent.current_task}>
            {agent.current_task}
          </div>
        )}
        
        {/* Error Display */}
        {hasError && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-red-600 dark:text-red-400">
              Error Details
            </div>
            <div className="text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800 text-wrap break-words">
              {agent.error || 'An error occurred during processing'}
            </div>
          </div>
        )}
        
        {/* Connection Status Footer */}
        {showConnectionHealth && !compact && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <StreamIcon className={cn('h-3 w-3', streamingConfig.color)} />
              <span>{streamingConfig.label}</span>
            </div>
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Compact Agent Status Mini Card
// ============================================================================

interface AgentStatusMiniCardProps {
  agent: AgentStatus;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AgentStatusMiniCard = memo(function AgentStatusMiniCard({
  agent,
  isActive = false,
  onClick,
  className,
}: AgentStatusMiniCardProps) {
  const statusConfig = getAgentStatusConfig(agent.status);
  const StatusIcon = statusConfig.icon;
  const typeIcon = getAgentTypeIcon(agent.agent_type);
  const progressPercentage = Math.round(agent.progress * 100);

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
        statusConfig.bgColor,
        statusConfig.borderColor,
        isActive && 'ring-1 ring-blue-500/50',
        onClick && 'hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${agent.name} - ${statusConfig.label} - ${progressPercentage}%`}
    >
      <span className="text-sm">{typeIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{agent.name}</div>
        <div className="flex items-center gap-2">
          <Progress value={agent.progress * 100} className="h-1 flex-1" />
          <span className="text-xs text-gray-600">{progressPercentage}%</span>
        </div>
      </div>
      <StatusIcon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          statusConfig.iconColor,
          statusConfig.animate && statusConfig.animate
        )}
      />
    </div>
  );
});

export default AgentStatusCard;