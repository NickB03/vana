import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        waiting: 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
        active: 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 animate-pulse',
        done: 'border-transparent bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50',
        error: 'border-transparent bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
        current: 'border-transparent bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50',
        completed: 'border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs rounded-md',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'waiting',
      size: 'default',
    },
  }
);

type AgentStatus = 'waiting' | 'active' | 'done' | 'error' | 'current' | 'completed';

export interface AgentBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  status: AgentStatus;
  agentType?: string;
  showIcon?: boolean;
  pulse?: boolean;
}

const statusIcons: Record<AgentStatus, string> = {
  waiting: '⏳',
  active: '🔄',
  current: '▶️',
  done: '✅', 
  completed: '✅',
  error: '❌',
};

const statusLabels: Record<AgentStatus, string> = {
  waiting: 'Waiting',
  active: 'Active',
  current: 'Current', 
  done: 'Done',
  completed: 'Complete',
  error: 'Error',
};

export function AgentBadge({
  className,
  status,
  agentType,
  showIcon = true,
  pulse = false,
  size,
  ...props
}: AgentBadgeProps) {
  const variant = status;
  const label = agentType || statusLabels[status];
  const icon = showIcon ? statusIcons[status] : '';
  
  return (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        pulse && status === 'active' && 'animate-pulse',
        className
      )}
      title={`${label} - ${statusLabels[status]}`}
      {...props}
    >
      {showIcon && (
        <span className="mr-1" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
    </div>
  );
}

// Utility function to map research agent status to badge status
export function getAgentBadgeStatus(agentStatus: string): AgentStatus {
  switch (agentStatus?.toLowerCase()) {
    case 'waiting':
    case 'pending':
      return 'waiting';
    case 'running':
    case 'active':
      return 'active';
    case 'current':
      return 'current';
    case 'completed':
    case 'done':
    case 'finished':
      return 'done';
    case 'failed':
    case 'error':
      return 'error';
    default:
      return 'waiting';
  }
}

export { badgeVariants };
export default AgentBadge;
