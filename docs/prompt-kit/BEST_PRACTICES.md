# Prompt Kit Best Practices for AI Applications

> **Guide for building production-ready AI chat interfaces**

## Table of Contents

1. [Performance Optimization](#performance-optimization)
2. [State Management](#state-management)
3. [Error Handling](#error-handling)
4. [Accessibility](#accessibility)
5. [Testing](#testing)
6. [Security](#security)
7. [UX Guidelines](#ux-guidelines)

---

## Performance Optimization

### 1. Memoization for Streaming

**Problem**: Re-rendering entire chat history on every token

**Solution**: Use `id` prop on Markdown component

```tsx
// ❌ Bad - Re-renders all messages on every token
{messages.map(msg => (
  <Markdown>{msg.content}</Markdown>
))}

// ✅ Good - Only re-renders changed message
{messages.map(msg => (
  <Markdown id={msg.id}>{msg.content}</Markdown>
))}
```

**Why it works**: Prompt Kit's Markdown component uses `marked` to split content into blocks, then memoizes each block individually.

### 2. Lazy Loading Heavy Components

```tsx
import { lazy, Suspense } from "react"

// Lazy load CodeBlock (includes Shiki syntax highlighter)
const CodeBlock = lazy(() => import("@/components/prompt-kit/code-block"))

// Use with Suspense
<Suspense fallback={<Loader variant="pulse" />}>
  <CodeBlock>
    <CodeBlockCode code={code} language="typescript" />
  </CodeBlock>
</Suspense>
```

**When to use**:
- CodeBlock (Shiki is ~500KB)
- JSXPreview (react-jsx-parser)
- Any component not immediately visible

### 3. Virtual Scrolling for Long Chats

For conversations with 100+ messages:

```bash
npm install react-virtuoso
```

```tsx
import { Virtuoso } from "react-virtuoso"

<Virtuoso
  data={messages}
  itemContent={(index, msg) => (
    <Message key={msg.id}>
      <MessageContent markdown id={msg.id}>
        {msg.content}
      </MessageContent>
    </Message>
  )}
  followOutput="smooth"
/>
```

**Benefits**:
- Only renders visible messages
- Smooth scrolling
- Memory efficient

### 4. Debounce Input Updates

For real-time features (autocomplete, suggestions):

```tsx
import { useDebouncedCallback } from "use-debounce"

const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    fetchSuggestions(value)
  },
  300
)

<PromptInput
  value={input}
  onValueChange={(val) => {
    setInput(val)
    debouncedSearch(val)
  }}
>
  <PromptInputTextarea />
</PromptInput>
```

### 5. Code Splitting

Split chat components by route:

```tsx
// app/chat/layout.tsx
import dynamic from "next/dynamic"

const ChatInterface = dynamic(() => import("./chat-interface"), {
  loading: () => <Loader variant="circular" />,
  ssr: false // Client-side only for interactive features
})
```

---

## State Management

### 1. Message State Structure

**Recommended structure**:

```typescript
interface Message {
  id: string                    // Unique identifier
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  toolInvocations?: ToolInvocation[]
  metadata?: {
    model?: string
    tokens?: number
    reasoning?: string
    sources?: Source[]
  }
}

interface ToolInvocation {
  toolCallId: string
  toolName: string
  state: "pending" | "running" | "completed" | "error"
  args: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
}
```

### 2. Optimistic Updates

Show user message immediately, append assistant response:

```tsx
const handleSubmit = async () => {
  // 1. Optimistic user message
  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: "user",
    content: input,
    timestamp: Date.now()
  }
  setMessages(prev => [...prev, userMsg])
  setInput("")

  // 2. Stream assistant response
  const assistantMsg: Message = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    timestamp: Date.now()
  }
  setMessages(prev => [...prev, assistantMsg])

  // 3. Update as tokens stream in
  for await (const chunk of streamResponse(input)) {
    assistantMsg.content += chunk
    setMessages(prev => [
      ...prev.slice(0, -1),
      { ...assistantMsg }
    ])
  }
}
```

### 3. Session Management

Store session state in URL or localStorage:

```tsx
// URL-based (recommended for sharing)
import { useSearchParams, useRouter } from "next/navigation"

function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session") || crypto.randomUUID()

  // Update URL when session changes
  useEffect(() => {
    if (!searchParams.get("session")) {
      router.replace(`/chat?session=${sessionId}`)
    }
  }, [])

  // Load messages for session
  useEffect(() => {
    loadMessages(sessionId)
  }, [sessionId])
}
```

```tsx
// LocalStorage-based (for privacy)
import { useLocalStorage } from "usehooks-ts"

function ChatPage() {
  const [messages, setMessages] = useLocalStorage<Message[]>(
    "chat-messages",
    []
  )
}
```

### 4. Context for Shared State

For complex applications with multiple chat-related components:

```tsx
// contexts/chat-context.tsx
import { createContext, useContext, useState } from "react"

interface ChatContextType {
  messages: Message[]
  addMessage: (msg: Message) => void
  updateMessage: (id: string, content: string) => void
  clearMessages: () => void
  isLoading: boolean
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg])
  }

  const updateMessage = (id: string, content: string) => {
    setMessages(prev =>
      prev.map(msg => msg.id === id ? { ...msg, content } : msg)
    )
  }

  const clearMessages = () => setMessages([])

  return (
    <ChatContext.Provider value={{
      messages,
      addMessage,
      updateMessage,
      clearMessages,
      isLoading
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) throw new Error("useChat must be used within ChatProvider")
  return context
}
```

---

## Error Handling

### 1. Network Error Recovery

```tsx
const [error, setError] = useState<string | null>(null)
const [retryCount, setRetryCount] = useState(0)

const handleSubmit = async () => {
  try {
    setError(null)
    await sendMessage(input)
  } catch (err) {
    setError(err.message)

    // Automatic retry (max 3 times)
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
        handleSubmit()
      }, 1000 * Math.pow(2, retryCount)) // Exponential backoff
    }
  }
}

// Display error
{error && (
  <div className="text-red-500 text-sm p-2">
    Error: {error}
    <Button onClick={() => handleSubmit()} size="sm">
      Retry
    </Button>
  </div>
)}
```

### 2. SSE Connection Handling

```tsx
function useSSEChat(apiUrl: string) {
  const [messages, setMessages] = useState([])
  const eventSourceRef = useRef<EventSource | null>(null)

  const sendMessage = (content: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(
      `${apiUrl}?message=${encodeURIComponent(content)}`
    )

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // Handle message...
    }

    eventSource.onerror = (err) => {
      console.error("SSE error:", err)
      eventSource.close()

      // Show error to user
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "system",
        content: "Connection lost. Please try again.",
        timestamp: Date.now()
      }])
    }

    eventSourceRef.current = eventSource
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return { messages, sendMessage }
}
```

### 3. Rate Limiting

```tsx
import { RateLimiter } from "limiter"

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: "minute"
})

const handleSubmit = async () => {
  const canProceed = await limiter.removeTokens(1)

  if (!canProceed) {
    setError("Too many requests. Please wait a moment.")
    return
  }

  // Proceed with message...
}
```

---

## Accessibility

### 1. Keyboard Navigation

```tsx
<PromptInput
  value={input}
  onValueChange={setInput}
  onSubmit={handleSubmit}
>
  <PromptInputTextarea
    aria-label="Message input"
    placeholder="Type a message..."
  />
  <PromptInputActions>
    <PromptInputAction tooltip="Send message">
      <Button
        type="submit"
        aria-label="Send message"
        disabled={!input.trim()}
      >
        <ArrowUpIcon aria-hidden="true" />
      </Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

**Key points**:
- `aria-label` on interactive elements
- `aria-hidden` on decorative icons
- Proper `disabled` states

### 2. Screen Reader Support

```tsx
<Message>
  <MessageAvatar
    src="/avatar.png"
    alt={msg.role === "user" ? "User avatar" : "Assistant avatar"}
    fallback={msg.role[0].toUpperCase()}
  />
  <MessageContent
    markdown
    role="article"
    aria-label={`${msg.role} message`}
  >
    {msg.content}
  </MessageContent>
</Message>

// Announce new messages to screen readers
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {isLoading && "Assistant is typing..."}
  {messages[messages.length - 1]?.role === "assistant" && "New message received"}
</div>
```

### 3. Focus Management

```tsx
import { useRef, useEffect } from "react"

function ChatInterface() {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Focus input after sending message
  const handleSubmit = async () => {
    await sendMessage(input)
    inputRef.current?.focus()
  }

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea ref={inputRef} />
    </PromptInput>
  )
}
```

---

## Testing

### 1. Unit Tests

```tsx
// __tests__/chat.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ChatPage from "@/app/chat/page"

describe("ChatPage", () => {
  it("sends message on submit", async () => {
    render(<ChatPage />)

    const input = screen.getByPlaceholderText("Message...")
    const sendButton = screen.getByRole("button", { name: /send/i })

    fireEvent.change(input, { target: { value: "Hello" } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument()
    })
  })

  it("displays assistant response", async () => {
    // Mock API response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ message: "Hi there!" })
      })
    ) as jest.Mock

    render(<ChatPage />)

    const input = screen.getByPlaceholderText("Message...")
    fireEvent.change(input, { target: { value: "Hello" } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      expect(screen.getByText("Hi there!")).toBeInTheDocument()
    })
  })
})
```

### 2. E2E Tests (Playwright)

```typescript
// e2e/chat.spec.ts
import { test, expect } from "@playwright/test"

test("complete chat flow", async ({ page }) => {
  await page.goto("http://localhost:3000/chat")

  // Type message
  await page.fill('textarea[placeholder="Message..."]', "What is AI?")

  // Send message
  await page.click('button[aria-label="Send message"]')

  // Wait for response
  await page.waitForSelector('text=Artificial Intelligence', {
    timeout: 10000
  })

  // Verify message appears
  expect(await page.textContent("body")).toContain("What is AI?")
})
```

### 3. Integration Tests with Chrome DevTools MCP

As Claude Code, use the Chrome DevTools MCP to verify:

```javascript
// 1. Navigate to page
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/chat" })

// 2. Take snapshot
mcp__chrome-devtools__take_snapshot()

// 3. Fill input
mcp__chrome-devtools__fill({ uid: "textarea-id", value: "test message" })

// 4. Submit
mcp__chrome-devtools__click({ uid: "send-button-id" })

// 5. Wait for response
mcp__chrome-devtools__wait_for({ text: "Assistant", timeout: 5000 })

// 6. Check for errors
mcp__chrome-devtools__list_console_messages()
```

---

## Security

### 1. Input Sanitization

```tsx
import DOMPurify from "dompurify"

// Sanitize user input before displaying
const sanitizedContent = DOMPurify.sanitize(msg.content, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "code", "pre"],
  ALLOWED_ATTR: ["href"]
})

<MessageContent>
  <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
</MessageContent>
```

**Note**: Prompt Kit's Markdown component already sanitizes content via `react-markdown`, which is XSS-safe.

### 2. API Authentication

```tsx
const sendMessage = async (content: string) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      "X-CSRF-Token": csrfToken
    },
    body: JSON.stringify({ message: content })
  })

  if (response.status === 401) {
    // Redirect to login
    router.push("/login")
  }
}
```

### 3. Rate Limiting (Frontend)

```tsx
import { useState, useCallback } from "react"

function useRateLimitedSubmit(limitMs: number = 1000) {
  const [lastSubmit, setLastSubmit] = useState(0)

  const submit = useCallback(async (fn: () => Promise<void>) => {
    const now = Date.now()
    if (now - lastSubmit < limitMs) {
      return // Too soon, ignore
    }

    setLastSubmit(now)
    await fn()
  }, [lastSubmit, limitMs])

  return submit
}

// Usage
const rateLimitedSubmit = useRateLimitedSubmit(1000)

const handleSubmit = () => {
  rateLimitedSubmit(async () => {
    await sendMessage(input)
  })
}
```

---

## UX Guidelines

### 1. Loading States

Show different loaders based on context:

```tsx
// While waiting for first token
{isLoading && messages[messages.length - 1]?.role === "user" && (
  <Loader variant="typing" />
)}

// While streaming
{isStreaming && (
  <Loader variant="pulse-dot" />
)}

// While processing tool calls
{toolCallState === "running" && (
  <Loader variant="circular" text="Searching web..." />
)}
```

### 2. Empty States

```tsx
{messages.length === 0 && (
  <div className="flex flex-col items-center justify-center h-full gap-4">
    <h2 className="text-2xl font-bold">Start a conversation</h2>
    <div className="flex flex-wrap gap-2">
      {[
        "Explain quantum computing",
        "Write a Python function",
        "Translate to Spanish"
      ].map(suggestion => (
        <PromptSuggestion
          key={suggestion}
          onClick={() => setInput(suggestion)}
        >
          {suggestion}
        </PromptSuggestion>
      ))}
    </div>
  </div>
)}
```

### 3. Error Recovery

```tsx
{error && (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <AlertCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-red-900 dark:text-red-100">
          Something went wrong
        </p>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
          {error}
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
          >
            Try again
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
```

### 4. Scroll Behavior

```tsx
// Auto-scroll only when user is at bottom
const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
const messagesEndRef = useRef<HTMLDivElement>(null)

const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
  setShouldAutoScroll(isAtBottom)
}

useEffect(() => {
  if (shouldAutoScroll) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
}, [messages, shouldAutoScroll])

<div onScroll={handleScroll}>
  {messages.map(...)}
  <div ref={messagesEndRef} />
</div>
```

**Note**: ChatContainer handles this automatically!

### 5. Progressive Disclosure

```tsx
// Show advanced options on demand
const [showAdvanced, setShowAdvanced] = useState(false)

<div>
  <PromptInput>
    <PromptInputTextarea />
    {showAdvanced && (
      <div className="p-2 border-t">
        <label>
          Temperature:
          <input type="range" min="0" max="1" step="0.1" />
        </label>
      </div>
    )}
    <PromptInputActions>
      <Button
        variant="ghost"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <SettingsIcon />
      </Button>
      <Button type="submit">Send</Button>
    </PromptInputActions>
  </PromptInput>
</div>
```

---

## Production Checklist

Before deploying:

- [ ] Implement error boundaries
- [ ] Add loading states for all async operations
- [ ] Handle network failures gracefully
- [ ] Implement rate limiting
- [ ] Add analytics/monitoring
- [ ] Test keyboard navigation
- [ ] Verify screen reader compatibility
- [ ] Test on mobile devices
- [ ] Optimize bundle size (lazy loading)
- [ ] Add E2E tests
- [ ] Security audit (XSS, CSRF, auth)
- [ ] Performance testing (1000+ messages)
- [ ] Browser compatibility testing
- [ ] Add proper error logging (Sentry, etc.)

---

**Version**: 1.0.0
**Last Updated**: 2025-01-23
