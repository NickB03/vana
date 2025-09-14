import * as React from 'react';
import { cn } from '@/lib/utils';
import { AgentBadge, getAgentBadgeStatus } from './agent-badge';
import { ProgressDot, getProgressDotVariant } from './progress-dot';

export interface QueueAgent {
  id: string;
  type: string;
  status: string;
  progress?: number;
  current_task?: string;
  error?: string;
}

export interface AgentQueueProps extends React.HTMLAttributes<HTMLDivElement> {
  agents: QueueAgent[];
  layout?: 'horizontal' | 'vertical' | 'compact';
  showProgress?: boolean;
  showLabels?: boolean;
  animate?: boolean;
  maxVisible?: number;
  onAgentClick?: (agent: QueueAgent) => void;
}

export function AgentQueue({
  className,
  agents = [],
  layout = 'horizontal',
  showProgress = true,
  showLabels = true,
  animate = true,
  maxVisible,
  onAgentClick,
  ...props
}: AgentQueueProps) {
  const visibleAgents = maxVisible ? agents.slice(0, maxVisible) : agents;
  const hiddenCount = maxVisible && agents.length > maxVisible ? agents.length - maxVisible : 0;
  
  const renderAgent = (agent: QueueAgent, index: number) => {
    const isClickable = !!onAgentClick;
    const badgeStatus = getAgentBadgeStatus(agent.status);
    const progressVariant = getProgressDotVariant(agent.status, agent.progress || 0);
    
    return (
      <div
        key={agent.id}
        className={cn(
          'flex items-center gap-2 transition-all duration-200',
          layout === 'vertical' && 'flex-col text-center',
          layout === 'compact' && 'gap-1',
          isClickable && 'cursor-pointer hover:scale-105',
          animate && 'animate-in fade-in slide-in-from-left-2',
          animate && `duration-${300 + index * 100}`
        )}
        onClick={() => onAgentClick?.(agent)}
        title={agent.current_task || agent.error || `${agent.type} - ${agent.status}`}
      >
        {showProgress && (
          <ProgressDot
            variant={progressVariant}
            progress={agent.progress}
            size={layout === 'compact' ? 'sm' : 'default'}
            animate={animate}
            pulse={agent.status === 'running' || agent.status === 'current'}
          />
        )}
        
        {showLabels && (
          <AgentBadge
            status={badgeStatus}
            agentType={agent.type}
            size={layout === 'compact' ? 'sm' : 'default'}
            pulse={agent.status === 'running' || agent.status === 'current'}
          />
        )}
        
        {/* Connection line to next agent (horizontal layout only) */}
        {layout === 'horizontal' && index < visibleAgents.length - 1 && (
          <div
            className={cn(
              'flex-1 h-px bg-border min-w-4 max-w-8',
              agent.status === 'completed' && 'bg-green-300',
              agent.status === 'current' && 'bg-blue-300',
              animate && 'transition-colors duration-300'
            )}
          />
        )}
      </div>
    );
  };
  
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        layout === 'vertical' && 'flex-col items-start gap-3',
        layout === 'compact' && 'gap-1',
        className
      )}
      {...props}
    >
      {/* Agent pipeline */}
      <div
        className={cn(
          'flex items-center gap-2',
          layout === 'vertical' && 'flex-col items-start gap-3',
          layout === 'compact' && 'gap-1'
        )}
      >
        {visibleAgents.map(renderAgent)}
        
        {/* Hidden count indicator */}
        {hiddenCount > 0 && (
          <div className={cn(
            'text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md',
            layout === 'compact' && 'text-[10px] px-1 py-0.5'
          )}>
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
}

// Utility component for queue statistics
export interface QueueStatsProps extends React.HTMLAttributes<HTMLDivElement> {
  agents: QueueAgent[];
  showCounts?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export function QueueStats({
  className,
  agents = [],
  showCounts = true,
  layout = 'horizontal',
  ...props
}: QueueStatsProps) {
  const stats = React.useMemo(() => {
    const total = agents.length;
    const completed = agents.filter(a => a.status === 'completed' || a.status === 'done').length;
    const active = agents.filter(a => a.status === 'running' || a.status === 'current').length;
    const waiting = agents.filter(a => a.status === 'waiting' || a.status === 'pending').length;
    const failed = agents.filter(a => a.status === 'failed' || a.status === 'error').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, active, waiting, failed, progress };
  }, [agents]);
  
  return (
    <div
      className={cn(
        'flex items-center gap-3 text-sm text-muted-foreground',
        layout === 'vertical' && 'flex-col items-start gap-1',
        className
      )}
      {...props}
    >
      {showCounts && (
        <>
          <span className="font-medium">{stats.progress}% Complete</span>
          <span className="text-xs">({stats.completed}/{stats.total})</span>
          
          {stats.active > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              {stats.active} Active
            </span>
          )}
          
          {stats.failed > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {stats.failed} Failed
            </span>
          )}
        </>
      )}
    </div>
  );
}

// Utility function to sort agents in queue order
export function sortAgentsForQueue(agents: QueueAgent[]): QueueAgent[] {
  const statusOrder: Record<string, number> = {
    completed: 0,
    done: 0,
    current: 1,
    running: 1,
    active: 1,
    waiting: 2,
    pending: 2,
    failed: 3,
    error: 3,
  };
  
  return [...agents].sort((a, b) => {
    const aOrder = statusOrder[a.status] ?? 4;
    const bOrder = statusOrder[b.status] ?? 4;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Secondary sort by agent type for consistency
    return a.type.localeCompare(b.type);
  });
}

export default AgentQueue;
