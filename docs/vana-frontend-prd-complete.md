# Vana Frontend PRD – Complete Build Specification

**Version:** 1.0  
**Date:** 2025-08-11  
**Status:** Final  
**Purpose:** Comprehensive product requirements document for Vana AI frontend, incorporating all gaps identified in planning session

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Core User Flows](#core-user-flows)
5. [Authentication System](#authentication-system)
6. [Homepage Specification](#homepage-specification)
7. [Chat Interface](#chat-interface)
8. [Canvas System](#canvas-system)
9. [File Upload System](#file-upload-system)
10. [Agent Communication & Task Management](#agent-communication--task-management)
11. [Session Management](#session-management)
12. [State Management](#state-management)
13. [Backend Integration](#backend-integration)
14. [UI Components Specification](#ui-components-specification)
15. [Error Handling & Recovery](#error-handling--recovery)
16. [Accessibility Requirements](#accessibility-requirements)
17. [Performance Requirements](#performance-requirements)
18. [Security Requirements](#security-requirements)
19. [Testing Requirements](#testing-requirements)
20. [Deployment & Infrastructure](#deployment--infrastructure)
21. [Roadmap & Future Enhancements](#roadmap--future-enhancements)

---

## 1. Executive Summary

### 1.1 Product Vision
Vana is a multi-agent AI platform modeled after industry leaders (Google Gemini, Anthropic Claude, OpenAI ChatGPT) but differentiated by:
- **Canvas-first output**: Side-by-side editing with multiple editor modes
- **Multi-agent orchestration**: Visual workflow tracking via Agent Task Deck
- **Seamless file handling**: Direct `.md` to Canvas pipeline
- **shadcn/ui foundation**: Consistent, accessible, maintainable UI

### 1.2 Core Features
- Conversational AI chat with streaming responses
- Multi-mode Canvas (Markdown, Code, Web Preview, Sandbox)
- Agent Task Deck for workflow visualization
- File upload with intelligent routing
- Session persistence with selective history
- Google OAuth authentication

### 1.3 Technical Foundation
- **Frontend**: React + Next.js 13 (App Router)
- **Backend**: Google Agent Development Kit (GADK) with FastAPI
- **Streaming**: Server-Sent Events (SSE) with real-time token streaming
- **LLM Provider**: LiteLLM (proxy for Claude, GPT, Gemini models)
- **State**: Zustand with modular stores
- **UI**: shadcn/ui + Tailwind CSS
- **Monitoring**: OpenTelemetry, Cloud Trace, BigQuery analytics
- **Session Storage**: Persistent session store with Google Cloud integration

---

## 2. Technology Stack

### 2.1 Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 13+ | React framework with App Router |
| UI Components | shadcn/ui | Latest | Radix-based accessible components |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| State Management | Zustand | 4.x | Lightweight state management |
| Authentication | Firebase Auth | 9.x | Google OAuth + JWT |
| Code Editor | Monaco Editor | Latest | VS Code editor in browser |
| Markdown | react-markdown | 9.x | Markdown rendering |
| Animation | Framer Motion | 11.x | Smooth transitions |
| Icons | lucide-react | Latest | Consistent icon set |
| SSE Client | EventSource | Native | Server-sent events |

### 2.2 Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety |
| ESLint | Code quality |
| Prettier | Code formatting |
| Vitest | Unit testing |
| Playwright | E2E testing |

---

## 3. Architecture Overview

### 3.1 Application Structure

```
/app
  /auth           # Authentication pages
    page.tsx      # Combined login/register
  /chat           # Main chat interface
    page.tsx      # Chat view
  /api            # API routes (if needed)
  layout.tsx      # Root layout with providers
  page.tsx        # Homepage

/components
  /ui             # shadcn components
  /chat           # Chat-specific components
  /canvas         # Canvas components
  /agent          # Agent deck & communication
  /upload         # File upload components
  /session        # Session management

/stores
  sessionStore.ts
  chatStore.ts
  canvasStore.ts
  uploadStore.ts
  agentDeckStore.ts
  authStore.ts

/lib
  /utils          # Utility functions
  /hooks          # Custom React hooks
  /api            # API client
  /sse            # SSE handling
```

### 3.2 Data Flow

```
User Input → Frontend State → API Request → GADK Backend
                                    ↓
Canvas Update ← SSE Stream ← Agent Processing
```

---

## 4. Core User Flows

### 4.1 Homepage → Chat → Canvas Flow

#### Purpose
Seamless transition from landing to interactive conversation with optional Canvas output.

#### Detailed Flow

1. **Homepage Landing**
   - User sees greeting: "Hi, I'm Vana"
   - Prompt suggestions displayed as cards
   - Tool picker shows available modes
   - Sidebar shows recent conversations (homepage-origin only)

2. **Prompt Submission**
   ```
   User Action: Type prompt + Enter/Send
   System Response:
   - Create new session with UUID
   - Transition to chat view (smooth animation)
   - Initialize SSE connection
   - Begin streaming agent response
   ```

3. **Agent Response Processing**
   ```
   If response.type === 'canvas':
     - Set activeView = 'canvas'
     - Open Canvas panel side-by-side
     - Load content into appropriate editor
   Else:
     - Stream tokens to chat message
   ```

4. **Manual Canvas Access**
   ```
   User Action: Click Canvas button
   System Response:
   - If canvasContent exists → load it
   - Else → open blank markdown editor
   ```

#### State Changes
```typescript
// On prompt submit
sessionStore.createSession(prompt)
chatStore.addMessage({ role: 'user', content: prompt })
sseClient.connect(sessionId)

// On canvas trigger
canvasStore.open(type, content)
uiStore.setActiveView('canvas')
```

### 4.2 Tool-Triggered Session Flow

#### Purpose
Allow users to start with a specific tool rather than text prompt.

#### Flow
1. User clicks tool (e.g., "Code Editor")
2. System creates new session
3. Canvas opens immediately in selected mode
4. Chat remains available for prompts

---

## 5. Authentication System

### 5.1 Overview
Combined login/register page using shadcn Authentication template with Google OAuth as primary method.

### 5.2 UI Specification

#### Component Structure
```tsx
<Card className="w-[400px]">
  <CardHeader>
    <CardTitle>Welcome to Vana</CardTitle>
    <CardDescription>Sign in to continue</CardDescription>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="login">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
      <TabsContent value="register">
        <RegisterForm />
      </TabsContent>
    </Tabs>
    <Separator className="my-4" />
    <Button variant="outline" className="w-full" onClick={googleSignIn}>
      <Icons.google className="mr-2 h-4 w-4" />
      Continue with Google
    </Button>
  </CardContent>
</Card>
```

### 5.3 Authentication Flow

```typescript
// Google OAuth flow
const googleSignIn = async () => {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  const token = await result.user.getIdToken()
  
  // Store in Zustand
  authStore.setUser(result.user)
  authStore.setToken(token)
  
  // Redirect
  router.push('/chat')
}
```

### 5.4 Route Protection

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  
  if (!token && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }
  
  if (token && request.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/chat', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

---

## 6. Homepage Specification

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (Sessions)  │      Main Content Area       │
│                      │                              │
│  Recent Chats:       │    Hi, I'm Vana             │
│  • Project planning  │                              │
│  • Code review       │  ┌────┐ ┌────┐ ┌────┐      │
│  • Documentation     │  │Idea│ │Plan│ │Debug│      │
│                      │  └────┘ └────┘ └────┘      │
│                      │                              │
│                      │  🔧 Canvas  📝 Markdown     │
│                      │  💻 Code    🌐 Web          │
│                      │                              │
│                      │  [What can I help with?___] │
│                      │                    [Send]   │
└─────────────────────────────────────────────────────┘
```

### 6.2 Components

#### Greeting
```tsx
<h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
  Hi, I'm Vana
</h1>
```

#### Prompt Suggestions
```tsx
<div className="flex gap-4 overflow-x-auto pb-2">
  {suggestions.map(suggestion => (
    <Card 
      key={suggestion.id}
      className="min-w-[200px] cursor-pointer hover:border-primary transition-colors"
      onClick={() => handleSuggestionClick(suggestion)}
    >
      <CardContent className="p-4">
        <p className="text-sm">{suggestion.text}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

#### Tool Picker
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  {tools.map(tool => (
    <Button
      key={tool.id}
      variant="outline"
      className="h-20 flex flex-col gap-2"
      onClick={() => handleToolSelect(tool)}
    >
      <tool.icon className="h-6 w-6" />
      <span className="text-xs">{tool.name}</span>
    </Button>
  ))}
</div>
```

#### Input Bar
```tsx
<div className="flex items-end gap-2 p-4 border-t bg-background">
  <Button variant="ghost" size="icon">
    <Paperclip className="h-4 w-4" />
  </Button>
  <Textarea
    className="flex-grow resize-none min-h-[56px] max-h-[200px]"
    placeholder="What can I help with today?"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyPress}
  />
  <Button variant="ghost" size="sm">
    Canvas
  </Button>
  <Button type="submit" disabled={!input.trim()}>
    <Send className="h-4 w-4" />
  </Button>
</div>
```

### 6.3 Background Styling
```css
/* Subtle gradient glow */
.homepage-background {
  background: radial-gradient(
    ellipse at top,
    rgba(59, 130, 246, 0.1) 0%,
    transparent 50%
  );
}
```

---

## 7. Chat Interface

### 7.1 Message Rendering

#### User Messages
```tsx
<div className="flex justify-end mb-4">
  <div className="max-w-[70%] bg-muted rounded-lg p-3">
    <p className="text-sm">{message.content}</p>
    {message.files && (
      <div className="flex items-center gap-1 mt-2 text-muted-foreground">
        <FileText className="h-3 w-3" />
        <Tooltip>
          <TooltipTrigger>
            <span className="text-xs">{message.files[0].name}</span>
          </TooltipTrigger>
          <TooltipContent>
            Attached: {message.files.map(f => f.name).join(', ')}
          </TooltipContent>
        </Tooltip>
      </div>
    )}
  </div>
</div>
```

#### Agent Messages
```tsx
<div className="flex flex-col gap-1 mb-4">
  <span className="text-xs text-muted-foreground flex items-center gap-1">
    <Brain className="h-3 w-3" />
    {message.agentName || 'Vana Agent'}
  </span>
  <div className="max-w-[70%] bg-card border rounded-lg p-3">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <CodeBlock
              language={match[1]}
              value={String(children).replace(/\n$/, '')}
              {...props}
            />
          ) : (
            <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          )
        }
      }}
    >
      {message.content}
    </ReactMarkdown>
  </div>
</div>
```

### 7.2 Streaming Behavior

```typescript
// SSE handler
const handleSSE = () => {
  const eventSource = new EventSource(`/api/chat/stream?session=${sessionId}`)
  
  eventSource.addEventListener('message_token', (e) => {
    const data = JSON.parse(e.data)
    chatStore.appendToLastMessage(data.token)
  })
  
  eventSource.addEventListener('canvas_open', (e) => {
    const data = JSON.parse(e.data)
    canvasStore.open(data.canvasType, data.content)
  })
  
  eventSource.addEventListener('task_update', (e) => {
    const data = JSON.parse(e.data)
    agentDeckStore.updateTasks(data.taskList)
  })
  
  eventSource.addEventListener('error', (e) => {
    chatStore.setStreamError(true)
    eventSource.close()
  })
}
```

### 7.3 Input Handling

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  
  if (!input.trim() && uploadedFiles.length === 0) return
  
  const message = {
    role: 'user',
    content: input,
    files: uploadedFiles,
    timestamp: Date.now()
  }
  
  chatStore.addMessage(message)
  setInput('')
  setUploadedFiles([])
  
  await sendToBackend(message)
  handleSSE()
}

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit(e as any)
  }
}
```

---

## 8. Canvas System

### 8.1 Canvas Architecture

#### Layout
```
┌─────────────────────────────────────────────────────┐
│     Chat (60%)      │      Canvas (40%)             │
│                     │ ┌───────────────────────────┐ │
│  Messages...        │ │ [Markdown|Code|Web] [X]  │ │
│                     │ ├───────────────────────────┤ │
│                     │ │                           │ │
│                     │ │    Editor/Preview Area    │ │
│                     │ │                           │ │
│                     │ └───────────────────────────┘ │
│  [Input...]         │          ← Resizable →        │
└─────────────────────────────────────────────────────┘
```

### 8.2 Canvas Modes

#### Mode Configuration
```typescript
interface CanvasMode {
  type: 'markdown' | 'code' | 'web' | 'sandbox'
  editor: React.ComponentType
  readOnly?: boolean
  allowSwitch?: boolean
}

const canvasModes: Record<string, CanvasMode> = {
  markdown: {
    type: 'markdown',
    editor: MarkdownEditor,
    allowSwitch: true
  },
  code: {
    type: 'code',
    editor: MonacoEditor,
    allowSwitch: true
  },
  web: {
    type: 'web',
    editor: WebPreview,
    allowSwitch: true
  },
  sandbox: {
    type: 'sandbox',
    editor: SandboxPreview,
    readOnly: true,
    allowSwitch: false
  }
}
```

### 8.3 Resizable Panel Implementation

```tsx
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'

<ResizablePanelGroup direction="horizontal" className="h-full">
  <ResizablePanel defaultSize={60} minSize={30}>
    <ChatView />
  </ResizablePanel>
  
  <ResizableHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
  
  <ResizablePanel defaultSize={40} minSize={30} maxSize={70}>
    <Canvas />
  </ResizablePanel>
</ResizablePanelGroup>
```

### 8.4 Editor Components

#### Markdown Editor
```tsx
const MarkdownEditor = ({ content, onChange }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm resize-none"
          placeholder="Start writing markdown..."
        />
        <ScrollArea className="border rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </ScrollArea>
      </div>
    </div>
  )
}
```

#### Canvas Toolbar
```tsx
const CanvasToolbar = () => {
  const { activeType, switchType, versions, isDirty, save } = useCanvasStore()
  
  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-2">
        <Tabs value={activeType} onValueChange={switchType}>
          <TabsList>
            <TabsTrigger value="markdown">
              <FileText className="h-4 w-4 mr-1" />
              Markdown
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code className="h-4 w-4 mr-1" />
              Code
            </TabsTrigger>
            <TabsTrigger value="web">
              <Globe className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {versions.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <History className="h-4 w-4 mr-1" />
                Version {versions.length}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {versions.map(v => (
                <DropdownMenuItem key={v.id} onClick={() => loadVersion(v.id)}>
                  {formatRelativeTime(v.timestamp)} - {v.description}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {isDirty && (
          <Button variant="outline" size="sm" onClick={save}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={close}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

#### Code Editor (Monaco)
```tsx
const CodeEditor = ({ content, language, onChange }) => {
  return (
    <MonacoEditor
      height="100%"
      language={language || 'javascript'}
      value={content}
      onChange={onChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true
      }}
    />
  )
}
```

#### Sandbox Preview
```tsx
const SandboxPreview = ({ content }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      doc?.open()
      doc?.write(content)
      doc?.close()
    }
  }, [content])
  
  return (
    <div className="relative h-full">
      <iframe
        ref={iframeRef}
        className="w-full h-full bg-white"
        sandbox="allow-scripts allow-same-origin"
        title="Sandbox Preview"
      />
      {/* Future: Add "Edit in Code View" button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        disabled
      >
        Edit Code
      </Button>
    </div>
  )
}
```

### 8.5 Canvas Version History

```typescript
interface CanvasVersion {
  id: string
  timestamp: number
  content: string
  type: CanvasType
  author: 'user' | 'agent'
  description?: string
}

interface CanvasVersionStore {
  versions: CanvasVersion[]
  currentVersionId: string
  
  createVersion: (content: string, description?: string) => void
  loadVersion: (versionId: string) => void
  diffVersions: (v1: string, v2: string) => DiffResult
}
```

### 8.6 Canvas State Management

```typescript
interface CanvasStore {
  isOpen: boolean
  activeType: CanvasType
  content: string
  title?: string
  isDirty: boolean
  versions: CanvasVersion[]
  currentVersionId: string
  
  open: (type: CanvasType, content?: string) => void
  close: () => void
  setContent: (content: string) => void
  switchType: (newType: CanvasType) => void
  save: () => Promise<void>
  createVersion: (description?: string) => void
  loadVersion: (versionId: string) => void
}

const useCanvasStore = create<CanvasStore>((set, get) => ({
  isOpen: false,
  activeType: 'markdown',
  content: '',
  title: undefined,
  isDirty: false,
  
  open: (type, content = '') => {
    set({
      isOpen: true,
      activeType: type,
      content,
      isDirty: false
    })
  },
  
  close: () => {
    if (get().isDirty) {
      // Prompt to save
      if (confirm('Save changes?')) {
        get().save()
      }
    }
    set({ isOpen: false })
  },
  
  setContent: (content) => {
    set({ content, isDirty: true })
  },
  
  switchType: (newType) => {
    // Attempt content conversion
    const converted = convertContent(get().content, get().activeType, newType)
    set({
      activeType: newType,
      content: converted
    })
  },
  
  save: async () => {
    // Save to backend
    await api.saveCanvas({
      sessionId: sessionStore.currentSessionId,
      type: get().activeType,
      content: get().content
    })
    set({ isDirty: false })
  }
}))
```

---

## 9. File Upload System

### 9.1 Upload Configuration

```typescript
const UPLOAD_CONFIG = {
  maxFiles: 3,
  maxSize: 10 * 1024 * 1024, // 10MB
  acceptedTypes: {
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
}
```

### 9.2 Upload UI Components

#### Upload Button
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => fileInputRef.current?.click()}
>
  <Paperclip className="h-4 w-4" />
</Button>
<input
  ref={fileInputRef}
  type="file"
  multiple
  accept={Object.keys(UPLOAD_CONFIG.acceptedTypes).join(',')}
  onChange={handleFileSelect}
  className="hidden"
/>
```

#### File Preview Chips
```tsx
const FilePreview = ({ files, onRemove }) => {
  if (files.length === 0) return null
  
  return (
    <div className="flex gap-2 p-2 border-t">
      {files.map(file => (
        <Card key={file.name} className="px-2 py-1 flex items-center gap-2">
          {getFileIcon(file.type)}
          <Tooltip>
            <TooltipTrigger>
              <span className="text-xs truncate max-w-[120px]">
                {file.name}
              </span>
            </TooltipTrigger>
            <TooltipContent>{file.name}</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={() => onRemove(file)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Card>
      ))}
    </div>
  )
}
```

### 9.3 Upload Processing

```typescript
const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  
  // Validate
  const validFiles = files.filter(file => {
    if (file.size > UPLOAD_CONFIG.maxSize) {
      toast.error(`${file.name} exceeds 10MB limit`)
      return false
    }
    return true
  })
  
  // Check total count
  if (uploadedFiles.length + validFiles.length > UPLOAD_CONFIG.maxFiles) {
    toast.error(`Maximum ${UPLOAD_CONFIG.maxFiles} files allowed`)
    return
  }
  
  // Special handling for .md files
  const mdFile = validFiles.find(f => f.name.endsWith('.md'))
  if (mdFile && !input.trim()) {
    // Auto-open in Canvas
    const content = await readFileContent(mdFile)
    canvasStore.open('markdown', content)
  }
  
  setUploadedFiles(prev => [...prev, ...validFiles])
}
```

### 9.4 Drag & Drop

```tsx
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const files = Array.from(e.dataTransfer.files)
  handleFileSelect({ target: { files } } as any)
}

<div
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
  onDragEnter={() => setIsDragging(true)}
  onDragLeave={() => setIsDragging(false)}
  className={cn(
    "transition-colors",
    isDragging && "bg-accent/10 border-accent"
  )}
>
  {/* Input area */}
</div>
```

---

## 10. Agent Communication & Task Management

### 10.1 AgentPlan Visualization

#### Purpose
Visual pipeline showing the multi-agent orchestration process in real-time, giving users insight into complex AI reasoning.

#### Component Structure
```tsx
const AgentPlanVisualization = () => {
  const { steps, currentStep } = useAgentPlanStore()
  
  return (
    <div className="bg-card rounded-lg p-4 mb-4">
      <h3 className="text-sm font-medium mb-3">Agent Pipeline</h3>
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={cn(
              "flex flex-col items-center",
              currentStep === index && "animate-pulse"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                step.status === 'complete' && "bg-green-500",
                step.status === 'running' && "bg-blue-500",
                step.status === 'pending' && "bg-gray-300"
              )}>
                {getStepIcon(step.type)}
              </div>
              <span className="text-xs mt-1">{step.name}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5",
                step.status === 'complete' ? "bg-green-500" : "bg-gray-300"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
```

### 10.2 Agent Task Deck

#### Purpose
Visual card stack representation of multi-agent workflows without cluttering chat.

#### UI Structure
```tsx
const AgentTaskDeck = () => {
  const { tasks, isVisible, close } = useAgentDeckStore()
  
  if (!isVisible) return null
  
  return (
    <div className="fixed top-20 right-4 z-50">
      <div className="relative">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6"
          onClick={close}
        >
          <X className="h-4 w-4" />
        </Button>
        
        {/* Card stack */}
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ 
                x: 0, 
                opacity: 1,
                y: task.status === 'complete' ? 100 : 0
              }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.1
              }}
            >
              <Card className="w-64 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAgentIcon(task.agent)}
                    <div>
                      <p className="text-sm font-medium">{task.agent}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                  </div>
                  <div>
                    {task.status === 'running' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {task.status === 'complete' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {task.status === 'error' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 10.2 Inline Task List (Chat)

```tsx
const InlineTaskList = ({ tasks }) => {
  const [isExpanded, setIsExpanded] = useState(true)
  
  return (
    <div className="bg-muted/50 rounded-lg p-3 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium w-full"
      >
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          !isExpanded && "-rotate-90"
        )} />
        Agent Tasks ({tasks.filter(t => t.status === 'complete').length}/{tasks.length})
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
              {task.status === 'complete' && '✅'}
              {task.status === 'running' && '⏳'}
              {task.status === 'pending' && '⭕'}
              <span className={cn(
                task.status === 'complete' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 10.3 Agent Attribution

```tsx
const AgentAttribution = ({ agentName, agentType }) => {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
      {getAgentIcon(agentType)}
      <span>{agentName || 'Vana Agent'}</span>
    </div>
  )
}
```

### 10.4 Task Update Handling

```typescript
// SSE handler for task updates
eventSource.addEventListener('task_update', (e) => {
  const data = JSON.parse(e.data)
  
  agentDeckStore.updateTasks(data.taskList)
  
  // Show inline list if deck is closed
  if (!agentDeckStore.isVisible) {
    chatStore.setActiveTaskList(data.taskList)
  }
  
  // Animate card shuffle for completed tasks
  data.taskList.forEach(task => {
    if (task.status === 'complete') {
      agentDeckStore.shuffleCard(task.id)
    }
  })
})
```

---

## 11. Session Management

### 11.1 Session Structure

```typescript
interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
  canvasState?: CanvasState
  origin: 'homepage' | 'tool' | 'other'
}

interface SessionStore {
  currentSessionId: string | null
  sessions: Session[]
  
  createSession: (origin: string, initialPrompt?: string) => Session
  loadSession: (sessionId: string) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  deleteSession: (sessionId: string) => void
  getHomepageSessions: () => Session[]
}
```

### 11.2 Sidebar Implementation

```tsx
const SessionSidebar = () => {
  const { sessions, currentSessionId, loadSession } = useSessionStore()
  const homepageSessions = sessions.filter(s => s.origin === 'homepage')
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Button className="w-full mb-4" onClick={createNewSession}>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        
        <div className="space-y-2">
          {homepageSessions.map(session => (
            <div
              key={session.id}
              className={cn(
                "p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                currentSessionId === session.id && "bg-accent border-l-2 border-primary"
              )}
              onClick={() => loadSession(session.id)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">
                  {session.title}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => renameSession(session.id)}>
                      <Edit className="h-3 w-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteSession(session.id)}>
                      <Trash className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(session.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
```

### 11.3 Session Persistence

```typescript
// Auto-save with debounce
const debouncedSave = useMemo(
  () => debounce(async (session: Session) => {
    await api.saveSession(session)
  }, 2000),
  []
)

// Save on message add
useEffect(() => {
  if (currentSession) {
    debouncedSave(currentSession)
  }
}, [currentSession?.messages])
```

---

## 12. State Management

### 12.1 Store Architecture

```typescript
// Root store configuration
interface RootStore {
  auth: AuthStore
  session: SessionStore
  chat: ChatStore
  canvas: CanvasStore
  upload: UploadStore
  agentDeck: AgentDeckStore
  ui: UIStore
}

// Store provider
export const StoreProvider = ({ children }) => {
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  )
}
```

### 12.2 Individual Stores

#### Auth Store
```typescript
interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  signIn: (provider: 'google' | 'email', credentials?: any) => Promise<void>
  signOut: () => Promise<void>
  refreshToken: () => Promise<void>
}
```

#### Chat Store
```typescript
interface ChatStore {
  messages: Message[]
  isStreaming: boolean
  streamError: boolean
  activeTaskList: Task[] | null
  
  addMessage: (message: Message) => void
  appendToLastMessage: (token: string) => void
  setStreamError: (error: boolean) => void
  retryLastMessage: () => Promise<void>
}
```

#### UI Store
```typescript
interface UIStore {
  activeView: 'chat' | 'canvas'
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  
  setActiveView: (view: 'chat' | 'canvas') => void
  toggleSidebar: () => void
  setTheme: (theme: string) => void
}
```

### 12.3 Persistence Strategy

```typescript
// Local storage persistence
const persistConfig = {
  name: 'vana-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    theme: state.ui.theme,
    sidebarCollapsed: state.ui.sidebarCollapsed,
    sessions: state.session.sessions
  })
}

// Session storage for sensitive data
const sessionPersist = {
  name: 'vana-session',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({
    token: state.auth.token,
    currentSessionId: state.session.currentSessionId
  })
}
```

---

## 13. Backend Integration

### 13.1 Google Agent Development Kit (ADK) Architecture

#### Agent Reasoning Loop
The core intelligence is provided by a custom agent built with Google's Agent Development Kit that implements:
- **Measurement interpretation**: Structured understanding of user prompts
- **Action invocation**: Tool execution for data gathering and transformation
- **Reasoning cycle**: Iterative problem-solving with tool chaining
- **Multi-agent orchestration**: Primary orchestrator delegating to specialized agents

#### Agent Tools Registry
```typescript
interface AgentTools {
  // Canvas control tools
  open_canvas: (type: string, content: string) => void
  update_canvas: (content: string) => void
  create_version: (versionData: any) => void
  
  // Execution tools
  search_web: (query: string) => SearchResult[]
  execute_code: (code: string) => ExecutionResult
  file_system_access: (path: string) => FileData
  
  // Specialized agent delegation
  delegate_to_research: (task: string) => ResearchResult
  delegate_to_coding: (spec: string) => CodeResult
  delegate_to_markdown: (content: string) => MarkdownResult
}
```

#### Multi-Agent Orchestration
```typescript
interface AgentOrchestration {
  orchestrator: {
    role: 'primary',
    capabilities: ['task_decomposition', 'agent_selection', 'result_aggregation']
  },
  specialists: {
    research_agent: ['web_search', 'document_analysis', 'summarization'],
    coding_agent: ['code_generation', 'refactoring', 'testing'],
    markdown_agent: ['formatting', 'documentation', 'content_structuring'],
    canvas_agent: ['canvas_control', 'version_management', 'preview_generation']
  }
}
```

### 13.2 API Client

```typescript
class VanaAPIClient {
  private baseURL: string
  private token: string | null
  
  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.token = null
  }
  
  setToken(token: string) {
    this.token = token
  }
  
  async createSession(prompt: string, files?: File[]): Promise<Session> {
    const formData = new FormData()
    formData.append('prompt', prompt)
    files?.forEach(file => formData.append('files', file))
    
    const response = await fetch(`${this.baseURL}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    })
    
    return response.json()
  }
  
  streamChat(sessionId: string): EventSource {
    return new EventSource(
      `${this.baseURL}/chat/stream?session=${sessionId}&token=${this.token}`
    )
  }
}
```

### 13.2 SSE Event Specifications

#### Event Types
```typescript
type SSEEventType = 
  | 'message_token'
  | 'canvas_open'
  | 'task_update'
  | 'error'
  | 'complete'
  | 'agent_switch'

interface SSEEvent<T = any> {
  type: SSEEventType
  data: T
  timestamp: number
}
```

#### Event Payloads

```typescript
// Token streaming
interface MessageTokenPayload {
  token: string
  position: number
  messageId: string
}

// Canvas trigger
interface CanvasOpenPayload {
  type: 'canvas'
  canvasType: 'markdown' | 'code' | 'web' | 'sandbox'
  content: string
  title?: string
}

// Task updates
interface TaskUpdatePayload {
  taskList: Array<{
    id: string
    title: string
    agent: string
    description: string
    status: 'pending' | 'running' | 'complete' | 'error'
    progress?: number
  }>
}

// Agent switch
interface AgentSwitchPayload {
  fromAgent: string
  toAgent: string
  reason: string
}
```

### 13.3 Error Handling

```typescript
const handleSSEError = (error: Event) => {
  console.error('SSE Error:', error)
  
  // Attempt reconnection with exponential backoff
  let retryCount = 0
  const maxRetries = 5
  
  const retry = () => {
    if (retryCount >= maxRetries) {
      chatStore.setStreamError(true)
      toast.error('Connection lost. Please refresh.')
      return
    }
    
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
    setTimeout(() => {
      retryCount++
      initSSE()
    }, delay)
  }
  
  retry()
}
```

---

## 14. UI Components Specification

### 14.1 shadcn Component Usage Map

| Feature | Components Used |
|---------|----------------|
| Auth Page | Card, Tabs, Button, Input, Label, Separator |
| Chat Messages | Card, ScrollArea, Tooltip |
| Canvas | ResizablePanel, Tabs, Button |
| File Upload | Button, Card, Tooltip |
| Sidebar | ScrollArea, DropdownMenu, Button |
| Agent Deck | Card, Button, motion.div |
| Input Bar | Textarea, Button |

### 14.2 Custom Components

#### CodeBlock Component
```tsx
interface CodeBlockProps {
  language: string
  value: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem'
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}
```

#### LoadingDots Component
```tsx
const LoadingDots = () => {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  )
}
```

### 14.3 Theme Configuration

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme as default (matching Gemini/Claude)
        background: '#131314',
        foreground: '#E3E3E3',
        card: {
          DEFAULT: '#1E1F20',
          foreground: '#E3E3E3'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        muted: {
          DEFAULT: '#2A2B2C',
          foreground: '#9CA3AF'
        },
        accent: {
          // Gradient colors for highlights
          blue: '#3B82F6',
          purple: '#8B5CF6'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        'gradient-accent': 'linear-gradient(to right, #3B82F6, #8B5CF6)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'card-shuffle': 'shuffle 0.5s ease-in-out'
      },
      keyframes: {
        shuffle: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(20px) scale(0.95)' },
          '100%': { transform: 'translateY(100px)' }
        }
      }
    }
  }
}
```

---

## 15. Error Handling & Recovery

### 15.1 Error States

```typescript
enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  RATE_LIMIT = 'RATE_LIMIT'
}

interface ErrorState {
  type: ErrorType
  message: string
  retryable: boolean
  action?: () => void
}
```

### 15.2 Error UI Components

#### Error Chip
```tsx
const ErrorChip = ({ error, onRetry }) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {error.retryable && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Retry
        </Button>
      )}
    </Alert>
  )
}
```

### 15.3 Recovery Strategies

```typescript
const recoveryStrategies: Record<ErrorType, () => void> = {
  [ErrorType.NETWORK]: async () => {
    // Retry with exponential backoff
    await retryWithBackoff(lastAction)
  },
  [ErrorType.AUTH]: () => {
    // Refresh token or redirect to login
    authStore.refreshToken().catch(() => {
      router.push('/auth')
    })
  },
  [ErrorType.RATE_LIMIT]: () => {
    // Show cooldown timer
    showRateLimitModal()
  },
  [ErrorType.SERVER]: () => {
    // Log error and show support contact
    logError()
    showSupportModal()
  },
  [ErrorType.VALIDATION]: () => {
    // Highlight invalid fields
    highlightErrors()
  }
}
```

---

## 16. Accessibility Requirements

### 16.1 WCAG 2.1 AA Compliance

| Area | Requirements |
|------|-------------|
| Keyboard Navigation | All interactive elements accessible via keyboard |
| Focus Management | Visible focus indicators, logical tab order |
| Screen Readers | Proper ARIA labels and announcements |
| Color Contrast | 4.5:1 for normal text, 3:1 for large text |
| Motion | Respect prefers-reduced-motion |

### 16.2 Implementation

#### Keyboard Shortcuts
```typescript
const keyboardShortcuts = {
  'cmd+k': () => canvasStore.toggle(),
  'cmd+/': () => showShortcutsModal(),
  'cmd+enter': () => submitPrompt(),
  'esc': () => closeActiveModal()
}
```

#### ARIA Implementation
```tsx
<div role="main" aria-label="Chat interface">
  <div role="region" aria-label="Message history" aria-live="polite">
    {messages.map(msg => (
      <div
        role="article"
        aria-label={`Message from ${msg.role}`}
        key={msg.id}
      >
        {msg.content}
      </div>
    ))}
  </div>
  
  <form role="form" aria-label="Chat input">
    <label htmlFor="prompt" className="sr-only">
      Enter your message
    </label>
    <Textarea
      id="prompt"
      aria-describedby="prompt-help"
      aria-invalid={!!error}
      aria-errormessage={error ? "prompt-error" : undefined}
    />
  </form>
</div>
```

---

## 17. Performance Requirements

### 17.1 Metrics

| Metric | Target |
|--------|--------|
| Initial Load | < 3s |
| Time to Interactive | < 5s |
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| SSE Latency | < 100ms |
| Canvas Open | < 200ms |
| Agent Response First Token | < 500ms |

### 17.2 Monitoring & Analytics

#### OpenTelemetry Integration
```typescript
import { trace, metrics } from '@opentelemetry/api'

const tracer = trace.getTracer('vana-frontend')
const meter = metrics.getMeter('vana-frontend')

// Trace user interactions
const span = tracer.startSpan('chat.sendMessage')
span.setAttributes({
  'user.id': userId,
  'session.id': sessionId,
  'message.length': message.length
})

// Record metrics
const messageCounter = meter.createCounter('messages.sent')
messageCounter.add(1, { agent: 'vana' })
```

#### Cloud Trace Integration
- Trace requests through FastAPI → ADK Agent → Tool invocations
- Monitor latency at each stage of the pipeline
- Identify bottlenecks in multi-agent orchestration

#### BigQuery Analytics
```typescript
interface UsageMetrics {
  sessionId: string
  userId: string
  promptCount: number
  canvasOpens: number
  agentInvocations: string[]
  sessionDuration: number
  toolsUsed: string[]
  timestamp: number
}

// Log to BigQuery for analysis
logToBigQuery('usage_metrics', metrics)
```

### 17.3 Optimization Strategies

```typescript
// Code splitting
const Canvas = lazy(() => import('./components/Canvas'))
const AgentDeck = lazy(() => import('./components/AgentDeck'))

// Virtual scrolling for messages
import { VariableSizeList } from 'react-window'

// Image optimization
import Image from 'next/image'

// Memoization
const MemoizedMessage = memo(Message, (prev, next) => {
  return prev.content === next.content && prev.status === next.status
})
```

---

## 18. Security Requirements

### 18.1 Content Security Policy

```typescript
const CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Monaco needs eval
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'", process.env.NEXT_PUBLIC_API_URL],
  'frame-src': ["'self'"], // For sandbox iframe
  'worker-src': ["'self'", 'blob:'] // Monaco workers
}
```

### 18.2 Input Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify'

const sanitizeMarkdown = (content: string) => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}
```

### 18.3 Authentication Security

```typescript
// Token rotation
useEffect(() => {
  const interval = setInterval(() => {
    authStore.refreshToken()
  }, 30 * 60 * 1000) // 30 minutes
  
  return () => clearInterval(interval)
}, [])

// Secure cookie config
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

---

## 19. Testing Requirements

### 19.1 Unit Testing

```typescript
// Example test for message component
describe('Message Component', () => {
  it('renders user message correctly', () => {
    const message = {
      role: 'user',
      content: 'Hello',
      timestamp: Date.now()
    }
    
    render(<Message {...message} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
  
  it('shows file indicator when files attached', () => {
    const message = {
      role: 'user',
      content: 'Check this',
      files: [{ name: 'document.pdf' }]
    }
    
    render(<Message {...message} />)
    expect(screen.getByLabelText('Attached: document.pdf')).toBeInTheDocument()
  })
})
```

### 19.2 E2E Testing

```typescript
// Playwright test
test('complete chat flow', async ({ page }) => {
  // Navigate to homepage
  await page.goto('/')
  
  // Enter prompt
  await page.fill('[placeholder="What can I help with today?"]', 'Write a poem')
  await page.press('[placeholder="What can I help with today?"]', 'Enter')
  
  // Wait for response
  await page.waitForSelector('[data-testid="agent-message"]')
  
  // Open canvas
  await page.click('[aria-label="Open Canvas"]')
  await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
  
  // Verify content in canvas
  await expect(page.locator('[data-testid="canvas-content"]')).toContainText('poem')
})
```

---

## 20. Deployment & Infrastructure

### 20.1 Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}
NEXT_PUBLIC_SENTRY_DSN=https://...

# .env.production
NEXT_PUBLIC_API_URL=https://api.vana.ai
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### 20.2 Build Configuration

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "vitest",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  }
}
```

### 20.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: vana-frontend
          region: us-central1
```

---

## 21. Roadmap & Future Enhancements

### 21.1 Phase 1 (Post-MVP)
- **Edit in Code View** for sandbox outputs
- PDF thumbnail previews
- Keyboard shortcut system (Cmd+K for Canvas)
- Agent verbose/debug mode
- Mobile responsive Canvas (tab view)

### 21.2 Phase 2
- Voice input/output
- Multi-language support
- Collaborative sessions
- Export conversations
- Template library

### 21.3 Phase 3
- Plugin system
- Custom agent creation
- Advanced file processing (spreadsheets, presentations)
- API access for third-party integrations
- Offline mode with sync

---

## Appendix A: Component Props Reference

### Button Props
```typescript
interface ButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  className?: string
  onClick?: () => void
}
```

### Card Props
```typescript
interface CardProps {
  className?: string
  hover?: boolean
  clickable?: boolean
  selected?: boolean
}
```

### Input Props
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'search'
  placeholder?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  error?: boolean
  errorMessage?: string
}
```

---

## Appendix B: SSE Event Flow Diagrams

### Standard Chat Flow
```
User Input → Backend Processing → SSE Stream Start
                                        ↓
                              [message_token events]
                                        ↓
                               [complete event]
```

### Canvas Trigger Flow
```
Agent Decision → canvas_open event → Frontend Canvas Open
                                            ↓
                                    Load content into editor
```

### Multi-Agent Flow
```
Primary Agent → task_update (pending) → Secondary Agent
                                              ↓
                                     task_update (running)
                                              ↓
                                     task_update (complete)
                                              ↓
                                        Canvas trigger
```

---

## Appendix C: Tailwind Classes Reference

### Common Patterns
```css
/* Cards */
.card-default: "bg-card border rounded-lg p-4"
.card-hover: "hover:border-primary transition-colors"

/* Buttons */
.btn-primary: "bg-primary text-primary-foreground hover:bg-primary/90"
.btn-ghost: "hover:bg-accent hover:text-accent-foreground"

/* Text */
.text-muted: "text-muted-foreground"
.text-gradient: "bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"

/* Layout */
.sidebar: "w-64 border-r bg-background"
.main-content: "flex-1 overflow-auto"
```

---

## Appendix D: Package.json Specification

```json
{
  "name": "vana-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 5173",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "framer-motion": "^11.0.3",
    "lucide-react": "^0.312.0",
    "zustand": "^4.5.0",
    "@monaco-editor/react": "^4.6.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "react-resizable-panels": "^1.0.5",
    "react-window": "^1.8.10",
    "tailwind-merge": "^2.2.0",
    "firebase": "^10.7.2",
    "isomorphic-dompurify": "^2.3.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-trace-web": "^1.19.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "@types/node": "20.11.5",
    "@types/react": "18.2.48",
    "@types/react-dom": "18.2.18",
    "@types/react-window": "^1.8.8",
    "@types/react-syntax-highlighter": "^15.5.11",
    "autoprefixer": "10.4.17",
    "eslint": "8.56.0",
    "eslint-config-next": "14.0.4",
    "postcss": "8.4.33",
    "tailwindcss": "3.4.1",
    "typescript": "5.3.3",
    "@playwright/test": "^1.40.1",
    "vitest": "^1.2.1",
    "@vitejs/plugin-react": "^4.2.1"
  }
}
```

---

## Appendix E: Development Setup Instructions

### Initial Setup
```bash
# Create frontend directory
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --eslint

# Navigate to frontend
cd frontend

# Install shadcn/ui
npx shadcn-ui@latest init

# Add shadcn components
npx shadcn-ui@latest add button card dialog dropdown-menu tabs tooltip scroll-area separator alert

# Install additional dependencies
npm install zustand @monaco-editor/react react-markdown remark-gfm framer-motion lucide-react react-resizable-panels react-window firebase

# Setup environment variables
cp .env.example .env.local
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## Appendix F: Mock Data for Development

### Sample Session Data
```typescript
export const mockSession = {
  id: "session-123",
  title: "Project Planning Discussion",
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 1800000,
  origin: 'homepage' as const,
  messages: [
    {
      id: "msg-1",
      role: "user" as const,
      content: "Help me plan a new React project",
      timestamp: Date.now() - 3600000
    },
    {
      id: "msg-2",
      role: "assistant" as const,
      content: "I'll help you plan your React project. Let's start with the architecture...",
      agentName: "Vana Agent",
      timestamp: Date.now() - 3500000
    }
  ]
}

export const mockCanvasContent = {
  markdown: `# Project Plan\n\n## Overview\nThis is a sample project plan...\n\n## Tasks\n- [ ] Setup repository\n- [ ] Install dependencies\n- [ ] Create components`,
  code: `function ProjectComponent() {\n  return (\n    <div>\n      <h1>Hello Project</h1>\n    </div>\n  )\n}`,
  web: `<!DOCTYPE html>\n<html>\n<head><title>Sample</title></head>\n<body><h1>Preview</h1></body>\n</html>`,
  sandbox: `<div id="app"></div>\n<script>\n  document.getElementById('app').innerHTML = 'Interactive Demo';\n</script>`
}

export const mockTasks = [
  { id: "task-1", title: "Analyze requirements", agent: "Research Agent", status: "complete" as const },
  { id: "task-2", title: "Generate code structure", agent: "Code Agent", status: "running" as const },
  { id: "task-3", title: "Create documentation", agent: "Markdown Agent", status: "pending" as const }
]
```

---

## Appendix G: Canvas Content Conversion Rules

### Conversion Specifications
```typescript
// Markdown to Code
export const markdownToCode = (content: string, language = 'javascript'): string => {
  // Extract code blocks if they exist
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  const matches = content.match(codeBlockRegex)
  
  if (matches && matches.length > 0) {
    // Return first code block content
    return matches[0].replace(/```\w*\n?/, '').replace(/```$/, '')
  }
  
  // Wrap entire content as code comment
  return `// Converted from Markdown\n/*\n${content}\n*/`
}

// Code to Markdown
export const codeToMarkdown = (content: string, language = 'javascript'): string => {
  return `\`\`\`${language}\n${content}\n\`\`\``
}

// Markdown to Web
export const markdownToWeb = async (content: string): Promise<string> => {
  // Use react-markdown's render to HTML capability
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui; padding: 20px; }
        code { background: #f4f4f4; padding: 2px 4px; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
      </style>
    </head>
    <body>
      ${await renderMarkdownToHTML(content)}
    </body>
    </html>
  `
  return html
}

// Web to Sandbox
export const webToSandbox = (content: string): string => {
  // Add sandbox restrictions
  return content.replace('<script', '<script type="text/javascript"')
}
```

---

## Document Control

**Last Updated:** 2025-08-11  
**Next Review:** 2025-08-18  
**Owner:** Frontend Team  
**Stakeholders:** Product, Design, Backend, QA
**Purpose:** Complete specification for Claude Code to build Vana frontend from scratch

---

## Integration Summary

This PRD combines and reconciles:

### From Original Frontend Build Scope:
- Google Agent Development Kit (ADK) architecture with reasoning loop
- Multi-agent orchestration with specialized agents
- AgentPlan visualization pipeline
- Canvas version history system
- Dark theme configuration matching Gemini/Claude
- OpenTelemetry, Cloud Trace, and BigQuery monitoring
- Persistent session storage with Google Cloud
- Real-time SSE streaming with structured events
- Canvas toolbar with version management
- Multiple Canvas modes (markdown, code, web, sandbox)

### From ChatGPT Planning Session:
- Complete authentication flow with shadcn template
- Detailed homepage specification with greeting and tool picker
- Resizable Canvas panels with drag handles
- Agent Task Deck with shuffle animations
- Inline task list (collapsible like "Thinking")
- File upload with .md auto-open to Canvas
- Session filtering (homepage-only in sidebar)
- Agent attribution labels
- Error recovery with retry buttons
- Empty states for all views
- Keyboard shortcuts (Cmd+K for Canvas)
- "Edit in Code View" for sandbox (roadmap)

### Unified Architecture:
- **Backend**: Google ADK with FastAPI handling agent orchestration
- **Frontend**: React/Next.js with shadcn/ui components
- **State**: Zustand with modular stores and persistence
- **Streaming**: SSE for real-time updates (tokens, canvas, tasks)
- **Monitoring**: Full observability stack (OTel, Cloud Trace, BigQuery)
- **UI/UX**: Dark theme by default with gradient accents
- **Canvas**: Multi-mode editor with version history and resizing
- **Agents**: Visual workflow tracking via deck and pipeline views

---

*This document represents the complete frontend specification for Vana. Any deviations or enhancements should be documented and approved through the standard change management process.*