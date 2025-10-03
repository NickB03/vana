/**
 * Performance testing setup
 * Configures performance monitoring and testing utilities
 */

import { vi } from 'vitest'

type PerformanceEntryLike = {
  name: string
  duration: number
  startTime: number
  entryType: string
  detail?: unknown
  toJSON?: () => unknown
}

// Establish predictable performance primitives when running under Jest/Vitest.
if (!global.PerformanceObserver) {
  const MockPerformanceObserver: any = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn((): PerformanceEntryLike[] => []),
  }))
  MockPerformanceObserver.supportedEntryTypes = ['mark', 'measure', 'navigation', 'resource']
  global.PerformanceObserver = MockPerformanceObserver
}

if (!global.performance) {
  global.performance = {} as Performance
}

const originalPerformance = global.performance

if (!originalPerformance.now) {
  originalPerformance.now = () => Date.now()
}

const marks = new Map<string, number>()
const measures: PerformanceEntryLike[] = []

originalPerformance.mark = (markName: string, markOptions?: PerformanceMarkOptions) => {
  const startTime = originalPerformance.now()
  marks.set(markName, startTime)

  const mark: PerformanceEntryLike = {
    name: markName,
    duration: 0,
    startTime,
    entryType: 'mark',
    detail: markOptions?.detail ?? null,
    toJSON: () => ({ name: markName }),
  }

  return mark as unknown as PerformanceMark
}

originalPerformance.measure = (
  measureName: string,
  options?: { start?: string; end?: string } | string,
  endMark?: string
) => {
  let startTime = originalPerformance.now()
  let endTime = originalPerformance.now()

  if (typeof options === 'string') {
    startTime = marks.get(options) ?? startTime
    endTime = marks.get(endMark ?? measureName) ?? endTime
  } else if (options) {
    if (options.start) {
      startTime = marks.get(options.start) ?? startTime
    }
    if (options.end) {
      endTime = marks.get(options.end) ?? endTime
    }
  }

  const duration = Math.max(0, endTime - startTime)
  const measureEntry: PerformanceEntryLike = {
    name: measureName,
    duration,
    startTime,
    entryType: 'measure',
    detail: null,
    toJSON: () => ({ name: measureName, duration }),
  }
  measures.push(measureEntry)

  return measureEntry as unknown as PerformanceMeasure
}

originalPerformance.getEntriesByType = (type: string) => {
  if (type === 'measure') {
    return measures as PerformanceEntry[]
  }
  return [] as PerformanceEntry[]
}

originalPerformance.getEntriesByName = (name: string) => {
  return measures.filter((entry) => entry.name === name) as PerformanceEntry[]
}

// Provide utility namespace consumed by specs.
export const performanceUtils = {
  clearEntries: () => {
    measures.length = 0
    marks.clear()
  },

  measureRenderTime: (componentName: string, renderFn: () => void) => {
    const startTime = originalPerformance.now()
    renderFn()
    const endTime = originalPerformance.now()
    return endTime - startTime
  },

  mockPerformanceEntry: (name: string, duration: number = 100): PerformanceEntryLike => ({
    name,
    duration,
    startTime: originalPerformance.now(),
    entryType: 'measure',
  }),

  getComponentRenderTime: (name: string): number => {
    const entries = originalPerformance.getEntriesByName(name)
    if (!entries.length) {
      return 0
    }
    return entries[entries.length - 1].duration
  },

  takeMemorySnapshot: () => {
    const memory = (global as unknown as { performance: any }).performance?.memory
    if (memory) {
      return {
        jsHeapSizeLimit: memory.jsHeapSizeLimit ?? 0,
        totalJSHeapSize: memory.totalJSHeapSize ?? 0,
        usedJSHeapSize: memory.usedJSHeapSize ?? 0,
      }
    }

    // Provide deterministic fallback when memory api is unavailable
    return {
      jsHeapSizeLimit: 0,
      totalJSHeapSize: 0,
      usedJSHeapSize: measures.reduce((acc, entry) => acc + entry.duration, 0),
    }
  },

  detectMemoryLeak: (baseline: number, current: number, threshold: number) => {
    return current - baseline > threshold
  },

  detectLongTasks: (thresholdMs: number) => {
    return measures.filter((entry) => entry.duration > thresholdMs)
  },

  checkPerformanceBudget: (
    metrics: { renderTime?: number; componentMountTime?: number; memoryUsage?: number },
    budgets: { renderTime?: number; componentMountTime?: number; memoryUsage?: number }
  ) => {
    const violations: string[] = []

    if (budgets.renderTime != null && (metrics.renderTime ?? 0) > budgets.renderTime) {
      violations.push(`renderTime exceeded: ${(metrics.renderTime ?? 0).toFixed(2)}ms`)
    }

    if (budgets.componentMountTime != null && (metrics.componentMountTime ?? 0) > budgets.componentMountTime) {
      violations.push(
        `componentMountTime exceeded: ${(metrics.componentMountTime ?? 0).toFixed(2)}ms`
      )
    }

    if (budgets.memoryUsage != null && (metrics.memoryUsage ?? 0) > budgets.memoryUsage) {
      violations.push(`memoryUsage exceeded: ${(metrics.memoryUsage ?? 0) / 1024 / 1024}MB`)
    }

    return {
      passed: violations.length === 0,
      violations,
    }
  },
}

// Helper utilities providing richer wrappers for the specs
export const performanceHelpers = {
  measureFunction: async <T>(
    fn: () => T | Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }> => {
    const startMark = `${label}-start`
    const endMark = `${label}-end`
    originalPerformance.mark(startMark)
    const result = await fn()
    originalPerformance.mark(endMark)
    const entry = originalPerformance.measure(label, { start: startMark, end: endMark })
    return { result, duration: entry.duration }
  },

  simulateHeavyComputation: (durationMs: number) => {
    const end = originalPerformance.now() + durationMs
    while (originalPerformance.now() < end) {
      // Busy loop to emulate expensive work
    }
  },

  measureRenderTime: performanceUtils.measureRenderTime,
}

export class ComponentPerformanceTracker {
  private readonly componentName: string
  private startMark: string | null = null

  constructor(componentName: string) {
    this.componentName = componentName
  }

  startMount() {
    this.startMark = `${this.componentName}-mount-start`
    originalPerformance.mark(this.startMark)
  }

  endMount() {
    if (!this.startMark) {
      return
    }
    const endMark = `${this.componentName}-mount-end`
    originalPerformance.mark(endMark)
    originalPerformance.measure(this.componentName, {
      start: this.startMark,
      end: endMark,
    })
    this.startMark = null
  }
}

// Set performance budget thresholds
export const PERFORMANCE_BUDGETS = {
  COMPONENT_RENDER_TIME: 16, // 16ms for 60fps
  PAINT_TIME: 100, // First contentful paint
  INTERACTION_TIME: 50, // Time to interactive
  BUNDLE_SIZE: 800 * 1024, // 800KB gzipped
}
