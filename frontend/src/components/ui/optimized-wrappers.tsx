/**
 * Optimized UI Component Wrappers
 * Pre-memoized versions of common UI components that render arrays or complex data
 */

'use client'

import React, { useMemo } from 'react';
import { memoWithTracking, useStableArray } from '@/lib/react-performance';
import { cn } from '@/lib/utils';

// Badge component optimized for array rendering
export interface OptimizedBadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const OptimizedBadge = memoWithTracking(({ 
  variant = 'default', 
  className, 
  children, 
  onClick 
}: OptimizedBadgeProps) => {
  const badgeClasses = useMemo(() => {
    const baseClasses = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
    const variantClasses = {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      outline: 'text-foreground',
    };
    
    return cn(baseClasses, variantClasses[variant], className);
  }, [variant, className]);

  if (onClick) {
    return (
      <button onClick={onClick} className={badgeClasses}>
        {children}
      </button>
    );
  }

  return (
    <div className={badgeClasses}>
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.variant === nextProps.variant &&
         prevProps.className === nextProps.className &&
         prevProps.children === nextProps.children &&
         prevProps.onClick === nextProps.onClick;
}, 'OptimizedBadge');

// List component for rendering arrays efficiently
export interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  isLoading?: boolean;
}

function OptimizedListBase<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  emptyComponent,
  loadingComponent,
  isLoading = false
}: OptimizedListProps<T>) {
  const stableItems = useStableArray(items);

  const memoizedItems = useMemo(() => {
    return stableItems.map((item, index) => {
      const key = keyExtractor(item, index);
      return (
        <React.Fragment key={key}>
          {renderItem(item, index)}
        </React.Fragment>
      );
    });
  }, [stableItems, renderItem, keyExtractor]);

  if (isLoading && loadingComponent) {
    return <div className={className}>{loadingComponent}</div>;
  }

  if (stableItems.length === 0 && emptyComponent) {
    return <div className={className}>{emptyComponent}</div>;
  }

  return (
    <div className={className}>
      {memoizedItems}
    </div>
  );
}

// Memoized List component
export const MemoizedOptimizedList = memoWithTracking(OptimizedListBase, (prevProps, nextProps) => {
  return prevProps.items.length === nextProps.items.length &&
         prevProps.renderItem === nextProps.renderItem &&
         prevProps.keyExtractor === nextProps.keyExtractor &&
         prevProps.className === nextProps.className &&
         prevProps.isLoading === nextProps.isLoading;
}, 'OptimizedList') as typeof OptimizedListBase;

// Progress component optimized for frequent updates
export interface OptimizedProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  showPercentage?: boolean;
}

export const OptimizedProgress = memoWithTracking(({
  value,
  max = 100,
  className,
  indicatorClassName,
  showPercentage = false
}: OptimizedProgressProps) => {
  const percentage = useMemo(() => {
    const clampedValue = Math.max(0, Math.min(value, max));
    return (clampedValue / max) * 100;
  }, [value, max]);

  const progressStyles = useMemo(() => ({
    transform: `translateX(-${100 - percentage}%)`
  }), [percentage]);

  return (
    <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        style={progressStyles}
      />
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return Math.round(prevProps.value) === Math.round(nextProps.value) &&
         prevProps.max === nextProps.max &&
         prevProps.className === nextProps.className &&
         prevProps.indicatorClassName === nextProps.indicatorClassName &&
         prevProps.showPercentage === nextProps.showPercentage;
}, 'OptimizedProgress');

// Avatar component optimized for lists
export interface OptimizedAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const OptimizedAvatar = memoWithTracking(({
  src,
  alt,
  fallback,
  className,
  size = 'md'
}: OptimizedAvatarProps) => {
  const sizeClasses = useMemo(() => {
    const sizes = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-10 w-10'
    };
    return sizes[size];
  }, [size]);

  const avatarClasses = useMemo(() => 
    cn('relative flex shrink-0 overflow-hidden rounded-full', sizeClasses, className),
    [sizeClasses, className]
  );

  return (
    <div className={avatarClasses}>
      {src ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          {fallback || alt?.charAt(0)?.toUpperCase() || '?'}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.src === nextProps.src &&
         prevProps.alt === nextProps.alt &&
         prevProps.fallback === nextProps.fallback &&
         prevProps.className === nextProps.className &&
         prevProps.size === nextProps.size;
}, 'OptimizedAvatar');

// Card component optimized for array rendering
export interface OptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const OptimizedCard = memoWithTracking(({
  children,
  className,
  onClick,
  hover = false
}: OptimizedCardProps) => {
  const cardClasses = useMemo(() => {
    const baseClasses = 'rounded-lg border bg-card text-card-foreground shadow-sm';
    const interactiveClasses = onClick ? 'cursor-pointer' : '';
    const hoverClasses = hover ? 'transition-shadow hover:shadow-md' : '';
    
    return cn(baseClasses, interactiveClasses, hoverClasses, className);
  }, [className, onClick, hover]);

  if (onClick) {
    return (
      <button onClick={onClick} className={cardClasses}>
        {children}
      </button>
    );
  }

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children &&
         prevProps.className === nextProps.className &&
         prevProps.onClick === nextProps.onClick &&
         prevProps.hover === nextProps.hover;
}, 'OptimizedCard');

// Table row component optimized for large datasets
export interface OptimizedTableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export const OptimizedTableRow = memoWithTracking(({
  children,
  className,
  onClick,
  selected = false
}: OptimizedTableRowProps) => {
  const rowClasses = useMemo(() => {
    const baseClasses = 'border-b transition-colors';
    const interactiveClasses = onClick ? 'cursor-pointer hover:bg-muted/50' : '';
    const selectedClasses = selected ? 'bg-muted' : '';
    
    return cn(baseClasses, interactiveClasses, selectedClasses, className);
  }, [className, onClick, selected]);

  return (
    <tr onClick={onClick} className={rowClasses}>
      {children}
    </tr>
  );
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children &&
         prevProps.className === nextProps.className &&
         prevProps.onClick === nextProps.onClick &&
         prevProps.selected === nextProps.selected;
}, 'OptimizedTableRow');

// Export all optimized components
export {
  MemoizedOptimizedList as OptimizedList
};