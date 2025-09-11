/**
 * Agent Status Display Component
 * 
 * Real-time visualization of multi-agent research progress with individual
 * agent status tracking, progress indicators, and current task display.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { AgentStatus } from "@/lib/research-sse-service";
import { cn } from "@/lib/utils";

// ============================================================================
// Type Definitions
// ============================================================================

interface AgentStatusDisplayProps {
  agents: AgentStatus[];
  className?: string;
}

interface AgentCardProps {
  agent: AgentStatus;
  isActive?: boolean;
}

// ============================================================================
// Agent Status Icons and Colors
// ============================================================================

const getAgentStatusConfig = (status: AgentStatus['status']) => {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        badgeVariant: 'default' as const,
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    case 'current':
      return {
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        badgeVariant: 'default' as const,
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        animate: 'animate-spin',
      };
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        badgeVariant: 'destructive' as const,
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    case 'waiting':
    default:
      return {
        icon: Clock,
        color: 'text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-800/20',
        borderColor: 'border-gray-200 dark:border-gray-700',
        badgeVariant: 'secondary' as const,
        badgeColor: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
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
  };
  return icons[agentType] || '🤖';
};

// ============================================================================
// Individual Agent Card Component
// ============================================================================

function AgentCard({ agent, isActive = false }: AgentCardProps) {
  const config = getAgentStatusConfig(agent.status);
  const Icon = config.icon;
  const typeIcon = getAgentTypeIcon(agent.agent_type);

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-md',
        config.bgColor,
        config.borderColor,
        isActive && 'ring-2 ring-blue-500 ring-opacity-50 scale-105'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeIcon}</span>
            <CardTitle className="text-sm font-medium">
              {agent.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                'h-4 w-4',
                config.color,
                config.animate && config.animate
              )}
            />
            <Badge
              variant={config.badgeVariant}
              className={cn('text-xs', config.badgeColor)}
            >
              {agent.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Progress</span>
            <span>{Math.round(agent.progress * 100)}%</span>
          </div>
          <Progress
            value={agent.progress * 100}
            className="h-2"
          />
        </div>
        
        {/* Current Task */}
        {agent.current_task && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Current Task:
            </div>
            <div className="text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-2 rounded border">
              {agent.current_task}
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {agent.error && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-red-600 dark:text-red-400">
              Error:
            </div>
            <div className="text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
              {agent.error}
            </div>
          </div>
        )}
        
        {/* Agent Type Badge */}
        <div className="flex justify-end">
          <Badge variant="outline" className="text-xs">
            {agent.agent_type.replace('_', ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Agent Status Display Component
// ============================================================================

export function AgentStatusDisplay({ agents, className }: AgentStatusDisplayProps) {
  const activeAgent = agents.find(agent => agent.status === 'current');
  
  // Sort agents by status priority for better visual organization
  const sortedAgents = [...agents].sort((a, b) => {
    const statusPriority = { current: 0, completed: 1, error: 2, waiting: 3 };
    return statusPriority[a.status] - statusPriority[b.status];
  });
  
  if (agents.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-gray-500', className)}>
        <div className="text-center space-y-2">
          <Circle className="h-8 w-8 mx-auto opacity-50" />
          <p className="text-sm">No agents active</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Status Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {agents.slice(0, 3).map((agent, index) => (
              <div
                key={agent.agent_id}
                className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm"
                style={{ zIndex: agents.length - index }}
              >
                {getAgentTypeIcon(agent.agent_type)}
              </div>
            ))}
            {agents.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-medium">
                +{agents.length - 3}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium">Research Agents</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {agents.filter(a => a.status === 'completed').length} of {agents.length} completed
            </p>
          </div>
        </div>
        
        {activeAgent && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-gray-700 dark:text-gray-300">
              {activeAgent.name} working...
            </span>
          </div>
        )}
      </div>
      
      {/* Agent Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedAgents.map((agent) => (
          <AgentCard
            key={agent.agent_id}
            agent={agent}
            isActive={agent.status === 'current'}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Agent Status Bar (Alternative View)
// ============================================================================

interface AgentStatusBarProps {
  agents: AgentStatus[];
  className?: string;
}

export function AgentStatusBar({ agents, className }: AgentStatusBarProps) {
  const completedCount = agents.filter(a => a.status === 'completed').length;
  const errorCount = agents.filter(a => a.status === 'error').length;
  const activeCount = agents.filter(a => a.status === 'current').length;
  const waitingCount = agents.filter(a => a.status === 'waiting').length;
  
  return (
    <div className={cn('flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border', className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Agents:</span>
        <div className="flex gap-1">
          {agents.map((agent, index) => {
            const config = getAgentStatusConfig(agent.status);
            return (
              <div
                key={agent.agent_id}
                className={cn(
                  'w-3 h-3 rounded-full border',
                  config.color.replace('text-', 'bg-'),
                  agent.status === 'current' && 'animate-pulse'
                )}
                title={`${agent.name} - ${agent.status}`}
              />
            );
          })}
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs">
        {completedCount > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {completedCount} done
          </span>
        )}
        {activeCount > 0 && (
          <span className="flex items-center gap-1 text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            {activeCount} active
          </span>
        )}
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-3 w-3" />
            {errorCount} errors
          </span>
        )}
        {waitingCount > 0 && (
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3" />
            {waitingCount} waiting
          </span>
        )}
      </div>
    </div>
  );
}