/**
 * Auth Loading State Component
 * Shows loading states during authentication
 */

'use client';

import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface AuthLoadingStateProps {
  className?: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
}

export function AuthLoadingState({
  className,
  text = 'Authenticating...',
  size = 'md',
  variant = 'spinner'
}: AuthLoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      {variant === 'spinner' && (
        <Icons.spinner className={cn('animate-spin', sizeClasses[size])} />
      )}
      {variant === 'dots' && (
        <div className="flex space-x-1">
          <div className={cn('animate-bounce rounded-full bg-current', sizeClasses[size], 'animation-delay-0')} />
          <div className={cn('animate-bounce rounded-full bg-current', sizeClasses[size], 'animation-delay-200')} />
          <div className={cn('animate-bounce rounded-full bg-current', sizeClasses[size], 'animation-delay-400')} />
        </div>
      )}
      {variant === 'pulse' && (
        <div className={cn('animate-pulse rounded-full bg-current', sizeClasses[size])} />
      )}
      {text && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Full Page Auth Loading Component
 */
export function AuthPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <AuthLoadingState size="lg" variant="spinner" />
        <p className="text-muted-foreground">
          Checking authentication status...
        </p>
      </div>
    </div>
  );
}

/**
 * Auth Skeleton Component for placeholders
 */
interface AuthSkeletonProps {
  className?: string;
  type?: 'avatar' | 'button' | 'card';
}

export function AuthSkeleton({ className, type = 'avatar' }: AuthSkeletonProps) {
  if (type === 'avatar') {
    return (
      <div className={cn('h-10 w-10 animate-pulse rounded-full bg-muted', className)} />
    );
  }

  if (type === 'button') {
    return (
      <div className={cn('h-10 w-32 animate-pulse rounded-md bg-muted', className)} />
    );
  }

  if (type === 'card') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return null;
}