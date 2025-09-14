import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const progressDotVariants = cva(
  'relative inline-flex items-center justify-center rounded-full font-medium text-xs',
  {
    variants: {
      variant: {
        default: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        active: 'bg-blue-500 text-white',
        completed: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        waiting: 'bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-400',
      },
      size: {
        sm: 'w-6 h-6 text-[10px]',
        default: 'w-8 h-8 text-xs',
        lg: 'w-10 h-10 text-sm',
        xl: 'w-12 h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ProgressDotProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressDotVariants> {
  progress?: number;
  showProgress?: boolean;
  pulse?: boolean;
  animate?: boolean;
}

export function ProgressDot({
  className,
  progress = 0,
  showProgress = true,
  pulse = false,
  animate = false,
  variant,
  size,
  ...props
}: ProgressDotProps) {
  const displayProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDasharray = `${(displayProgress / 100) * 251.2} 251.2`; // 2π * 40 = 251.2
  
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      {...props}
    >
      {/* Background circle with progress ring */}
      {showProgress && progress > 0 && (
        <svg
          className={cn(
            'absolute inset-0',
            size === 'sm' && 'w-6 h-6',
            size === 'default' && 'w-8 h-8',
            size === 'lg' && 'w-10 h-10',
            size === 'xl' && 'w-12 h-12',
            animate && 'transition-all duration-500 ease-in-out'
          )}
          viewBox="0 0 88 88"
        >
          {/* Background ring */}
          <circle
            cx="44"
            cy="44"
            r="40"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Progress ring */}
          <circle
            cx="44"
            cy="44"
            r="40"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
            className={cn(
              'transition-all duration-500 ease-in-out',
              variant === 'active' && 'text-blue-500',
              variant === 'completed' && 'text-green-500',
              variant === 'error' && 'text-red-500',
              variant === 'waiting' && 'text-slate-400',
              !variant && 'text-blue-500'
            )}
          />
        </svg>
      )}
      
      {/* Main dot */}
      <div
        className={cn(
          progressDotVariants({ variant, size }),
          pulse && 'animate-pulse',
          'z-10'
        )}
      >
        {showProgress && progress >= 0 ? (
          <span className="font-mono">
            {Math.round(displayProgress)}%
          </span>
        ) : (
          <span className="w-2 h-2 bg-current rounded-full" />
        )}
      </div>
    </div>
  );
}

// Utility function to determine progress dot variant based on status and progress
export function getProgressDotVariant(status: string, progress: number): VariantProps<typeof progressDotVariants>['variant'] {
  if (status === 'error' || status === 'failed') {
    return 'error';
  }
  
  if (status === 'completed' || status === 'done' || progress >= 100) {
    return 'completed';
  }
  
  if (status === 'running' || status === 'active' || status === 'current') {
    return 'active';
  }
  
  if (status === 'waiting' || status === 'pending') {
    return 'waiting';
  }
  
  return 'default';
}

export { progressDotVariants };
export default ProgressDot;
