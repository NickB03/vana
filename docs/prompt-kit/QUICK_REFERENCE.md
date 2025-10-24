# Prompt Kit Quick Reference for Claude Code

> **⚡ Fast lookup guide** - Common commands, patterns, and component APIs

## Installation Commands

```bash
# Individual Components
npx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://prompt-kit.com/c/message.json"
npx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://prompt-kit.com/c/markdown.json"
npx shadcn@latest add "https://prompt-kit.com/c/code-block.json"
npx shadcn@latest add "https://prompt-kit.com/c/loader.json"
npx shadcn@latest add "https://prompt-kit.com/c/scroll-button.json"
npx shadcn@latest add "https://prompt-kit.com/c/prompt-suggestion.json"
npx shadcn@latest add "https://prompt-kit.com/c/reasoning.json"
npx shadcn@latest add "https://prompt-kit.com/c/tool.json"
npx shadcn@latest add "https://prompt-kit.com/c/source.json"
npx shadcn@latest add "https://prompt-kit.com/c/file-upload.json"
npx shadcn@latest add "https://prompt-kit.com/c/response-stream.json"
npx shadcn@latest add "https://prompt-kit.com/c/jsx-preview.json"
npx shadcn@latest add "https://prompt-kit.com/c/steps.json"
npx shadcn@latest add "https://prompt-kit.com/c/system-message.json"

# Note: Primitives like chatbot/tool-calling are for Vercel AI SDK
# For Vana's ADK architecture, use individual components instead
```

## Required Dependencies

```bash
# Core
npm install lucide-react class-variance-authority clsx

# For Markdown
npm install react-markdown remark-gfm remark-breaks marked

# For Code Blocks
npm install shiki

# For Streaming with ADK (uses native EventSource)
# No additional packages needed - use browser EventSource API

# For Tailwind Typography (recommended)
npm install -D @tailwindcss/typography
```

## Component Cheat Sheet

### PromptInput

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
  <PromptInputTextarea placeholder="Type..." />
  <PromptInputActions>
    <PromptInputAction tooltip="Send">
      <Button><ArrowUpIcon /></Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

**Props**:
- `value` / `onValueChange` - Controlled input
- `onSubmit` - Triggered on Enter (not Shift+Enter)
- `isLoading` - Disables input
- `maxHeight` - Max height before scrolling (default: 240)

---

### Message

```tsx
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageActions,
  MessageAction
} from "@/components/prompt-kit/message"

<Message>
  <MessageAvatar src="/avatar.png" alt="User" fallback="U" />
  <div className="flex flex-col gap-2">
    <MessageContent markdown>{content}</MessageContent>
    <MessageActions>
      <MessageAction tooltip="Copy">
        <Button variant="ghost" size="icon"><CopyIcon /></Button>
      </MessageAction>
    </MessageActions>
  </div>
</Message>
```

**Props**:
- `MessageContent.markdown` - Enable markdown rendering
- `MessageAvatar.fallback` - Text shown if image fails

---

### ChatContainer

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
      {messages.map(msg => <Message key={msg.id}>...</Message>)}
    </ChatContainerContent>
    <ChatContainerScrollAnchor />
  </ChatContainerRoot>

  <div className="absolute bottom-4 right-4">
    <ScrollButton />
  </div>
</div>
```

**Features**:
- Auto-scrolls to new messages (if at bottom)
- User scroll up = stop auto-scroll
- User scroll to bottom = resume auto-scroll

---

### Markdown

```tsx
import { Markdown } from "@/components/prompt-kit/markdown"

<Markdown
  id={message.id}  // REQUIRED for memoization!
  className="prose dark:prose-invert"
>
  {markdownContent}
</Markdown>
```

**Important**: Always provide `id` prop for streaming performance!

---

### CodeBlock

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

**Languages**: `typescript`, `javascript`, `python`, `rust`, `go`, `bash`, etc.
**Themes**: `github-light`, `github-dark`, `dracula`, `nord`, etc.

---

### Loader

```tsx
import { Loader } from "@/components/prompt-kit/loader"

<Loader variant="circular" size="md" />
<Loader variant="typing" />
<Loader variant="text-shimmer" text="Thinking..." />
```

**Variants**: `circular`, `classic`, `pulse`, `pulse-dot`, `dots`, `typing`, `wave`, `bars`, `terminal`, `text-blink`, `text-shimmer`, `loading-dots`
**Sizes**: `sm`, `md`, `lg`

---

### Tool

```tsx
import { Tool } from "@/components/prompt-kit/tool"

<Tool
  toolPart={{
    type: "web_search",
    state: "completed",
    input: { query: "..." },
    output: { results: [...] },
    toolCallId: "call_123",
    errorText: undefined
  }}
  defaultOpen={false}
/>
```

**States**: `pending`, `running`, `completed`, `error`

---

### Source

```tsx
import { Source, SourceTrigger, SourceContent } from "@/components/prompt-kit/source"

<Source href="https://example.com">
  <SourceTrigger label="[1]" showFavicon />
  <SourceContent title="Example" description="Info source" />
</Source>
```

---

### Reasoning

```tsx
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/prompt-kit/reasoning"

<Reasoning isStreaming={isStreaming} open={open} onOpenChange={setOpen}>
  <ReasoningTrigger>View reasoning</ReasoningTrigger>
  <ReasoningContent markdown>{reasoningText}</ReasoningContent>
</Reasoning>
```

**Auto-closes** when `isStreaming` becomes `false`.

---

### PromptSuggestion

```tsx
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"

// Normal mode
<PromptSuggestion onClick={() => setInput(text)}>
  {text}
</PromptSuggestion>

// Highlight mode
<PromptSuggestion highlight="python">
  Write a python function
</PromptSuggestion>
```

---

### FileUpload

```tsx
import { FileUpload, FileUploadTrigger, FileUploadContent } from "@/components/prompt-kit/file-upload"

<FileUpload
  onFilesAdded={handleFiles}
  accept=".jpg,.png,.pdf"
  multiple
>
  <FileUploadContent>
    <FileUploadTrigger asChild>
      <Button><PaperclipIcon /></Button>
    </FileUploadTrigger>
  </FileUploadContent>
</FileUpload>
```

---

## Common Patterns

### Basic Chat

```tsx
const [messages, setMessages] = useState([])
const [input, setInput] = useState("")

return (
  <div className="flex flex-col h-screen">
    <ChatContainerRoot className="flex-1">
      <ChatContainerContent>
        {messages.map(msg => (
          <Message key={msg.id}>
            <MessageContent markdown>{msg.content}</MessageContent>
          </Message>
        ))}
      </ChatContainerContent>
    </ChatContainerRoot>

    <div className="p-4 border-t">
      <PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit}>
        <PromptInputTextarea />
      </PromptInput>
    </div>
  </div>
)
```

### With Streaming (ADK/SSE)

```tsx
import { useState, useEffect, useRef } from "react"

const [messages, setMessages] = useState([])
const [input, setInput] = useState("")
const [isLoading, setIsLoading] = useState(false)
const eventSourceRef = useRef<EventSource | null>(null)

const handleSubmit = () => {
  if (!input.trim()) return

  setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: input }])
  const userInput = input
  setInput("")
  setIsLoading(true)

  // Connect to ADK SSE
  const eventSource = new EventSource(
    `/api/sse/run_sse?session_id=session-${Date.now()}&message=${encodeURIComponent(userInput)}`
  )

  let content = ""
  const assistantId = (Date.now() + 1).toString()

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.content) {
      content += data.content
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.id === assistantId) {
          return [...prev.slice(0, -1), { ...last, content }]
        }
        return [...prev, { id: assistantId, role: "assistant", content }]
      })
    }
    if (data.done) {
      eventSource.close()
      setIsLoading(false)
    }
  }

  eventSourceRef.current = eventSource
}

return (
  <>
    {messages.map(msg => (
      <Message key={msg.id}>
        <MessageContent markdown id={msg.id}>{msg.content}</MessageContent>
      </Message>
    ))}

    <PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit} isLoading={isLoading}>
      <PromptInputTextarea />
    </PromptInput>
  </>
)
```

### With Tool Calls

```tsx
{messages.map(msg => (
  <Message key={msg.id}>
    {msg.toolInvocations?.map(tool => (
      <Tool
        key={tool.toolCallId}
        toolPart={{
          type: tool.toolName,
          state: tool.state,
          input: tool.args,
          output: tool.result,
          toolCallId: tool.toolCallId
        }}
      />
    ))}
    <MessageContent markdown>{msg.content}</MessageContent>
  </Message>
))}
```

### With Avatars

```tsx
<Message>
  <MessageAvatar
    src={msg.role === "user" ? "/user.png" : "/assistant.png"}
    alt={msg.role}
    fallback={msg.role[0].toUpperCase()}
  />
  <MessageContent markdown>{msg.content}</MessageContent>
</Message>
```

### With Actions

```tsx
<Message>
  <MessageContent markdown>{msg.content}</MessageContent>
  <MessageActions>
    <MessageAction tooltip="Copy">
      <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(msg.content)}>
        <CopyIcon />
      </Button>
    </MessageAction>
    <MessageAction tooltip="Like">
      <Button variant="ghost" size="icon" onClick={() => handleLike(msg.id)}>
        <ThumbsUpIcon />
      </Button>
    </MessageAction>
  </MessageActions>
</Message>
```

### Input with File Upload

```tsx
<PromptInput>
  <PromptInputTextarea />
  <PromptInputActions>
    <FileUpload onFilesAdded={handleFiles}>
      <FileUploadTrigger asChild>
        <PromptInputAction tooltip="Attach">
          <Button variant="ghost" size="icon"><PaperclipIcon /></Button>
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

## Tailwind Config

```js
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
}
```

---

## Common Issues & Fixes

### Markdown not rendering
```bash
npm install react-markdown remark-gfm remark-breaks
```
```tsx
<MessageContent markdown>{content}</MessageContent>
```

### Code blocks not highlighted
```bash
npm install shiki
```

### Auto-scroll not working
```tsx
// Must use this structure:
<ChatContainerRoot>
  <ChatContainerContent>
    {messages}
  </ChatContainerContent>
  <ChatContainerScrollAnchor />
</ChatContainerRoot>
```

### Styles look wrong
```bash
npm install -D @tailwindcss/typography
```
Add to `tailwind.config.js`:
```js
plugins: [require("@tailwindcss/typography")]
```

---

## File Locations After Install

```
your-project/
├── components/
│   ├── prompt-kit/       # Components installed here
│   │   ├── prompt-input.tsx
│   │   ├── message.tsx
│   │   ├── chat-container.tsx
│   │   └── ...
│   └── ui/               # shadcn/ui base components
│       ├── button.tsx
│       ├── textarea.tsx
│       └── ...
```

---

## Performance Tips

1. **Use `id` prop for streaming**:
```tsx
<Markdown id={message.id}>{content}</Markdown>
```

2. **Lazy load heavy components**:
```tsx
const CodeBlock = lazy(() => import("@/components/prompt-kit/code-block"))
```

3. **Virtualize long lists** (100+ messages):
```bash
npm install react-virtuoso
```
```tsx
import { Virtuoso } from "react-virtuoso"

<Virtuoso
  data={messages}
  itemContent={(i, msg) => <Message>{msg.content}</Message>}
/>
```

---

## Resources

- Docs: https://www.prompt-kit.com/docs
- GitHub: https://github.com/ibelick/prompt-kit
- Blocks: https://www.prompt-kit.com/blocks
- Examples: `/docs/prompt-kit/examples/` (in this repo)

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-01-23
