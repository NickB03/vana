import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Message } from '@/components/chat/Message'
import type { Message as MessageType } from '@/types'

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>
}))

// Mock code block component
vi.mock('@/components/ui/code-block', () => ({
  CodeBlock: ({ value, language }: { value: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>{value}</pre>
  )
}))

describe('Message Component', () => {
  const mockUserMessage: MessageType = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, how are you?',
    timestamp: Date.now()
  }

  const mockAssistantMessage: MessageType = {
    id: 'msg-2',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    timestamp: Date.now(),
    agentName: 'Vana Agent'
  }

  const mockMessageWithFiles: MessageType = {
    id: 'msg-3',
    role: 'user',
    content: 'Please review this document',
    timestamp: Date.now(),
    files: [
      { name: 'document.pdf', size: 1024, type: 'application/pdf' },
      { name: 'data.csv', size: 2048, type: 'text/csv' }
    ]
  }

  it('renders user message correctly', () => {
    render(<Message message={mockUserMessage} />)
    
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
    expect(screen.getByText('Hello, how are you?').closest('div')).toHaveClass('justify-end')
  })

  it('renders assistant message correctly', () => {
    render(<Message message={mockAssistantMessage} />)
    
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument()
    expect(screen.getByText('Vana Agent')).toBeInTheDocument()
    
    // Should have brain icon for agent
    expect(screen.getByTestId('agent-icon')).toBeInTheDocument()
  })

  it('renders message with file attachments', () => {
    render(<Message message={mockMessageWithFiles} />)
    
    expect(screen.getByText('Please review this document')).toBeInTheDocument()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText('data.csv')).toBeInTheDocument()
    
    // Should show file count indicator
    expect(screen.getByText('2 files')).toBeInTheDocument()
  })

  it('shows file tooltip on hover', async () => {
    render(<Message message={mockMessageWithFiles} />)
    
    const fileIndicator = screen.getByText('document.pdf')
    fireEvent.mouseEnter(fileIndicator)
    
    await waitFor(() => {
      expect(screen.getByText('Attached: document.pdf, data.csv')).toBeInTheDocument()
    })
  })

  it('renders markdown content for assistant messages', () => {
    const messageWithMarkdown: MessageType = {
      id: 'msg-4',
      role: 'assistant',
      content: '# Title\n\nThis is **bold** text with `code`.',
      timestamp: Date.now(),
      agentName: 'Vana Agent'
    }

    render(<Message message={messageWithMarkdown} />)
    
    expect(screen.getByTestId('markdown')).toBeInTheDocument()
    expect(screen.getByTestId('markdown')).toHaveTextContent('# Title\n\nThis is **bold** text with `code`.')
  })

  it('renders code blocks with syntax highlighting', () => {
    const messageWithCode: MessageType = {
      id: 'msg-5',
      role: 'assistant',
      content: '```javascript\nconst hello = "world";\nconsole.log(hello);\n```',
      timestamp: Date.now(),
      agentName: 'Code Agent'
    }

    render(<Message message={messageWithCode} />)
    
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
    expect(screen.getByTestId('code-block')).toHaveAttribute('data-language', 'javascript')
    expect(screen.getByTestId('code-block')).toHaveTextContent('const hello = "world";')
  })

  it('shows loading state for streaming messages', () => {
    const streamingMessage: MessageType = {
      id: 'msg-6',
      role: 'assistant',
      content: 'I am typing',
      timestamp: Date.now(),
      agentName: 'Vana Agent',
      isStreaming: true
    }

    render(<Message message={streamingMessage} />)
    
    expect(screen.getByTestId('loading-dots')).toBeInTheDocument()
  })

  it('formats timestamps correctly', () => {
    const messageFromYesterday: MessageType = {
      ...mockUserMessage,
      timestamp: Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
    }

    render(<Message message={messageFromYesterday} />)
    
    // Should show relative time
    expect(screen.getByText(/yesterday/i)).toBeInTheDocument()
  })

  it('handles very long messages with proper styling', () => {
    const longMessage: MessageType = {
      id: 'msg-7',
      role: 'assistant',
      content: 'A'.repeat(5000), // 5000 character message
      timestamp: Date.now(),
      agentName: 'Verbose Agent'
    }

    render(<Message message={longMessage} />)
    
    const messageElement = screen.getByTestId('message-content')
    expect(messageElement).toHaveStyle({ wordWrap: 'break-word' })
  })

  it('shows error state for failed messages', () => {
    const errorMessage: MessageType = {
      id: 'msg-8',
      role: 'assistant',
      content: 'Sorry, I encountered an error.',
      timestamp: Date.now(),
      agentName: 'Error Agent',
      hasError: true
    }

    render(<Message message={errorMessage} />)
    
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    expect(screen.getByTestId('retry-button')).toBeInTheDocument()
  })

  it('handles retry action for error messages', () => {
    const onRetry = vi.fn()
    const errorMessage: MessageType = {
      id: 'msg-9',
      role: 'assistant',
      content: 'Failed to process request.',
      timestamp: Date.now(),
      agentName: 'Error Agent',
      hasError: true
    }

    render(<Message message={errorMessage} onRetry={onRetry} />)
    
    const retryButton = screen.getByTestId('retry-button')
    fireEvent.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledWith('msg-9')
  })

  it('applies correct accessibility attributes', () => {
    render(<Message message={mockAssistantMessage} />)
    
    const messageElement = screen.getByRole('article')
    expect(messageElement).toHaveAttribute('aria-label', 'Message from assistant')
    expect(messageElement).toHaveAttribute('tabindex', '0')
  })

  it('handles copy message functionality', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock }
    })

    render(<Message message={mockAssistantMessage} />)
    
    const copyButton = screen.getByTestId('copy-button')
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('I am doing well, thank you!')
    })

    // Should show copied indicator
    expect(screen.getByTestId('copied-indicator')).toBeInTheDocument()
  })

  it('handles different agent types with appropriate icons', () => {
    const codeAgentMessage: MessageType = {
      ...mockAssistantMessage,
      agentName: 'Code Agent',
      agentType: 'code'
    }

    render(<Message message={codeAgentMessage} />)
    
    expect(screen.getByTestId('code-agent-icon')).toBeInTheDocument()
  })

  it('shows confidence score when available', () => {
    const messageWithConfidence: MessageType = {
      ...mockAssistantMessage,
      confidence: 0.95
    }

    render(<Message message={messageWithConfidence} />)
    
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-indicator')).toBeInTheDocument()
  })
})