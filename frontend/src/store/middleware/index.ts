'use client';

import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { immer as immerMiddleware } from 'zustand/middleware/immer';
import { devtools as devtoolsMiddleware, persist as persistMiddleware, PersistOptions, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { safeLocalStorage } from '@/lib/ssr-utils';

// Custom middleware types
type Immer<T> = (
  config: StateCreator<T, [], [], T>,
  impl: StateCreator<T, [], [], T>
) => StateCreator<T, [], [], T>;

type DevTools<T> = (
  config: StateCreator<T, [], [], T>,
  impl: StateCreator<T, [], [], T>
) => StateCreator<T, [], [], T>;

type Persist<T> = (
  config: StateCreator<T, [], [], T>,
  options: PersistOptions<T>
) => StateCreator<T, [], [], T>;

// Performance monitoring middleware
export const performanceMiddleware = <T>(
  config: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, api) => {
  const originalSet = set;
  
  const wrappedSet: typeof set = (...args) => {
    const startTime = performance.now();
    
    const result = originalSet(...args);
    
    const duration = performance.now() - startTime;
    
    // Log performance warnings for slow updates
    if (duration > 50) {
      console.warn(`Store update took ${duration.toFixed(2)}ms - exceeds 50ms performance target`);
    }
    
    // Track metrics in development
    if (process.env.NODE_ENV === 'development') {
      (window as any).__VANA_STORE_METRICS = {
        ...((window as any).__VANA_STORE_METRICS || {}),
        lastUpdate: {
          timestamp: Date.now(),
          duration,
          args: args[0] // First argument contains the update
        },
        totalUpdates: ((window as any).__VANA_STORE_METRICS?.totalUpdates || 0) + 1,
        averageDuration: (
          (((window as any).__VANA_STORE_METRICS?.averageDuration || 0) * 
           ((window as any).__VANA_STORE_METRICS?.totalUpdates || 0) + duration) /
          (((window as any).__VANA_STORE_METRICS?.totalUpdates || 0) + 1)
        )
      };
    }
    
    return result;
  };
  
  return config(wrappedSet, get, api);
};

// Validation middleware
export const validationMiddleware = <T>(
  config: StateCreator<T, [], [], T>,
  validators?: Partial<Record<keyof T, (value: any) => boolean>>
): StateCreator<T, [], [], T> => (set, get, api) => {
  const originalSet = set;
  
  const wrappedSet: typeof set = (...args) => {
    // Only validate in development
    if (process.env.NODE_ENV === 'development' && validators) {
      const currentState = get();
      
      // Extract the partial state from the update
      let partialUpdate: Partial<T> = {};
      if (typeof args[0] === 'function') {
        // If it's a function, we need to simulate the update to validate
        const tempState = { ...currentState };
        const updater = args[0] as (state: T) => void;
        updater(tempState);
        partialUpdate = tempState;
      } else if (typeof args[0] === 'object') {
        partialUpdate = args[0] as Partial<T>;
      }
      
      // Run validators
      Object.entries(partialUpdate).forEach(([key, value]) => {
        const validator = validators[key as keyof T];
        if (validator && !validator(value)) {
          console.warn(`Validation failed for state property '${key}' with value:`, value);
        }
      });
    }
    
    return originalSet(...args);
  };
  
  return config(wrappedSet, get, api);
};

// Memory optimization middleware
export const memoryOptimizationMiddleware = <T>(
  config: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, api) => {
  // Track memory usage in development
  if (process.env.NODE_ENV === 'development') {
    let memoryCheckInterval: NodeJS.Timeout;
    
    const checkMemory = () => {
      if ('performance' in window && 'memory' in (window.performance as any)) {
        const memory = (window.performance as any).memory;
        const memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1048576), // MB
          total: Math.round(memory.totalJSHeapSize / 1048576), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
        };
        
        // Warn if memory usage is high
        if (memoryUsage.used > memoryUsage.limit * 0.8) {
          console.warn('High memory usage detected:', memoryUsage);
        }
        
        (window as any).__VANA_MEMORY_USAGE = memoryUsage;
      }
    };
    
    // Check memory every 30 seconds
    memoryCheckInterval = setInterval(checkMemory, 30000);
    
    // Cleanup on unmount (though this is tricky with Zustand)
    const originalDestroy = api.destroy;
    if (originalDestroy) {
      api.destroy = () => {
        clearInterval(memoryCheckInterval);
        originalDestroy();
      };
    }
  }
  
  return config(set, get, api);
};

// Error handling middleware
export const errorHandlingMiddleware = <T>(
  config: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, api) => {
  const originalSet = set;
  
  const wrappedSet: typeof set = (...args) => {
    try {
      return originalSet(...args);
    } catch (error) {
      console.error('Store update failed:', error);
      
      // Optional: Report error to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Report to your error monitoring service
        // Example: Sentry, LogRocket, etc.
      }
      
      // Don't throw the error to prevent app crashes
      return;
    }
  };
  
  return config(wrappedSet, get, api);
};

// Custom immer middleware with optimizations
export const optimizedImmer = <T>(
  config: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => {
  return immerMiddleware(config);
};

// Custom devtools middleware with enhanced features
export const enhancedDevtools = <T>(
  config: StateCreator<T, [], [], T>,
  options?: {
    name?: string;
    trace?: boolean;
    traceLimit?: number;
  }
): StateCreator<T, [], [], T> => {
  const devtoolsOptions = {
    name: options?.name || 'vana-store',
    trace: options?.trace ?? process.env.NODE_ENV === 'development',
    traceLimit: options?.traceLimit ?? 25,
  };
  
  return devtoolsMiddleware(config, devtoolsOptions);
};

// Custom persistence middleware with selective persistence
export const selectivePersist = <T>(
  config: StateCreator<T, [], [], T>,
  options: PersistOptions<T> & {
    selectiveKeys?: (keyof T)[];
    compressionThreshold?: number; // Size in bytes before compression
  }
): StateCreator<T, [], [], T> => {
  const persistOptions: PersistOptions<T> = {
    ...options,
    storage: options.storage || createJSONStorage(() => safeLocalStorage()),
    partialize: options.partialize || ((state) => {
      if (options.selectiveKeys) {
        const result: Partial<T> = {};
        options.selectiveKeys.forEach(key => {
          result[key] = state[key];
        });
        return result;
      }
      return state;
    }),
    // Custom serialization with compression support
    serialize: options.serialize || ((state) => {
      const serialized = JSON.stringify(state);
      
      // If compression threshold is set and data is large, you could add compression here
      if (options.compressionThreshold && serialized.length > options.compressionThreshold) {
        // Note: This would require a compression library like pako or lz-string
        // For now, just warn about large state
        console.warn(`Persisted state is ${serialized.length} bytes - consider optimizing`);
      }
      
      return serialized;
    }),
  };
  
  return persistMiddleware(config, persistOptions);
};

// Rate limiting middleware for actions
export const rateLimitMiddleware = <T>(
  config: StateCreator<T, [], [], T>,
  options: {
    maxUpdatesPerSecond?: number;
    burstLimit?: number;
  } = {}
): StateCreator<T, [], [], T> => (set, get, api) => {
  const { maxUpdatesPerSecond = 60, burstLimit = 10 } = options;
  
  let updateCount = 0;
  let burstCount = 0;
  let lastReset = Date.now();
  let lastBurstReset = Date.now();
  
  const originalSet = set;
  
  const wrappedSet: typeof set = (...args) => {
    const now = Date.now();
    
    // Reset counters every second
    if (now - lastReset >= 1000) {
      updateCount = 0;
      lastReset = now;
    }
    
    // Reset burst counter every 100ms
    if (now - lastBurstReset >= 100) {
      burstCount = 0;
      lastBurstReset = now;
    }
    
    // Check rate limits
    if (updateCount >= maxUpdatesPerSecond) {
      console.warn('Rate limit exceeded: too many updates per second');
      return;
    }
    
    if (burstCount >= burstLimit) {
      console.warn('Burst limit exceeded: too many rapid updates');
      return;
    }
    
    updateCount++;
    burstCount++;
    
    return originalSet(...args);
  };
  
  return config(wrappedSet, get, api);
};

// Combine all middleware into a single function
export const createMiddleware = <T>(
  config: StateCreator<T, [], [], T>,
  options?: {
    name?: string;
    enableDevtools?: boolean;
    enablePersistence?: boolean;
    persistenceOptions?: PersistOptions<T> & {
      selectiveKeys?: (keyof T)[];
      compressionThreshold?: number;
    };
    enablePerformanceMonitoring?: boolean;
    enableValidation?: boolean;
    validators?: Partial<Record<keyof T, (value: any) => boolean>>;
    enableRateLimit?: boolean;
    rateLimitOptions?: {
      maxUpdatesPerSecond?: number;
      burstLimit?: number;
    };
  }
) => {
  let finalConfig = config;
  
  // Apply middleware in reverse order (innermost first)
  
  // Error handling (innermost)
  finalConfig = errorHandlingMiddleware(finalConfig);
  
  // Memory optimization
  finalConfig = memoryOptimizationMiddleware(finalConfig);
  
  // Performance monitoring
  if (options?.enablePerformanceMonitoring !== false) {
    finalConfig = performanceMiddleware(finalConfig);
  }
  
  // Validation
  if (options?.enableValidation && options.validators) {
    finalConfig = validationMiddleware(finalConfig, options.validators);
  }
  
  // Rate limiting
  if (options?.enableRateLimit) {
    finalConfig = rateLimitMiddleware(finalConfig, options.rateLimitOptions);
  }
  
  // Immer (for immutable updates)
  finalConfig = optimizedImmer(finalConfig);
  
  // Persistence
  if (options?.enablePersistence !== false && options?.persistenceOptions) {
    finalConfig = selectivePersist(finalConfig, options.persistenceOptions);
  }
  
  // DevTools
  if (options?.enableDevtools !== false) {
    finalConfig = enhancedDevtools(finalConfig, {
      name: options?.name || 'vana-store',
      trace: process.env.NODE_ENV === 'development',
      traceLimit: 25
    });
  }
  
  // Subscribe with selector (outermost)
  finalConfig = subscribeWithSelector(finalConfig);
  
  return finalConfig;
};

// Export middleware components for individual use
export {
  optimizedImmer as immer,
  enhancedDevtools as devtools,
  selectivePersist as persist,
  performanceMiddleware,
  validationMiddleware,
  memoryOptimizationMiddleware,
  errorHandlingMiddleware,
  rateLimitMiddleware
};

// Type helpers for middleware composition
export type MiddlewareConfig<T> = StateCreator<
  T,
  [
    ['zustand/subscribeWithSelector', never],
    ['zustand/devtools', never],
    ['zustand/persist', unknown],
    ['zustand/immer', never]
  ],
  [],
  T
>;

// Performance utilities
export const getStoreMetrics = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).__VANA_STORE_METRICS || null;
};

export const getMemoryUsage = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).__VANA_MEMORY_USAGE || null;
};

// Debug utilities for development
export const debugStore = <T>(store: any) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🏪 Vana Store Debug');
  console.log('Current State:', store.getState());
  console.log('Performance Metrics:', getStoreMetrics());
  console.log('Memory Usage:', getMemoryUsage());
  console.groupEnd();
};

// Store health checker
export const checkStoreHealth = (store: any) => {
  const metrics = getStoreMetrics();
  const memory = getMemoryUsage();
  
  const health = {
    performance: 'good',
    memory: 'good',
    issues: [] as string[]
  };
  
  // Check performance
  if (metrics?.averageDuration > 50) {
    health.performance = 'warning';
    health.issues.push(`Average update duration is ${metrics.averageDuration.toFixed(2)}ms (target: <50ms)`);
  }
  
  if (metrics?.averageDuration > 100) {
    health.performance = 'critical';
  }
  
  // Check memory
  if (memory?.used && memory?.limit) {
    const memoryRatio = memory.used / memory.limit;
    if (memoryRatio > 0.8) {
      health.memory = 'warning';
      health.issues.push(`High memory usage: ${memory.used}MB / ${memory.limit}MB`);
    }
    if (memoryRatio > 0.9) {
      health.memory = 'critical';
    }
  }
  
  return health;
};