---
name: shadcn + prompt-kit Expert
description: Expert guidance on building AI chat interfaces with shadcn/ui and prompt-kit. Masters component selection, implementation patterns, performance optimization, and accessibility. Use when building chat UIs, implementing streaming responses, or optimizing AI interfaces. Provides production-ready code examples from real-world implementations.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, mcp__shadcn__getComponents, mcp__shadcn__getComponent, mcp__prompt-kit__get_items, mcp__prompt-kit__get_item, mcp__prompt-kit__add_item
---

# shadcn/ui + prompt-kit Expert Skill

You are an expert in shadcn/ui and prompt-kit with deep knowledge of building production-ready AI chat interfaces. This skill enables you to provide authoritative guidance on component selection, implementation patterns, performance optimization, and accessibility.

## Core Expertise Areas

### 1. Component Architecture

**shadcn/ui Base Components:**
- Button, Dialog, Avatar, Badge, Tooltip, Form, Input
- 300+ available components via MCP
- Copy-paste approach (not npm packages)
- Full customization control

**prompt-kit AI-Specific Components:**
- **Chat**: PromptInput, Message, ChatContainer, ScrollButton
- **Streaming**: Markdown (with memoization), ResponseStream
- **AI Features**: Reasoning, Tool, Steps, Source, Loader
- **Utilities**: PromptSuggestion, FileUpload, CodeBlock, SystemMessage

### 2. AI Chat Interface Patterns

**Basic Chat:**
- User/AI message display
- Auto-scrolling behavior
- Loading states
- Avatar handling

**Streaming Chat:**
- SSE (Server-Sent Events) integration
- Real-time token-by-token rendering
- Markdown memoization (CRITICAL for performance!)
- Scroll management during streaming

**Advanced Features:**
- Tool calling visualization
- Multi-agent conversations
- Source citations
- Reasoning displays
- File uploads
- Prompt suggestions

### 3. Performance Optimization

**Critical Optimizations:**
- Markdown `id` prop for block-level memoization
- Virtual scrolling for long conversations (100+ messages)
- Code block caching (Shiki highlighting)
- React.memo for message components
- Debounced user input
- Lazy loading for heavy components

**Streaming Performance:**
- Never re-render entire history
- Use memoized markdown blocks
- Optimize SSE connection handling
- Manage scroll position efficiently

### 4. Accessibility & Best Practices

**A11y Requirements:**
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements
- Color contrast compliance (WCAG AA)
- Focus management

**Code Quality:**
- TypeScript strict typing
- Discriminated unions for messages
- Proper error handling
- Security: XSS protection, input sanitization

## Reference Documentation

### Primary References
- `/docs/shadcn/README.md` - Overview and quick start
- `/docs/shadcn/AI-CHAT-PATTERNS.md` - Common patterns (basic chat, streaming, tool calling, multi-agent)
- `/docs/shadcn/COMPONENT-REFERENCE.md` - Complete component API reference
- `/docs/shadcn/BEST-PRACTICES.md` - Performance, accessibility, TypeScript, security

### Official Documentation
- [shadcn/ui](https://ui.shadcn.com) - Official shadcn documentation
- [prompt-kit](https://www.prompt-kit.com) - prompt-kit documentation
- `/docs/prompt-kit/prompt-kit-llm-full.md` - Local comprehensive guide (2000+ lines)
- `/docs/prompt-kit/examples/` - Real implementation examples

### MCP Tool Access
- `mcp__shadcn__getComponents()` - List all 300+ shadcn components
- `mcp__shadcn__getComponent({ component: "button" })` - Get specific component details
- `mcp__prompt-kit__get_items()` - List all prompt-kit components
- `mcp__prompt-kit__get_item({ name: "prompt-input" })` - Get component details
- `mcp__prompt-kit__add_item({ name: "chat-container" })` - Add component to project

## Key Capabilities

### Recommend Components

```
User: "I need an input field for my chat app"
→ Recommend: PromptInput over base Input
→ Explain: Auto-resize, actions support, file upload ready
→ Provide: Installation command and basic usage
→ Reference: /docs/shadcn/COMPONENT-REFERENCE.md#promptinput
```

### Generate Production-Ready Code

```
User: "Create a chat interface with streaming"
→ Generate complete component with:
  - PromptInput for user input
  - ChatContainer for auto-scroll
  - Message components with markdown
  - SSE streaming logic
  - Error handling
  - TypeScript types
→ Include performance optimizations (markdown id prop!)
→ Reference: /docs/shadcn/AI-CHAT-PATTERNS.md#streaming-chat-with-sse
```

### Optimize Existing Code

```
User: "My chat is slow when streaming"
→ Diagnose: Check for markdown id prop
→ Identify: Missing memoization, re-rendering issues
→ Provide: Optimized code with explanations
→ Reference: /docs/shadcn/BEST-PRACTICES.md#performance-optimization
```

### Implement Advanced Features

```
User: "Add tool calling visualization"
→ Recommend: Tool component from prompt-kit
→ Show: Integration with message component
→ Provide: Type-safe tool call handling
→ Reference: /docs/shadcn/AI-CHAT-PATTERNS.md#chat-with-tool-calling
```

## Best Practices You Follow

### Component Selection
- ✅ Use prompt-kit for AI-specific features
- ✅ Use shadcn/ui for general UI components
- ✅ Combine both for complete chat apps
- ✅ Check MCP tools for component details before implementing
- ✅ Always prefer composition over configuration

### Performance
- ✅ **ALWAYS** add `id` prop to Markdown components
- ✅ Use React.memo for message components
- ✅ Implement virtual scrolling for 100+ messages
- ✅ Cache code highlighting results
- ✅ Debounce expensive operations

### Code Quality
- ✅ Use TypeScript with strict typing
- ✅ Create discriminated unions for messages
- ✅ Handle SSE errors gracefully
- ✅ Validate and sanitize user input
- ✅ Test accessibility with screen readers

### Styling
- ✅ Use theme-aware colors (bg-background, text-foreground)
- ✅ Mobile-first responsive design
- ✅ Consistent spacing with Tailwind scale
- ✅ Support dark mode by default

## Vana Project Context

The Vana project is a multi-agent AI platform with:

**Frontend Stack:**
- Next.js 13+ (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui + prompt-kit theme

**Current Implementation:**
- Location: `/frontend/src/app/page.tsx`
- Components: `/frontend/src/components/`
- SSE Streaming: Via `/api/sse/...` proxy endpoints
- Backend: FastAPI + Google ADK (port 8000)

**Key Files:**
- `/frontend/src/hooks/chat/sse-event-handlers.ts` - SSE logic
- `/frontend/src/hooks/chat/adk-content-extraction.ts` - Content parsing
- `/frontend/src/hooks/store.ts` - State management

## How to Use This Skill

1. **Component recommendations**: "Which component should I use for X?"
2. **Code generation**: "Create a chat interface with streaming"
3. **Performance optimization**: "Why is my chat slow?"
4. **Accessibility guidance**: "How do I make this accessible?"
5. **Pattern implementation**: "Show me how to implement tool calling"
6. **Bug fixing**: "My markdown isn't rendering correctly"

The skill will automatically reference `/docs/shadcn/` documentation and use MCP tools to provide accurate component information.

## Example Prompts

### Component Selection
- "Which component should I use for a chat input?"
- "Show me all available loader variants"
- "What's the difference between Message and markdown rendering?"

### Implementation
- "Create a basic chat interface with shadcn/prompt-kit"
- "Implement streaming chat with SSE"
- "Add tool calling visualization to my chat"
- "Show me how to implement multi-agent conversations"

### Optimization
- "My chat is laggy during streaming - how do I fix it?"
- "Optimize my message list for 1000+ messages"
- "Why is my markdown re-rendering everything?"

### Accessibility
- "Make my chat interface accessible"
- "Add keyboard navigation to my chat"
- "How do I announce new messages to screen readers?"

### Troubleshooting
- "ScrollButton not working"
- "Markdown not highlighting code"
- "ChatContainer not auto-scrolling"
- "File upload not triggering"

## Critical Rules

### 🚨 Never Forget These!

1. **Markdown MUST have `id` prop for streaming**
   ```tsx
   <Markdown id={message.id}>{content}</Markdown>
   ```

2. **ScrollButton ONLY works inside ChatContainerRoot**
   ```tsx
   <ChatContainerRoot>
     <ScrollButton />
   </ChatContainerRoot>
   ```

3. **Use theme-aware colors (NEVER hard-code)**
   ```tsx
   className="bg-background text-foreground"
   ```

4. **Always handle SSE errors**
   ```tsx
   try { /* stream */ } catch (e) { /* handle */ }
   ```

5. **Type messages with discriminated unions**
   ```tsx
   type Message = UserMessage | AssistantMessage
   ```

---

**Skill Version**: 1.0
**Last Updated**: October 2025
**References**: `/docs/shadcn/` + prompt-kit documentation + 300+ shadcn components via MCP
