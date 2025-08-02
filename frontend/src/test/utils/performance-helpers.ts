/**
 * Performance Testing Helpers
 * 
 * Utilities for measuring and testing performance in components and services
 */

import { vi } from 'vitest';
import type { RenderResult } from '@testing-library/react';

// Performance measurement utilities
export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export class PerformanceProfiler {
  private measurements: PerformanceMeasurement[] = [];
  private activeTimers = new Map<string, number>();

  startMeasurement(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.activeTimers.set(name, startTime);
    
    if (metadata) {
      this.activeTimers.set(`${name}_metadata`, JSON.stringify(metadata) as any);
    }
  }

  endMeasurement(name: string): PerformanceMeasurement | null {
    const endTime = performance.now();
    const startTime = this.activeTimers.get(name);
    
    if (!startTime) {
      console.warn(`No active measurement found for: ${name}`);
      return null;
    }

    const metadataStr = this.activeTimers.get(`${name}_metadata`) as string;
    const metadata = metadataStr ? JSON.parse(metadataStr) : undefined;

    const measurement: PerformanceMeasurement = {
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata,
    };

    this.measurements.push(measurement);
    this.activeTimers.delete(name);
    this.activeTimers.delete(`${name}_metadata`);

    return measurement;
  }

  getMeasurements(): PerformanceMeasurement[] {
    return [...this.measurements];
  }

  getMeasurement(name: string): PerformanceMeasurement | undefined {
    return this.measurements.find(m => m.name === name);
  }

  getAverageDuration(namePattern: string | RegExp): number {
    const pattern = typeof namePattern === 'string' 
      ? new RegExp(namePattern) 
      : namePattern;
    
    const matchingMeasurements = this.measurements.filter(m => 
      pattern.test(m.name)
    );

    if (matchingMeasurements.length === 0) return 0;

    const totalDuration = matchingMeasurements.reduce(
      (sum, m) => sum + m.duration, 
      0
    );

    return totalDuration / matchingMeasurements.length;
  }

  clear(): void {
    this.measurements = [];
    this.activeTimers.clear();
  }

  // Statistical analysis
  getStatistics(namePattern?: string | RegExp) {
    let measurements = this.measurements;
    
    if (namePattern) {
      const pattern = typeof namePattern === 'string' 
        ? new RegExp(namePattern) 
        : namePattern;
      measurements = measurements.filter(m => pattern.test(m.name));
    }

    if (measurements.length === 0) {
      return null;
    }

    const durations = measurements.map(m => m.duration);
    durations.sort((a, b) => a - b);

    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = total / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const min = durations[0];
    const max = durations[durations.length - 1];

    // Calculate percentiles
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95 = durations[p95Index];
    const p99 = durations[p99Index];

    return {
      count: measurements.length,
      total,
      average,
      median,
      min,
      max,
      p95,
      p99,
    };
  }
}

// React component performance measurement
export const measureRenderTime = <T extends RenderResult>(
  renderFn: () => T,
  testName = 'component_render'
): { result: T; measurement: PerformanceMeasurement } => {
  const profiler = new PerformanceProfiler();
  
  profiler.startMeasurement(testName);
  const result = renderFn();
  const measurement = profiler.endMeasurement(testName)!;

  return { result, measurement };
};

// Hook performance measurement
export const measureHookExecution = <T>(
  hookFn: () => T,
  testName = 'hook_execution'
): { result: T; measurement: PerformanceMeasurement } => {
  const profiler = new PerformanceProfiler();
  
  profiler.startMeasurement(testName);
  const result = hookFn();
  const measurement = profiler.endMeasurement(testName)!;

  return { result, measurement };
};

// Event processing performance
export const measureEventProcessing = (
  eventProcessor: () => void,
  eventCount: number,
  testName = 'event_processing'
): PerformanceMeasurement => {
  const profiler = new PerformanceProfiler();
  
  profiler.startMeasurement(testName, { eventCount });
  eventProcessor();
  const measurement = profiler.endMeasurement(testName)!;

  return measurement;
};

// Memory usage helpers
export const measureMemoryUsage = () => {
  const memory = (performance as any).memory;
  
  if (!memory) {
    return null;
  }

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    timestamp: Date.now(),
  };
};

export const trackMemoryLeaks = (
  testFn: () => void,
  iterations = 100
): { initialMemory: any; finalMemory: any; memoryGrowth: number } => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const initialMemory = measureMemoryUsage();
  
  // Run the function multiple times to detect leaks
  for (let i = 0; i < iterations; i++) {
    testFn();
  }

  // Force garbage collection again
  if (global.gc) {
    global.gc();
  }

  const finalMemory = measureMemoryUsage();
  const memoryGrowth = finalMemory 
    ? finalMemory.usedJSHeapSize - (initialMemory?.usedJSHeapSize || 0)
    : 0;

  return {
    initialMemory,
    finalMemory,
    memoryGrowth,
  };
};

// Connection performance helpers
export const measureConnectionTime = async (
  connectionFn: () => Promise<void>,
  testName = 'connection_time'
): Promise<PerformanceMeasurement> => {
  const profiler = new PerformanceProfiler();
  
  profiler.startMeasurement(testName);
  await connectionFn();
  const measurement = profiler.endMeasurement(testName)!;

  return measurement;
};

// Batch operation performance
export const measureBatchPerformance = <T>(
  batchFn: (items: T[]) => void,
  items: T[],
  batchSizes: number[] = [1, 10, 50, 100, 500],
  testName = 'batch_operation'
): PerformanceMeasurement[] => {
  const profiler = new PerformanceProfiler();
  const measurements: PerformanceMeasurement[] = [];

  for (const batchSize of batchSizes) {
    const batch = items.slice(0, batchSize);
    const name = `${testName}_${batchSize}`;
    
    profiler.startMeasurement(name, { batchSize, itemCount: batch.length });
    batchFn(batch);
    const measurement = profiler.endMeasurement(name)!;
    
    measurements.push(measurement);
  }

  return measurements;
};

// Performance assertion helpers
export const expectPerformance = (measurement: PerformanceMeasurement) => ({
  toBeFasterThan: (maxDurationMs: number) => {
    expect(measurement.duration).toBeLessThanOrEqual(maxDurationMs);
  },
  
  toBeSlowerThan: (minDurationMs: number) => {
    expect(measurement.duration).toBeGreaterThanOrEqual(minDurationMs);
  },
  
  toBeBetween: (minMs: number, maxMs: number) => {
    expect(measurement.duration).toBeGreaterThanOrEqual(minMs);
    expect(measurement.duration).toBeLessThanOrEqual(maxMs);
  },
});

// Benchmark comparison
export const compareBenchmarks = (
  name1: string,
  fn1: () => void,
  name2: string,
  fn2: () => void,
  iterations = 1000
): { 
  winner: string; 
  results: Record<string, PerformanceMeasurement[]>;
  comparison: {
    averageDifference: number;
    percentageDifference: number;
  };
} => {
  const profiler = new PerformanceProfiler();
  const results: Record<string, PerformanceMeasurement[]> = {
    [name1]: [],
    [name2]: [],
  };

  // Run benchmarks
  for (let i = 0; i < iterations; i++) {
    // Benchmark 1
    profiler.startMeasurement(`${name1}_${i}`);
    fn1();
    const measurement1 = profiler.endMeasurement(`${name1}_${i}`)!;
    results[name1].push(measurement1);

    // Benchmark 2
    profiler.startMeasurement(`${name2}_${i}`);
    fn2();
    const measurement2 = profiler.endMeasurement(`${name2}_${i}`)!;
    results[name2].push(measurement2);
  }

  // Calculate averages
  const avg1 = results[name1].reduce((sum, m) => sum + m.duration, 0) / iterations;
  const avg2 = results[name2].reduce((sum, m) => sum + m.duration, 0) / iterations;

  const winner = avg1 < avg2 ? name1 : name2;
  const averageDifference = Math.abs(avg1 - avg2);
  const percentageDifference = (averageDifference / Math.min(avg1, avg2)) * 100;

  return {
    winner,
    results,
    comparison: {
      averageDifference,
      percentageDifference,
    },
  };
};

// Mock performance API for testing
export const mockPerformanceAPI = () => {
  const mockPerformance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    memory: {
      usedJSHeapSize: 5000000,
      totalJSHeapSize: 10000000,
      jsHeapSizeLimit: 2147483648,
    },
  };

  Object.defineProperty(global, 'performance', {
    value: mockPerformance,
    writable: true,
  });

  return mockPerformance;
};

// Performance test suite helper
export const createPerformanceTestSuite = (
  suiteName: string,
  tests: Array<{
    name: string;
    fn: () => void;
    maxDuration: number;
    iterations?: number;
  }>
) => {
  const profiler = new PerformanceProfiler();
  const results: Record<string, PerformanceMeasurement[]> = {};

  const runSuite = () => {
    for (const test of tests) {
      const iterations = test.iterations || 1;
      results[test.name] = [];

      for (let i = 0; i < iterations; i++) {
        profiler.startMeasurement(`${test.name}_${i}`);
        test.fn();
        const measurement = profiler.endMeasurement(`${test.name}_${i}`)!;
        results[test.name].push(measurement);
      }

      // Check performance requirement
      const avgDuration = results[test.name].reduce(
        (sum, m) => sum + m.duration, 0
      ) / iterations;

      if (avgDuration > test.maxDuration) {
        throw new Error(
          `Performance test "${test.name}" failed: ` +
          `average duration ${avgDuration.toFixed(2)}ms exceeds ` +
          `maximum ${test.maxDuration}ms`
        );
      }
    }

    return results;
  };

  return {
    runSuite,
    getResults: () => results,
    profiler,
  };
};

// Create a global profiler instance for easy access
export const globalProfiler = new PerformanceProfiler();