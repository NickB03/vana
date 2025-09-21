import React from 'react'
import { render } from '@testing-library/react'
import VanaHomePage from '@/components/vana/VanaHomePage'
import { useSSE } from '@/hooks/useSSE'

function DisabledSSEConsumer() {
  useSSE('/api/test', { enabled: false })
  return <div>ok</div>
}

describe('VanaHomePage', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<VanaHomePage onStartChat={jest.fn()} />)
    ).not.toThrow()
  })

  it('handles disabled SSE without crashing', () => {
    expect(() => render(<DisabledSSEConsumer />)).not.toThrow()
  })
})
