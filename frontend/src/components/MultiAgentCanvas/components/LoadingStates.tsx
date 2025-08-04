/**
 * Loading States and Skeleton Components for Multi-Agent Canvas
 * Provides smooth loading animations and transitions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Network, Activity, Eye, Terminal } from 'lucide-react';
import '../styles/panel-enhancements.css';

interface LoadingSkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export function LoadingSkeleton({ className, height = 'h-4', width = 'w-full' }: LoadingSkeletonProps) {
  return (
    <div className={cn('loading-skeleton', height, width, className)} />
  );
}

interface LoadingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingDots({ className, size = 'md' }: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className={cn('loading-dot', sizeClasses[size])} />
      <div className={cn('loading-dot', sizeClasses[size])} />
      <div className={cn('loading-dot', sizeClasses[size])} />
    </div>
  );
}

interface NetworkLoadingProps {
  message?: string;
}

export function NetworkLoading({ message = 'Loading network data...' }: NetworkLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center p-8"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 mb-4 rounded-full border-3 border-primary/20 border-t-primary"
      />
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium text-foreground">{message}</span>
      </div>
      <LoadingDots className="mt-2" />
    </motion.div>
  );
}

export function AgentNetworkSkeleton() {
  return (
    <div className="space-y-6 panel-content">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <LoadingSkeleton className="w-6 h-6 rounded-full" />
          <div className="space-y-2">
            <LoadingSkeleton className="w-32 h-5" />
            <LoadingSkeleton className="w-24 h-3" />
          </div>
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <LoadingSkeleton className="w-5 h-5 rounded" />
              <LoadingSkeleton className="w-12 h-4 rounded-full" />
            </div>
            <LoadingSkeleton className="w-16 h-8 mb-2" />
            <LoadingSkeleton className="w-20 h-3" />
          </div>
        ))}
      </div>

      {/* Activity Skeleton */}
      <div className="activity-feed">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="activity-item">
            <div className="flex items-start gap-3">
              <LoadingSkeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <LoadingSkeleton className="w-24 h-4" />
                <LoadingSkeleton className="w-32 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InspectorSkeleton() {
  return (
    <div className="space-y-6 panel-content">
      {/* Agent Header Skeleton */}
      <div className="metric-card">
        <div className="flex items-center gap-3 mb-4">
          <LoadingSkeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <LoadingSkeleton className="w-32 h-5" />
            <LoadingSkeleton className="w-16 h-4 rounded-full" />
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <LoadingSkeleton className="w-4 h-4 rounded" />
                <LoadingSkeleton className="w-16 h-4" />
              </div>
              <LoadingSkeleton className="w-12 h-6 mb-2" />
              <LoadingSkeleton className="w-20 h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Tools Section Skeleton */}
      <div className="metric-card">
        <div className="flex items-center gap-2 mb-4">
          <LoadingSkeleton className="w-5 h-5 rounded" />
          <LoadingSkeleton className="w-24 h-5" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-8 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

interface PanelTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}

export function PanelTransition({ 
  children, 
  isVisible, 
  direction = 'up',
  delay = 0 
}: PanelTransitionProps) {
  const variants = {
    up: { y: 20, opacity: 0 },
    down: { y: -20, opacity: 0 },
    left: { x: 20, opacity: 0 },
    right: { x: -20, opacity: 0 }
  };

  return (
    <motion.div
      initial={variants[direction]}
      animate={isVisible ? { x: 0, y: 0, opacity: 1 } : variants[direction]}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.25, 0.1, 0.25, 1] 
      }}
    >
      {children}
    </motion.div>
  );
}

interface StatusIndicatorProps {
  status: 'active' | 'idle' | 'processing' | 'error';
  label?: string;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ 
  status, 
  label, 
  showPulse = true, 
  size = 'md' 
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  return (
    <div className={cn("status-indicator", status)}>
      <div className={cn(
        "rounded-full bg-current",
        sizeClasses[size],
        showPulse && status === 'active' && "animate-pulse"
      )} />
      {label && <span className="ml-1">{label}</span>}
    </div>
  );
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 1000, className }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(startValue + difference * easeOutCubic);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, displayValue]);

  return <span className={className}>{displayValue}</span>;
}

interface MetricCardLoadingProps {
  title?: string;
  showIcon?: boolean;
}

export function MetricCardLoading({ title, showIcon = true }: MetricCardLoadingProps) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-2">
        {showIcon && <LoadingSkeleton className="w-5 h-5 rounded" />}
        {title ? (
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        ) : (
          <LoadingSkeleton className="w-16 h-4" />
        )}
      </div>
      <LoadingSkeleton className="w-12 h-8 mb-2" />
      <LoadingSkeleton className="w-20 h-3" />
    </div>
  );
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("flex flex-col items-center justify-center py-12 text-center", className)}
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action}
    </motion.div>
  );
}