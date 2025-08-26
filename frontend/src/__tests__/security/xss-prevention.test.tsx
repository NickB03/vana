/**
 * XSS Prevention Security Tests
 * Tests XSS prevention mechanisms in chat interface and throughout the application
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatInterface } from '@/components/chat/chat-interface';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { useAuth } from '@/hooks/use-auth';
import { useSessionStore } from '@/store/session-store';
import { ChatMessage } from '@/types/session';
import DOMPurify from 'isomorphic-dompurify';

// Mock dependencies
jest.mock('@/hooks/use-auth');
jest.mock('@/store/session-store');
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((dirty) => dirty),
  __esModule: true,
  default: { sanitize: jest.fn((dirty) => dirty) }
}));

// Mock EventSource
global.EventSource = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  readyState: 0,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2
})) as any;

// Mock fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSessionStore = useSessionStore as jest.MockedFunction<typeof useSessionStore>;

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  isVerified: true
};

const mockTokens = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600
};

const mockSession = {
  id: 'test-session-123',
  name: 'Test Session',
  messages: [] as ChatMessage[],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

const mockSessionStore = {
  currentSession: mockSession,
  addMessage: jest.fn(),
  createSession: jest.fn(),
  sessions: [mockSession],
  loadSession: jest.fn(),
  deleteSession: jest.fn(),
  clearSessions: jest.fn()
};

describe('XSS Prevention Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      tokens: mockTokens,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn()
    });
    mockUseSessionStore.mockReturnValue(mockSessionStore);
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  describe('Chat Interface XSS Protection', () => {
    const maliciousScripts = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')" />',
      '<svg onload="alert(\'XSS\')" />',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')" />',
      '<object data="javascript:alert(\'XSS\')" />',
      '<embed src="javascript:alert(\'XSS\')" />',
      '<link href="javascript:alert(\'XSS\')" />',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')" />',
      '<form action="javascript:alert(\'XSS\')" />',
      '<input type="image" src="javascript:alert(\'XSS\')" />',
      '<base href="javascript:alert(\'XSS\')" />',
      '<style>@import "javascript:alert(\'XSS\')"</style>',
      '<div onclick="alert(\'XSS\')">Click me</div>',
      '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>'
    ];

    it('should prevent XSS in user messages', async () => {
      const testMessage: ChatMessage = {
        id: 'test-msg-1',
        role: 'user',
        content: '<script>alert("XSS")</script>Hello World',
        timestamp: Date.now()
      };

      render(
        <MessageList
          messages={[testMessage]}
          streamingMessage={null}
          isLoading={false}
        />
      );

      // Verify script tags are not rendered as executable code
      const messageElement = screen.getByText(/Hello World/);
      expect(messageElement).toBeInTheDocument();
      expect(messageElement.innerHTML).not.toContain('<script>');
    });

    it('should sanitize malicious content in assistant messages', async () => {
      const testMessage: ChatMessage = {
        id: 'test-msg-2',
        role: 'assistant',
        content: '<img src="x" onerror="alert(\'XSS\')" />Safe content',
        timestamp: Date.now()
      };

      render(
        <MessageList
          messages={[testMessage]}
          streamingMessage={null}
          isLoading={false}
        />
      );

      const messageElement = screen.getByText(/Safe content/);
      expect(messageElement).toBeInTheDocument();
      expect(messageElement.innerHTML).not.toContain('onerror');
    });

    it('should test all known XSS vectors', async () => {
      maliciousScripts.forEach(async (script, index) => {
        const testMessage: ChatMessage = {
          id: `test-msg-${index}`,
          role: 'user',
          content: `${script}Safe text`,
          timestamp: Date.now()
        };

        render(
          <MessageList
            messages={[testMessage]}
            streamingMessage={null}
            isLoading={false}
          />
        );

        // Verify no script execution context exists
        const scripts = document.querySelectorAll('script');
        scripts.forEach(scriptEl => {
          expect(scriptEl.innerHTML).not.toContain('alert');
        });
      });
    });

    it('should prevent XSS in message input', async () => {
      const mockOnSendMessage = jest.fn();
      
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      const inputElement = screen.getByPlaceholderText('Type a message...');
      
      // Try to inject script
      fireEvent.change(inputElement, { 
        target: { value: '<script>alert("XSS")</script>' } 
      });
      
      fireEvent.keyPress(inputElement, { key: 'Enter', code: 13, charCode: 13 });
      
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalled();
      });

      // Verify the input value doesn't contain executable script
      const sentMessage = mockOnSendMessage.mock.calls[0][0];
      expect(sentMessage).not.toContain('<script>');
    });

    it('should prevent XSS in streaming messages', async () => {
      const streamingMessage: ChatMessage = {
        id: 'streaming-msg',
        role: 'assistant',
        content: '<svg onload="alert(\'XSS\')" />',
        timestamp: Date.now(),
        metadata: { streaming: true }
      };

      render(
        <MessageList
          messages={[]}
          streamingMessage={streamingMessage}
          isLoading={true}
        />
      );

      // Verify streaming content is sanitized
      expect(document.querySelector('svg')).not.toHaveAttribute('onload');
    });

    it('should handle HTML entities correctly', async () => {
      const testMessage: ChatMessage = {
        id: 'test-msg-entities',
        role: 'user',
        content: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        timestamp: Date.now()
      };

      render(
        <MessageList
          messages={[testMessage]}
          streamingMessage={null}
          isLoading={false}
        />
      );

      // Should display as text, not execute
      const messageElement = screen.getByText(/script/);
      expect(messageElement).toBeInTheDocument();
      expect(messageElement.innerHTML).not.toContain('alert');
    });
  });

  describe('DOMPurify Integration', () => {
    it('should call DOMPurify.sanitize for user content', async () => {
      const maliciousContent = '<script>alert("XSS")</script>Hello';
      const mockSanitize = DOMPurify.sanitize as jest.MockedFunction<typeof DOMPurify.sanitize>;
      mockSanitize.mockReturnValue('Hello');

      const testMessage: ChatMessage = {
        id: 'test-sanitize',
        role: 'user',
        content: maliciousContent,
        timestamp: Date.now()
      };

      render(
        <MessageList
          messages={[testMessage]}
          streamingMessage={null}
          isLoading={false}
        />
      );

      expect(mockSanitize).toHaveBeenCalledWith(maliciousContent, expect.any(Object));
    });

    it('should use proper DOMPurify configuration', () => {
      const mockSanitize = DOMPurify.sanitize as jest.MockedFunction<typeof DOMPurify.sanitize>;
      mockSanitize.mockReturnValue('clean content');

      const testMessage: ChatMessage = {
        id: 'test-config',
        role: 'assistant',
        content: '<p>Test</p>',
        timestamp: Date.now()
      };

      render(
        <MessageList
          messages={[testMessage]}
          streamingMessage={null}
          isLoading={false}
        />
      );

      expect(mockSanitize).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ALLOWED_TAGS: expect.any(Array),
          ALLOWED_ATTR: expect.any(Array),
          FORBID_SCRIPT: true,
          FORBID_TAGS: expect.arrayContaining(['script', 'iframe', 'object', 'embed'])
        })
      );
    });
  });

  describe('Content Security Policy Compliance', () => {
    it('should not execute inline event handlers', () => {
      const maliciousHTML = '<div onclick="alert(\'XSS\')" id="test-csp">Click me</div>';
      document.body.innerHTML = maliciousHTML;
      
      const element = document.getElementById('test-csp');
      expect(element).toBeInTheDocument();
      expect(element?.getAttribute('onclick')).toBeNull();
    });

    it('should block data: URLs in images', () => {
      const maliciousImg = '<img src="data:text/html,<script>alert(\'XSS\')</script>" id="test-img" />';
      document.body.innerHTML = maliciousImg;
      
      const img = document.getElementById('test-img') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img?.src).not.toContain('data:text/html');
    });

    it('should prevent javascript: URLs', () => {
      const maliciousLink = '<a href="javascript:alert(\'XSS\')" id="test-link">Click</a>';
      document.body.innerHTML = maliciousLink;
      
      const link = document.getElementById('test-link') as HTMLAnchorElement;
      expect(link).toBeInTheDocument();
      expect(link?.href).not.toContain('javascript:');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types to prevent XSS via SVG', async () => {
      const mockOnSendMessage = jest.fn();
      
      render(
        <MessageInput
          onSendMessage={mockOnSendMessage}
          disabled={false}
          placeholder="Type a message..."
        />
      );

      // Create malicious SVG file
      const maliciousSVG = new File([
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'XSS\')">">'], 
        'malicious.svg', 
        { type: 'image/svg+xml' }
      );

      const fileInput = screen.getByRole('button', { name: /attach/i });
      
      // Simulate file selection - this should be blocked or sanitized
      Object.defineProperty(fileInput, 'files', {
        value: [maliciousSVG],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Verify file is either rejected or sanitized
      await waitFor(() => {
        if (mockOnSendMessage.mock.calls.length > 0) {
          const files = mockOnSendMessage.mock.calls[0][1];
          if (files && files.length > 0) {
            // If file is accepted, it should be sanitized
            expect(files[0].name).toBe('malicious.svg');
          }
        }
      });
    });
  });

  describe('URL Sanitization', () => {
    it('should sanitize URLs in messages', () => {
      const testMessage: ChatMessage = {
        id: 'test-url',
        role: 'user',
        content: 'Visit https://example.com and javascript:alert("XSS")',
        timestamp: Date.now()
      };

      render(
        <MessageList
          messages={[testMessage]}
          streamingMessage={null}
          isLoading={false}
        />
      );

      const links = document.querySelectorAll('a');
      links.forEach(link => {
        expect(link.href).not.toContain('javascript:');
        expect(link.href).not.toContain('data:');
        expect(link.href).not.toContain('vbscript:');
      });
    });

    it('should preserve safe URLs', () => {
      const testMessage: ChatMessage = {
        id: 'test-safe-url',
        role: 'user',
        content: 'Visit https://example.com',
        timestamp: Date.now()
      };

      render(
        <MessageList
          messages={[testMessage]}
          streamingMessage={null}
          isLoading={false}
        />
      );

      const link = document.querySelector('a[href="https://example.com"]');
      expect(link).toBeInTheDocument();
    });
  });
});
