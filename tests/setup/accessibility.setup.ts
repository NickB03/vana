/**
 * Accessibility testing setup
 * Configures axe-core and jest-dom matchers for accessibility testing
 */

import { toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

// Configure jest-axe matchers
expect.extend(toHaveNoViolations)

// Extend Jest expect interface
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
  }
}

// Global axe configuration
import { configureAxe } from 'jest-axe'

export const axe = configureAxe({
  rules: {
    // Disable rules that are too strict for development
    'color-contrast': { enabled: false },
  },
})

const announcements: string[] = []

export const accessibility = {
  axe,
  recordAnnouncement: (message: string) => {
    announcements.push(message)
  },
  clearAnnouncements: () => {
    announcements.length = 0
  },
  getAnnouncements: () => [...announcements],
}

// Mock IntersectionObserver if not available
if (!global.IntersectionObserver) {
  global.IntersectionObserver = class IntersectionObserver {
    readonly root = null
    readonly rootMargin = '0px'
    readonly thresholds = [0]
    
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() { return [] }
  } as any
}

// Mock ResizeObserver if not available
if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any
}
