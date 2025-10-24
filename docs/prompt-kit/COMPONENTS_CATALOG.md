# Prompt Kit Components Catalog

> **Complete reference** - All components with props, examples, and use cases

## Navigation

- [Input Components](#input-components)
- [Display Components](#display-components)
- [Container Components](#container-components)
- [Utility Components](#utility-components)
- [Advanced Components](#advanced-components)

---

## Input Components

### PromptInput

**Purpose**: Auto-resizing textarea with action buttons

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
```

**Import**:
```tsx
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction
} from "@/components/prompt-kit/prompt-input"
```

**Basic Example**:
```tsx
<PromptInput
  value={input}
  onValueChange={setInput}
  onSubmit={handleSubmit}
>
  <PromptInputTextarea placeholder="Type a message..." />
</PromptInput>
```

**With Actions**:
```tsx
<PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit}>
  <PromptInputTextarea />
  <PromptInputActions>
    <PromptInputAction tooltip="Attach file">
      <Button variant="ghost" size="icon"><PaperclipIcon /></Button>
    </PromptInputAction>
    <PromptInputAction tooltip="Send" side="top">
      <Button type="submit"><ArrowUpIcon /></Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

**Props**:

| Component | Prop | Type | Default | Description |
|-----------|------|------|---------|-------------|
| `PromptInput` | `value` | `string` | - | Controlled input value |
| | `onValueChange` | `(value: string) => void` | - | Value change handler |
| | `onSubmit` | `() => void` | - | Submit handler (Enter key) |
| | `isLoading` | `boolean` | `false` | Loading state |
| | `maxHeight` | `number \| string` | `240` | Max height before scroll |
| | `className` | `string` | - | Additional CSS classes |
| `PromptInputTextarea` | `disableAutosize` | `boolean` | `false` | Disable auto-resize |
| | `disabled` | `boolean` | `false` | Disable input |
| | `placeholder` | `string` | - | Placeholder text |
| `PromptInputAction` | `tooltip` | `React.ReactNode` | - | Tooltip content |
| | `side` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Tooltip position |

**Use Cases**:
- ✅ Chat input fields
- ✅ AI prompt interfaces
- ✅ Search with suggestions
- ✅ Form submissions

---

## Display Components

### Message

**Purpose**: Display chat messages with avatars and actions

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/message.json"
```

**Import**:
```tsx
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageActions,
  MessageAction
} from "@/components/prompt-kit/message"
```

**Basic Example**:
```tsx
<Message>
  <MessageAvatar src="/avatar.png" alt="User" fallback="U" />
  <MessageContent>{content}</MessageContent>
</Message>
```

**With Markdown**:
```tsx
<Message>
  <MessageAvatar src="/assistant.png" alt="AI" fallback="AI" />
  <MessageContent markdown id={message.id}>
    {markdownContent}
  </MessageContent>
</Message>
```

**With Actions**:
```tsx
<Message>
  <MessageAvatar src="/user.png" alt="User" fallback="U" />
  <div className="flex flex-col gap-2">
    <MessageContent markdown>{content}</MessageContent>
    <MessageActions>
      <MessageAction tooltip="Copy">
        <Button variant="ghost" size="icon"><CopyIcon /></Button>
      </MessageAction>
      <MessageAction tooltip="Like">
        <Button variant="ghost" size="icon"><ThumbsUpIcon /></Button>
      </MessageAction>
    </MessageActions>
  </div>
</Message>
```

**Props**:

| Component | Prop | Type | Default | Description |
|-----------|------|------|---------|-------------|
| `MessageAvatar` | `src` | `string` | - | Avatar image URL |
| | `alt` | `string` | - | Alt text |
| | `fallback` | `string` | - | Fallback text |
| | `delayMs` | `number` | - | Fallback delay |
| `MessageContent` | `markdown` | `boolean` | `false` | Render as markdown |
| | `className` | `string` | - | Additional CSS classes |
| `MessageAction` | `tooltip` | `React.ReactNode` | - | Tooltip content |
| | `side` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Tooltip position |

**Use Cases**:
- ✅ Chat messages
- ✅ Comment threads
- ✅ Assistant responses
- ✅ User feedback display

---

### Markdown

**Purpose**: Render markdown with syntax highlighting

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/markdown.json"
npm install react-markdown remark-gfm remark-breaks marked
```

**Import**:
```tsx
import { Markdown } from "@/components/prompt-kit/markdown"
```

**Example**:
```tsx
<Markdown
  id={message.id}  // IMPORTANT for memoization!
  className="prose dark:prose-invert"
>
  {markdownContent}
</Markdown>
```

**Custom Components**:
```tsx
<Markdown
  id={message.id}
  components={{
    h1: ({ children }) => <h1 className="text-2xl font-bold">{children}</h1>,
    a: ({ href, children }) => <a href={href} className="underline">{children}</a>
  }}
>
  {content}
</Markdown>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | - | **Required** for memoization |
| `className` | `string` | - | CSS classes |
| `components` | `Partial<Components>` | - | Custom component overrides |

**Features**:
- GitHub Flavored Markdown (tables, strikethrough, task lists)
- Syntax highlighting via Shiki
- Memoization for streaming performance
- Code blocks with copy button

**Use Cases**:
- ✅ AI responses
- ✅ Documentation display
- ✅ Rich text content
- ✅ Streaming text

---

### CodeBlock

**Purpose**: Display code with syntax highlighting

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/code-block.json"
npm install shiki
```

**Import**:
```tsx
import { CodeBlock, CodeBlockCode } from "@/components/prompt-kit/code-block"
```

**Example**:
```tsx
<CodeBlock>
  <CodeBlockCode
    code={codeString}
    language="typescript"
    theme="github-dark"
  />
</CodeBlock>
```

**With Header**:
```tsx
<CodeBlock>
  <div className="flex items-center justify-between p-2 border-b">
    <span className="text-sm font-mono">example.ts</span>
    <Button variant="ghost" size="sm"><CopyIcon /></Button>
  </div>
  <CodeBlockCode code={code} language="typescript" />
</CodeBlock>
```

**Props**:

| Component | Prop | Type | Default | Description |
|-----------|------|------|---------|-------------|
| `CodeBlockCode` | `code` | `string` | - | Code to display |
| | `language` | `string` | `"tsx"` | Language for highlighting |
| | `theme` | `string` | `"github-light"` | Syntax theme |

**Supported Languages**: `typescript`, `javascript`, `python`, `rust`, `go`, `java`, `c`, `cpp`, `bash`, `sql`, `json`, `yaml`, `markdown`, etc.

**Supported Themes**: `github-light`, `github-dark`, `dracula`, `nord`, `monokai`, `solarized-light`, `solarized-dark`, etc.

**Use Cases**:
- ✅ Code examples in AI responses
- ✅ Documentation
- ✅ Code review interfaces
- ✅ Tutorial content

---

## Container Components

### ChatContainer

**Purpose**: Auto-scrolling container for chat messages

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
```

**Import**:
```tsx
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor
} from "@/components/prompt-kit/chat-container"
```

**Example**:
```tsx
<ChatContainerRoot className="h-screen">
  <ChatContainerContent className="space-y-4 p-4">
    {messages.map(msg => (
      <Message key={msg.id}>
        <MessageContent markdown>{msg.content}</MessageContent>
      </Message>
    ))}
  </ChatContainerContent>
  <ChatContainerScrollAnchor />
</ChatContainerRoot>
```

**With Scroll Button**:
```tsx
import { ScrollButton } from "@/components/prompt-kit/scroll-button"

<div className="relative h-screen">
  <ChatContainerRoot className="h-full">
    <ChatContainerContent>
      {messages.map(...)}
    </ChatContainerContent>
    <ChatContainerScrollAnchor />
  </ChatContainerRoot>

  <div className="absolute bottom-4 right-4">
    <ScrollButton />
  </div>
</div>
```

**Auto-Scroll Behavior**:
- ✅ Auto-scrolls to bottom when new content added (if already at bottom)
- ✅ Stops auto-scroll when user scrolls up
- ✅ Resumes auto-scroll when user scrolls back to bottom
- ✅ Smooth spring animations
- ✅ Works with streaming content

**Use Cases**:
- ✅ Chat interfaces
- ✅ Live logs
- ✅ Streaming content
- ✅ Real-time feeds

---

## Utility Components

### Loader

**Purpose**: Loading indicators

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/loader.json"
```

**Import**:
```tsx
import { Loader } from "@/components/prompt-kit/loader"
```

**Variants**:
```tsx
// Spinner variants
<Loader variant="circular" size="md" />
<Loader variant="pulse" size="lg" />
<Loader variant="pulse-dot" size="sm" />

// Dot variants
<Loader variant="dots" />
<Loader variant="loading-dots" />
<Loader variant="bounce-dots" />

// Animation variants
<Loader variant="typing" />
<Loader variant="wave" />
<Loader variant="bars" />

// Text variants
<Loader variant="text-blink" text="Loading..." />
<Loader variant="text-shimmer" text="Thinking..." />

// Terminal variant
<Loader variant="terminal" />
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"circular" \| "classic" \| "pulse" \| "pulse-dot" \| "dots" \| "typing" \| "wave" \| "bars" \| "terminal" \| "text-blink" \| "text-shimmer" \| "loading-dots"` | `"circular"` | Loader style |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Loader size |
| `text` | `string` | - | Text for text variants |

**Use Cases**:
- ✅ Loading states
- ✅ Processing indicators
- ✅ Typing indicators
- ✅ Background tasks

---

### ScrollButton

**Purpose**: Scroll to bottom button

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/scroll-button.json"
```

**Import**:
```tsx
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
```

**Example**:
```tsx
<div className="relative h-screen">
  <ChatContainerRoot className="h-full">
    <ChatContainerContent>
      {messages}
    </ChatContainerContent>
  </ChatContainerRoot>

  <div className="absolute bottom-4 right-4">
    <ScrollButton
      variant="outline"
      size="icon"
      threshold={100}
    />
  </div>
</div>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `threshold` | `number` | `50` | Distance from bottom to show button |
| `variant` | `"default" \| "outline" \| "ghost"` | `"outline"` | Button variant |
| `size` | `"default" \| "sm" \| "lg"` | `"sm"` | Button size |

**Note**: Only works inside `ChatContainerRoot`!

**Use Cases**:
- ✅ Long chat histories
- ✅ Live feeds
- ✅ Infinite scroll lists

---

### PromptSuggestion

**Purpose**: Clickable prompt suggestions

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/prompt-suggestion.json"
```

**Import**:
```tsx
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"
```

**Normal Mode**:
```tsx
{suggestions.map(text => (
  <PromptSuggestion
    key={text}
    onClick={() => setInput(text)}
  >
    {text}
  </PromptSuggestion>
))}
```

**Highlight Mode**:
```tsx
<PromptSuggestion
  highlight="python"
  onClick={() => setInput("Write a python function")}
>
  Write a python function
</PromptSuggestion>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `highlight` | `string` | - | Text to highlight |
| `variant` | `"default" \| "outline" \| "ghost"` | `"outline"` | Button variant |
| `size` | `"default" \| "sm" \| "lg"` | `"lg"` | Button size |

**Use Cases**:
- ✅ Starter prompts
- ✅ Autocomplete suggestions
- ✅ Related queries
- ✅ Example prompts

---

## Advanced Components

### Tool

**Purpose**: Display AI tool calls

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/tool.json"
```

**Import**:
```tsx
import { Tool } from "@/components/prompt-kit/tool"
```

**Example**:
```tsx
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

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `toolPart` | `ToolPart` | - | Tool invocation data |
| `defaultOpen` | `boolean` | `false` | Initially expanded |

**ToolPart Type**:
```typescript
interface ToolPart {
  type: string
  state: "pending" | "running" | "completed" | "error"
  input: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId: string
  errorText?: string
}
```

**Use Cases**:
- ✅ Tool calling visualization
- ✅ Function execution display
- ✅ API call tracking
- ✅ Agent actions

---

### Source

**Purpose**: Display web sources

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/source.json"
```

**Import**:
```tsx
import { Source, SourceTrigger, SourceContent } from "@/components/prompt-kit/source"
```

**Example**:
```tsx
<Source href="https://example.com">
  <SourceTrigger label="[1]" showFavicon />
  <SourceContent
    title="Example Site"
    description="Information about the topic"
  />
</Source>
```

**Props**:

| Component | Prop | Type | Description |
|-----------|------|------|-------------|
| `Source` | `href` | `string` | Source URL |
| `SourceTrigger` | `label` | `string` | Display label |
| | `showFavicon` | `boolean` | Show site favicon |
| `SourceContent` | `title` | `string` | Source title |
| | `description` | `string` | Source description |

**Use Cases**:
- ✅ Citations
- ✅ Reference links
- ✅ Web search results
- ✅ Source attribution

---

### Reasoning

**Purpose**: Collapsible AI reasoning display

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/reasoning.json"
```

**Import**:
```tsx
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/prompt-kit/reasoning"
```

**Example**:
```tsx
<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger>View reasoning</ReasoningTrigger>
  <ReasoningContent markdown>
    {reasoningText}
  </ReasoningContent>
</Reasoning>
```

**Controlled**:
```tsx
<Reasoning
  open={open}
  onOpenChange={setOpen}
  isStreaming={isStreaming}
>
  <ReasoningTrigger>View reasoning</ReasoningTrigger>
  <ReasoningContent markdown>{reasoningText}</ReasoningContent>
</Reasoning>
```

**Props**:

| Component | Prop | Type | Default | Description |
|-----------|------|------|---------|-------------|
| `Reasoning` | `isStreaming` | `boolean` | - | Auto-closes when false |
| | `open` | `boolean` | - | Controlled open state |
| | `onOpenChange` | `(open: boolean) => void` | - | Open change handler |
| `ReasoningContent` | `markdown` | `boolean` | `false` | Render as markdown |

**Use Cases**:
- ✅ Chain-of-thought display
- ✅ Explanation details
- ✅ Debug information
- ✅ Step-by-step reasoning

---

### FileUpload

**Purpose**: Drag & drop file upload

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/file-upload.json"
```

**Import**:
```tsx
import { FileUpload, FileUploadTrigger, FileUploadContent } from "@/components/prompt-kit/file-upload"
```

**Example**:
```tsx
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

**With PromptInput**:
```tsx
<PromptInput>
  <PromptInputTextarea />
  <PromptInputActions>
    <FileUpload onFilesAdded={handleFiles}>
      <FileUploadTrigger asChild>
        <PromptInputAction tooltip="Attach file">
          <Button variant="ghost" size="icon">
            <PaperclipIcon />
          </Button>
        </PromptInputAction>
      </FileUploadTrigger>
    </FileUpload>
  </PromptInputActions>
</PromptInput>
```

**Props**:

| Component | Prop | Type | Default | Description |
|-----------|------|------|---------|-------------|
| `FileUpload` | `onFilesAdded` | `(files: File[]) => void` | - | Files selected handler |
| | `multiple` | `boolean` | `true` | Allow multiple files |
| | `accept` | `string` | - | Accepted file types |
| `FileUploadTrigger` | `asChild` | `boolean` | `false` | Use child as trigger |

**Use Cases**:
- ✅ Document upload
- ✅ Image attachments
- ✅ File processing
- ✅ Multi-file selection

---

### ResponseStream (Experimental)

**Purpose**: Client-side streaming simulation

**Install**:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/response-stream.json"
```

**Import**:
```tsx
import { ResponseStream } from "@/components/prompt-kit/response-stream"
```

**Typewriter Mode**:
```tsx
<ResponseStream
  textStream={text}
  mode="typewriter"
  speed={50}
  onComplete={() => console.log("Done")}
/>
```

**Fade Mode**:
```tsx
<ResponseStream
  textStream={text}
  mode="fade"
  speed={30}
/>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `textStream` | `string \| AsyncIterable<string>` | - | Text to stream |
| `mode` | `"typewriter" \| "fade"` | `"typewriter"` | Animation mode |
| `speed` | `number` | `20` | Speed (1-100) |
| `onComplete` | `() => void` | - | Completion callback |

**Note**: Not recommended for real LLM streaming. Use for demos/UI only.

---

## Component Combinations

### Full Chat Interface

```tsx
<div className="flex flex-col h-screen">
  <ChatContainerRoot className="flex-1">
    <ChatContainerContent className="space-y-4 p-4">
      {messages.map(msg => (
        <Message key={msg.id}>
          <MessageAvatar src={msg.avatar} alt={msg.role} fallback={msg.role[0]} />
          <MessageContent markdown id={msg.id}>{msg.content}</MessageContent>
        </Message>
      ))}
    </ChatContainerContent>
    <ChatContainerScrollAnchor />
  </ChatContainerRoot>

  <div className="p-4 border-t">
    <PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit}>
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
  </div>
</div>
```

---

**Version**: 1.0.0
**Last Updated**: 2025-01-23
