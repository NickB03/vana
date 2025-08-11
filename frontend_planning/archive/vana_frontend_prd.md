# Vana Frontend – Full Build Bible PRD

**Version:** 1.0  
**Date:** 2025-08-11  
**Prepared for:** Full build implementation of Vana AI frontend, modeled on Gemini / Claude patterns  
**Tech Stack:** React, Tailwind CSS, shadcn/ui, Zustand, SSE via LiteLLM, Monaco Editor, react-markdown, lucide-react icons  

---

## 1. Project Overview

### Purpose
Vana is a **multi-agent AI chat platform** designed for conversational content generation, structured tool outputs, and multi-pane editing via a **Canvas system**.  
It draws inspiration from Gemini, Claude, and ChatGPT but introduces:
- **Canvas-first** output with multiple editor modes (Markdown, Code, Web Preview, Sandbox)
- **Agent orchestration** with a visual **Task Deck**
- **Shadcn-based UI** for maintainability and consistency
- **File upload pipeline** supporting `.md` for direct Canvas editing
- **Sidebar session persistence** with selective retrieval rules

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React (Vite or Next.js) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State | Zustand (modular stores) |
| Networking | SSE via LiteLLM |
| Auth | shadcn Authentication + Google OAuth |
| Markdown Rendering | react-markdown + remark plugins |
| Code Editing | Monaco Editor |
| Sandbox Execution | iframe with `sandbox="allow-scripts"` |
| Icons | lucide-react |
| Animation | Framer Motion |

---

## 3. Global State Architecture

- **Session Store**
  ```ts
  {
    currentSessionId: string | null,
    sessions: Session[]
  }
  ```
- **Chat Store**
  ```ts
  {
    messages: Message[],
    addMessage(msg: Message): void
  }
  ```
- **Canvas Store**
  ```ts
  {
    isOpen: boolean,
    content: { type: 'markdown' | 'code' | 'web' | 'sandbox', value: string },
    openCanvas(type, content),
    closeCanvas()
  }
  ```
- **Upload Store**
  ```ts
  {
    uploads: File[],
    addUpload(file: File),
    removeUpload(fileId: string)
  }
  ```
- **Agent Deck Store**
  ```ts
  {
    tasks: Task[],
    isVisible: boolean,
    toggleDeck()
  }
  ```

---

## 4. Homepage Specification

### Purpose
Serve as entry point for Vana sessions, offering quick-start prompts, tool selection, and recent conversations.  

### User Flow
1. User visits `/`:
   - If authenticated → see greeting, prompt bar, tool picker, sidebar with recent sessions.
   - If not authenticated → same UI but prompt submit redirects to `/auth`.

2. Prompt submission:
   - Enter text → press Enter or click Send → `startSession()` → navigate to Chat view.

3. Tool picker:
   - Clicking a tool opens a new session pre-configured with Canvas in that mode.

4. Sidebar:
   - Shows only sessions started from homepage.

### UI Spec
- **Greeting**: `Hi, I’m Vana` – Tailwind `text-2xl font-semibold`
- **Prompt Suggestions**: shadcn `Button variant="outline"`
- **Tool Picker**: Grid of shadcn `Button`s, each with lucide-react icon
- **Recent Conversations**: shadcn `ResizablePanel` on left
- **Prompt Input**: shadcn `Input` with `placeholder="Ask me anything..."`

### Wireframe Description
```
--------------------------------------------------
| Sidebar (recent sessions) |   Main Content     |
|                           | Greeting           |
|                           | [suggestion btns]  |
|                           | [tool picker]      |
|                           | [input bar]        |
--------------------------------------------------
```

### Backend
- None directly, session created on first submit.

### Edge Cases
- Auth fail → redirect to `/auth`
- Empty prompt → disable send

### Accessibility
- Input `aria-label="Chat prompt"`
- Buttons labeled with tool name

---

## 5. Authentication

### Purpose
Allow login via Google OAuth and optional email/password.

### UI Spec
- Based on [shadcn Authentication Example](https://ui.shadcn.com/examples/authentication)
- Google button with lucide Google icon
- Redirect post-login to homepage or last active session

### State
- Auth state persisted in Zustand/localStorage

### Edge Cases
- Expired token → refresh or redirect to `/auth`

---

## 6. Chat View

### Purpose
Provide real-time, streaming conversation between user and Vana/agents.

### User Flow
1. Landing in Chat from homepage or session click.
2. Message list displays prior messages from session store.
3. Input bar at bottom with:
   - Textarea (shadcn `Textarea`)
   - Send button (shadcn `Button` with lucide `Send`)
   - File upload (📎 icon)
   - Canvas toggle button
4. SSE stream appends tokens to current agent message.

### UI Spec
- Message bubbles:
  - **User**: right-aligned, shadcn `Card variant="outline"`
  - **Agent**: left-aligned, includes attribution label above message
- Upload icon → file select dialog
- Canvas toggle → `openCanvas()`

### Wireframe
```
--------------------------------------------------
| Sidebar | Chat Messages (scrollable)           |
|         |  User: "Hello"   [📎 file.md]        |
|         |  Agent (Vana): "Hi there..."         |
|         |--------------------------------------|
|         | [upload] [textarea........] [send]   |
--------------------------------------------------
```

### Backend Integration
- `/chat` POST → SSE stream  
- Events:
  - `message_token`
  - `canvas_open`
  - `task_update`

### Edge Cases
- SSE disconnect → reconnect & retry
- Send disabled if input empty and no uploads

---

## 7. Canvas System

### Purpose
Display and edit structured outputs in specialized editors.

### Modes
| Type | Editor |
|------|--------|
| markdown | react-markdown or text editor |
| code | Monaco Editor |
| web | HTML/CSS/JS preview in iframe |
| sandbox | Secure iframe with scripts allowed |

### Behavior
- Side-by-side with chat
- Resizable via shadcn `ResizablePanel`
- Manual or agent-triggered open
- Empty state: blank markdown editor

### Wireframe
```
--------------------------------------------------
| Chat Column   | Canvas Column (resizable)      |
|               | ----------------------------   |
|               | [Header: type switch, close]   |
|               | [Editor area / preview]        |
--------------------------------------------------
```

### State
- `canvasContent`: `{ type, value }`
- `isOpen`: boolean

### Backend
- `canvas_open` SSE event payload:
  ```json
  {
    "type": "canvas",
    "canvasType": "markdown",
    "content": "# Hello"
  }
  ```

---

## 8. File Upload Flow

### Purpose
Allow attaching files to prompts, with `.md` triggering Canvas directly.

### Supported Types
- `.md`, `.txt`, `.pdf`, `.docx`
- Max 3 files, ≤10MB each

### Behavior
- Upload button in chat input
- Drag-and-drop onto input bar
- Show file chips before send
- Minimal indicator in message bubble after send

### Wireframe
```
[📎 file1.md] [📎 file2.pdf]
User: "Summarize this"
```

### Backend
- Multipart POST
- `.md` without prompt → open Canvas

---

## 9. Sidebar / Sessions

### Purpose
Persist conversation history for navigation.

### Behavior
- Shows sessions only from homepage
- Each entry: title, timestamp
- Collapse/expand

### State
- `sessions[]` persisted locally and optionally synced with backend

---

## 10. Agent Communication & Task Deck

### Purpose
Visually track multi-agent workflows.

### Task Deck Behavior
- Floating card stack
- Each card: agent role, description, status icon
- Cards shuffle to bottom when complete
- Close (X) hides deck but tasks still show in inline to-do list in chat

### To-Do List
- Minimal list inline with chat showing task names and status
- Matches deck content

### Wireframe
```
[Deck: top-right of chat]
[Card: Code Agent - "Formatting code" ⏳]
[Card: Markdown Agent - "Rendering doc" ✅]
```

### Backend
- `task_update` SSE event:
  ```json
  {
    "type": "task_update",
    "taskList": [
      { "title": "Generate Outline", "status": "complete" },
      { "title": "Format Markdown", "status": "pending" }
    ]
  }
  ```

---

## 11. Error Handling

### Purpose
Prevent user confusion and allow quick recovery.

### Behavior
- Red error chip under failed messages
- Retry button
- SSE reconnect logic with exponential backoff

---

## 12. Empty States

- Chat: “Start a conversation…”
- Canvas: Blank markdown editor with hint text
- Sidebar: “No recent conversations”

---

## 13. Enhancements & Roadmap

- “Edit in Code View” for sandbox outputs
- PDF preview thumbnails
- Keyboard shortcut to toggle Canvas (`Cmd+K`)
- Agent verbose/debug mode

---

## 14. Accessibility

- ARIA labels for all buttons
- Keyboard navigation for chat, canvas, and deck
- High contrast mode support

---

## 15. Wireframe Summary

*(Embedded above in each section for context)*