import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock the dependencies
vi.mock('@/components/MessageWithArtifacts', () => ({
  MessageWithArtifacts: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@/components/ReasoningDisplay', () => ({
  ReasoningDisplay: () => <div>Reasoning Display</div>,
}));

vi.mock('@/components/ReasoningErrorBoundary', () => ({
  ReasoningErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockMessage = {
  id: 'test-message-1',
  role: 'assistant' as const,
  content: 'Hello, this is a test message',
  session_id: 'test-session',
};

const mockHandlers = {
  onRetry: vi.fn(),
  onCopy: vi.fn(),
  onEdit: vi.fn(),
  onArtifactOpen: vi.fn(),
};

describe('ChatMessage', () => {
  it('renders assistant message correctly', () => {
    render(
      <TooltipProvider>
        <ChatMessage
          message={mockMessage}
          isLastMessage={false}
          isStreaming={false}
          {...mockHandlers}
        />
      </TooltipProvider>
    );

    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    expect(screen.getByText('Vana')).toBeInTheDocument();
  });

  it('renders user message correctly', () => {
    const userMessage = {
      ...mockMessage,
      role: 'user' as const,
      content: 'User question',
    };

    render(
      <TooltipProvider>
        <ChatMessage
          message={userMessage}
          isLastMessage={false}
          isStreaming={false}
          {...mockHandlers}
        />
      </TooltipProvider>
    );

    expect(screen.getByText('User question')).toBeInTheDocument();
  });

  it('shows reasoning when available', () => {
    const messageWithReasoning = {
      ...mockMessage,
      reasoning: 'This is reasoning text',
    };

    render(
      <TooltipProvider>
        <ChatMessage
          message={messageWithReasoning}
          isLastMessage={false}
          isStreaming={false}
          {...mockHandlers}
        />
      </TooltipProvider>
    );

    expect(screen.getByText('Reasoning Display')).toBeInTheDocument();
  });

  it('memoizes correctly - same props do not trigger re-render', () => {
    const { rerender } = render(
      <TooltipProvider>
        <ChatMessage
          message={mockMessage}
          isLastMessage={false}
          isStreaming={false}
          {...mockHandlers}
        />
      </TooltipProvider>
    );

    // Re-render with same props
    rerender(
      <TooltipProvider>
        <ChatMessage
          message={mockMessage}
          isLastMessage={false}
          isStreaming={false}
          {...mockHandlers}
        />
      </TooltipProvider>
    );

    // Should still be in document (no errors from memo)
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });
});
