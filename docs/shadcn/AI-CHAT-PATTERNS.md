# AI Chat Interface Patterns

> **Production-tested patterns for building AI chat applications with shadcn/ui and prompt-kit**

## 📋 Table of Contents

1. [Basic Chat Interface](#basic-chat-interface)
2. [Streaming Chat with SSE](#streaming-chat-with-sse)
3. [Chat with Tool Calling](#chat-with-tool-calling)
4. [Multi-Agent Chat](#multi-agent-chat)
5. [Advanced Features](#advanced-features)

---

## Basic Chat Interface

### Pattern: Simple Q&A Chat

**Use Case:** Basic question-answer AI chat without streaming

**Components Needed:**
- `PromptInput` - User input
- `Message` - Display messages
- `ChatContainer` - Auto-scrolling
- `Loader` - Loading states

**Architecture:**

```
┌─────────────────────────────────┐
│      Chat Container             │
│  ┌───────────────────────────┐  │
│  │   Message (User)          │  │
│  │   Message (AI)            │  │
│  │   Message (User)          │  │
│  │   Loader (if loading)     │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │   Prompt Input            │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Code Pattern:**

```tsx
import { ChatContainerRoot, ChatContainerContent } from "@/components/prompt-kit/chat-container"
import { Message, MessageAvatar, MessageContent } from "@/components/prompt-kit/message"
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input"
import { Loader } from "@/components/prompt-kit/loader"

export function BasicChat() {
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string}>>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!input.trim()) return

    const userMessage = { id: crypto.randomUUID(), role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      const data = await response.json()
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.content }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="space-y-4 p-4">
          {messages.map((message) => (
            <Message key={message.id}>
              <MessageAvatar
                src={message.role === 'user' ? '/user-avatar.png' : '/ai-avatar.png'}
                alt={message.role}
              />
              <MessageContent markdown>{message.content}</MessageContent>
            </Message>
          ))}
          {isLoading && <Loader variant="typing" />}
        </ChatContainerContent>
      </ChatContainerRoot>

      <div className="border-t p-4">
        <PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit} isLoading={isLoading}>
          <PromptInputTextarea placeholder="Ask me anything..." />
        </PromptInput>
      </div>
    </div>
  )
}
```

---

## Streaming Chat with SSE

### Pattern: Real-time Streaming Responses

**Use Case:** Stream AI responses token-by-token for better UX

**Additional Components:**
- `Markdown` with streaming optimization
- `ScrollButton` for manual scroll control

**Key Concept:** Use `useEffect` to handle SSE connections and append to message content

**Code Pattern:**

```tsx
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from "@/components/prompt-kit/chat-container"
import { Message, MessageAvatar, MessageContent } from "@/components/prompt-kit/message"
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Markdown } from "@/components/prompt-kit/markdown"

export function StreamingChat() {
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string}>>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")

  const handleSubmit = async () => {
    if (!input.trim()) return

    const userMessage = { id: crypto.randomUUID(), role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsStreaming(true)
    setStreamingMessage("")

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              setStreamingMessage(prev => prev + (parsed.content || ''))
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }

      // Save complete message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingMessage
      }])
      setStreamingMessage("")
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="relative flex h-screen flex-col">
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="space-y-4 p-4">
          {messages.map((message) => (
            <Message key={message.id}>
              <MessageAvatar
                src={message.role === 'user' ? '/user-avatar.png' : '/ai-avatar.png'}
                alt={message.role}
              />
              <MessageContent markdown>
                <Markdown id={message.id}>{message.content}</Markdown>
              </MessageContent>
            </Message>
          ))}

          {/* Streaming message */}
          {isStreaming && streamingMessage && (
            <Message>
              <MessageAvatar src="/ai-avatar.png" alt="AI" />
              <MessageContent markdown>
                <Markdown id="streaming">{streamingMessage}</Markdown>
              </MessageContent>
            </Message>
          )}
        </ChatContainerContent>
        <ChatContainerScrollAnchor />

        {/* Scroll to bottom button */}
        <div className="absolute bottom-4 right-4">
          <ScrollButton />
        </div>
      </ChatContainerRoot>

      <div className="border-t p-4">
        <PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit} isLoading={isStreaming}>
          <PromptInputTextarea placeholder="Ask me anything..." />
        </PromptInput>
      </div>
    </div>
  )
}
```

**★ Insight ─────────────────────────────────────**
- Markdown component has built-in memoization for streaming
- Always provide unique `id` prop to prevent re-rendering
- ChatContainer's auto-scroll works seamlessly with streaming
─────────────────────────────────────────────────

---

## Chat with Tool Calling

### Pattern: AI with Function Calling

**Use Case:** Display when AI calls tools/functions

**Additional Components:**
- `Tool` - Display tool executions
- `Steps` - Show processing steps
- `Reasoning` - Show AI reasoning

**Architecture:**

```
┌─────────────────────────────────┐
│   Message (User): "What's       │
│   the weather in SF?"           │
├─────────────────────────────────┤
│   Message (AI):                 │
│   ┌───────────────────────────┐ │
│   │ Reasoning (collapsible)   │ │
│   │ "I need to check weather" │ │
│   └───────────────────────────┘ │
│   ┌───────────────────────────┐ │
│   │ Tool: get_weather         │ │
│   │ Input: {city: "SF"}       │ │
│   │ Output: {temp: 72}        │ │
│   └───────────────────────────┘ │
│   "It's 72°F in San Francisco" │
└─────────────────────────────────┘
```

**Code Pattern:**

```tsx
import { Tool } from "@/components/prompt-kit/tool"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/prompt-kit/reasoning"
import { Steps, StepsItem } from "@/components/prompt-kit/steps"

type ToolCall = {
  type: string
  state: 'pending' | 'running' | 'completed' | 'error'
  input: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId: string
  errorText?: string
}

type AIMessage = {
  id: string
  role: 'assistant'
  content: string
  reasoning?: string
  toolCalls?: ToolCall[]
  steps?: Array<{title: string, description: string}>
}

export function ToolCallingChat() {
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'assistant'} & (
    | {role: 'user', content: string}
    | AIMessage
  )>>([])

  return (
    <ChatContainerRoot>
      <ChatContainerContent className="space-y-4 p-4">
        {messages.map((message) => (
          <Message key={message.id}>
            <MessageAvatar
              src={message.role === 'user' ? '/user-avatar.png' : '/ai-avatar.png'}
              alt={message.role}
            />
            <MessageContent>
              {message.role === 'assistant' && (
                <>
                  {/* Show AI reasoning */}
                  {message.reasoning && (
                    <Reasoning isStreaming={false}>
                      <ReasoningTrigger />
                      <ReasoningContent markdown>{message.reasoning}</ReasoningContent>
                    </Reasoning>
                  )}

                  {/* Show processing steps */}
                  {message.steps && message.steps.length > 0 && (
                    <Steps>
                      {message.steps.map((step, idx) => (
                        <StepsItem key={idx} title={step.title}>
                          {step.description}
                        </StepsItem>
                      ))}
                    </Steps>
                  )}

                  {/* Show tool calls */}
                  {message.toolCalls?.map((toolCall) => (
                    <Tool
                      key={toolCall.toolCallId}
                      toolPart={toolCall}
                      defaultOpen={false}
                    />
                  ))}

                  {/* Final response */}
                  <Markdown id={message.id}>{message.content}</Markdown>
                </>
              )}

              {message.role === 'user' && message.content}
            </MessageContent>
          </Message>
        ))}
      </ChatContainerContent>
    </ChatContainerRoot>
  )
}
```

---

## Multi-Agent Chat

### Pattern: Multiple AI Agents Responding

**Use Case:** Show responses from different specialized agents

**Key Difference:** Different avatars, agent names, and routing logic

**Code Pattern:**

```tsx
type AgentType = 'planner' | 'researcher' | 'evaluator' | 'composer'

type AgentMessage = {
  id: string
  role: 'assistant'
  agent: AgentType
  content: string
  reasoning?: string
}

const AGENT_CONFIG: Record<AgentType, {name: string, avatar: string, color: string}> = {
  planner: { name: 'Plan Generator', avatar: '/agents/planner.png', color: 'bg-blue-500' },
  researcher: { name: 'Researcher', avatar: '/agents/researcher.png', color: 'bg-green-500' },
  evaluator: { name: 'Evaluator', avatar: '/agents/evaluator.png', color: 'bg-purple-500' },
  composer: { name: 'Composer', avatar: '/agents/composer.png', color: 'bg-orange-500' }
}

export function MultiAgentChat() {
  const [messages, setMessages] = useState<Array<
    {id: string, role: 'user', content: string} | AgentMessage
  >>([])

  return (
    <ChatContainerRoot>
      <ChatContainerContent className="space-y-4 p-4">
        {messages.map((message) => (
          <Message key={message.id}>
            {message.role === 'assistant' ? (
              <>
                <MessageAvatar
                  src={AGENT_CONFIG[message.agent].avatar}
                  alt={AGENT_CONFIG[message.agent].name}
                />
                <div className="flex-1">
                  {/* Agent name badge */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${AGENT_CONFIG[message.agent].color}`} />
                    <span className="text-sm font-medium text-muted-foreground">
                      {AGENT_CONFIG[message.agent].name}
                    </span>
                  </div>
                  <MessageContent markdown>
                    <Markdown id={message.id}>{message.content}</Markdown>
                  </MessageContent>
                </div>
              </>
            ) : (
              <>
                <MessageAvatar src="/user-avatar.png" alt="You" />
                <MessageContent>{message.content}</MessageContent>
              </>
            )}
          </Message>
        ))}
      </ChatContainerContent>
    </ChatContainerRoot>
  )
}
```

---

## Advanced Features

### 1. Prompt Suggestions

**Use Case:** Suggest prompts to users

```tsx
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"

const suggestions = [
  "Explain quantum computing",
  "Write a Python function",
  "Analyze this data"
]

<div className="flex flex-wrap gap-2 p-4">
  {suggestions.map((suggestion) => (
    <PromptSuggestion
      key={suggestion}
      onClick={() => setInput(suggestion)}
    >
      {suggestion}
    </PromptSuggestion>
  ))}
</div>
```

### 2. File Upload

**Use Case:** Upload files with prompts

```tsx
import { FileUpload, FileUploadTrigger, FileUploadContent } from "@/components/prompt-kit/file-upload"
import { Paperclip } from "lucide-react"

<PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit}>
  <PromptInputTextarea placeholder="Ask about your files..." />
  <PromptInputActions>
    <FileUpload
      onFilesAdded={(files) => setUploadedFiles(prev => [...prev, ...files])}
      accept=".pdf,.txt,.md"
      multiple
    >
      <FileUploadTrigger asChild>
        <PromptInputAction tooltip="Attach files">
          <Paperclip className="h-4 w-4" />
        </PromptInputAction>
      </FileUploadTrigger>
    </FileUpload>
  </PromptInputActions>
</PromptInput>
```

### 3. Source Citations

**Use Case:** Show sources AI used

```tsx
import { Source, SourceTrigger, SourceContent } from "@/components/prompt-kit/source"

<Message>
  <MessageContent>
    According to recent studies...
    <Source href="https://example.com/study">
      <SourceTrigger label="1" showFavicon />
      <SourceContent
        title="AI Research Study 2024"
        description="Latest findings in AI safety"
      />
    </Source>
  </MessageContent>
</Message>
```

### 4. System Messages

**Use Case:** Show system notifications/warnings

```tsx
import { SystemMessage } from "@/components/prompt-kit/system-message"

<SystemMessage variant="warning">
  Your session will expire in 5 minutes
</SystemMessage>

<SystemMessage variant="info">
  New AI model available! Try it now.
</SystemMessage>
```

---

## Performance Optimization

### 1. Markdown Memoization

**Always use `id` prop for streaming:**

```tsx
<Markdown id={message.id}>{message.content}</Markdown>
```

This prevents re-rendering of previous messages during streaming.

### 2. Virtual Scrolling for Long Chats

For chats with 1000+ messages, use react-window:

```tsx
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <Message key={messages[index].id}>
        {/* ... */}
      </Message>
    </div>
  )}
</FixedSizeList>
```

### 3. Code Block Caching

Code blocks use Shiki for syntax highlighting. Cache highlighted code:

```tsx
const highlightedCode = useMemo(() => {
  return highlightCode(code, language)
}, [code, language])
```

---

## Accessibility Best Practices

### 1. ARIA Labels

```tsx
<PromptInputTextarea
  placeholder="Ask me anything..."
  aria-label="Chat input"
/>

<ScrollButton aria-label="Scroll to bottom" />
```

### 2. Keyboard Navigation

```tsx
<PromptInput
  onSubmit={handleSubmit}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }}
/>
```

### 3. Focus Management

```tsx
const inputRef = useRef<HTMLTextAreaElement>(null)

useEffect(() => {
  if (!isLoading) {
    inputRef.current?.focus()
  }
}, [isLoading])
```

---

## Testing Patterns

### 1. Component Testing

```tsx
import { render, screen } from '@testing-library/react'
import { Message } from '@/components/prompt-kit/message'

test('renders message content', () => {
  render(
    <Message>
      <MessageContent>Hello world</MessageContent>
    </Message>
  )
  expect(screen.getByText('Hello world')).toBeInTheDocument()
})
```

### 2. Streaming Testing

```tsx
import { renderHook, act } from '@testing-library/react'

test('handles SSE streaming', async () => {
  const { result } = renderHook(() => useStreamingChat())

  await act(async () => {
    await result.current.sendMessage('Hello')
  })

  expect(result.current.messages).toHaveLength(2)
  expect(result.current.messages[1].role).toBe('assistant')
})
```

---

**Related Documentation:**
- [COMPONENT-REFERENCE.md](./COMPONENT-REFERENCE.md) - Detailed component APIs
- [CODE-EXAMPLES.md](./CODE-EXAMPLES.md) - More production examples
- [BEST-PRACTICES.md](./BEST-PRACTICES.md) - Advanced optimization
