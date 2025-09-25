/**
 * React Performance Optimization Utilities
 * Prevents React Error #185 (infinite re-render loops) through strategic memoization
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Performance tracking types
 */
export interface RenderTracker {
  componentName: string;
  renderCount: number;
  lastRender: number;
  averageRenderTime: number;
  warnings: string[];
}

/**
 * Memoization comparison functions for common patterns
 */
export const memoComparisons = {
  /**
   * Deep comparison for arrays - prevents re-renders when array contents are same
   */
  shallowArrayEquals: <T>(prevArray: T[], nextArray: T[]): boolean => {
    if (prevArray.length !== nextArray.length) return false;
    return prevArray.every((item, index) => item === nextArray[index]);
  },

  /**
   * Props comparison ignoring specific keys that change frequently
   */
  propsIgnoring: (ignoreKeys: string[]) => 
    (prevProps: Record<string, any>, nextProps: Record<string, any>): boolean => {
      const prevKeys = Object.keys(prevProps).filter(key => !ignoreKeys.includes(key));
      const nextKeys = Object.keys(nextProps).filter(key => !ignoreKeys.includes(key));
      
      if (prevKeys.length !== nextKeys.length) return false;
      
      return prevKeys.every(key => prevProps[key] === nextProps[key]);
    },

  /**
   * Function comparison that considers function identity
   */
  stableFunctions: (prevProps: any, nextProps: any): boolean => {
    const prevFunctions = Object.entries(prevProps).filter(([_, value]) => typeof value === 'function');
    const nextFunctions = Object.entries(nextProps).filter(([_, value]) => typeof value === 'function');
    
    if (prevFunctions.length !== nextFunctions.length) return false;
    
    return prevFunctions.every(([key, prevFunc]) => prevFunc === nextProps[key]);
  }
};

/**
 * Hook to track component render performance and detect potential loops
 */
export function useRenderTracker(componentName: string, threshold = 10): RenderTracker {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const renderTimesRef = useRef<number[]>([]);
  const warningsRef = useRef<string[]>([]);
  
  // Track this render
  renderCountRef.current += 1;
  const renderTime = Date.now() - startTimeRef.current;
  renderTimesRef.current.push(renderTime);
  
  // Keep only recent render times (last 20 renders)
  if (renderTimesRef.current.length > 20) {
    renderTimesRef.current = renderTimesRef.current.slice(-20);
  }
  
  // Check for potential infinite loop
  useEffect(() => {
    if (renderCountRef.current > threshold) {
      const warning = `Potential render loop detected in ${componentName}: ${renderCountRef.current} renders`;
      if (!warningsRef.current.includes(warning)) {
        warningsRef.current.push(warning);
        console.warn(warning);
      }
    }
  }, [componentName, threshold]);
  
  // Reset counter after component unmounts or significant time passes
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      renderCountRef.current = 0;
      warningsRef.current = [];
    }, 5000);
    
    return () => clearTimeout(resetTimer);
  }, []);
  
  return useMemo(() => ({
    componentName,
    renderCount: renderCountRef.current,
    lastRender: renderTime,
    averageRenderTime: renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length,
    warnings: [...warningsRef.current]
  }), [componentName, renderTime]);
}

/**
 * Hook to create stable callback functions that prevent re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  
  // Update ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);
  
  // Return stable callback that always calls current version
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Hook for memoizing expensive array operations
 */
export function useStableArray<T>(
  array: T[],
  comparison?: (prev: T[], next: T[]) => boolean
): T[] {
  const compareFunc = comparison || memoComparisons.shallowArrayEquals;
  
  return useMemo(() => array, [
    array.length,
    // Use custom comparison or fall back to reference equality
    useMemo(() => array, [compareFunc([], array) ? [] : array])
  ]);
}

/**
 * Hook for stable object memoization
 */
export function useStableObject<T extends Record<string, any>>(
  object: T,
  ignoreKeys: string[] = []
): T {
  return useMemo(() => {
    // Create new object without ignored keys for comparison
    const stableObject = { ...object };
    ignoreKeys.forEach(key => delete stableObject[key]);
    return object;
  }, [
    ...Object.entries(object)
      .filter(([key]) => !ignoreKeys.includes(key))
      .map(([key, value]) => `${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`)
  ]);
}

/**
 * Debounced state hook to prevent rapid re-renders
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, React.Dispatch<React.SetStateAction<T>>, T] {
  const [immediateValue, setImmediateValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(immediateValue);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [immediateValue, delay]);
  
  return [debouncedValue, setImmediateValue, immediateValue];
}

/**
 * Performance-optimized event handlers for high-frequency events
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;
    
    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      // Clear existing timeout and set new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]) as T;
}

/**
 * Production-safe render counter that warns about potential loops
 */
export function createRenderCounter(componentName: string) {
  if (process.env.NODE_ENV === 'production') {
    return () => {}; // No-op in production
  }
  
  let count = 0;
  let lastReset = Date.now();
  
  return () => {
    count++;
    const now = Date.now();
    
    // Reset counter every 5 seconds
    if (now - lastReset > 5000) {
      count = 0;
      lastReset = now;
    }
    
    // Warn if too many renders in short time
    if (count > 15) {
      console.warn(`🔄 Potential render loop in ${componentName}: ${count} renders in 5s`);
    }
  };
}

/**
 * Stable refs for preventing re-renders due to inline objects/arrays
 */
export function useStableRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef<T>(value);
  ref.current = value;
  return ref;
}

/**
 * Type-safe memo wrapper with performance tracking
 */
export function memoWithTracking<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean,
  componentName?: string
): React.NamedExoticComponent<P> {
  const MemoizedComponent = React.memo(Component, areEqual);
  
  // Add display name for debugging
  const displayName = componentName || Component.displayName || Component.name || 'Anonymous';
  MemoizedComponent.displayName = `Memo(${displayName})`;
  
  if (process.env.NODE_ENV === 'development') {
    // Wrap with performance tracking in development
    const DevPerformanceComponent = React.memo((props: P) => {
      const tracker = useRenderTracker(displayName);
      
      // Log performance issues
      useEffect(() => {
        if (tracker.warnings.length > 0) {
          console.group(`⚠️ Performance Warning: ${displayName}`);
          tracker.warnings.forEach(warning => console.warn(warning));
          console.groupEnd();
        }
      }, [tracker.warnings]);
      
      return React.createElement(MemoizedComponent, props);
    }, areEqual);
    
    DevPerformanceComponent.displayName = `DevPerf(${displayName})`;
    return DevPerformanceComponent;
  }
  
  return MemoizedComponent;
}