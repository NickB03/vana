# Component API Reference

> **Complete API reference for shadcn/ui and prompt-kit components used in AI chat interfaces**

## 📚 Table of Contents

### prompt-kit Components
- [PromptInput](#promptinput)
- [Message](#message)
- [ChatContainer](#chatcontainer)
- [Markdown](#markdown)
- [Reasoning](#reasoning)
- [Tool](#tool)
- [Steps](#steps)
- [Source](#source)
- [Loader](#loader)
- [ScrollButton](#scrollbutton)
- [PromptSuggestion](#promptsuggestion)
- [FileUpload](#fileupload)
- [CodeBlock](#codeblock)
- [SystemMessage](#systemmessage)

### shadcn/ui Base Components
- [Button](#button-shadcnui)
- [Dialog](#dialog-shadcnui)
- [Avatar](#avatar-shadcnui)
- [Badge](#badge-shadcnui)
- [Tooltip](#tooltip-shadcnui)

---

## prompt-kit Components

### PromptInput

**Purpose:** Input field designed specifically for chat interfaces with auto-resize, actions, and file upload support.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/prompt-input.json
```

**Sub-components:**
- `PromptInput` - Main container
- `PromptInputTextarea` - Auto-resizing textarea
- `PromptInputActions` - Container for action buttons
- `PromptInputAction` - Individual action button with tooltip

#### PromptInput Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | `boolean` | `false` | Shows loading state, disables input |
| `value` | `string` | - | Controlled input value |
| `onValueChange` | `(value: string) => void` | - | Callback when value changes |
| `maxHeight` | `number \| string` | `240` | Maximum height of textarea (px) |
| `onSubmit` | `() => void` | - | Callback when Enter is pressed |
| `children` | `React.ReactNode` | - | Child components (textarea, actions) |
| `className` | `string` | - | Additional CSS classes |

#### PromptInputTextarea Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disableAutosize` | `boolean` | `false` | Disable automatic height adjustment |
| `disabled` | `boolean` | `false` | Disable the textarea |
| `placeholder` | `string` | - | Placeholder text |
| `onKeyDown` | `(e: KeyboardEvent) => void` | - | Keyboard event handler |
| `className` | `string` | - | Additional CSS classes |

#### PromptInputAction Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tooltip` | `React.ReactNode` | - | Tooltip content |
| `side` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Tooltip position |
| `disabled` | `boolean` | `false` | Disable the action |
| `children` | `React.ReactNode` | - | Icon or content |

**Example:**
```tsx
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/prompt-kit/prompt-input"
import { Send, Paperclip } from "lucide-react"

<PromptInput
  value={input}
  onValueChange={setInput}
  onSubmit={handleSubmit}
  isLoading={isLoading}
  maxHeight={300}
>
  <PromptInputTextarea
    placeholder="Type your message..."
    className="min-h-[60px]"
  />
  <PromptInputActions>
    <PromptInputAction tooltip="Attach file">
      <Paperclip className="h-4 w-4" />
    </PromptInputAction>
    <PromptInputAction tooltip="Send message" disabled={!input.trim()}>
      <Send className="h-4 w-4" />
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

---

### Message

**Purpose:** Display user and AI messages with avatars, markdown, and actions.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/message.json
```

**Sub-components:**
- `Message` - Container
- `MessageAvatar` - User/AI avatar
- `MessageContent` - Message text (supports markdown)
- `MessageActions` - Action buttons container
- `MessageAction` - Individual action button

#### MessageAvatar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Avatar image URL |
| `alt` | `string` | - | Alt text for image |
| `fallback` | `string` | - | Text if image fails to load |
| `delayMs` | `number` | - | Delay before showing fallback (ms) |

#### MessageContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `markdown` | `boolean` | `false` | Render content as markdown |
| `children` | `React.ReactNode` | - | Content to display |
| `className` | `string` | - | Additional CSS classes |

#### MessageAction Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tooltip` | `React.ReactNode` | - | Tooltip content |
| `side` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Tooltip position |
| `onClick` | `() => void` | - | Click handler |

**Example:**
```tsx
import { Message, MessageAvatar, MessageContent, MessageActions, MessageAction } from "@/components/prompt-kit/message"
import { Copy, ThumbsUp } from "lucide-react"

<Message>
  <MessageAvatar
    src="/ai-avatar.png"
    alt="AI"
    fallback="AI"
  />
  <MessageContent markdown>
    **Hello!** How can I help you today?
  </MessageContent>
  <MessageActions>
    <MessageAction tooltip="Copy">
      <Copy className="h-4 w-4" />
    </MessageAction>
    <MessageAction tooltip="Like">
      <ThumbsUp className="h-4 w-4" />
    </MessageAction>
  </MessageActions>
</Message>
```

---

### ChatContainer

**Purpose:** Auto-scrolling container for chat interfaces with smart scroll behavior.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/chat-container.json
```

**Sub-components:**
- `ChatContainerRoot` - Main container with scroll logic
- `ChatContainerContent` - Content wrapper
- `ChatContainerScrollAnchor` - Scroll anchor element

**Features:**
- ✅ Automatic scroll to bottom on new messages
- ✅ Preserves scroll position when user scrolls up
- ✅ Velocity-based spring animations
- ✅ ResizeObserver for content changes
- ✅ Mobile support

#### ChatContainerRoot Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Content to render |
| `className` | `string` | - | Additional CSS classes |

**Example:**
```tsx
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from "@/components/prompt-kit/chat-container"

<ChatContainerRoot className="h-[600px]">
  <ChatContainerContent className="space-y-4 p-4">
    {messages.map(msg => (
      <Message key={msg.id}>...</Message>
    ))}
  </ChatContainerContent>
  <ChatContainerScrollAnchor />
</ChatContainerRoot>
```

---

### Markdown

**Purpose:** Render markdown with GFM support, code highlighting, and streaming optimization.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/markdown.json
```

**Features:**
- ✅ GitHub Flavored Markdown (tables, strikethrough, task lists)
- ✅ Syntax highlighting with Shiki
- ✅ Memoization for streaming performance
- ✅ Custom component overrides
- ✅ Tailwind Typography support

#### Markdown Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | - | Markdown content to render |
| `id` | `string` | - | **REQUIRED for streaming!** Unique ID for memoization |
| `className` | `string` | - | Additional CSS classes |
| `components` | `Partial<Components>` | - | Custom component overrides |

**Example:**
```tsx
import { Markdown } from "@/components/prompt-kit/markdown"

// ✅ With streaming (MUST have id!)
<Markdown id={message.id}>
  {message.content}
</Markdown>

// ❌ Without id - will re-render entire history!
<Markdown>{message.content}</Markdown>

// With custom components
<Markdown
  id={message.id}
  components={{
    h1: ({ children }) => <h1 className="text-3xl font-bold">{children}</h1>,
    a: ({ href, children }) => <a href={href} className="text-blue-500">{children}</a>
  }}
>
  {markdown}
</Markdown>
```

**★ Insight ─────────────────────────────────────**
The `id` prop enables block-level memoization. Each markdown
block is cached separately, so when streaming new content,
only the new/changed blocks re-render. This is CRITICAL for
performance in chat applications with long histories.
─────────────────────────────────────────────────

---

### Reasoning

**Purpose:** Collapsible component for showing AI reasoning/thought process.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/reasoning.json
```

**Sub-components:**
- `Reasoning` - Main container
- `ReasoningTrigger` - Click to expand/collapse
- `ReasoningContent` - Reasoning content (supports markdown)

#### Reasoning Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when open state changes |
| `isStreaming` | `boolean` | - | Auto-closes when `false` |
| `className` | `string` | - | Additional CSS classes |

#### ReasoningContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `markdown` | `boolean` | `false` | Render as markdown |
| `contentClassName` | `string` | - | CSS classes for content |

**Example:**
```tsx
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/prompt-kit/reasoning"

<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent markdown>
    {reasoningText}
  </ReasoningContent>
</Reasoning>
```

---

### Tool

**Purpose:** Display tool/function call details (input, output, status, errors).

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/tool.json
```

**Compatible with AI SDK v5 tool calling architecture.**

#### Tool Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `toolPart` | `ToolPart` | - | Tool invocation data |
| `defaultOpen` | `boolean` | `false` | Expanded by default |
| `className` | `string` | - | Additional CSS classes |

#### ToolPart Type

```typescript
type ToolPart = {
  type: string                      // Tool name
  state: 'pending' | 'running' | 'completed' | 'error'
  input: Record<string, unknown>    // Tool input parameters
  output?: Record<string, unknown>  // Tool output (if completed)
  toolCallId: string                // Unique identifier
  errorText?: string                // Error message (if failed)
}
```

**Example:**
```tsx
import { Tool } from "@/components/prompt-kit/tool"

const toolCall: ToolPart = {
  type: "web_search",
  state: "completed",
  input: { query: "latest AI news" },
  output: { results: [...] },
  toolCallId: "call_123"
}

<Tool toolPart={toolCall} defaultOpen />
```

---

### Steps

**Purpose:** Display a sequence of AI processing steps.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/steps.json
```

**Sub-components:**
- `Steps` - Container
- `StepsItem` - Individual step

#### StepsItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Step title |
| `icon` | `React.ReactNode` | - | Custom icon (default: checkmark) |
| `children` | `React.ReactNode` | - | Step description/details |

**Example:**
```tsx
import { Steps, StepsItem } from "@/components/prompt-kit/steps"
import { Search, FileText, CheckCircle } from "lucide-react"

<Steps>
  <StepsItem title="Searching web" icon={<Search />}>
    Found 10 relevant sources
  </StepsItem>
  <StepsItem title="Analyzing content" icon={<FileText />}>
    Extracted key information
  </StepsItem>
  <StepsItem title="Complete" icon={<CheckCircle />}>
    Generated response
  </StepsItem>
</Steps>
```

---

### Source

**Purpose:** Display source citations with hover details.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/source.json
```

**Sub-components:**
- `Source` - Container with href
- `SourceTrigger` - Clickable citation number/label
- `SourceContent` - Hover card with details

#### SourceTrigger Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Citation label (e.g., "1", "2") |
| `showFavicon` | `boolean` | `false` | Show website favicon |

#### SourceContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Source title |
| `description` | `string` | - | Source description |

**Example:**
```tsx
import { Source, SourceTrigger, SourceContent } from "@/components/prompt-kit/source"

According to recent studies
<Source href="https://example.com/study">
  <SourceTrigger label="1" showFavicon />
  <SourceContent
    title="AI Safety Research 2024"
    description="Comprehensive study on AI alignment"
  />
</Source>
```

---

### Loader

**Purpose:** Loading indicators with 12+ variants.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/loader.json
```

#### Loader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"circular" \| "classic" \| "pulse" \| "pulse-dot" \| "dots" \| "typing" \| "wave" \| "bars" \| "terminal" \| "text-blink" \| "text-shimmer" \| "loading-dots"` | `"circular"` | Visual style |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size |
| `text` | `string` | - | Text to display (for text variants) |

**Best Variants for Chat:**
- `typing` - Typing animation (most common for AI)
- `pulse-dot` - Pulsing dot
- `text-shimmer` - "Thinking..." with shimmer effect

**Example:**
```tsx
import { Loader } from "@/components/prompt-kit/loader"

{isLoading && <Loader variant="typing" size="md" />}
{isProcessing && <Loader variant="text-shimmer" text="Analyzing..." />}
```

---

### ScrollButton

**Purpose:** Floating button to scroll to bottom of chat.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/scroll-button.json
```

**IMPORTANT:** Only works inside `ChatContainerRoot`!

#### ScrollButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `threshold` | `number` | `50` | Distance from bottom (px) to show button |
| `variant` | `"default" \| "outline" \| "ghost"` | `"outline"` | Button style |
| `size` | `"default" \| "sm" \| "lg"` | `"sm"` | Button size |

**Example:**
```tsx
import { ScrollButton } from "@/components/prompt-kit/scroll-button"

<ChatContainerRoot className="relative">
  <ChatContainerContent>...</ChatContainerContent>
  <div className="absolute bottom-4 right-4">
    <ScrollButton threshold={100} />
  </div>
</ChatContainerRoot>
```

---

### PromptSuggestion

**Purpose:** Clickable prompt suggestions for users.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/prompt-suggestion.json
```

**Two Modes:**
1. **Normal Mode** - Pill-shaped buttons
2. **Highlight Mode** - Text with highlighted search terms

#### PromptSuggestion Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "outline" \| "ghost"` | `"outline"` | Button style (normal mode) |
| `size` | `"default" \| "sm" \| "lg"` | `"lg"` | Button size |
| `highlight` | `string` | - | Text to highlight (enables highlight mode) |
| `onClick` | `() => void` | - | Click handler |

**Example:**
```tsx
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"

// Normal mode
<PromptSuggestion onClick={() => setInput("Explain quantum computing")}>
  Explain quantum computing
</PromptSuggestion>

// Highlight mode
<PromptSuggestion highlight="quantum">
  Explain quantum computing basics
</PromptSuggestion>
```

---

### FileUpload

**Purpose:** Drag-and-drop file upload with visual feedback.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/file-upload.json
```

**Sub-components:**
- `FileUpload` - Main container with drag/drop logic
- `FileUploadTrigger` - Click to browse files
- `FileUploadContent` - Drop zone area

#### FileUpload Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onFilesAdded` | `(files: File[]) => void` | - | Callback when files added |
| `multiple` | `boolean` | `true` | Allow multiple files |
| `accept` | `string` | - | File types (e.g., ".pdf,.txt") |

**Example:**
```tsx
import { FileUpload, FileUploadTrigger, FileUploadContent } from "@/components/prompt-kit/file-upload"

<FileUpload
  onFilesAdded={(files) => console.log(files)}
  accept=".pdf,.txt,.md"
  multiple
>
  <FileUploadTrigger asChild>
    <button>Browse files</button>
  </FileUploadTrigger>
  <FileUploadContent>
    Drag and drop files here
  </FileUploadContent>
</FileUpload>
```

---

### CodeBlock

**Purpose:** Syntax-highlighted code blocks using Shiki.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/code-block.json
```

**Sub-components:**
- `CodeBlock` - Container
- `CodeBlockCode` - Code with syntax highlighting
- `CodeBlockGroup` - Header with metadata

#### CodeBlockCode Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | - | Code to display |
| `language` | `string` | `"tsx"` | Language for highlighting |
| `theme` | `string` | `"github-light"` | Shiki theme |

**Supported themes:** github-light, github-dark, dracula, nord, and [more](https://github.com/shikijs/shiki/blob/main/docs/themes.md)

**Example:**
```tsx
import { CodeBlock, CodeBlockCode } from "@/components/prompt-kit/code-block"

<CodeBlock>
  <CodeBlockCode
    code={`function hello() {\n  console.log("Hello!");\n}`}
    language="javascript"
    theme="github-dark"
  />
</CodeBlock>
```

---

### SystemMessage

**Purpose:** Banner-style system notifications/warnings.

**Installation:**
```bash
npx shadcn@canary add https://www.prompt-kit.com/c/system-message.json
```

#### SystemMessage Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "info" \| "warning" \| "error"` | `"default"` | Message type |
| `children` | `React.ReactNode` | - | Message content |

**Example:**
```tsx
import { SystemMessage } from "@/components/prompt-kit/system-message"

<SystemMessage variant="warning">
  Your API key will expire in 7 days
</SystemMessage>

<SystemMessage variant="info">
  New features available! Check them out.
</SystemMessage>
```

---

## shadcn/ui Base Components

### Button (shadcn/ui)

**Installation:**
```bash
npx shadcn@latest add button
```

#### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | Button size |
| `asChild` | `boolean` | `false` | Use child as button element |

---

### Dialog (shadcn/ui)

**Installation:**
```bash
npx shadcn@latest add dialog
```

**Sub-components:**
- `Dialog` - Root component
- `DialogTrigger` - Opens dialog
- `DialogContent` - Dialog content
- `DialogHeader`, `DialogTitle`, `DialogDescription` - Header elements

---

### Avatar (shadcn/ui)

**Installation:**
```bash
npx shadcn@latest add avatar
```

**Sub-components:**
- `Avatar` - Container
- `AvatarImage` - Image element
- `AvatarFallback` - Fallback text/icon

---

### Badge (shadcn/ui)

**Installation:**
```bash
npx shadcn@latest add badge
```

#### Badge Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "secondary" \| "destructive" \| "outline"` | `"default"` | Visual style |

---

### Tooltip (shadcn/ui)

**Installation:**
```bash
npx shadcn@latest add tooltip
```

**Sub-components:**
- `TooltipProvider` - Wrap app/component
- `Tooltip` - Root
- `TooltipTrigger` - Hover target
- `TooltipContent` - Tooltip content

---

## Quick Reference Table

| Component | Use Case | Key Props |
|-----------|----------|-----------|
| `PromptInput` | User message input | `value`, `onSubmit`, `isLoading` |
| `Message` | Display messages | `MessageAvatar`, `MessageContent` |
| `ChatContainer` | Scrolling container | Auto-scroll behavior |
| `Markdown` | Render markdown | **`id`** (required for streaming!) |
| `Reasoning` | AI thought process | `isStreaming`, `open` |
| `Tool` | Tool/function calls | `toolPart`, `defaultOpen` |
| `Steps` | Processing steps | `StepsItem` with title |
| `Source` | Source citations | `href`, `SourceTrigger`, `SourceContent` |
| `Loader` | Loading states | `variant`, `size` |
| `ScrollButton` | Scroll to bottom | `threshold` |

---

**Related Documentation:**
- [AI-CHAT-PATTERNS.md](./AI-CHAT-PATTERNS.md) - Common patterns
- [CODE-EXAMPLES.md](./CODE-EXAMPLES.md) - Production examples
- [BEST-PRACTICES.md](./BEST-PRACTICES.md) - Optimization tips
