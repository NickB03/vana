# Vana Frontend Implementation Guide
**Complete Execution Document for Finishing Frontend Implementation**

**Version:** 1.0  
**Date:** 2025-08-12  
**Status:** Production-Ready Implementation Guide  
**Purpose:** Single source of truth for completing frontend from 32% → 100% PRD compliance

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Phase 1: MVP Foundation](#phase-1-mvp-foundation)
4. [Phase 2: Feature Completion](#phase-2-feature-completion)
5. [Phase 3: Production Readiness](#phase-3-production-readiness)
6. [Testing Enforcement Strategy](#testing-enforcement-strategy)
7. [Technical Implementation Details](#technical-implementation-details)
8. [File Structure](#file-structure)
9. [Execution Commands](#execution-commands)
10. [Quality Gates](#quality-gates)
11. [Common Failures & Solutions](#common-failures--solutions)
12. [PRD Alignment Checklist](#prd-alignment-checklist)
13. [Agent Execution Strategy](#agent-execution-strategy)

---

## 1. Executive Summary

### Current State
- **Implementation Progress:** 32% complete ✅
- **Architecture Quality:** Excellent ✅
- **Major Issues:** Missing components, runtime errors ❌
- **State Management:** Fully compliant with PRD ✅

### Goal
Complete the remaining 68% implementation to achieve:
- **100% PRD compliance**
- **Zero runtime errors**
- **Production-ready application**
- **Comprehensive testing coverage**

### Three-Phase Strategy
1. **Phase 1 (5-7 days):** Fix crashes, create missing components, achieve MVP functionality
2. **Phase 2 (5-7 days):** Complete all PRD features, integrate authentication and SSE
3. **Phase 3 (3-5 days):** Testing, optimization, production deployment

### Critical Success Factors
- **Sequential execution** (avoid parallel SPARC that caused VS Code crash)
- **Mandatory testing gates** after each component
- **Runtime verification** using browser-tools-mcp
- **Single-agent focus** per phase

---

## 2. Current State Analysis

### 2.1 Working Components ✅
**Files that are correct and should be kept:**

```
/frontend/stores/                    # ✅ Excellent - All stores follow PRD exactly
├── canvasStore.ts                  # ✅ Progressive enhancement implemented perfectly
├── chatStore.ts                    # ✅ Architecture correct, ready for real API
├── sessionStore.ts                 # ✅ Compliant with PRD
├── authStore.ts                    # ✅ JWT structure ready
├── agentDeckStore.ts               # ✅ Basic structure good
└── uploadStore.ts                  # ✅ Partial but good foundation

/frontend/components/ui/            # ✅ shadcn/ui components all correct
├── All 20+ UI components properly imported and configured

/frontend/lib/utils.ts              # ✅ Utilities correct
/frontend/next.config.js            # ✅ Excellent security config for Monaco
/frontend/package.json              # ✅ Dependencies aligned with PRD
/frontend/tailwind.config.ts        # ✅ Design system matches PRD
```

### 2.2 Missing Components ❌
**Critical components that must be created:**

```
/frontend/components/canvas/
├── CanvasEditor.tsx                # ❌ MISSING - Core Canvas component
├── CanvasStatusBar.tsx             # ❌ MISSING - Save status indicator
└── editors/
    ├── MarkdownEditor.tsx          # ❌ MISSING - Split-view markdown
    ├── CodeEditor.tsx              # ❌ MISSING - Monaco integration
    ├── WebPreview.tsx              # ❌ MISSING - HTML/CSS/JS preview
    └── SandboxEditor.tsx           # ❌ MISSING - Isolated execution

/frontend/components/upload/
├── FileUploader.tsx                # ❌ MISSING - Drag-drop upload
├── FilePreview.tsx                 # ❌ MISSING - File status display
└── UploadProgress.tsx              # ❌ MISSING - Progress indicators

/frontend/components/agent/
├── AgentTaskDeck.tsx               # ❌ MISSING - Main agent visualization
├── AgentPipeline.tsx               # ❌ MISSING - Pipeline view
└── InlineTaskList.tsx              # ❌ MISSING - Inline task display

/frontend/app/auth/
└── page.tsx                        # ❌ MISSING - Authentication page
```

### 2.3 Broken Components 🔧
**Files needing critical fixes:**

```
/frontend/components/homepage/
├── SessionSidebar.tsx              # 🔧 Missing 'use client' - Will crash
├── ToolGrid.tsx                    # 🔧 Missing 'use client' - Will crash
└── QuickStart.tsx                  # 🔧 Missing 'use client' - Will crash

/frontend/components/chat/
├── MessageList.tsx                 # 🔧 Missing 'use client' - Will crash
└── MessageInput.tsx                # 🔧 Missing 'use client' - Will crash

/frontend/components/canvas/
└── CanvasSystem.tsx                # 🔧 Imports non-existent components
```

### 2.4 Architecture Assessment ✅
**What's excellent and should be preserved:**

1. **State Management:** Zustand implementation is exemplary
2. **Type System:** Comprehensive TypeScript integration
3. **Security Config:** CSP headers exceed requirements
4. **Progressive Enhancement:** Canvas store correctly implements PRD approach
5. **Component Architecture:** Well-structured when complete
6. **Design System:** Perfect shadcn/ui + Tailwind integration

---

## 3. Phase 1: MVP Foundation
**Goal:** Functional app without crashes (5-7 days)

### 3.1 Day 1: Critical Fixes (Mandatory First Day)

#### Morning (4 hours): Stop All Crashes
**Execute in this exact order:**

1. **Add missing 'use client' directives** (30 minutes)
```bash
# Files requiring immediate fixes:
frontend/components/homepage/SessionSidebar.tsx    # Add 'use client' at line 1
frontend/components/homepage/ToolGrid.tsx          # Add 'use client' at line 1  
frontend/components/homepage/QuickStart.tsx        # Add 'use client' at line 1
frontend/components/chat/MessageList.tsx           # Add 'use client' at line 1
frontend/components/chat/MessageInput.tsx          # Add 'use client' at line 1
frontend/components/agent/AgentTaskCard.tsx        # Add 'use client' at line 1
frontend/components/agent/TaskStatusIndicator.tsx  # Add 'use client' at line 1
```

2. **Create stub files for missing imports** (90 minutes)
```bash
# Prevent import crashes by creating stub files:
touch frontend/components/canvas/CanvasEditor.tsx
touch frontend/components/canvas/CanvasStatusBar.tsx
touch frontend/components/canvas/editors/MarkdownEditor.tsx
touch frontend/components/canvas/editors/CodeEditor.tsx
touch frontend/components/canvas/editors/WebPreview.tsx
touch frontend/components/canvas/editors/SandboxEditor.tsx
touch frontend/components/upload/FileUploader.tsx
touch frontend/components/upload/FilePreview.tsx
touch frontend/components/agent/AgentTaskDeck.tsx
touch frontend/components/agent/InlineTaskList.tsx
touch frontend/components/agent/AgentPipeline.tsx
```

3. **Install missing dependencies** (60 minutes)
```bash
cd frontend
npm install @monaco-editor/react monaco-editor react-markdown remark-gfm react-syntax-highlighter dompurify
```

4. **Verify app loads without errors** (30 minutes)
```bash
cd frontend
npm run dev
# Navigate to http://localhost:3000
# Verify no console errors
```

#### Afternoon (4 hours): Infrastructure Setup

1. **Configure Monaco Editor webpack** (60 minutes)
2. **Update environment variables** (30 minutes)
3. **Test basic navigation works** (30 minutes)
4. **Create component templates** (120 minutes)

**Day 1 Success Criteria:**
- [ ] App loads without crashes
- [ ] No console errors on homepage
- [ ] Chat page loads successfully
- [ ] All navigation works

### 3.2 Day 2-3: Canvas Core Implementation

#### Canvas Editor Component Template
```tsx
// frontend/components/canvas/CanvasEditor.tsx
'use client'

import { useCanvasStore } from '@/stores/canvasStore'
import { MarkdownEditor } from './editors/MarkdownEditor'
import { CodeEditor } from './editors/CodeEditor'
import { WebPreview } from './editors/WebPreview'
import { SandboxEditor } from './editors/SandboxEditor'

export function CanvasEditor() {
  const { activeType, content, setContent } = useCanvasStore()

  const renderEditor = () => {
    switch (activeType) {
      case 'markdown':
        return <MarkdownEditor value={content} onChange={setContent} />
      case 'code':
        return <CodeEditor value={content} onChange={setContent} />
      case 'web':
        return <WebPreview value={content} onChange={setContent} />
      case 'sandbox':
        return <SandboxEditor value={content} onChange={setContent} />
      default:
        return <div>Select a canvas type</div>
    }
  }

  return (
    <div className="h-full w-full">
      {renderEditor()}
    </div>
  )
}
```

#### Canvas Status Bar Template
```tsx
// frontend/components/canvas/CanvasStatusBar.tsx
'use client'

import { useCanvasStore } from '@/stores/canvasStore'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, CheckCircle } from 'lucide-react'

export function CanvasStatusBar() {
  const { isDirty, lastSaved, activeType, content } = useCanvasStore()
  
  const wordCount = content.split(' ').length
  const charCount = content.length

  return (
    <div className="flex items-center justify-between p-2 border-t bg-muted/50 text-xs">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{activeType}</Badge>
        <span>{wordCount} words, {charCount} chars</span>
      </div>
      
      <div className="flex items-center gap-2">
        {isDirty ? (
          <div className="flex items-center gap-1 text-yellow-600">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span>Unsaved changes</span>
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
```

### 3.3 Day 4: Chat Implementation

#### Message List Fix Template
```tsx
// frontend/components/chat/MessageList.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { Message } from './Message'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MessageList() {
  const { messages } = useChatStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <ScrollArea className="flex-1 px-4" ref={scrollRef}>
      <div className="space-y-4 py-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>
    </ScrollArea>
  )
}
```

### 3.4 Day 5: File Upload System

#### File Uploader Template
```tsx
// frontend/components/upload/FileUploader.tsx
'use client'

import { useState, useRef } from 'react'
import { useUploadStore } from '@/stores/uploadStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { Button } from '@/components/ui/button'
import { Paperclip } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile } = useUploadStore()
  const { open: openCanvas } = useCanvasStore()

  const handleFileSelect = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.name.endsWith('.md')) {
        const content = await file.text()
        openCanvas('markdown', content)
        toast({
          title: "Markdown file opened",
          description: `${file.name} has been opened in Canvas`
        })
      } else {
        await uploadFile(file)
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  )
}
```

### 3.5 Day 6-7: Integration & Testing

#### Integration Checklist
- [ ] Replace mock APIs with real endpoints
- [ ] Implement basic SSE connection
- [ ] Wire up authentication flow
- [ ] Test all user flows end-to-end
- [ ] Fix any integration issues
- [ ] Performance check
- [ ] Update documentation

**Phase 1 Acceptance Criteria:**
- [ ] App loads without crashes
- [ ] Chat sends and receives messages  
- [ ] Canvas opens and switches modes
- [ ] Files can be uploaded
- [ ] Basic navigation works
- [ ] No runtime errors in console

---

## 4. Phase 2: Feature Completion  
**Goal:** Full PRD compliance (5-7 days)

### 4.1 Agent Task Deck Implementation

#### Complete Agent Task Deck Template
```tsx
// frontend/components/agent/AgentTaskDeck.tsx
'use client'

import { useAgentDeckStore } from '@/stores/agentDeckStore'
import { AnimatePresence, motion } from 'framer-motion'
import { AgentTaskCard } from './AgentTaskCard'

export function AgentTaskDeck() {
  const { tasks, isVisible } = useAgentDeckStore()

  if (!isVisible || tasks.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      <AnimatePresence>
        {tasks.slice(0, 3).map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ 
              x: 0, 
              opacity: 1,
              y: index * 8,
              scale: 1 - (index * 0.02)
            }}
            exit={{ x: 100, opacity: 0 }}
            style={{ zIndex: 100 - index }}
          >
            <AgentTaskCard task={task} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

### 4.2 Authentication System

#### Authentication Page Template
```tsx
// frontend/app/auth/page.tsx
'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AuthPage() {
  const { signInWithGoogle, isLoading } = useAuthStore()
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome to Vana</CardTitle>
          <CardDescription>Sign in to start your AI-powered workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={signInWithGoogle}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  {/* Google icon SVG */}
                </svg>
                Continue with Google
              </Button>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={signInWithGoogle}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  {/* Google icon SVG */}
                </svg>
                Sign up with Google
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 4.3 SSE Integration

#### Real SSE Connection Implementation
```typescript
// frontend/lib/sse/connection.ts
export class SSEConnection {
  private eventSource: EventSource | null = null
  private sessionId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(sessionId: string, token?: string) {
    this.sessionId = sessionId
    this.disconnect() // Close existing connection

    const url = `${process.env.NEXT_PUBLIC_API_URL}/agent_network_sse/${sessionId}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    
    this.eventSource = new EventSource(url)
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.eventSource) return

    this.eventSource.addEventListener('connection', (e) => {
      console.log('SSE Connected:', JSON.parse(e.data))
      this.reconnectAttempts = 0
    })

    this.eventSource.addEventListener('agent_start', (e) => {
      const data = JSON.parse(e.data)
      useAgentDeckStore.getState().addAgent(data)
    })

    this.eventSource.addEventListener('research_sources', (e) => {
      const data = JSON.parse(e.data)
      useChatStore.getState().addResearchSources(data.sources)
    })

    this.eventSource.onerror = () => {
      this.handleReconnection()
    }
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    setTimeout(() => {
      this.reconnectAttempts++
      if (this.sessionId) {
        this.connect(this.sessionId)
      }
    }, delay)
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }
}
```

### 4.4 Session Management

#### Session Sidebar Implementation
```tsx
// frontend/components/homepage/SessionSidebar.tsx  
'use client'

import { useSessionStore } from '@/stores/sessionStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MessageSquare } from 'lucide-react'

export function SessionSidebar() {
  const { sessions, currentSessionId, createSession, loadSession } = useSessionStore()
  const homepageSessions = sessions.filter(s => s.origin === 'homepage')

  return (
    <div className="w-64 border-r bg-background/50">
      <div className="p-4">
        <Button 
          className="w-full mb-4" 
          onClick={() => createSession('homepage')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-2">
            {homepageSessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                  currentSessionId === session.id ? 'border-primary' : ''
                }`}
                onClick={() => loadSession(session.id)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
```

---

## 5. Phase 3: Production Readiness
**Goal:** Deployable application (3-5 days)

### 5.1 Comprehensive Testing

#### Unit Test Template
```typescript
// tests/unit/stores/canvasStore.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCanvasStore } from '@/stores/canvasStore'

describe('CanvasStore', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      isOpen: false,
      activeType: 'markdown',
      content: '',
      isDirty: false
    })
  })

  it('should open canvas with correct type and content', () => {
    const { result } = renderHook(() => useCanvasStore())
    
    act(() => {
      result.current.open('code', 'console.log("test")')
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.activeType).toBe('code')
    expect(result.current.content).toBe('console.log("test")')
  })

  it('should convert content between types correctly', () => {
    const { result } = renderHook(() => useCanvasStore())
    
    act(() => {
      result.current.open('markdown', '```javascript\nconsole.log("test")\n```')
      result.current.switchType('code')
    })

    expect(result.current.activeType).toBe('code')
    expect(result.current.content).toBe('console.log("test")')
  })
})
```

#### E2E Test Template
```typescript
// tests/e2e/canvas-flow.spec.ts
import { test, expect } from '@playwright/test'

test('Canvas workflow end-to-end', async ({ page }) => {
  await page.goto('/')
  
  // Navigate to chat
  await page.click('[data-testid="new-chat-button"]')
  await expect(page).toHaveURL(/\/chat/)
  
  // Open Canvas
  await page.click('[data-testid="canvas-toggle"]')
  await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible()
  
  // Test content editing
  await page.fill('[data-testid="canvas-content"]', '# Test Document\nContent here')
  
  // Test type switching
  await page.click('[data-testid="canvas-tab-code"]')
  await expect(page.locator('[data-testid="code-editor"]')).toBeVisible()
  
  // Test save functionality
  await page.keyboard.press('Meta+s')
  await expect(page.locator('[data-testid="save-success"]')).toBeVisible()
})
```

### 5.2 Performance Optimization

#### Code Splitting Configuration
```typescript
// Dynamic imports for heavy components
const MonacoEditor = lazy(() => import('@monaco-editor/react'))
const AgentTaskDeck = lazy(() => import('./components/agent/AgentTaskDeck'))
const CanvasSystem = lazy(() => import('./components/canvas/CanvasSystem'))

// Component-level memoization
export const MemoizedMessage = memo(Message, (prev, next) => {
  return prev.content === next.content && 
         prev.status === next.status
})
```

### 5.3 Security Hardening

#### Content Security Policy
```javascript
// next.config.js - Already excellent, keep existing config
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'", // Monaco WASM
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' " + process.env.NEXT_PUBLIC_API_URL,
      "worker-src 'self' blob:" // Monaco workers
    ].join('; ')
  }
]
```

---

## 6. Testing Enforcement Strategy

### 6.1 Mandatory Testing Gates

**RULE: No component is "complete" until ALL these gates pass:**

#### Gate 1: Compilation & Import Validation
```bash
npx tsc --noEmit                    # TypeScript compilation
npx next build                      # Next.js build verification
npx next lint                       # ESLint validation
node scripts/validate-imports.js    # Custom import validation
```

#### Gate 2: Component Mounting Tests
```typescript
describe('[ComponentName] - Mounting Tests', () => {
  it('should render without crashing', () => {
    expect(() => render(<ComponentName />)).not.toThrow()
  })
  
  it('should handle all required props', () => {
    const props = getMinimumRequiredProps()
    expect(() => render(<ComponentName {...props} />)).not.toThrow()
  })
})
```

#### Gate 3: Runtime Browser Testing
```typescript
test('should load and display correctly', async ({ page }) => {
  await page.goto('/component-page')
  await expect(page.locator('[data-testid="component-root"]')).toBeVisible()
  
  // Check for console errors
  const errors = []
  page.on('pageerror', (error) => errors.push(error))
  await expect(errors.length).toBe(0)
})
```

#### Gate 4: Integration Testing
```typescript
// Test store integration
describe('[ComponentName] - Store Integration', () => {
  it('should connect to required stores', () => {
    const { result } = renderHook(() => useRequiredStore())
    expect(result.current).toBeDefined()
  })
})
```

#### Gate 5: SSR/Hydration Testing
```typescript
// For client components
describe('[ComponentName] - SSR Tests', () => {
  it('should hydrate correctly with use client', () => {
    const container = document.createElement('div')
    const serverHtml = renderToString(<ComponentName />)
    container.innerHTML = serverHtml
    
    expect(() => {
      hydrateRoot(container, <ComponentName />)
    }).not.toThrow()
  })
})
```

#### Gate 6: Performance Testing
```typescript
test('should meet performance requirements', async () => {
  const result = await lighthouse('http://localhost:3000')
  expect(result.categories.performance.score).toBeGreaterThan(0.9)
})
```

---

## 7. Technical Implementation Details

### 7.1 Component Templates

#### Client Component Template
```tsx
'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/stores/store'
import { Button } from '@/components/ui/button'

interface ComponentProps {
  // Define props interface
}

export function ComponentName({ }: ComponentProps) {
  const store = useStore()
  
  return (
    <div data-testid="component-root">
      {/* Component implementation */}
    </div>
  )
}
```

#### Canvas Editor Structure
```tsx
// Progressive Canvas implementation
export function CanvasEditor() {
  const { activeType, content, setContent } = useCanvasStore()

  const renderEditor = () => {
    switch (activeType) {
      case 'markdown':
        return (
          <div className="grid grid-cols-2 h-full">
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="p-4 font-mono text-sm resize-none"
            />
            <div className="border-l p-4">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        )
      case 'code':
        return (
          <Suspense fallback={<div>Loading editor...</div>}>
            <MonacoEditor
              value={content}
              onChange={(value) => setContent(value || '')}
              language="javascript"
              theme="vs-dark"
            />
          </Suspense>
        )
      default:
        return <div>Select canvas type</div>
    }
  }

  return <div className="h-full">{renderEditor()}</div>
}
```

### 7.2 SSE Connection Class
```typescript
export class SSEConnection {
  private eventSource: EventSource | null = null
  private reconnectAttempts = 0

  connect(sessionId: string) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/agent_network_sse/${sessionId}`
    this.eventSource = new EventSource(url)
    
    this.eventSource.addEventListener('agent_start', (e) => {
      const data = JSON.parse(e.data)
      useAgentDeckStore.getState().addAgent(data)
    })
    
    this.eventSource.addEventListener('research_sources', (e) => {
      const data = JSON.parse(e.data)
      useChatStore.getState().addResearchSources(data.sources)
    })
  }
}
```

### 7.3 Store Integration Patterns
```typescript
// Hook pattern for store integration
export function useCanvasState() {
  const canvas = useCanvasStore()
  const ui = useUIStore()
  
  return {
    ...canvas,
    toggleCanvas: () => {
      if (canvas.isOpen) {
        canvas.close()
      } else {
        canvas.open('markdown')
      }
      ui.setCanvasVisible(!canvas.isOpen)
    }
  }
}
```

---

## 8. File Structure
**Target structure after completion:**

```
frontend/
├── app/                           # Next.js 14 App Router
│   ├── auth/page.tsx             # ✅ Authentication page
│   ├── chat/page.tsx             # ✅ Chat interface
│   ├── layout.tsx                # ✅ Root layout
│   └── page.tsx                  # ✅ Homepage
├── components/
│   ├── canvas/                   # Canvas system
│   │   ├── CanvasSystem.tsx      # ✅ Main container
│   │   ├── CanvasEditor.tsx      # 🔧 Core editor
│   │   ├── CanvasToolbar.tsx     # ✅ Mode switching
│   │   ├── CanvasStatusBar.tsx   # 🔧 Status display
│   │   └── editors/              # Mode-specific editors
│   │       ├── MarkdownEditor.tsx # 🔧 Split-view markdown
│   │       ├── CodeEditor.tsx     # 🔧 Monaco integration  
│   │       ├── WebPreview.tsx     # 🔧 HTML/CSS/JS preview
│   │       └── SandboxEditor.tsx  # 🔧 Isolated execution
│   ├── chat/                     # Chat components
│   │   ├── MessageList.tsx       # 🔧 Fix 'use client'
│   │   ├── MessageInput.tsx      # 🔧 Fix 'use client'
│   │   ├── ChatHeader.tsx        # ✅ Session info
│   │   └── CodeBlock.tsx         # ✅ Syntax highlighting
│   ├── upload/                   # File upload system
│   │   ├── FileUploader.tsx      # 🔧 Drag-drop upload
│   │   ├── FilePreview.tsx       # 🔧 File status
│   │   └── UploadProgress.tsx    # 🔧 Progress indicators
│   ├── agent/                    # Agent visualization
│   │   ├── AgentTaskDeck.tsx     # 🔧 Main deck
│   │   ├── AgentTaskCard.tsx     # ✅ Basic implementation
│   │   ├── TaskStatusIndicator.tsx # ✅ Basic implementation
│   │   ├── AgentPipeline.tsx     # 🔧 Pipeline view
│   │   └── InlineTaskList.tsx    # 🔧 Inline tasks
│   ├── homepage/                 # Homepage components
│   │   ├── SessionSidebar.tsx    # 🔧 Fix 'use client'
│   │   ├── ToolGrid.tsx          # 🔧 Fix 'use client'
│   │   ├── QuickStart.tsx        # 🔧 Fix 'use client'
│   │   ├── GreetingHeader.tsx    # ✅ Compliant
│   │   └── PromptSuggestions.tsx # ✅ Compliant
│   └── ui/                       # shadcn/ui components
│       └── *.tsx                 # ✅ All 20+ components correct
├── stores/                       # State management
│   ├── canvasStore.ts            # ✅ Excellent implementation
│   ├── chatStore.ts              # ✅ Ready for real API
│   ├── sessionStore.ts           # ✅ Compliant
│   ├── authStore.ts              # ✅ JWT structure ready
│   ├── agentDeckStore.ts         # ✅ Basic structure
│   └── uploadStore.ts            # ✅ Partial implementation
├── lib/
│   ├── api/client.ts             # 🔧 Complete API client
│   ├── sse/                      # SSE implementation
│   │   ├── connection.ts         # 🔧 Real SSE connection
│   │   ├── handlers.ts           # ✅ Event handlers
│   │   └── types.ts              # ✅ Type definitions
│   └── utils/
│       └── content-conversion.ts # ✅ Canvas utilities
├── tests/                        # Testing infrastructure
│   ├── unit/                     # 🔧 Unit tests needed
│   ├── integration/              # 🔧 Integration tests needed
│   └── e2e/                      # 🔧 E2E tests needed
└── package.json                  # ✅ Dependencies correct

Legend:
✅ Correct and complete
🔧 Needs implementation or fixes
```

---

## 9. Execution Commands

### 9.1 Development Workflow
```bash
# Start development
cd frontend
npm run dev

# Testing workflow
npm run test              # Unit tests
npm run test:e2e         # E2E tests with Playwright
npm run test:integration # Integration tests
npm run build            # Production build
npm run lint             # Code quality
npm run type-check       # TypeScript validation
```

### 9.2 Quality Assurance
```bash
# Mandatory before marking any component complete
npm run test && npm run build && npm run lint && npm run type-check

# Runtime verification
npm run dev &
sleep 10
curl -f http://localhost:3000 || echo "❌ Frontend failed to start"
npx playwright test tests/smoke/ # Smoke tests
```

### 9.3 Component Validation
```bash
# Create new component validation script
node scripts/validate-component.js [component-path]

# This script checks:
# - TypeScript compilation
# - Import resolution  
# - 'use client' directive if needed
# - Basic rendering test
# - Store integration test
```

---

## 10. Quality Gates

### 10.1 "DONE" Criteria for Components

A component is **ONLY** complete when ALL of these pass:

#### ✅ Compilation Gates
- [ ] TypeScript compiles without errors
- [ ] Next.js builds successfully
- [ ] All imports resolve to existing files
- [ ] ESLint passes with no errors

#### ✅ Unit Test Gates
- [ ] Component mounts without crashing
- [ ] All required props work correctly
- [ ] Store integrations function properly
- [ ] Event handlers work as expected

#### ✅ Integration Gates
- [ ] SSR renders correctly (if applicable)
- [ ] Client hydration works (if 'use client')
- [ ] Store state synchronization works
- [ ] API integrations work (not just mocks)

#### ✅ E2E Runtime Gates
- [ ] Component loads in real browser
- [ ] No console errors or warnings
- [ ] Interactive elements respond correctly
- [ ] Visual regression tests pass

#### ✅ Documentation Gates
- [ ] Component API documented
- [ ] Props interface exported
- [ ] Usage examples provided
- [ ] Test coverage >= 80%

### 10.2 Phase Completion Gates

#### Phase 1: MVP Foundation
- [ ] App loads without crashes
- [ ] Chat interface functional
- [ ] Canvas opens and switches modes
- [ ] File upload works
- [ ] All navigation functional
- [ ] Zero console errors

#### Phase 2: Feature Completion  
- [ ] All PRD features implemented
- [ ] Authentication working end-to-end
- [ ] SSE streaming functional
- [ ] Agent visualization working
- [ ] Session management complete
- [ ] Error handling implemented

#### Phase 3: Production Readiness
- [ ] 80% test coverage achieved
- [ ] All Lighthouse scores > 90
- [ ] Zero critical security issues
- [ ] < 3s initial load time
- [ ] Successful deployment to staging
- [ ] Load testing passed

---

## 11. Common Failures & Solutions

### 11.1 Server/Client Component Errors

**Error:** `TypeError: Cannot read properties of undefined`
**Cause:** Missing 'use client' directive on interactive components
**Solution:** Add 'use client' at the top of these files:
- All components using hooks (useState, useEffect, etc.)
- All components with event handlers
- All components using browser APIs

### 11.2 Import Resolution Problems

**Error:** `Module not found: Can't resolve 'component'`
**Cause:** Component file doesn't exist
**Solution:** Create the missing file or remove the import
**Prevention:** Use the import validation script

### 11.3 SSE Connection Issues

**Error:** `EventSource failed`
**Cause:** CORS issues or wrong endpoint
**Solution:** 
1. Verify backend endpoint is `/agent_network_sse/{sessionId}`
2. Check CORS configuration allows EventSource
3. Verify authentication headers

### 11.4 Canvas State Management

**Error:** Canvas content not persisting
**Cause:** State not properly connected to localStorage
**Solution:** Verify zustand persist middleware is configured correctly
**Code:**
```typescript
persist(
  (set, get) => ({ /* store */ }),
  {
    name: 'canvas-storage',
    partialize: (state) => ({
      content: state.content,
      activeType: state.activeType
    })
  }
)
```

### 11.5 Monaco Editor Bundle Issues

**Error:** `Module parse failed: Unexpected character`
**Cause:** Monaco Editor workers not properly configured
**Solution:** Ensure webpack configuration in next.config.js is correct
**Prevention:** Follow exact Monaco setup from PRD

---

## 12. PRD Alignment Checklist

### Homepage Implementation (PRD Lines 345-398)
- [ ] Greeting with gradient text effect
- [ ] Prompt suggestions as interactive cards
- [ ] Tool grid with Canvas integration
- [ ] Session sidebar with recent chats
- [ ] Quick start with file upload

### Chat Interface (PRD Lines 404-523)
- [ ] Message list with streaming support
- [ ] Message input with file upload
- [ ] SSE connection for real-time updates
- [ ] Agent message attribution
- [ ] Research source display
- [ ] Code block with Canvas integration

### Canvas System (PRD Lines 529-805)
- [ ] Progressive Canvas architecture
- [ ] Four modes: Markdown, Code, Web, Sandbox
- [ ] Content conversion between modes
- [ ] Version history management
- [ ] Save/load functionality
- [ ] Monaco Editor integration
- [ ] Split-view markdown editing
- [ ] HTML/CSS/JS preview

### File Upload (PRD Lines 814-878)
- [ ] Drag-and-drop interface
- [ ] Multiple file support
- [ ] .md file automatic Canvas routing
- [ ] File preview with progress
- [ ] Upload progress indicators
- [ ] File type validation

### Agent Task Deck (PRD Lines 887-990)
- [ ] Floating card-based visualization
- [ ] Animation system for task updates
- [ ] Task status indicators
- [ ] Pipeline view
- [ ] Inline task list integration
- [ ] SSE integration for agent events

### Authentication (PRD Lines 275-342)
- [ ] JWT-based authentication
- [ ] Google OAuth integration
- [ ] Token refresh mechanism
- [ ] Route protection middleware
- [ ] Login/register UI
- [ ] Session persistence

### Session Management (PRD Lines 994-1095)
- [ ] Session creation and loading
- [ ] Session persistence across refreshes
- [ ] Session sidebar with recent chats
- [ ] Session export/import
- [ ] Multi-session support

---

## 13. Agent Execution Strategy

### 13.1 Recommended Approach for New Session

**CRITICAL: Use sequential execution, NOT parallel SPARC**

The previous implementation failed because parallel SPARC agents caused VS Code to crash and overwhelmed the system. Use this approach:

#### Single-Agent Sequential Approach
```bash
# Phase 1: Use ONE focused agent
Task("Frontend Implementation - Phase 1", "Complete MVP foundation with critical fixes and Canvas core", "frontend-api-specialist")

# Phase 2: Use ONE focused agent  
Task("Frontend Implementation - Phase 2", "Complete all PRD features with authentication and SSE", "frontend-api-specialist")

# Phase 3: Use ONE focused agent
Task("Frontend Implementation - Phase 3", "Add comprehensive testing and production readiness", "frontend-api-specialist")
```

#### Testing Validation After Each Component
```bash
# After completing each component:
# 1. Run compilation tests
# 2. Use browser-tools-mcp for runtime verification
# 3. Mark complete only after validation

mcp__browser-tools-mcp__takeScreenshot  # Visual verification
mcp__browser-tools-mcp__runAuditMode    # Quality check
```

#### Memory Pattern for Context
```bash
# Use claude-flow memory for state tracking
mcp__claude-flow__memory_usage {
  "action": "store",
  "key": "frontend-progress",
  "value": "Phase 1 complete: Canvas core implemented, all components compile"
}
```

### 13.2 What NOT to Do

❌ **Don't use parallel SPARC execution** - causes system overload
❌ **Don't skip testing gates** - leads to compounding issues
❌ **Don't mark components complete without verification** - creates false progress
❌ **Don't use multiple agents simultaneously** - causes confusion and conflicts

### 13.3 Success Pattern

✅ **One focused agent per phase**
✅ **Complete one component fully before moving to next**
✅ **Test after every component**
✅ **Use browser-tools-mcp for runtime verification**
✅ **Update memory after each milestone**

---

## Conclusion

This guide provides everything needed to complete the Vana frontend implementation from 32% to 100% PRD compliance. The architecture is excellent - it just needs disciplined execution following this sequential approach.

**Key Success Factors:**
1. Follow the three-phase approach exactly
2. Use single-agent sequential execution
3. Test every component before marking complete
4. Never skip the mandatory testing gates
5. Use browser-tools-mcp for runtime verification

**Estimated Timeline:**
- Phase 1 (MVP): 5-7 days
- Phase 2 (Features): 5-7 days  
- Phase 3 (Production): 3-5 days
- **Total: 13-19 days**

The foundation is solid. Execute this plan methodically, and the frontend will achieve full PRD compliance without the issues that plagued the previous attempt.

---

**Document Status:** Ready for execution  
**Next Action:** Begin Phase 1, Day 1 critical fixes  
**Success Criteria:** Working application with zero runtime errors and 100% PRD feature compliance