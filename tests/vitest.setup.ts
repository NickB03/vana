import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Ensure we start with a clean DOM between tests.
afterEach(() => {
  cleanup()
})

// jsdom does not implement this API by default; mock to avoid crashes.
window.HTMLElement.prototype.scrollIntoView = vi.fn()
