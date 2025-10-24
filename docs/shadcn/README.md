# shadcn/ui + Prompt-Kit Expert Documentation

> **Expert guidance for building AI chat interfaces with shadcn/ui and prompt-kit**

This directory contains comprehensive documentation for using shadcn/ui components and prompt-kit specialized components to build production-ready AI chat applications.

## 📚 Documentation Index

- **[AI-CHAT-PATTERNS.md](./AI-CHAT-PATTERNS.md)** - Common patterns and architectures for AI chat interfaces
- **[COMPONENT-REFERENCE.md](./COMPONENT-REFERENCE.md)** - Quick reference for essential components
- **[CODE-EXAMPLES.md](./CODE-EXAMPLES.md)** - Production-ready code examples
- **[BEST-PRACTICES.md](./BEST-PRACTICES.md)** - Best practices and optimization techniques

## 🚀 Quick Start

### What is shadcn/ui?

shadcn/ui is a collection of re-usable components built with Radix UI and Tailwind CSS. Components are **not** installed as npm packages - instead, you copy the source code directly into your project.

### What is prompt-kit?

prompt-kit is a specialized library built on top of shadcn/ui with components designed specifically for AI applications. It provides:

- **Chat Components**: Message, PromptInput, ChatContainer
- **Streaming Components**: ResponseStream, Markdown with memoization
- **AI-Specific**: Reasoning, Tool, Source, Steps
- **Feedback**: Loader variants, ScrollButton

### Installation

```bash
# Install shadcn/ui components
npx shadcn@latest add button dialog form input

# Install prompt-kit components
npx shadcn@canary add https://www.prompt-kit.com/c/prompt-input.json
npx shadcn@canary add https://www.prompt-kit.com/c/message.json
npx shadcn@canary add https://www.prompt-kit.com/c/chat-container.json
```

### MCP Tools Available

You have access to two MCP tools for browsing components:

```typescript
// Get all shadcn components (300+ available)
mcp__shadcn__getComponents()

// Get specific shadcn component details
mcp__shadcn__getComponent({ component: "button" })

// Get all prompt-kit items
mcp__prompt-kit__get_items()

// Get specific prompt-kit component
mcp__prompt-kit__get_item({ name: "prompt-input" })

// Add prompt-kit component to project
mcp__prompt-kit__add_item({ name: "chat-container" })
```

## 🎯 Core prompt-kit Components for AI Chat

### Essential Chat Components

| Component | Purpose | Installation |
|-----------|---------|--------------|
| `prompt-input` | Input field with auto-resize, actions, file upload | `npx shadcn@canary add https://www.prompt-kit.com/c/prompt-input.json` |
| `message` | Display user/AI messages with avatars, markdown | `npx shadcn@canary add https://www.prompt-kit.com/c/message.json` |
| `chat-container` | Auto-scrolling container with smart behavior | `npx shadcn@canary add https://www.prompt-kit.com/c/chat-container.json` |
| `markdown` | Render markdown with GFM, code highlighting | `npx shadcn@canary add https://www.prompt-kit.com/c/markdown.json` |

### Advanced AI Components

| Component | Purpose | Installation |
|-----------|---------|--------------|
| `reasoning` | Collapsible AI reasoning/thought process | `npx shadcn@canary add https://www.prompt-kit.com/c/reasoning.json` |
| `tool` | Display tool calls (input/output/status) | `npx shadcn@canary add https://www.prompt-kit.com/c/tool.json` |
| `steps` | Show AI processing steps | `npx shadcn@canary add https://www.prompt-kit.com/c/steps.json` |
| `source` | Display sources with hover details | `npx shadcn@canary add https://www.prompt-kit.com/c/source.json` |
| `loader` | 12+ loading variants | `npx shadcn@canary add https://www.prompt-kit.com/c/loader.json` |

### Utility Components

| Component | Purpose | Installation |
|-----------|---------|--------------|
| `scroll-button` | Float button to scroll to bottom | `npx shadcn@canary add https://www.prompt-kit.com/c/scroll-button.json` |
| `prompt-suggestion` | Clickable prompt suggestions | `npx shadcn@canary add https://www.prompt-kit.com/c/prompt-suggestion.json` |
| `file-upload` | Drag-and-drop file upload | `npx shadcn@canary add https://www.prompt-kit.com/c/file-upload.json` |
| `code-block` | Code syntax highlighting (Shiki) | `npx shadcn@canary add https://www.prompt-kit.com/c/code-block.json` |

## 🎨 shadcn/ui Base Components

### Most Common for Chat UIs

- **button** - Action buttons, send buttons
- **input** - Text inputs (though prompt-input is better for chat)
- **dialog** - Modals, settings
- **dropdown-menu** - User menus, options
- **avatar** - User/AI avatars (used in message component)
- **badge** - Status indicators
- **card** - Container components
- **separator** - Visual dividers
- **tooltip** - Hover hints

### Installation

```bash
npx shadcn@latest add button input dialog dropdown-menu avatar badge card separator tooltip
```

## 📦 Complete Chat App Setup

```bash
# Base shadcn/ui
npx shadcn@latest add button dialog avatar badge tooltip

# Core prompt-kit chat
npx shadcn@canary add https://www.prompt-kit.com/c/prompt-input.json
npx shadcn@canary add https://www.prompt-kit.com/c/message.json
npx shadcn@canary add https://www.prompt-kit.com/c/chat-container.json
npx shadcn@canary add https://www.prompt-kit.com/c/markdown.json

# Advanced AI features
npx shadcn@canary add https://www.prompt-kit.com/c/reasoning.json
npx shadcn@canary add https://www.prompt-kit.com/c/tool.json
npx shadcn@canary add https://www.prompt-kit.com/c/loader.json
npx shadcn@canary add https://www.prompt-kit.com/c/scroll-button.json
```

## 🔗 Key Resources

### Official Documentation
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [prompt-kit Documentation](https://www.prompt-kit.com/docs)
- [prompt-kit GitHub](https://github.com/ibelick/prompt-kit)

### Local References
- `/docs/prompt-kit/prompt-kit-llm-full.md` - Complete prompt-kit documentation (2000+ lines)
- `/docs/prompt-kit/examples/` - Real implementation examples

### MCP Servers Configured
- `shadcn` - Browse 300+ shadcn components
- `prompt-kit` - Browse and add AI-specific components

## 💡 Key Concepts

### Component Philosophy

**shadcn/ui approach:**
- Copy components directly into your project
- Full control over implementation
- Customize without restrictions
- No npm dependency bloat

**prompt-kit approach:**
- Built on shadcn/ui foundation
- AI-specific components
- Streaming-optimized
- Production-tested patterns

### Styling

Both use **Tailwind CSS** for styling:
- Utility-first CSS framework
- Responsive by default
- Dark mode support built-in
- Customizable via `tailwind.config.js`

### TypeScript

All components are **fully typed**:
- Props interfaces
- Component types
- Strong type safety
- IntelliSense support

## 🎯 When to Use What

### Use prompt-kit when:
- ✅ Building AI chat interfaces
- ✅ Need streaming text support
- ✅ Displaying tool calls/reasoning
- ✅ Want optimized markdown rendering
- ✅ Need auto-scrolling chat containers

### Use base shadcn/ui when:
- ✅ Building general UI components
- ✅ Need dialogs, dropdowns, forms
- ✅ Want maximum customization
- ✅ Building non-AI features

### Use both together:
- ✅ **Best approach for AI apps!**
- ✅ shadcn for base UI (buttons, dialogs, forms)
- ✅ prompt-kit for AI features (chat, streaming, tools)

## 📖 Next Steps

1. Read [AI-CHAT-PATTERNS.md](./AI-CHAT-PATTERNS.md) for common patterns
2. Check [COMPONENT-REFERENCE.md](./COMPONENT-REFERENCE.md) for component APIs
3. Study [CODE-EXAMPLES.md](./CODE-EXAMPLES.md) for production code
4. Review [BEST-PRACTICES.md](./BEST-PRACTICES.md) for optimization tips

## 🤖 Using the shadcn-expert Skill

Activate the skill with:
```
/shadcn-expert
```

Or use the agent for complex tasks:
```
/shadcn-agent
```

The skill provides:
- Component recommendations
- Code generation
- Best practice guidance
- Performance optimization
- Accessibility compliance

---

**Version:** 1.0
**Last Updated:** October 2025
**Maintainer:** Vana Project
