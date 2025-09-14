/**
 * Test Providers and React Components
 * 
 * Separate file for JSX components used in testing
 * to avoid conflicts with TypeScript generics in test-helpers.ts
 */

import type { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ChatProvider } from '@/contexts/chat-context'

// ============================================================================
// Test Providers and Wrappers
// ============================================================================

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ChatProvider>
      {children}
    </ChatProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render, AllTheProviders }