# Prompt Kit Documentation Index

> **Navigation hub** for all Prompt Kit documentation

## 📚 Documentation Structure

This documentation is organized for **AI coding agents** (Claude Code, Cursor, Windsurf, etc.) to efficiently implement Prompt Kit components.

---

## 🚀 Quick Start

**New to Prompt Kit?** Start here:

1. **[README.md](./README.md)** - Main comprehensive guide
   - Installation
   - Core concepts
   - Component reference
   - Usage patterns
   - Integration examples

---

## 📖 Documentation Files

### Essential Guides

| File | Purpose | When to Use |
|------|---------|-------------|
| **[README.md](./README.md)** | Main documentation | First-time setup, comprehensive reference |
| **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** | Fast lookup cheat sheet | Quick command/prop lookup |
| **[CLAUDE_CODE_INSTRUCTIONS.md](./CLAUDE_CODE_INSTRUCTIONS.md)** | AI agent-specific guide | Claude Code implementation workflows |

### Deep Dives

| File | Purpose | When to Use |
|------|---------|-------------|
| **[COMPONENTS_CATALOG.md](./COMPONENTS_CATALOG.md)** | Complete component reference | Detailed component API reference |
| **[BEST_PRACTICES.md](./BEST_PRACTICES.md)** | Production best practices | Performance, security, testing |

### Examples

| Resource | Description |
|----------|-------------|
| **[examples/](./examples/)** | Official Prompt Kit repository | Real-world component examples |
| **[prompt-kit-llm-full.md](./prompt-kit-llm-full.md)** | LLM-friendly full documentation | Single-file reference |

---

## 🎯 Use Case Navigation

### "I need to..."

#### Build a Chat Interface
1. Read: [README.md - Usage Patterns](./README.md#usage-patterns)
2. Use: Pattern 1 (Basic Chat Interface)
3. Reference: [COMPONENTS_CATALOG.md - ChatContainer](./COMPONENTS_CATALOG.md#chatcontainer)

#### Add Streaming Responses
1. Read: [README.md - Pattern 2](./README.md#pattern-2-streaming-responses)
2. Reference: [BEST_PRACTICES.md - Performance](./BEST_PRACTICES.md#performance-optimization)
3. Install: `markdown`, use `id` prop

#### Display Tool Calls
1. Read: [README.md - Pattern 3](./README.md#pattern-3-with-tool-calling)
2. Reference: [COMPONENTS_CATALOG.md - Tool](./COMPONENTS_CATALOG.md#tool)
3. Install: `npx shadcn add "https://prompt-kit.com/c/tool.json"`

#### Add File Upload
1. Read: [README.md - Recipe 3](./README.md#recipe-3-file-upload-with-input)
2. Reference: [COMPONENTS_CATALOG.md - FileUpload](./COMPONENTS_CATALOG.md#fileupload)
3. Integrate with PromptInput

#### Optimize Performance
1. Read: [BEST_PRACTICES.md - Performance Optimization](./BEST_PRACTICES.md#performance-optimization)
2. Implement: Memoization, lazy loading, virtualization
3. Test with Chrome DevTools MCP

#### Handle Errors
1. Read: [BEST_PRACTICES.md - Error Handling](./BEST_PRACTICES.md#error-handling)
2. Implement: Network recovery, SSE handling, rate limiting
3. Add user feedback

#### Make Accessible
1. Read: [BEST_PRACTICES.md - Accessibility](./BEST_PRACTICES.md#accessibility)
2. Add: ARIA labels, keyboard nav, screen reader support
3. Test with screen reader

#### Deploy to Production
1. Read: [BEST_PRACTICES.md - Production Checklist](./BEST_PRACTICES.md#production-checklist)
2. Verify: Error handling, security, performance
3. Test: E2E, browser compat, mobile

---

## 🔍 Component Quick Finder

| Component | Install Command | Documentation |
|-----------|-----------------|---------------|
| **PromptInput** | `npx shadcn add "...prompt-input.json"` | [Catalog](./COMPONENTS_CATALOG.md#promptinput) |
| **Message** | `npx shadcn add "...message.json"` | [Catalog](./COMPONENTS_CATALOG.md#message) |
| **ChatContainer** | `npx shadcn add "...chat-container.json"` | [Catalog](./COMPONENTS_CATALOG.md#chatcontainer) |
| **Markdown** | `npx shadcn add "...markdown.json"` | [Catalog](./COMPONENTS_CATALOG.md#markdown) |
| **CodeBlock** | `npx shadcn add "...code-block.json"` | [Catalog](./COMPONENTS_CATALOG.md#codeblock) |
| **Loader** | `npx shadcn add "...loader.json"` | [Catalog](./COMPONENTS_CATALOG.md#loader) |
| **Tool** | `npx shadcn add "...tool.json"` | [Catalog](./COMPONENTS_CATALOG.md#tool) |
| **Source** | `npx shadcn add "...source.json"` | [Catalog](./COMPONENTS_CATALOG.md#source) |
| **Reasoning** | `npx shadcn add "...reasoning.json"` | [Catalog](./COMPONENTS_CATALOG.md#reasoning) |
| **FileUpload** | `npx shadcn add "...file-upload.json"` | [Catalog](./COMPONENTS_CATALOG.md#fileupload) |

---

## 🧭 Recommended Reading Order

### For First Implementation

1. **[README.md - Quick Start](./README.md#quick-start)** (5 min)
2. **[README.md - Core Concepts](./README.md#core-concepts)** (10 min)
3. **[README.md - Component Reference](./README.md#component-reference)** (15 min)
4. **Choose a pattern** from [Usage Patterns](./README.md#usage-patterns)
5. **Implement** following [CLAUDE_CODE_INSTRUCTIONS.md](./CLAUDE_CODE_INSTRUCTIONS.md)
6. **Verify** with Chrome DevTools MCP

### For Production Deployment

1. **Review** [BEST_PRACTICES.md - Performance](./BEST_PRACTICES.md#performance-optimization)
2. **Implement** [Error Handling](./BEST_PRACTICES.md#error-handling)
3. **Add** [Accessibility features](./BEST_PRACTICES.md#accessibility)
4. **Complete** [Production Checklist](./BEST_PRACTICES.md#production-checklist)

### For Specific Components

1. **Find component** in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. **Read full API** in [COMPONENTS_CATALOG.md](./COMPONENTS_CATALOG.md)
3. **Check examples** in [examples/](./examples/)

---

## 📊 Documentation Stats

| File | Lines | Purpose | Audience |
|------|-------|---------|----------|
| README.md | ~600 | Main guide | All users |
| QUICK_REFERENCE.md | ~400 | Fast lookup | Experienced devs |
| CLAUDE_CODE_INSTRUCTIONS.md | ~500 | AI agent guide | Claude Code |
| COMPONENTS_CATALOG.md | ~800 | API reference | All users |
| BEST_PRACTICES.md | ~700 | Production guide | Production deployments |

**Total**: ~3000 lines of comprehensive documentation

---

## 🔗 External Resources

### Official Links
- **Website**: https://www.prompt-kit.com
- **GitHub**: https://github.com/ibelick/prompt-kit
- **Docs**: https://www.prompt-kit.com/docs
- **Blocks**: https://www.prompt-kit.com/blocks

### Related
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **Next.js**: https://nextjs.org
- **Google ADK**: https://github.com/google/adk-python

---

## 🛠️ For AI Agents (Claude Code)

### Implementation Workflow

```
1. User Request
   ↓
2. Clarify requirements (use AskUserQuestion if needed)
   ↓
3. Consult CLAUDE_CODE_INSTRUCTIONS.md for decision tree
   ↓
4. Install required components
   ↓
5. Choose pattern from README.md
   ↓
6. Implement code
   ↓
7. Verify with Chrome DevTools MCP
   ↓
8. Done
```

### Quick Decision Tree

```
User wants chat interface?
├─ Basic? → Pattern 1
├─ Streaming? → Pattern 2
├─ Tool calling? → Pattern 3
└─ Full-featured? → Recipe 1

User wants specific component?
├─ Check QUICK_REFERENCE.md
├─ Read COMPONENTS_CATALOG.md
└─ Install and implement

User has errors?
├─ Check BEST_PRACTICES.md - Troubleshooting
├─ Verify dependencies installed
└─ Use Chrome DevTools MCP to debug

User wants to deploy?
├─ Complete BEST_PRACTICES.md checklist
├─ Run all tests
└─ Verify security
```

---

## 📝 Document Maintenance

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Maintained By**: Vana Project Team

### Updating Documentation

When Prompt Kit updates:
1. Pull latest from `examples/` repo
2. Update component versions in COMPONENTS_CATALOG.md
3. Update installation commands if changed
4. Add new components to QUICK_REFERENCE.md
5. Update this INDEX.md with new sections

---

## 💡 Tips for AI Agents

### Context Management

For long conversations, prioritize reading:
1. **First time**: README.md (full context)
2. **Subsequent**: QUICK_REFERENCE.md (fast lookup)
3. **Specific needs**: Relevant section from COMPONENTS_CATALOG.md
4. **Production**: BEST_PRACTICES.md sections as needed

### Token Efficiency

- Use **INDEX.md** to find relevant docs
- Read **only needed sections** from catalogs
- Reference **QUICK_REFERENCE.md** for props/commands
- Use **examples/** for code patterns

### Verification Strategy

Always use Chrome DevTools MCP to verify:
```javascript
// 1. Navigate
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })

// 2. Snapshot
mcp__chrome-devtools__take_snapshot()

// 3. Test interaction
mcp__chrome-devtools__fill({ uid: "input", value: "test" })
mcp__chrome-devtools__click({ uid: "button" })

// 4. Check errors
mcp__chrome-devtools__list_console_messages()
```

---

**Happy Building! 🚀**
