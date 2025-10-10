# SSE Implementation Diagrams

Comprehensive visual documentation for the Vana SSE (Server-Sent Events) implementation.

## 📊 Available Diagrams

### 1. [SSE Sequence Diagram](./sse-sequence-diagram.md)
**Complete message flow from user action to UI update**

Shows the entire sequence of interactions:
- User sends message → Chat UI → Backend → ADK → Response streaming
- SSE connection establishment and authentication
- Real-time event processing and state updates
- Error handling and retry logic
- Timing considerations and async operations

**Use this for**: Understanding the complete end-to-end flow of a chat message.

---

### 2. [Architecture Diagram](./sse-architecture-diagram.md)
**C4-style component diagram showing service architecture**

Visualizes the system components:
- Frontend layer (React, hooks, EventSource)
- Proxy layer (Next.js API routes)
- Backend layer (FastAPI, session management)
- ADK layer (Google Agent Development Kit)
- External services (GCS, Gemini API)
- Data flow and security boundaries

**Use this for**: Understanding how different services interact and where components live.

---

### 3. [State Machine Diagram](./sse-state-machine.md)
**SSE connection lifecycle and state transitions**

Documents all connection states:
- Disconnected → Connecting → Connected → Error → Reconnecting
- Event processing states
- Reconnection strategy
- Message streaming states
- State transition triggers

**Use this for**: Debugging connection issues and understanding state management.

---

### 4. [Message Processing Flowchart](./sse-message-processing-flowchart.md)
**Message type routing and processing logic**

Covers all event types:
- `research_update` - Incremental content chunks
- `research_complete` - Completion status
- `agent_status` - Agent coordination
- `error` - Error handling with rate limit detection
- Message actions (edit, delete, regenerate)
- Edge cases (empty data, [DONE] markers, comments)

**Use this for**: Understanding how different message types are processed.

---

### 5. [Class Diagram](./sse-class-diagram.md)
**Key classes, interfaces, and relationships**

Documents the codebase structure:
- Frontend hooks (`useSSE`, `useOptimizedSSE`, `useChatStream`)
- Backend routers (`ADKRouter`, `SSEBroadcaster`)
- Data models (`ChatSession`, `Message`, `Agent`)
- State management (Zustand store)
- API clients and services

**Use this for**: Understanding the code architecture and class relationships.

---

## 🎯 Quick Reference Guide

### For Developers

**New to the codebase?**
1. Start with [Architecture Diagram](./sse-architecture-diagram.md) - See the big picture
2. Review [Sequence Diagram](./sse-sequence-diagram.md) - Follow a message flow
3. Study [Class Diagram](./sse-class-diagram.md) - Learn the code structure

**Debugging connection issues?**
1. Check [State Machine Diagram](./sse-state-machine.md) - Understand states
2. Review [Message Processing Flowchart](./sse-message-processing-flowchart.md) - See error paths

**Adding new features?**
1. Study [Architecture Diagram](./sse-architecture-diagram.md) - Find integration points
2. Review [Class Diagram](./sse-class-diagram.md) - Understand existing patterns
3. Check [Sequence Diagram](./sse-sequence-diagram.md) - See timing considerations

### For Product/Design Teams

**Understanding real-time features:**
- [Sequence Diagram](./sse-sequence-diagram.md) - See how streaming works
- [State Machine Diagram](./sse-state-machine.md) - Understand user experience states

**Planning new features:**
- [Architecture Diagram](./sse-architecture-diagram.md) - See system capabilities
- [Message Processing Flowchart](./sse-message-processing-flowchart.md) - Understand event types

---

## 📖 Diagram Conventions

### Color Coding

Throughout the diagrams, we use consistent color coding:

- **🔵 Blue** - Frontend components (React, hooks, UI)
- **🟡 Yellow** - Proxy/Middleware (Next.js API routes)
- **🟣 Purple** - Backend services (FastAPI, session management)
- **🟢 Green** - External services (ADK, Gemini API, GCS)
- **🔴 Red** - Error states and error handling
- **🟠 Orange** - Decision points and conditionals

### Component Notation

- **Rectangles** - Services, components, classes
- **Rounded rectangles** - Start/end states
- **Diamonds** - Decision points
- **Cylinders** - Data stores (databases, caches)
- **Dotted lines** - Async/event-driven communication
- **Solid lines** - Synchronous calls

---

## 🔧 Technical Details

### Key Technologies Visualized

1. **Server-Sent Events (SSE)**
   - Browser native EventSource API
   - Unidirectional server-to-client streaming
   - Automatic reconnection support

2. **Google ADK Integration**
   - 8 specialized research agents
   - Multi-agent coordination
   - Gemini 2.5 Pro Flash LLM

3. **State Management**
   - Zustand for global state
   - React hooks for local state
   - GCS for session persistence

4. **Security Architecture**
   - JWT authentication
   - HTTP-only cookies
   - Proxy-based token protection

---

## 🎨 Viewing the Diagrams

### Recommended Tools

1. **GitHub** - Built-in Mermaid rendering
2. **VS Code** - Markdown Preview Mermaid Support extension
3. **Mermaid Live Editor** - https://mermaid.live for editing
4. **Confluence/Notion** - Most support Mermaid syntax

### Rendering Options

All diagrams use [Mermaid](https://mermaid.js.org/) syntax and can be:
- Viewed directly on GitHub
- Rendered in VS Code with extensions
- Exported to PNG/SVG using mermaid-cli
- Embedded in documentation sites

---

## 📝 Diagram Maintenance

### Updating Diagrams

When updating the SSE implementation:

1. **Code changes** → Update relevant diagrams
2. **New event types** → Update message processing flowchart
3. **New components** → Update class and architecture diagrams
4. **State changes** → Update state machine diagram
5. **Flow changes** → Update sequence diagram

### Validation Checklist

Before committing diagram changes:

- [ ] Syntax validates in Mermaid Live Editor
- [ ] Renders correctly on GitHub preview
- [ ] Matches current implementation
- [ ] Color coding is consistent
- [ ] Labels are clear and descriptive
- [ ] Related diagrams are updated

---

## 🔗 Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Project overview and development guide
- [SSE Implementation](../../frontend/src/hooks/useSSE.ts) - Frontend SSE hook
- [ADK Routes](../../app/routes/adk_routes.py) - Backend ADK integration
- [Architecture Decisions](../../docs/architecture/) - ADRs and design docs

---

## 💡 Contributing

To add or update diagrams:

1. Use [Mermaid Live Editor](https://mermaid.live) for development
2. Follow existing color coding and naming conventions
3. Test rendering in GitHub preview
4. Update this README with new diagram descriptions
5. Submit PR with diagram changes and code updates together

---

## 📞 Support

Questions about the diagrams?
- Check [CLAUDE.md](../../CLAUDE.md) for context
- Review the source code referenced in each diagram
- Open an issue with the `documentation` label

---

**Last Updated**: 2025-10-09
**Diagram Version**: 1.0.0
**Compatible with**: Vana SSE Implementation (feat/rate-limiting branch)
