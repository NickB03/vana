# Best Practices for shadcn/ui + prompt-kit

> **Production-tested best practices, optimization techniques, and common pitfalls to avoid**

## 📚 Table of Contents

1. [Performance Optimization](#performance-optimization)
2. [Accessibility](#accessibility)
3. [TypeScript Best Practices](#typescript-best-practices)
4. [Styling Guidelines](#styling-guidelines)
5. [Testing Strategies](#testing-strategies)
6. [Common Pitfalls](#common-pitfalls)
7. [Security Considerations](#security-considerations)

---

## Performance Optimization

### 1. Markdown Memoization (CRITICAL!)

**Problem:** Without memoization, every new token re-renders the entire message history.

❌ **BAD - Will re-render everything:**
```tsx
<Markdown>{message.content}</Markdown>
```

✅ **GOOD - Only re-renders changed blocks:**
```tsx
<Markdown id={message.id}>{message.content}</Markdown>
```

**How it works:**
- Markdown splits content into semantic blocks
- Each block is memoized separately
- Only changed/new blocks re-render
- MASSIVE performance improvement for streaming

### 2. Message List Virtualization

For chats with 100+ messages, use virtual scrolling:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedChat() {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated message height
    overscan: 5 // Render 5 extra items
  })

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <Message>{messages[virtualRow.index]}</Message>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3. Code Block Caching

Shiki highlighting is expensive - cache results:

```tsx
const highlightCache = new Map<string, string>()

function useHighlightedCode(code: string, language: string) {
  return useMemo(() => {
    const key = `${language}:${code}`
    if (highlightCache.has(key)) {
      return highlightCache.get(key)!
    }

    const highlighted = highlightCode(code, language)
    highlightCache.set(key, highlighted)
    return highlighted
  }, [code, language])
}
```

### 4. Debounce User Input

Prevent excessive re-renders from typing:

```tsx
import { useDebouncedCallback } from 'use-debounce'

const debouncedOnChange = useDebouncedCallback(
  (value: string) => {
    // Expensive operation (e.g., API call for suggestions)
    fetchSuggestions(value)
  },
  300 // 300ms delay
)

<PromptInputTextarea
  onChange={(e) => {
    setValue(e.target.value) // Immediate UI update
    debouncedOnChange(e.target.value) // Debounced API call
  }}
/>
```

### 5. Lazy Load Components

For complex components (file upload, code editor):

```tsx
import { lazy, Suspense } from 'react'

const CodeEditor = lazy(() => import('@/components/code-editor'))

<Suspense fallback={<Loader variant="circular" />}>
  <CodeEditor code={code} />
</Suspense>
```

### 6. Optimize Re-renders

Use `React.memo` for message components:

```tsx
const MessageMemo = React.memo(Message, (prev, next) => {
  // Only re-render if content or id changes
  return prev.id === next.id && prev.content === next.content
})
```

---

## Accessibility

### 1. ARIA Labels

Always provide aria-labels for interactive elements:

```tsx
<PromptInputTextarea
  placeholder="Ask me anything..."
  aria-label="Chat message input"
  aria-describedby="input-help-text"
/>

<ScrollButton aria-label="Scroll to bottom of chat" />

<MessageAction tooltip="Copy message" aria-label="Copy message to clipboard">
  <Copy className="h-4 w-4" />
</MessageAction>
```

### 2. Keyboard Navigation

Support keyboard-only users:

```tsx
// Submit on Enter, new line on Shift+Enter
<PromptInputTextarea
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }}
/>

// Escape to close reasoning
<Reasoning
  onOpenChange={(open) => setIsOpen(open)}
  onKeyDown={(e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }}
/>
```

### 3. Focus Management

Return focus to input after actions:

```tsx
const inputRef = useRef<HTMLTextAreaElement>(null)

const handleSubmit = async () => {
  await sendMessage()
  inputRef.current?.focus() // Return focus to input
}

<PromptInputTextarea ref={inputRef} />
```

### 4. Screen Reader Support

Announce new messages:

```tsx
const [announcement, setAnnouncement] = useState("")

useEffect(() => {
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === 'assistant') {
      setAnnouncement(`AI responded: ${lastMessage.content.slice(0, 100)}`)
    }
  }
}, [messages])

<div role="status" aria-live="polite" className="sr-only">
  {announcement}
</div>
```

### 5. Color Contrast

Ensure WCAG AA compliance:

```tsx
// ✅ Good contrast
<span className="text-gray-900 dark:text-gray-100">Message text</span>

// ❌ Poor contrast
<span className="text-gray-400 dark:text-gray-600">Message text</span>
```

---

## TypeScript Best Practices

### 1. Strict Message Typing

Use discriminated unions for messages:

```typescript
type UserMessage = {
  id: string
  role: 'user'
  content: string
  timestamp: number
}

type AssistantMessage = {
  id: string
  role: 'assistant'
  content: string
  timestamp: number
  reasoning?: string
  toolCalls?: ToolCall[]
  sources?: Source[]
}

type Message = UserMessage | AssistantMessage

// TypeScript knows which properties exist based on role
function renderMessage(message: Message) {
  if (message.role === 'assistant') {
    // TypeScript knows message.reasoning exists here
    return <Reasoning>{message.reasoning}</Reasoning>
  }
}
```

### 2. Tool Call Types

Strongly type tool calls:

```typescript
type ToolCallState = 'pending' | 'running' | 'completed' | 'error'

interface BaseToolCall {
  id: string
  toolCallId: string
  state: ToolCallState
  timestamp: number
}

interface WebSearchToolCall extends BaseToolCall {
  type: 'web_search'
  input: { query: string }
  output?: { results: SearchResult[] }
}

interface WeatherToolCall extends BaseToolCall {
  type: 'get_weather'
  input: { city: string }
  output?: { temperature: number, conditions: string }
}

type ToolCall = WebSearchToolCall | WeatherToolCall

// Type-safe tool rendering
function renderTool(tool: ToolCall) {
  switch (tool.type) {
    case 'web_search':
      return <div>Searched: {tool.input.query}</div>
    case 'get_weather':
      return <div>Weather in {tool.input.city}</div>
  }
}
```

### 3. Event Handler Types

Use correct event types:

```typescript
import type { KeyboardEvent, FormEvent, ChangeEvent } from 'react'

function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault()
  sendMessage()
}

function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
  setValue(e.target.value)
}
```

### 4. Component Props with Generics

Type-safe generic components:

```typescript
interface DataDisplayProps<T> {
  data: T
  renderItem: (item: T) => React.ReactNode
}

function DataDisplay<T>({ data, renderItem }: DataDisplayProps<T>) {
  return <div>{renderItem(data)}</div>
}

// Usage
<DataDisplay<ToolCall>
  data={toolCall}
  renderItem={(tool) => <Tool toolPart={tool} />}
/>
```

---

## Styling Guidelines

### 1. Use Theme Colors

Always use theme-aware colors:

```tsx
// ✅ Good - adapts to dark mode
<div className="bg-background text-foreground">
  <span className="text-muted-foreground">Timestamp</span>
</div>

// ❌ Bad - hard-coded colors
<div className="bg-white text-black">
  <span className="text-gray-500">Timestamp</span>
</div>
```

### 2. Consistent Spacing

Use Tailwind's spacing scale:

```tsx
// ✅ Consistent spacing
<div className="space-y-4 p-4">
  <div className="mb-4">Header</div>
  <div className="mt-4">Content</div>
</div>

// ❌ Arbitrary spacing
<div style={{ marginTop: '17px', padding: '13px' }}>
  Content
</div>
```

### 3. Responsive Design

Mobile-first approach:

```tsx
<div className="
  flex flex-col         // Mobile: stack vertically
  md:flex-row          // Tablet+: side by side
  gap-2                // Mobile: small gap
  md:gap-4             // Tablet+: larger gap
  p-2                  // Mobile: small padding
  md:p-4               // Tablet+: larger padding
">
  <div>Sidebar</div>
  <div className="flex-1">Content</div>
</div>
```

### 4. Component Composition

Prefer composition over configuration:

```tsx
// ✅ Good - flexible composition
<Message>
  <MessageAvatar src="/ai.png" />
  <MessageContent markdown>
    <Markdown>{content}</Markdown>
    <Tool toolPart={tool} />
  </MessageContent>
  <MessageActions>
    <MessageAction tooltip="Copy"><Copy /></MessageAction>
  </MessageActions>
</Message>

// ❌ Bad - too many props
<Message
  avatar="/ai.png"
  content={content}
  showMarkdown
  tools={[tool]}
  showCopyButton
  showLikeButton
/>
```

---

## Testing Strategies

### 1. Component Testing

Test user interactions:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptInput } from '@/components/prompt-kit/prompt-input'

test('submits message on Enter', () => {
  const handleSubmit = jest.fn()

  render(
    <PromptInput value="Hello" onSubmit={handleSubmit}>
      <PromptInputTextarea />
    </PromptInput>
  )

  const textarea = screen.getByRole('textbox')
  fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

  expect(handleSubmit).toHaveBeenCalled()
})
```

### 2. Streaming Testing

Test SSE streaming:

```tsx
test('handles streaming responses', async () => {
  const mockStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"content":"Hello"}\n'))
      controller.enqueue(new TextEncoder().encode('data: {"content":" world"}\n'))
      controller.close()
    }
  })

  global.fetch = jest.fn(() =>
    Promise.resolve({ body: mockStream } as Response)
  )

  const { result } = renderHook(() => useStreamingChat())
  await act(async () => {
    await result.current.sendMessage('Hi')
  })

  expect(result.current.messages[1].content).toBe('Hello world')
})
```

### 3. Accessibility Testing

```tsx
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('has no accessibility violations', async () => {
  const { container } = render(<ChatInterface />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Common Pitfalls

### 1. ❌ Forgetting Markdown `id` prop

**Problem:** Entire chat history re-renders on every token

```tsx
// ❌ BAD
<Markdown>{message.content}</Markdown>

// ✅ GOOD
<Markdown id={message.id}>{message.content}</Markdown>
```

### 2. ❌ Using ScrollButton without ChatContainer

**Problem:** ScrollButton only works inside ChatContainerRoot

```tsx
// ❌ BAD - won't work
<div className="overflow-auto">
  <ScrollButton />
</div>

// ✅ GOOD
<ChatContainerRoot>
  <ChatContainerContent>...</ChatContainerContent>
  <ScrollButton />
</ChatContainerRoot>
```

### 3. ❌ Not handling SSE connection errors

**Problem:** Silent failures, poor UX

```tsx
// ❌ BAD
const reader = response.body?.getReader()
while (reader) {
  const { value } = await reader.read()
  // No error handling
}

// ✅ GOOD
try {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No reader available')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // Process value
  }
} catch (error) {
  console.error('Streaming error:', error)
  setError('Connection lost. Please try again.')
} finally {
  setIsStreaming(false)
}
```

### 4. ❌ Heavy components in message list

**Problem:** Slow rendering, laggy scrolling

```tsx
// ❌ BAD
{messages.map(msg => (
  <HeavyComponent key={msg.id} message={msg} />
))}

// ✅ GOOD
const MessageItem = React.memo(({ message }) => (
  <LightComponent message={message} />
))

{messages.map(msg => (
  <MessageItem key={msg.id} message={msg} />
))}
```

### 5. ❌ Not handling mobile keyboards

**Problem:** Input hidden behind keyboard on mobile

```tsx
// ✅ Add proper viewport handling
<div className="flex h-screen flex-col">
  <div className="flex-1 overflow-auto">
    {/* Chat messages */}
  </div>
  <div className="flex-shrink-0 border-t p-4">
    {/* Always visible input */}
    <PromptInput />
  </div>
</div>
```

---

## Security Considerations

### 1. Sanitize User Input

Never trust user input:

```tsx
import DOMPurify from 'dompurify'

// ✅ Sanitize HTML before rendering
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userHtml)
}} />

// ✅ Markdown component handles this automatically
<Markdown>{userContent}</Markdown>
```

### 2. Validate File Uploads

```tsx
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']

<FileUpload
  onFilesAdded={(files) => {
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large`)
        return false
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not allowed`)
        return false
      }
      return true
    })
    handleFiles(validFiles)
  }}
/>
```

### 3. Rate Limiting

Prevent API abuse:

```tsx
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500 // Max users per interval
})

async function handleSubmit() {
  try {
    await limiter.check(userId, 10) // 10 requests per minute
    await sendMessage()
  } catch {
    toast.error('Too many requests. Please slow down.')
  }
}
```

### 4. XSS Protection

CodeBlock component automatically escapes code, but be careful with custom rendering:

```tsx
// ✅ Safe - CodeBlock escapes automatically
<CodeBlockCode code={userCode} language="javascript" />

// ❌ Dangerous - could execute code
<div dangerouslySetInnerHTML={{ __html: userCode }} />
```

---

## Performance Checklist

Before deploying to production:

- [ ] Markdown components have unique `id` props
- [ ] Message list uses virtualization (if >100 messages)
- [ ] Code highlighting is cached
- [ ] User input is debounced
- [ ] Large components are lazy-loaded
- [ ] Message components use `React.memo`
- [ ] SSE connections have error handling
- [ ] Mobile keyboard doesn't hide input
- [ ] Dark mode is properly supported
- [ ] Accessibility tested with screen reader
- [ ] No console errors or warnings

---

**Related Documentation:**
- [AI-CHAT-PATTERNS.md](./AI-CHAT-PATTERNS.md) - Common patterns
- [COMPONENT-REFERENCE.md](./COMPONENT-REFERENCE.md) - Component APIs
- [README.md](./README.md) - Getting started
