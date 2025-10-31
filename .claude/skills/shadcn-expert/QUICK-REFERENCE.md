# shadcn/prompt-kit Quick Reference

> **Fast reference guide for building AI chat interfaces**

## 🎯 Essential Components

### Core Chat Components

```bash
# Install all at once
npx shadcn@canary add \
  https://www.prompt-kit.com/c/prompt-input.json \
  https://www.prompt-kit.com/c/message.json \
  https://www.prompt-kit.com/c/chat-container.json \
  https://www.prompt-kit.com/c/markdown.json \
  https://www.prompt-kit.com/c/loader.json \
  https://www.prompt-kit.com/c/scroll-button.json
```

### Component Cheat Sheet

| Need | Component | Key Props |
|------|-----------|-----------|
| User input | `PromptInput` | `value`, `onSubmit`, `isLoading` |
| Display message | `Message` | `MessageAvatar`, `MessageContent` |
| Auto-scroll | `ChatContainer` | (auto behavior) |
| Markdown | `Markdown` | **`id`** (REQUIRED!) |
| AI reasoning | `Reasoning` | `isStreaming` |
| Tool calls | `Tool` | `toolPart` |
| Loading | `Loader` | `variant="typing"` |
| Scroll to bottom | `ScrollButton` | (inside ChatContainer) |

## 🚀 Quick Start Templates

### Basic Chat
```tsx
<div className="flex h-screen flex-col">
  <ChatContainerRoot className="flex-1">
    <ChatContainerContent className="space-y-4 p-4">
      {messages.map(msg => (
        <Message key={msg.id}>
          <MessageAvatar src={msg.avatar} />
          <MessageContent markdown>
            <Markdown id={msg.id}>{msg.content}</Markdown>
          </MessageContent>
        </Message>
      ))}
    </ChatContainerContent>
  </ChatContainerRoot>

  <div className="border-t p-4">
    <PromptInput value={input} onValueChange={setInput} onSubmit={send}>
      <PromptInputTextarea placeholder="Ask me anything..." />
    </PromptInput>
  </div>
</div>
```

### Streaming Chat
```tsx
// Add to basic chat:
{isStreaming && streamingContent && (
  <Message>
    <MessageAvatar src="/ai.png" />
    <MessageContent markdown>
      <Markdown id="streaming">{streamingContent}</Markdown>
    </MessageContent>
  </Message>
)}

{isLoading && <Loader variant="typing" />}
```

## 🔥 Critical Rules

### 1. Markdown MUST have `id` prop
```tsx
// ❌ BAD - re-renders everything!
<Markdown>{content}</Markdown>

// ✅ GOOD - only re-renders changed blocks
<Markdown id={message.id}>{content}</Markdown>
```

### 2. ScrollButton requires ChatContainerRoot
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

### 3. Use theme-aware colors
```tsx
// ❌ BAD
className="bg-white text-black"

// ✅ GOOD
className="bg-background text-foreground"
```

## 🎨 Common Patterns

### Add Actions to Messages
```tsx
<Message>
  <MessageAvatar src="/ai.png" />
  <MessageContent markdown>{content}</MessageContent>
  <MessageActions>
    <MessageAction tooltip="Copy">
      <Copy className="h-4 w-4" />
    </MessageAction>
  </MessageActions>
</Message>
```

### Display Tool Calls
```tsx
const toolCall: ToolPart = {
  type: "web_search",
  state: "completed",
  input: { query: "AI news" },
  output: { results: [...] },
  toolCallId: "call_123"
}

<Tool toolPart={toolCall} defaultOpen />
```

### Show AI Reasoning
```tsx
<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent markdown>
    {reasoningText}
  </ReasoningContent>
</Reasoning>
```

### Add Prompt Suggestions
```tsx
const suggestions = ["Explain AI", "Write code", "Analyze data"]

<div className="flex gap-2">
  {suggestions.map(s => (
    <PromptSuggestion key={s} onClick={() => setInput(s)}>
      {s}
    </PromptSuggestion>
  ))}
</div>
```

## 🔧 MCP Tools

### Browse Components
```typescript
// Get all shadcn components (300+)
mcp__shadcn__getComponents()

// Get specific component
mcp__shadcn__getComponent({ component: "button" })

// List prompt-kit components
mcp__prompt-kit__get_items()

// Get component details
mcp__prompt-kit__get_item({ name: "prompt-input" })

// Add component to project
mcp__prompt-kit__add_item({ name: "chat-container" })
```

## 📦 Installation Commands

### shadcn/ui Base
```bash
npx shadcn@latest add button dialog avatar badge tooltip
```

### prompt-kit AI Components
```bash
# Essential
npx shadcn@canary add https://www.prompt-kit.com/c/prompt-input.json
npx shadcn@canary add https://www.prompt-kit.com/c/message.json
npx shadcn@canary add https://www.prompt-kit.com/c/chat-container.json
npx shadcn@canary add https://www.prompt-kit.com/c/markdown.json

# Advanced
npx shadcn@canary add https://www.prompt-kit.com/c/reasoning.json
npx shadcn@canary add https://www.prompt-kit.com/c/tool.json
npx shadcn@canary add https://www.prompt-kit.com/c/loader.json
npx shadcn@canary add https://www.prompt-kit.com/c/scroll-button.json
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Chat slow during streaming | Add `id` prop to Markdown |
| ScrollButton not working | Wrap in ChatContainerRoot |
| Code not highlighting | Install Shiki: `npm install shiki` |
| Auto-scroll broken | Use ChatContainerScrollAnchor |
| Dark mode colors wrong | Use theme colors (bg-background, etc) |

## 📚 Full Documentation

- **Patterns**: `/docs/shadcn/AI-CHAT-PATTERNS.md`
- **API Reference**: `/docs/shadcn/COMPONENT-REFERENCE.md`
- **Best Practices**: `/docs/shadcn/BEST-PRACTICES.md`
- **Quick Start**: `/docs/shadcn/README.md`

## 🎯 Loader Variants for Chat

```tsx
<Loader variant="typing" />        // ← Best for AI typing
<Loader variant="pulse-dot" />     // ← Minimal
<Loader variant="text-shimmer" text="Thinking..." />  // ← With text
```

## 🔒 TypeScript Types

```typescript
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

type AIMessage = Message & {
  role: 'assistant'
  reasoning?: string
  toolCalls?: ToolPart[]
  sources?: Source[]
}

type ToolPart = {
  type: string
  state: 'pending' | 'running' | 'completed' | 'error'
  input: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId: string
  errorText?: string
}
```

---

**Quick Links:**
- Official Docs: https://www.prompt-kit.com
- GitHub: https://github.com/ibelick/prompt-kit
- shadcn/ui: https://ui.shadcn.com
