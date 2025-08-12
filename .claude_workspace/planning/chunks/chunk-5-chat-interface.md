# Chunk 5: Chat Interface (Chat Interface Sections)

## 📸 UI REFERENCES

**Primary Reference**: Screenshot 12.06.24 AM.png (Gemini chat with sidebar)
- **Layout**: Left sidebar for conversations, main chat area with messages
- **Sidebar Design**:
  - Width: ~240px collapsible sidebar
  - Recent conversations with timestamps
  - "New Chat" button at top
  - Clean conversation list with hover states
- **Chat Interface**:
  - Message bubbles with agent attribution
  - User messages: Right-aligned, lighter background
  - Agent messages: Left-aligned, darker background with avatar
- **Colors**:
  - Sidebar background: #1A1A1A
  - Main chat background: #131314
  - User message: #2563EB background
  - Agent message: #374151 background
  - Text: #E5E7EB primary, #9CA3AF secondary
- **"Open" Button**: Floating action for Canvas/file operations

**VISUAL VALIDATION CRITERIA**:
✅ Clean sidebar with conversation history
✅ Proper message alignment (user right, agent left)
✅ Agent attribution with icons and names
✅ Scrollable message area with smooth scrolling
✅ Message input with file upload capability
✅ Research sources display with confidence indicators
✅ Copy functionality on all messages

## 💬 CRITICAL: The primary user interaction - must be perfect and responsive

### Extracted PRD Content (Chat Interface Sections)

```
## 7. Chat Interface

### 7.2 Message Rendering

```tsx
// components/chat/AgentMessage.tsx
export const AgentMessage = ({ message }: { message: Message }) => {
  return (
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
                  onOpenInCanvas={() => {
                    canvasStore.open('code', String(children))
                  }}
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
        
        {message.sources && (
          <ResearchSources sources={message.sources} />
        )}
      </div>
    </div>
  )
}
```

### Component Structure from Architecture:
```
/components
  /chat               # Chat-specific components
    MessageList.tsx
    MessageInput.tsx
    AgentMessage.tsx
```

### Chat State Management:
```
/stores
  chatStore.ts
```

### UI Components Usage:
```
| Feature | shadcn/ui Components | Custom Components |
|---------|---------------------|-------------------|
| Chat | ScrollArea, Card | MessageList, AgentMessage |
```

### Performance Requirements:
```
| Metric | Target | Measurement |
|--------|--------|-------------|
| Message Render | < 100ms | React Profiler |
```

### Custom Component Examples - Code Block with Canvas Integration:
```tsx
// components/ui/CodeBlock.tsx
interface CodeBlockProps {
  language: string
  value: string
  onOpenInCanvas?: () => void
}

export const CodeBlock = ({ language, value, onOpenInCanvas }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onOpenInCanvas && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenInCanvas}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          padding: '1rem'
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}
```
```

## Critical Requirements & Guardrails

### 🔴 ABSOLUTE REQUIREMENTS
1. **STREAMING MESSAGES**: Real-time token-by-token rendering via SSE
2. **MARKDOWN SUPPORT**: Full GitHub Flavored Markdown with syntax highlighting
3. **CODE BLOCK CANVAS**: Click any code block to open in Canvas
4. **RESEARCH SOURCES**: Display Brave Search sources with confidence scores
5. **AGENT ATTRIBUTION**: Show which agent sent each message
6. **RESPONSIVE LAYOUT**: Works perfectly on mobile and desktop
7. **ACCESSIBILITY**: Full screen reader and keyboard support

### 🟡 CRITICAL GUARDRAILS
- Message list must virtualize for 1000+ messages
- Code blocks must have copy and Canvas integration
- Sources must show confidence scores visually
- Input must handle file uploads and paste
- Must work with SSE streaming interruptions
- Error states for failed messages

### 🟢 SUCCESS CRITERIA
- Messages render in under 100ms
- Smooth scrolling with auto-scroll to bottom
- Copy-paste works flawlessly
- File uploads integrate seamlessly
- Mobile experience is excellent

## Step-by-Step Implementation Guide

### Phase 1: Chat Store Implementation (45 minutes)

1. **Core Chat Store**
   ```typescript
   // stores/chatStore.ts
   import { create } from 'zustand'
   import { persist } from 'zustand/middleware'
   import { immer } from 'zustand/middleware/immer'
   
   export interface ResearchSource {
     shortId: string
     title: string
     url: string
     domain: string
     snippet: string
     confidence: number
     supportedClaims: Array<{
       textSegment: string
       confidence: number
       reasoning?: string
     }>
     datePublished?: string
     author?: string
   }
   
   export interface Message {
     id: string
     role: 'user' | 'assistant' | 'system'
     content: string
     timestamp: number
     agentName?: string
     agentType?: string
     isStreaming?: boolean
     sources?: ResearchSource[]
     files?: Array<{
       id: string
       name: string
       type: string
       size: number
       url?: string
     }>
     metadata?: {
       model?: string
       tokensUsed?: number
       processingTime?: number
     }
     error?: string
     completedAt?: number
   }
   
   interface ChatState {
     messages: Message[]
     isLoading: boolean
     error: string | null
     isStreamConnected: boolean
     streamError: boolean
     currentSessionId: string | null
     
     // Input state
     input: string
     isSubmitting: boolean
     uploadedFiles: File[]
     
     // UI state
     showSources: boolean
     scrollToBottom: boolean
   }
   
   interface ChatActions {
     // Message management
     addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
     updateMessage: (messageId: string, updates: Partial<Message>) => void
     deleteMessage: (messageId: string) => void
     clearMessages: () => void
     
     // Streaming
     appendMessageToken: (messageId: string, token: string, isComplete: boolean) => void
     setStreamConnected: (connected: boolean) => void
     setStreamError: (error: boolean) => void
     
     // Research sources
     addResearchSources: (sources: ResearchSource[]) => void
     
     // Input management
     setInput: (input: string) => void
     setSubmitting: (submitting: boolean) => void
     addFile: (file: File) => void
     removeFile: (index: number) => void
     clearFiles: () => void
     
     // UI state
     setShowSources: (show: boolean) => void
     triggerScrollToBottom: () => void
     
     // Session management
     setCurrentSession: (sessionId: string) => void
     loadMessages: (sessionId: string) => Promise<void>
   }
   
   export type ChatStore = ChatState & ChatActions
   
   export const useChatStore = create<ChatStore>()(
     persist(
       immer((set, get) => ({
         // Initial state
         messages: [],
         isLoading: false,
         error: null,
         isStreamConnected: false,
         streamError: false,
         currentSessionId: null,
         input: '',
         isSubmitting: false,
         uploadedFiles: [],
         showSources: true,
         scrollToBottom: false,
   
         // Message management
         addMessage: (messageData) => {
           const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
           const message: Message = {
             ...messageData,
             id,
             timestamp: Date.now()
           }
   
           set(state => {
             state.messages.push(message)
             state.scrollToBottom = true
           })
   
           return id
         },
   
         updateMessage: (messageId, updates) => {
           set(state => {
             const message = state.messages.find(m => m.id === messageId)
             if (message) {
               Object.assign(message, updates)
             }
           })
         },
   
         deleteMessage: (messageId) => {
           set(state => {
             state.messages = state.messages.filter(m => m.id !== messageId)
           })
         },
   
         clearMessages: () => {
           set(state => {
             state.messages = []
           })
         },
   
         // Streaming
         appendMessageToken: (messageId, token, isComplete) => {
           set(state => {
             const message = state.messages.find(m => m.id === messageId)
             if (message) {
               message.content += token
               message.isStreaming = !isComplete
               
               if (isComplete) {
                 message.completedAt = Date.now()
               }
               
               state.scrollToBottom = true
             }
           })
         },
   
         setStreamConnected: (connected) => {
           set(state => {
             state.isStreamConnected = connected
             if (connected) {
               state.streamError = false
             }
           })
         },
   
         setStreamError: (error) => {
           set(state => {
             state.streamError = error
             if (error) {
               state.isStreamConnected = false
             }
           })
         },
   
         // Research sources
         addResearchSources: (sources) => {
           set(state => {
             const lastMessage = state.messages[state.messages.length - 1]
             if (lastMessage && lastMessage.role === 'assistant') {
               lastMessage.sources = sources
             }
           })
         },
   
         // Input management
         setInput: (input) => {
           set(state => {
             state.input = input
           })
         },
   
         setSubmitting: (submitting) => {
           set(state => {
             state.isSubmitting = submitting
           })
         },
   
         addFile: (file) => {
           set(state => {
             if (state.uploadedFiles.length < 3) {
               state.uploadedFiles.push(file)
             }
           })
         },
   
         removeFile: (index) => {
           set(state => {
             state.uploadedFiles = state.uploadedFiles.filter((_, i) => i !== index)
           })
         },
   
         clearFiles: () => {
           set(state => {
             state.uploadedFiles = []
           })
         },
   
         // UI state
         setShowSources: (show) => {
           set(state => {
             state.showSources = show
           })
         },
   
         triggerScrollToBottom: () => {
           set(state => {
             state.scrollToBottom = true
           })
         },
   
         // Session management
         setCurrentSession: (sessionId) => {
           set(state => {
             state.currentSessionId = sessionId
           })
         },
   
         loadMessages: async (sessionId) => {
           set(state => {
             state.isLoading = true
             state.error = null
           })
   
           try {
             // Load messages from backend or storage
             const messages = await loadSessionMessages(sessionId)
             
             set(state => {
               state.messages = messages
               state.currentSessionId = sessionId
               state.isLoading = false
               state.scrollToBottom = true
             })
           } catch (error) {
             set(state => {
               state.error = error instanceof Error ? error.message : 'Failed to load messages'
               state.isLoading = false
             })
           }
         }
       })),
       {
         name: 'chat-storage',
         partialize: (state) => ({
           // Don't persist messages (loaded from session)
           showSources: state.showSources,
           input: state.input // Persist draft input
         })
       }
     )
   )
   
   // Helper function to load messages from backend
   async function loadSessionMessages(sessionId: string): Promise<Message[]> {
     // Implementation depends on backend API
     // For now, return empty array
     return []
   }
   ```

### Phase 2: Message Components (60 minutes)

2. **Message List Component**
   ```typescript
   // components/chat/MessageList.tsx
   import { useEffect, useRef } from 'react'
   import { ScrollArea } from '@/components/ui/scroll-area'
   import { useChatStore } from '@/stores/chatStore'
   import { AgentMessage } from './AgentMessage'
   import { UserMessage } from './UserMessage'
   import { SystemMessage } from './SystemMessage'
   import { TypingIndicator } from './TypingIndicator'
   
   export const MessageList = () => {
     const { messages, isStreamConnected, streamError, scrollToBottom, triggerScrollToBottom } = useChatStore()
     const scrollAreaRef = useRef<HTMLDivElement>(null)
     const bottomRef = useRef<HTMLDivElement>(null)
   
     // Auto-scroll to bottom when new messages arrive
     useEffect(() => {
       if (scrollToBottom) {
         bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
         triggerScrollToBottom() // Reset the trigger
       }
     }, [scrollToBottom, triggerScrollToBottom])
   
     // Auto-scroll to bottom on new messages
     useEffect(() => {
       const shouldAutoScroll = scrollAreaRef.current ? 
         scrollAreaRef.current.scrollTop + scrollAreaRef.current.clientHeight >= 
         scrollAreaRef.current.scrollHeight - 100 : true
   
       if (shouldAutoScroll) {
         bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
       }
     }, [messages.length])
   
     const renderMessage = (message: Message) => {
       switch (message.role) {
         case 'user':
           return <UserMessage key={message.id} message={message} />
         case 'assistant':
           return <AgentMessage key={message.id} message={message} />
         case 'system':
           return <SystemMessage key={message.id} message={message} />
         default:
           return null
       }
     }
   
     return (
       <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
         <div className="space-y-4">
           {messages.length === 0 ? (
             <div className="flex items-center justify-center h-64 text-muted-foreground">
               <div className="text-center">
                 <p className="text-lg mb-2">No messages yet</p>
                 <p className="text-sm">Start a conversation to get help with your project</p>
               </div>
             </div>
           ) : (
             messages.map(renderMessage)
           )}
   
           {isStreamConnected && messages.some(m => m.isStreaming) && (
             <TypingIndicator />
           )}
   
           {streamError && (
             <div className="flex items-center justify-center py-4">
               <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                 Connection lost. Messages may not be delivered.
               </div>
             </div>
           )}
   
           <div ref={bottomRef} />
         </div>
       </ScrollArea>
     )
   }
   ```

3. **Agent Message Component**
   ```typescript
   // components/chat/AgentMessage.tsx
   import { useState } from 'react'
   import { Card, CardContent } from '@/components/ui/card'
   import { Button } from '@/components/ui/button'
   import { Badge } from '@/components/ui/badge'
   import { Brain, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
   import ReactMarkdown from 'react-markdown'
   import remarkGfm from 'remark-gfm'
   import { CodeBlock } from '@/components/ui/CodeBlock'
   import { ResearchSources } from './ResearchSources'
   import { useCanvasStore } from '@/stores/canvasStore'
   import { formatRelativeTime } from '@/lib/utils/format'
   import type { Message } from '@/stores/chatStore'
   
   interface AgentMessageProps {
     message: Message
   }
   
   export const AgentMessage = ({ message }: AgentMessageProps) => {
     const [copied, setCopied] = useState(false)
     const [showMetadata, setShowMetadata] = useState(false)
     const { open: openCanvas } = useCanvasStore()
   
     const handleCopy = async () => {
       await navigator.clipboard.writeText(message.content)
       setCopied(true)
       setTimeout(() => setCopied(false), 2000)
     }
   
     const getAgentIcon = (agentType?: string) => {
       switch (agentType) {
         case 'researcher': return '🔍'
         case 'coder': return '💻'
         case 'analyst': return '📊'
         case 'coordinator': return '🎯'
         case 'planner': return '📋'
         default: return '🤖'
       }
     }
   
     return (
       <div className="flex flex-col gap-2">
         {/* Agent Header */}
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
           <Brain className="h-3 w-3" />
           <span className="flex items-center gap-1">
             <span>{getAgentIcon(message.agentType)}</span>
             {message.agentName || 'Vana Agent'}
           </span>
           <span>•</span>
           <span>{formatRelativeTime(message.timestamp)}</span>
           {message.isStreaming && (
             <Badge variant="secondary" className="text-xs">
               Thinking...
             </Badge>
           )}
         </div>
   
         {/* Message Content */}
         <Card className="max-w-[85%] bg-card border">
           <CardContent className="p-4">
             <div className="relative group">
               {/* Copy Button */}
               <Button
                 variant="ghost"
                 size="icon"
                 className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                 onClick={handleCopy}
               >
                 {copied ? (
                   <Check className="h-3 w-3" />
                 ) : (
                   <Copy className="h-3 w-3" />
                 )}
               </Button>
   
               {/* Markdown Content */}
               <div className="prose prose-invert max-w-none">
                 <ReactMarkdown
                   remarkPlugins={[remarkGfm]}
                   components={{
                     code({ node, inline, className, children, ...props }) {
                       const match = /language-(\w+)/.exec(className || '')
                       const language = match ? match[1] : 'text'
                       const value = String(children).replace(/\n$/, '')
   
                       return !inline && match ? (
                         <CodeBlock
                           language={language}
                           value={value}
                           onOpenInCanvas={() => {
                             openCanvas('code', value)
                           }}
                           {...props}
                         />
                       ) : (
                         <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
                           {children}
                         </code>
                       )
                     },
                     pre: ({ children }) => (
                       <pre className="overflow-x-auto">{children}</pre>
                     ),
                     blockquote: ({ children }) => (
                       <blockquote className="border-l-4 border-muted-foreground/40 pl-4 italic">
                         {children}
                       </blockquote>
                     ),
                     table: ({ children }) => (
                       <div className="overflow-x-auto">
                         <table className="min-w-full border-collapse border border-muted">
                           {children}
                         </table>
                       </div>
                     ),
                     th: ({ children }) => (
                       <th className="border border-muted px-3 py-2 bg-muted/50 font-medium text-left">
                         {children}
                       </th>
                     ),
                     td: ({ children }) => (
                       <td className="border border-muted px-3 py-2">
                         {children}
                       </td>
                     )
                   }}
                 >
                   {message.content}
                 </ReactMarkdown>
               </div>
   
               {/* Streaming Cursor */}
               {message.isStreaming && (
                 <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1" />
               )}
             </div>
   
             {/* Research Sources */}
             {message.sources && message.sources.length > 0 && (
               <div className="mt-4">
                 <ResearchSources sources={message.sources} />
               </div>
             )}
   
             {/* Message Metadata */}
             {(message.metadata || message.error) && (
               <div className="mt-4 pt-3 border-t border-muted/20">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setShowMetadata(!showMetadata)}
                   className="text-xs text-muted-foreground h-6 px-2"
                 >
                   {showMetadata ? (
                     <ChevronUp className="h-3 w-3 mr-1" />
                   ) : (
                     <ChevronDown className="h-3 w-3 mr-1" />
                   )}
                   {message.error ? 'Error Details' : 'Metadata'}
                 </Button>
   
                 {showMetadata && (
                   <div className="mt-2 text-xs text-muted-foreground space-y-1">
                     {message.error && (
                       <div className="text-destructive">
                         Error: {message.error}
                       </div>
                     )}
                     {message.metadata?.model && (
                       <div>Model: {message.metadata.model}</div>
                     )}
                     {message.metadata?.tokensUsed && (
                       <div>Tokens: {message.metadata.tokensUsed}</div>
                     )}
                     {message.metadata?.processingTime && (
                       <div>Time: {message.metadata.processingTime}ms</div>
                     )}
                   </div>
                 )}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     )
   }
   ```

4. **User Message Component**
   ```typescript
   // components/chat/UserMessage.tsx
   import { Card, CardContent } from '@/components/ui/card'
   import { Button } from '@/components/ui/button'
   import { Badge } from '@/components/ui/badge'
   import { User, Copy, Check, Paperclip } from 'lucide-react'
   import { useState } from 'react'
   import { formatRelativeTime } from '@/lib/utils/format'
   import type { Message } from '@/stores/chatStore'
   
   interface UserMessageProps {
     message: Message
   }
   
   export const UserMessage = ({ message }: UserMessageProps) => {
     const [copied, setCopied] = useState(false)
   
     const handleCopy = async () => {
       await navigator.clipboard.writeText(message.content)
       setCopied(true)
       setTimeout(() => setCopied(false), 2000)
     }
   
     return (
       <div className="flex flex-col gap-2 items-end">
         {/* User Header */}
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
           <span>{formatRelativeTime(message.timestamp)}</span>
           <span>•</span>
           <span className="flex items-center gap-1">
             You
             <User className="h-3 w-3" />
           </span>
         </div>
   
         {/* Message Content */}
         <Card className="max-w-[85%] bg-primary/10 border-primary/20">
           <CardContent className="p-4">
             <div className="relative group">
               {/* Copy Button */}
               <Button
                 variant="ghost"
                 size="icon"
                 className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                 onClick={handleCopy}
               >
                 {copied ? (
                   <Check className="h-3 w-3" />
                 ) : (
                   <Copy className="h-3 w-3" />
                 )}
               </Button>
   
               {/* Message Text */}
               <div className="whitespace-pre-wrap text-sm">
                 {message.content}
               </div>
   
               {/* Attached Files */}
               {message.files && message.files.length > 0 && (
                 <div className="mt-3 space-y-2">
                   {message.files.map((file, index) => (
                     <div 
                       key={index}
                       className="flex items-center gap-2 text-xs bg-background/50 rounded px-2 py-1"
                     >
                       <Paperclip className="h-3 w-3" />
                       <span className="font-mono">{file.name}</span>
                       <Badge variant="outline" className="text-xs">
                         {(file.size / 1024).toFixed(1)}KB
                       </Badge>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </CardContent>
         </Card>
       </div>
     )
   }
   ```

### Phase 3: Message Input Component (45 minutes)

5. **Message Input with File Upload**
   ```typescript
   // components/chat/MessageInput.tsx
   import { useState, useRef, useEffect } from 'react'
   import { Button } from '@/components/ui/button'
   import { Textarea } from '@/components/ui/textarea'
   import { Card } from '@/components/ui/card'
   import { Badge } from '@/components/ui/badge'
   import { Send, Paperclip, X, Square } from 'lucide-react'
   import { useChatStore } from '@/stores/chatStore'
   import { useSessionStore } from '@/stores/sessionStore'
   import { useCanvasStore } from '@/stores/canvasStore'
   import { FileUploader } from '@/components/upload/FileUploader'
   
   export const MessageInput = () => {
     const {
       input,
       isSubmitting,
       uploadedFiles,
       setInput,
       setSubmitting,
       addMessage,
       clearFiles,
       removeFile
     } = useChatStore()
     
     const { currentSessionId } = useSessionStore()
     const { open: openCanvas } = useCanvasStore()
     const textareaRef = useRef<HTMLTextAreaElement>(null)
     const fileInputRef = useRef<HTMLInputElement>(null)
   
     // Auto-resize textarea
     useEffect(() => {
       const textarea = textareaRef.current
       if (textarea) {
         textarea.style.height = 'auto'
         textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
       }
     }, [input])
   
     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault()
       
       if ((!input.trim() && uploadedFiles.length === 0) || isSubmitting) {
         return
       }
   
       const messageContent = input.trim()
       const files = [...uploadedFiles]
       
       // Clear input immediately for better UX
       setInput('')
       clearFiles()
       
       // Add user message
       const userMessageId = addMessage({
         role: 'user',
         content: messageContent,
         files: files.map(file => ({
           id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
           name: file.name,
           type: file.type,
           size: file.size
         }))
       })
       
       // Handle .md file auto-open in Canvas
       const mdFile = files.find(f => f.name.endsWith('.md'))
       if (mdFile) {
         try {
           const content = await readFileContent(mdFile)
           openCanvas('markdown', content)
         } catch (error) {
           console.error('Failed to read .md file:', error)
         }
       }
   
       try {
         setSubmitting(true)
         
         // Send to backend
         await sendMessage({
           sessionId: currentSessionId!,
           content: messageContent,
           files: files
         })
         
       } catch (error) {
         console.error('Failed to send message:', error)
         
         // Add error message
         addMessage({
           role: 'system',
           content: 'Failed to send message. Please try again.',
           error: error instanceof Error ? error.message : 'Unknown error'
         })
       } finally {
         setSubmitting(false)
       }
     }
   
     const handleKeyDown = (e: React.KeyboardEvent) => {
       if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault()
         handleSubmit(e as any)
       }
     }
   
     const handleFileSelect = (files: File[]) => {
       files.forEach(file => {
         if (uploadedFiles.length < 3) {
           useChatStore.getState().addFile(file)
         }
       })
     }
   
     const handlePaste = (e: React.ClipboardEvent) => {
       const files = Array.from(e.clipboardData.files)
       if (files.length > 0) {
         handleFileSelect(files)
       }
     }
   
     const canSubmit = (input.trim() || uploadedFiles.length > 0) && !isSubmitting && currentSessionId
   
     return (
       <div className="border-t bg-background p-4">
         {/* File Attachments */}
         {uploadedFiles.length > 0 && (
           <div className="mb-3 flex gap-2 flex-wrap">
             {uploadedFiles.map((file, index) => (
               <Card key={index} className="p-2">
                 <div className="flex items-center gap-2 text-sm">
                   <Paperclip className="h-4 w-4" />
                   <span className="font-mono max-w-[200px] truncate">
                     {file.name}
                   </span>
                   <Badge variant="outline" className="text-xs">
                     {(file.size / 1024).toFixed(1)}KB
                   </Badge>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6"
                     onClick={() => removeFile(index)}
                   >
                     <X className="h-3 w-3" />
                   </Button>
                 </div>
               </Card>
             ))}
           </div>
         )}
   
         {/* Input Form */}
         <form onSubmit={handleSubmit} className="flex gap-2">
           <div className="flex-1 relative">
             <Textarea
               ref={textareaRef}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               onPaste={handlePaste}
               placeholder={currentSessionId ? "Ask me anything..." : "Create a session to start chatting"}
               className="min-h-[44px] max-h-[120px] resize-none pr-12"
               disabled={!currentSessionId || isSubmitting}
             />
             
             {/* File Upload Button */}
             <div className="absolute bottom-2 right-2">
               <FileUploader
                 onFilesSelect={handleFileSelect}
                 maxFiles={3 - uploadedFiles.length}
                 disabled={uploadedFiles.length >= 3}
               />
             </div>
           </div>
   
           {/* Submit Button */}
           <Button
             type="submit"
             disabled={!canSubmit}
             className="px-4"
           >
             {isSubmitting ? (
               <Square className="h-4 w-4" />
             ) : (
               <Send className="h-4 w-4" />
             )}
           </Button>
         </form>
   
         {/* Helper Text */}
         <div className="mt-2 text-xs text-muted-foreground text-center">
           {!currentSessionId ? (
             "Create a session to start chatting"
           ) : (
             "Press Enter to send, Shift+Enter for new line"
           )}
         </div>
       </div>
     )
   }
   
   // Helper function to read file content
   async function readFileContent(file: File): Promise<string> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader()
       reader.onload = (e) => resolve(e.target?.result as string)
       reader.onerror = (e) => reject(new Error('Failed to read file'))
       reader.readAsText(file)
     })
   }
   
   // Helper function to send message to backend
   async function sendMessage(data: {
     sessionId: string
     content: string
     files: File[]
   }): Promise<void> {
     // Implementation depends on backend API
     // This would typically send to the chat API endpoint
     console.log('Sending message:', data)
   }
   ```

### Phase 4: Supporting Components (30 minutes)

6. **Research Sources Component**
   ```typescript
   // components/chat/ResearchSources.tsx
   import { useState } from 'react'
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
   import { Button } from '@/components/ui/button'
   import { Badge } from '@/components/ui/badge'
   import { ChevronDown, ChevronUp, ExternalLink, Search } from 'lucide-react'
   import type { ResearchSource } from '@/stores/chatStore'
   
   interface ResearchSourcesProps {
     sources: ResearchSource[]
   }
   
   export const ResearchSources = ({ sources }: ResearchSourcesProps) => {
     const [isExpanded, setIsExpanded] = useState(false)
     const [expandedSource, setExpandedSource] = useState<string | null>(null)
   
     if (!sources || sources.length === 0) return null
   
     const getConfidenceColor = (confidence: number) => {
       if (confidence >= 0.8) return 'bg-green-500'
       if (confidence >= 0.6) return 'bg-yellow-500'
       return 'bg-red-500'
     }
   
     const getConfidenceLabel = (confidence: number) => {
       if (confidence >= 0.8) return 'High'
       if (confidence >= 0.6) return 'Medium'
       return 'Low'
     }
   
     return (
       <Card className="mt-4 bg-muted/30">
         <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
             <CardTitle className="text-sm flex items-center gap-2">
               <Search className="h-4 w-4" />
               Research Sources ({sources.length})
             </CardTitle>
             <Button
               variant="ghost"
               size="sm"
               onClick={() => setIsExpanded(!isExpanded)}
             >
               {isExpanded ? (
                 <ChevronUp className="h-4 w-4" />
               ) : (
                 <ChevronDown className="h-4 w-4" />
               )}
             </Button>
           </div>
         </CardHeader>
   
         {isExpanded && (
           <CardContent className="pt-0 space-y-3">
             {sources.map((source, index) => (
               <div key={source.shortId || index} className="border rounded-lg p-3 space-y-2">
                 <div className="flex items-start justify-between gap-2">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                       <a
                         href={source.url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="font-medium text-sm hover:underline line-clamp-1"
                       >
                         {source.title}
                       </a>
                       <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                     </div>
                     
                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
                       <span>{source.domain}</span>
                       {source.datePublished && (
                         <>
                           <span>•</span>
                           <span>{new Date(source.datePublished).toLocaleDateString()}</span>
                         </>
                       )}
                       {source.author && (
                         <>
                           <span>•</span>
                           <span>{source.author}</span>
                         </>
                       )}
                     </div>
                   </div>
   
                   <Badge variant="outline" className="flex items-center gap-1 text-xs">
                     <div
                       className={`w-2 h-2 rounded-full ${getConfidenceColor(source.confidence)}`}
                     />
                     {getConfidenceLabel(source.confidence)}
                   </Badge>
                 </div>
   
                 {source.snippet && (
                   <p className="text-sm text-muted-foreground line-clamp-2">
                     {source.snippet}
                   </p>
                 )}
   
                 {source.supportedClaims && source.supportedClaims.length > 0 && (
                   <div className="space-y-1">
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-6 text-xs p-1"
                       onClick={() => 
                         setExpandedSource(
                           expandedSource === source.shortId ? null : source.shortId
                         )
                       }
                     >
                       {expandedSource === source.shortId ? 'Hide' : 'Show'} claims ({source.supportedClaims.length})
                     </Button>
   
                     {expandedSource === source.shortId && (
                       <div className="space-y-2 pl-2 border-l-2 border-muted">
                         {source.supportedClaims.map((claim, claimIndex) => (
                           <div key={claimIndex} className="space-y-1">
                             <p className="text-xs italic">"{claim.textSegment}"</p>
                             <div className="flex items-center gap-2">
                               <Badge variant="outline" className="text-xs">
                                 {Math.round(claim.confidence * 100)}% confidence
                               </Badge>
                               {claim.reasoning && (
                                 <span className="text-xs text-muted-foreground">
                                   {claim.reasoning}
                                 </span>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ))}
           </CardContent>
         )}
       </Card>
     )
   }
   ```

7. **Typing Indicator Component**
   ```typescript
   // components/chat/TypingIndicator.tsx
   import { Brain } from 'lucide-react'
   
   export const TypingIndicator = () => {
     return (
       <div className="flex items-center gap-2 text-muted-foreground">
         <Brain className="h-3 w-3" />
         <div className="flex items-center gap-1">
           <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
           <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
           <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
         </div>
         <span className="text-sm">Agent is thinking...</span>
       </div>
     )
   }
   ```

## 🧠 THINK HARD Instructions

Before implementing ANY chat component:

1. **Performance**: Will this handle 1000+ messages smoothly?
2. **Accessibility**: Can screen readers navigate this properly?
3. **Mobile Experience**: Does this work well on small screens?
4. **Real-time Updates**: How does this handle rapid SSE updates?
5. **Error Recovery**: What happens when messages fail to send?
6. **Memory Usage**: Will this cause memory leaks with long conversations?
7. **User Experience**: Is the flow intuitive and responsive?

### Extended Reasoning Prompts:
- "What happens if a user sends 50 messages rapidly?"
- "How does this perform on a slow mobile device?"
- "What if the SSE connection drops mid-message?"
- "How does this handle very long code blocks?"
- "What happens if research sources fail to load?"

## EXACT shadcn/ui Components for Chunk 5

### Required Components:
```bash
scroll-area  # Message list scrolling
card         # Message containers
button       # Actions and controls
badge        # Status indicators
textarea     # Message input
```

### New Components to Install:
```bash
npx shadcn-ui@latest add separator
```

### Forbidden Components:
- Virtual scrolling libraries (implement manually if needed)
- Rich text editors
- Custom markdown libraries other than react-markdown

## Real Validation Tests

### Test 1: Message Rendering Performance
```bash
# Test with large number of messages
# Create 500+ messages
# Measure render time and scroll performance
# Should remain under 100ms per message
```

### Test 2: SSE Streaming Test
```bash
# Test real-time message streaming
# Send message that generates SSE response
# Verify tokens appear in real-time
# Check cursor animation and completion
```

### Test 3: File Upload Integration
```bash
# Test file upload and display
# Upload various file types
# Check .md auto-Canvas functionality
# Verify file size limits and validation
```

### Test 4: Mobile Responsiveness Test
```bash
# Test on mobile viewports (375px width)
# Check message layout and readability
# Verify input area accessibility
# Test touch interactions
```

### Test 5: Accessibility Test
```bash
# Test with screen reader
# Verify keyboard navigation
# Check ARIA labels and roles
# Test focus management
```

## What NOT to Do

### 🚫 FORBIDDEN ACTIONS:
1. **NO** synchronous processing of long messages
2. **NO** storing all messages in component state
3. **NO** missing virtualization for long conversations
4. **NO** blocking UI during message rendering
5. **NO** missing error states for failed messages
6. **NO** non-accessible keyboard navigation
7. **NO** missing mobile optimizations
8. **NO** hardcoded message limits
9. **NO** missing copy functionality
10. **NO** non-responsive layouts

### 🚫 COMMON MISTAKES:
- Not handling SSE disconnections gracefully
- Missing scroll-to-bottom on new messages
- Poor mobile input experience
- Not sanitizing message content
- Missing loading states for uploads
- Hardcoding file type restrictions
- Not implementing proper error recovery

### 🚫 ANTI-PATTERNS:
- Rendering all messages at once
- Not implementing message virtualization
- Missing progressive enhancement
- Not handling partial message tokens
- Creating non-accessible components
- Blocking main thread with rendering

## Success Completion Criteria

✅ **Chat Interface is complete when:**
1. Messages render smoothly with 1000+ items
2. SSE streaming works perfectly
3. File uploads integrate seamlessly
4. Mobile experience is excellent
5. Accessibility is fully implemented
6. Error handling covers all scenarios
7. Copy functionality works everywhere
8. Research sources display correctly
9. Performance meets all targets
10. All edge cases are handled

---

**Remember**: The chat interface is where users spend 90% of their time. Every interaction must be smooth, every animation purposeful, every error handled gracefully. This is the heart of the user experience.