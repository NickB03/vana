/**
 * Performance testing setup
 * Configures performance monitoring and testing utilities
 */

// Mock Performance Observer for testing
if (!global.PerformanceObserver) {
  global.PerformanceObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => []),
  }))
}

// Mock performance.measure for testing
if (!global.performance?.measure) {
  global.performance = {
    ...global.performance,
    measure: jest.fn(),
    mark: jest.fn(),
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  }
}

// Performance testing utilities
export const performanceUtils = {
  measureRenderTime: (componentName: string, renderFn: () => void) => {
    const startTime = performance.now()
    renderFn()
    const endTime = performance.now()
    return endTime - startTime
  },
  
  mockPerformanceEntry: (name: string, duration: number = 100) => ({
    name,
    duration,
    startTime: performance.now(),
    entryType: 'measure',
  }),
}

// Set performance budget thresholds
export const PERFORMANCE_BUDGETS = {
  COMPONENT_RENDER_TIME: 16, // 16ms for 60fps
  PAINT_TIME: 100, // First contentful paint
  INTERACTION_TIME: 50, // Time to interactive
  BUNDLE_SIZE: 800 * 1024, // 800KB gzipped
}