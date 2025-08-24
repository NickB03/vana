/**
 * Session Indicator Component
 * Shows session status and time remaining
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SessionIndicatorProps {
  className?: string;
  showTimeRemaining?: boolean;
  showRefreshStatus?: boolean;
  variant?: 'badge' | 'progress' | 'minimal';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide?: boolean;
}

export function SessionIndicator({
  className,
  showTimeRemaining = true,
  showRefreshStatus = false,
  variant = 'badge',
  position = 'bottom-right',
  autoHide = true
}: SessionIndicatorProps) {
  const { isAuthenticated, user } = useAuth();
  const { nextRefresh, isRefreshing, lastRefresh } = useTokenRefresh();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [sessionProgress, setSessionProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(!autoHide);

  useEffect(() => {
    if (!isAuthenticated || !nextRefresh) return;

    const updateTimeRemaining = () => {
      const now = Date.now();
      const refreshTime = nextRefresh.getTime();
      const timeDiff = refreshTime - now;

      if (timeDiff <= 0) {
        setTimeRemaining('Refreshing...');
        setSessionProgress(0);
      } else {
        // Calculate progress (assuming 55 minute session, refresh at 30 min)
        const totalTime = 55 * 60 * 1000; // 55 minutes
        const elapsed = totalTime - timeDiff;
        const progress = Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
        
        setSessionProgress(100 - progress);
        
        // Format time remaining
        if (timeDiff < 60000) {
          setTimeRemaining(`${Math.floor(timeDiff / 1000)}s`);
        } else if (timeDiff < 3600000) {
          setTimeRemaining(`${Math.floor(timeDiff / 60000)}m`);
        } else {
          setTimeRemaining(formatDistanceToNow(refreshTime, { addSuffix: false }));
        }
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, nextRefresh]);

  useEffect(() => {
    if (autoHide && isAuthenticated) {
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, isAuthenticated]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const getStatusColor = () => {
    if (isRefreshing) return 'bg-blue-500';
    if (sessionProgress > 50) return 'bg-green-500';
    if (sessionProgress > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isRefreshing) return 'Refreshing';
    if (sessionProgress > 50) return 'Active';
    if (sessionProgress > 20) return 'Expiring Soon';
    return 'Expired';
  };

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'fixed z-50',
          positionClasses[position],
          'transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          className
        )}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => autoHide && setIsVisible(false)}
      >
        <div className={cn('h-2 w-2 rounded-full', getStatusColor(), {
          'animate-pulse': isRefreshing
        })} />
      </div>
    );
  }

  if (variant === 'progress') {
    return (
      <div
        className={cn(
          'fixed z-50 w-64 p-4 bg-background border rounded-lg shadow-lg',
          positionClasses[position],
          'transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          className
        )}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => autoHide && setIsVisible(false)}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Session Status</span>
            <span className="text-muted-foreground">{getStatusText()}</span>
          </div>
          <Progress value={sessionProgress} className="h-2" />
          {showTimeRemaining && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Time remaining</span>
              <span>{timeRemaining}</span>
            </div>
          )}
          {showRefreshStatus && lastRefresh && (
            <div className="text-xs text-muted-foreground">
              Last refresh: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default badge variant
  return (
    <div
      className={cn(
        'fixed z-50',
        positionClasses[position],
        'transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => autoHide && setIsVisible(false)}
    >
      <Badge
        variant={sessionProgress > 50 ? 'default' : sessionProgress > 20 ? 'secondary' : 'destructive'}
        className={cn({
          'animate-pulse': isRefreshing
        })}
      >
        <div className="flex items-center space-x-2">
          <div className={cn('h-2 w-2 rounded-full', getStatusColor())} />
          <span>{getStatusText()}</span>
          {showTimeRemaining && timeRemaining && (
            <>
              <span className="text-xs">•</span>
              <span className="text-xs">{timeRemaining}</span>
            </>
          )}
        </div>
      </Badge>
    </div>
  );
}