# Prompt Kit Documentation for Claude Code

> **Target Audience**: AI coding agents (Claude Code, Cursor, etc.)
> **Purpose**: Comprehensive guide for implementing Prompt Kit components in AI chat applications

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Component Reference](#component-reference)
4. [Usage Patterns](#usage-patterns)
5. [Common Recipes](#common-recipes)
6. [Integration Guide](#integration-guide)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### What is Prompt Kit?

Prompt Kit is a **library of customizable UI components for AI applications**, built on top of shadcn/ui. It provides ready-to-use components for:
- Chat interfaces
- AI agents
- Autonomous assistants
- Streaming responses
- Tool calling visualizations

### Prerequisites

```bash
# Required versions
Node.js >= 18
React >= 19
Next.js >= 15 (recommended)

# Must have shadcn/ui installed first
npx shadcn@latest init
```

### Installation Patterns

**Install Individual Components** (Recommended):
```bash
# Install specific component
npx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://prompt-kit.com/c/message.json"
npx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
```

**Note**: Prompt Kit also offers full-stack primitives (chatbot, tool-calling), but these are built for Vercel AI SDK. **For Vana's ADK architecture, use individual components** and integrate with your ADK backend as shown in the [Integration Guide](#integration-guide).

### File Locations After Installation

```
your-project/
├── components/
│   ├── prompt-kit/          # Core components installed here
│   │   ├── prompt-input.tsx
│   │   ├── message.tsx
│   │   ├── chat-container.tsx
│   │   ├── markdown.tsx
│   │   └── ...
│   └── ui/                  # shadcn/ui base components
│       ├── button.tsx
│       ├── textarea.tsx
│       └── ...
```

---

## Core Concepts

### 1. Component Philosophy

Prompt Kit follows **shadcn/ui principles**:
- ✅ Components are **copied into your project** (not npm installed)
- ✅ **Full source code access** - modify freely
- ✅ **No abstraction layers** - direct React components
- ✅ **Tailwind CSS** for styling

### 2. Component Composition Pattern

Most components use a **compound component pattern**:

```tsx
// ❌ Bad: Monolithic component
<ChatInput placeholder="Type..." onSubmit={handleSubmit} />

// ✅ Good: Composable components
<PromptInput value={input} onValueChange={setInput}>
  <PromptInputTextarea placeholder="Type..." />
  <PromptInputActions>
    <PromptInputAction tooltip="Send">
      <Button type="submit">Send</Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

**Benefits**:
- Better control over layout
- Easy to add/remove features
- Type-safe props
- Clear component hierarchy

### 3. Context-Based State Management

Components like `PromptInput` use **React Context** internally:

```tsx
// Internal context (you don't need to import this)
const PromptInputContext = createContext({
  isLoading: boolean,
  value: string,
  setValue: (value: string) => void,
  // ...
})

// Child components access context automatically
function PromptInputTextarea() {
  const { value, setValue } = usePromptInput() // Internal hook
  // ...
}
```

**Why this matters**:
- You don't need to pass props to every child
- State is automatically shared
- Cleaner component API

### 4. Streaming & Real-Time Support

Prompt Kit is **optimized for AI streaming responses**:

```tsx
// Markdown component has built-in memoization for streaming
<Message>
  <MessageContent markdown>
    {streamingText} {/* Re-renders efficiently as text streams */}
  </MessageContent>
</Message>

// Chat container auto-scrolls during streaming
<ChatContainerRoot>
  <ChatContainerContent>
    {messages.map(msg => <Message key={msg.id}>...</Message>)}
  </ChatContainerContent>
</ChatContainerRoot>
```

---

## Component Reference

### Core Chat Components

#### 1. **PromptInput** - User Input Field

**Purpose**: Auto-resizing textarea with actions (like ChatGPT input)

```tsx
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction
} from "@/components/prompt-kit/prompt-input"

<PromptInput
  value={input}
  onValueChange={setInput}
  onSubmit={handleSubmit}
  isLoading={isLoading}
  maxHeight={240}
>
  <PromptInputTextarea
    placeholder="Message..."
    disabled={isLoading}
  />
  <PromptInputActions>
    <PromptInputAction tooltip="Attach file">
      <Button variant="ghost" size="icon">
        <PaperclipIcon />
      </Button>
    </PromptInputAction>
    <PromptInputAction tooltip="Send">
      <Button type="submit" disabled={!input.trim()}>
        <ArrowUpIcon />
      </Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

**Key Props**:
- `value` / `onValueChange` - Controlled input
- `onSubmit` - Called on Enter (not Shift+Enter)
- `isLoading` - Disables input during processing
- `maxHeight` - Max textarea height before scroll

#### 2. **Message** - Chat Message Bubble

**Purpose**: Display user/assistant messages with avatars and actions

```tsx
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageActions,
  MessageAction
} from "@/components/prompt-kit/message"

<Message>
  <MessageAvatar
    src="/avatar.png"
    alt="User"
    fallback="U"
  />
  <div className="flex flex-col gap-2">
    <MessageContent markdown={true}>
      {message.content}
    </MessageContent>
    <MessageActions>
      <MessageAction tooltip="Copy">
        <Button variant="ghost" size="icon">
          <CopyIcon />
        </Button>
      </MessageAction>
      <MessageAction tooltip="Like">
        <Button variant="ghost" size="icon">
          <ThumbsUpIcon />
        </Button>
      </MessageAction>
    </MessageActions>
  </div>
</Message>
```

**Key Props**:
- `markdown={true}` - Renders content as Markdown (uses `react-markdown`)
- Avatar shows fallback text if image fails

#### 3. **ChatContainer** - Auto-Scrolling Container

**Purpose**: Intelligent auto-scroll that follows new messages (like ChatGPT)

```tsx
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor
} from "@/components/prompt-kit/chat-container"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"

<div className="relative h-screen">
  <ChatContainerRoot className="h-full">
    <ChatContainerContent className="space-y-4 p-4">
      {messages.map(msg => (
        <Message key={msg.id}>...</Message>
      ))}
    </ChatContainerContent>
    <ChatContainerScrollAnchor />
  </ChatContainerRoot>

  {/* Optional: Scroll to bottom button */}
  <div className="absolute bottom-4 right-4">
    <ScrollButton />
  </div>
</div>
```

**Auto-Scroll Behavior**:
- ✅ Auto-scrolls when new content added (if already at bottom)
- ✅ Stops auto-scroll when user scrolls up
- ✅ Resumes auto-scroll when user scrolls back to bottom
- ✅ Smooth spring animations

#### 4. **Markdown** - Rich Text Rendering

**Purpose**: Render markdown with syntax highlighting and memoization

```tsx
import { Markdown } from "@/components/prompt-kit/markdown"

<Markdown
  id={message.id}  // Important for memoization!
  className="prose dark:prose-invert"
>
  {markdownContent}
</Markdown>
```

**Features**:
- GitHub Flavored Markdown (tables, strikethrough, task lists)
- Syntax highlighting via Shiki
- **Memoization** for streaming performance
- Code blocks with copy button

**Dependencies**:
```bash
npm install react-markdown remark-gfm remark-breaks shiki marked
```

#### 5. **CodeBlock** - Syntax Highlighted Code

**Purpose**: Display code with syntax highlighting

```tsx
import { CodeBlock, CodeBlockCode } from "@/components/prompt-kit/code-block"

<CodeBlock>
  <CodeBlockCode
    code={codeString}
    language="typescript"
    theme="github-dark"
  />
</CodeBlock>
```

**Supported Themes**:
- `github-light` (default)
- `github-dark`
- `dracula`
- `nord`
- Many more (see Shiki docs)

### Advanced Components

#### 6. **Loader** - Loading States

```tsx
import { Loader } from "@/components/prompt-kit/loader"

<Loader variant="circular" size="md" />
<Loader variant="typing" size="sm" />
<Loader variant="pulse-dot" size="lg" />
<Loader variant="text-shimmer" text="Thinking..." />
```

**Variants**: `circular`, `classic`, `pulse`, `pulse-dot`, `dots`, `typing`, `wave`, `bars`, `terminal`, `text-blink`, `text-shimmer`, `loading-dots`

#### 7. **Tool** - Display Tool Calls

**Purpose**: Visualize AI tool usage (compatible with ADK tool calling format)

```tsx
import { Tool } from "@/components/prompt-kit/tool"

<Tool
  toolPart={{
    type: "web_search",
    state: "completed",
    input: { query: "latest news" },
    output: { results: [...] },
    toolCallId: "call_123"
  }}
  defaultOpen={false}
/>
```

**States**: `pending`, `running`, `completed`, `error`

#### 8. **Source** - Web Sources Display

```tsx
import { Source, SourceTrigger, SourceContent } from "@/components/prompt-kit/source"

<Source href="https://example.com">
  <SourceTrigger label="[1]" showFavicon />
  <SourceContent
    title="Example Site"
    description="Information source"
  />
</Source>
```

#### 9. **Reasoning** - Collapsible Reasoning Display

```tsx
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/prompt-kit/reasoning"

<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger>View reasoning</ReasoningTrigger>
  <ReasoningContent markdown>
    {reasoningText}
  </ReasoningContent>
</Reasoning>
```

**Auto-closes** when `isStreaming` becomes `false`.

#### 10. **FileUpload** - Drag & Drop Files

```tsx
import { FileUpload, FileUploadTrigger, FileUploadContent } from "@/components/prompt-kit/file-upload"

<FileUpload
  onFilesAdded={handleFiles}
  accept=".jpg,.png,.pdf"
  multiple
>
  <FileUploadContent>
    <FileUploadTrigger asChild>
      <Button variant="ghost" size="icon">
        <PaperclipIcon />
      </Button>
    </FileUploadTrigger>
  </FileUploadContent>
</FileUpload>
```

---

## Usage Patterns

### Pattern 1: Basic Chat Interface

```tsx
"use client"

import { useState } from "react"
import { ChatContainerRoot, ChatContainerContent } from "@/components/prompt-kit/chat-container"
import { Message, MessageContent } from "@/components/prompt-kit/message"
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input"

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!input.trim()) return

    const userMessage = { id: Date.now(), role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Call your AI API here
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input })
    })

    const data = await response.json()
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "assistant",
      content: data.message
    }])
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="space-y-4 p-4">
          {messages.map(msg => (
            <Message key={msg.id}>
              <MessageContent markdown={msg.role === "assistant"}>
                {msg.content}
              </MessageContent>
            </Message>
          ))}
        </ChatContainerContent>
      </ChatContainerRoot>

      <div className="p-4 border-t">
        <PromptInput
          value={input}
          onValueChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        >
          <PromptInputTextarea placeholder="Message..." />
        </PromptInput>
      </div>
    </div>
  )
}
```

###Pattern 2: Streaming Responses (ADK/SSE)

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Message, MessageContent } from "@/components/prompt-kit/message"
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input"

export default function StreamingChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return

    // Add user message
    const userMsg = { id: Date.now().toString(), role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Connect to ADK SSE endpoint
    const sessionId = "session-" + Date.now()
    const eventSource = new EventSource(
      `/api/sse/run_sse?session_id=${sessionId}&message=${encodeURIComponent(input)}`
    )

    let assistantContent = ""
    const assistantId = (Date.now() + 1).toString()

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.content) {
        assistantContent += data.content
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.id === assistantId) {
            return [...prev.slice(0, -1), { ...last, content: assistantContent }]
          }
          return [...prev, { id: assistantId, role: "assistant", content: assistantContent }]
        })
      }

      if (data.done) {
        eventSource.close()
        setIsLoading(false)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setIsLoading(false)
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

  return (
    <div className="space-y-4">
      {messages.map(msg => (
        <Message key={msg.id}>
          <MessageContent
            markdown
            id={msg.id} // Important for memoization!
          >
            {msg.content}
          </MessageContent>
        </Message>
      ))}

      <PromptInput
        value={input}
        onValueChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        <PromptInputTextarea />
      </PromptInput>
    </div>
  )
}
```

### Pattern 3: With Tool Calling (ADK)

```tsx
import { Tool } from "@/components/prompt-kit/tool"
import { Message, MessageContent } from "@/components/prompt-kit/message"

// ADK returns tool calls in the SSE stream
{messages.map(msg => (
  <Message key={msg.id}>
    {msg.role === "assistant" && msg.toolCalls?.map(tool => (
      <Tool
        key={tool.id}
        toolPart={{
          type: tool.name,
          state: tool.status, // "pending" | "running" | "completed" | "error"
          input: tool.input,
          output: tool.output,
          toolCallId: tool.id,
          errorText: tool.error
        }}
      />
    ))}
    <MessageContent markdown id={msg.id}>{msg.content}</MessageContent>
  </Message>
))}
```

---

## Common Recipes

### Recipe 1: ChatGPT-Style Interface

```tsx
<div className="flex h-screen">
  {/* Sidebar with chat history */}
  <Sidebar>
    <SidebarContent>
      {/* Chat history */}
    </SidebarContent>
  </Sidebar>

  {/* Main chat area */}
  <div className="flex-1 flex flex-col">
    <ChatContainerRoot className="flex-1">
      <ChatContainerContent>
        {messages.map(msg => (
          <Message key={msg.id}>
            <MessageAvatar
              src={msg.role === "user" ? "/user.png" : "/assistant.png"}
              alt={msg.role}
              fallback={msg.role[0].toUpperCase()}
            />
            <MessageContent markdown>{msg.content}</MessageContent>
          </Message>
        ))}
      </ChatContainerContent>
    </ChatContainerRoot>

    <div className="p-4 border-t">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea />
        <PromptInputActions>
          <PromptInputAction tooltip="Send">
            <Button type="submit"><ArrowUpIcon /></Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>
    </div>
  </div>
</div>
```

### Recipe 2: Prompt Suggestions (Like Search)

```tsx
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"

const suggestions = [
  "Explain quantum computing",
  "Write a Python function",
  "Translate to Spanish"
]

<div className="flex flex-wrap gap-2 p-4">
  {suggestions.map(text => (
    <PromptSuggestion
      key={text}
      onClick={() => setInput(text)}
    >
      {text}
    </PromptSuggestion>
  ))}
</div>
```

### Recipe 3: File Upload with Input

```tsx
<PromptInput>
  <PromptInputTextarea />
  <PromptInputActions>
    <FileUpload onFilesAdded={handleFiles}>
      <FileUploadTrigger asChild>
        <PromptInputAction tooltip="Attach">
          <Button variant="ghost" size="icon">
            <PaperclipIcon />
          </Button>
        </PromptInputAction>
      </FileUploadTrigger>
    </FileUpload>
    <PromptInputAction tooltip="Send">
      <Button type="submit"><ArrowUpIcon /></Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

---

## Integration Guide

### With Google ADK (SSE Streaming)

```tsx
import { useState, useEffect } from "react"

function useADKStream(sessionId: string) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (content: string) => {
    setIsLoading(true)
    setMessages(prev => [...prev, { role: "user", content }])

    const eventSource = new EventSource(
      `/api/sse/run_sse?session_id=${sessionId}&message=${encodeURIComponent(content)}`
    )

    let assistantMessage = ""

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.content) {
        assistantMessage += data.content
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: assistantMessage }]
          }
          return [...prev, { role: "assistant", content: assistantMessage }]
        })
      }
      if (data.done) {
        eventSource.close()
        setIsLoading(false)
      }
    }
  }

  return { messages, sendMessage, isLoading }
}

export default function ADKChat() {
  const { messages, sendMessage, isLoading } = useADKStream("session-123")
  const [input, setInput] = useState("")

  const handleSubmit = () => {
    if (input.trim()) {
      sendMessage(input)
      setInput("")
    }
  }

  return (
    <>
      {messages.map((msg, i) => (
        <Message key={i}>
          <MessageContent markdown id={`msg-${i}`}>
            {msg.content}
          </MessageContent>
        </Message>
      ))}
      <PromptInput
        value={input}
        onValueChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        <PromptInputTextarea />
      </PromptInput>
    </>
  )
}
```

### Backend API Example (FastAPI + ADK)

Your FastAPI backend should expose the SSE endpoint that Prompt Kit connects to:

```python
# app/routes/sse.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.integration.adk_client import ADKClient

router = APIRouter()

@router.get("/api/sse/run_sse")
async def run_sse(session_id: str, message: str):
    """Stream ADK responses via SSE"""
    adk_client = ADKClient()

    async def event_stream():
        async for chunk in adk_client.stream_response(session_id, message):
            # Format as SSE
            yield f"data: {json.dumps(chunk)}\\n\\n"

        # Send done signal
        yield f"data: {json.dumps({'done': True})}\\n\\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

See `/app/routes/sse.py` in the Vana project for the complete implementation.

---

## Troubleshooting

### Issue: Components not found after installation

**Problem**: Import errors after running `npx shadcn add`

**Solution**:
```bash
# Check file was created
ls components/prompt-kit/

# If missing, manually copy from:
# https://github.com/ibelick/prompt-kit/tree/main/components/prompt-kit

# Or reinstall:
npx shadcn@latest add "https://prompt-kit.com/c/[component].json"
```

### Issue: Styling looks broken

**Problem**: Components don't have correct styles

**Solution**:
1. Verify Tailwind CSS is configured:
```js
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  // ...
}
```

2. Install Tailwind Typography (for markdown):
```bash
npm install -D @tailwindcss/typography
```

3. Add to tailwind.config.js:
```js
module.exports = {
  plugins: [require("@tailwindcss/typography")],
}
```

### Issue: Auto-scroll not working

**Problem**: `ChatContainer` not scrolling to new messages

**Solution**:
- Must use `ChatContainerRoot` as parent
- Must include `ChatContainerScrollAnchor`
- Do NOT use custom scroll containers

```tsx
// ❌ Wrong
<div className="overflow-auto">
  {messages.map(...)}
</div>

// ✅ Correct
<ChatContainerRoot>
  <ChatContainerContent>
    {messages.map(...)}
  </ChatContainerContent>
  <ChatContainerScrollAnchor />
</ChatContainerRoot>
```

### Issue: Markdown not rendering

**Problem**: Markdown shows as plain text

**Solution**:
1. Install dependencies:
```bash
npm install react-markdown remark-gfm remark-breaks
```

2. Use `markdown={true}` prop:
```tsx
<MessageContent markdown>{content}</MessageContent>
```

### Issue: Code blocks not highlighted

**Problem**: Code appears without syntax highlighting

**Solution**:
1. Install Shiki:
```bash
npm install shiki
```

2. Markdown automatically uses CodeBlock for syntax highlighting

---

## Best Practices for AI Agents

### When to Use Prompt Kit

✅ **Good Use Cases**:
- Building chat interfaces
- AI assistant UIs
- Tool calling visualizations
- Streaming response displays
- Conversational interfaces

❌ **Not Ideal For**:
- Static documentation sites
- Form-heavy applications
- Data tables/grids
- Admin dashboards

### Component Selection Guide

| Need | Component | Why |
|------|-----------|-----|
| User input | `PromptInput` | Auto-resize, Enter to submit |
| Display messages | `Message` | Avatars, markdown, actions |
| Chat history | `ChatContainer` | Auto-scroll, performance |
| Code snippets | `CodeBlock` | Syntax highlighting |
| AI reasoning | `Reasoning` | Collapsible, auto-close |
| Tool calls | `Tool` | Expandable details |
| Web sources | `Source` | Hover preview |
| Loading states | `Loader` | Multiple variants |

### Performance Tips

1. **Use memoization for streaming**:
```tsx
<Markdown id={message.id}>{content}</Markdown>
```

2. **Lazy load heavy components**:
```tsx
const CodeBlock = lazy(() => import("@/components/prompt-kit/code-block"))
```

3. **Virtualize long message lists** (for 100+ messages):
```tsx
import { Virtuoso } from "react-virtuoso"

<Virtuoso
  data={messages}
  itemContent={(index, msg) => <Message>{msg.content}</Message>}
/>
```

---

## Additional Resources

- **Official Docs**: https://www.prompt-kit.com/docs
- **GitHub**: https://github.com/ibelick/prompt-kit
- **Blocks**: https://www.prompt-kit.com/blocks (pre-built patterns)
- **shadcn/ui Docs**: https://ui.shadcn.com
- **Google ADK**: https://github.com/google/adk-python

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Maintained For**: Claude Code, Cursor, Windsurf, and other AI coding agents
