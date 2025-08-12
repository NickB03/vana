# Chunk 2: Homepage & Chat Flow (Lines 200-268 + Homepage Section)

## 📸 UI REFERENCES

**Primary Reference**: Screenshot 12.01.21 AM.png (Gemini homepage)
- **Layout**: Centered greeting with suggested action cards below
- **Colors**: 
  - Background: #1F1F1F (dark charcoal)
  - Primary text: #FFFFFF (white)
  - Secondary text: #9CA3AF (light gray)
  - Accent: #3B82F6 to #8B5CF6 (blue to purple gradient)
- **Typography**: 
  - Greeting: Large, bold title with gradient
  - Cards: Clean, readable sans-serif
- **Spacing**: Generous whitespace, centered layout with max-width container
- **Interaction**: Hover effects on suggestion cards, prominent input field

**VISUAL VALIDATION CRITERIA**:
✅ Homepage matches Gemini's centered, welcoming layout
✅ Gradient title "Hi, I'm Vana" prominently displayed
✅ 6 suggestion cards in responsive grid layout
✅ Bottom input field with file upload capability
✅ Dark theme with proper contrast ratios
✅ Smooth hover animations on interactive elements

## 🏠 CRITICAL: This creates the first user impression - make it perfect

### Extracted PRD Content (Lines 200-268 + Homepage Section)

```
## 4. Core User Flows

### 4.1 Homepage → Chat → Canvas Flow

#### Purpose
Seamless transition from landing to interactive AI conversation with Canvas output.

#### Detailed Flow

1. **Homepage Landing**
   ```typescript
   interface HomepageState {
     greeting: "Hi, I'm Vana"
     suggestions: PromptSuggestion[]
     tools: ToolOption[]
     recentSessions: Session[] // homepage-origin only
   }
   ```

2. **Prompt Submission**
   ```typescript
   const handleSubmit = async (prompt: string, files?: File[]) => {
     // Create session
     const session = sessionStore.createSession('homepage', prompt)
     
     // Navigate to chat
     router.push(`/chat?session=${session.id}`)
     
     // Initialize SSE
     const eventSource = new EventSource(
       `/agent_network_sse/${session.id}`
     )
     
     // Begin streaming
     eventSource.addEventListener('message_token', handleToken)
   }
   ```

3. **Agent Response Processing**
   ```typescript
   const handleAgentResponse = (event: MessageEvent) => {
     const data = JSON.parse(event.data)
     
     switch(data.type) {
       case 'canvas_open':
         canvasStore.open(data.canvasType, data.content)
         break
       case 'research_sources':
         agentDeckStore.updateSources(data.sources)
         break
       case 'task_update':
         agentDeckStore.updateTasks(data.tasks)
         break
     }
   }
   ```

### 4.2 Tool-Triggered Session Flow

```typescript
const handleToolSelect = (tool: ToolOption) => {
  const session = sessionStore.createSession('tool')
  
  // Open Canvas immediately
  canvasStore.open(tool.canvasType)
  
  // Navigate with Canvas open
  router.push(`/chat?session=${session.id}&canvas=${tool.canvasType}`)
}
```

---

## 6. Homepage Specification

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar              │      Main Content           │
│                       │                             │
│  Recent Chats:        │    Hi, I'm Vana            │
│  • Project planning   │                             │
│  • Code review        │  ┌────┐ ┌────┐ ┌────┐     │
│  • Documentation      │  │Idea│ │Plan│ │Debug│     │
│                       │  └────┘ └────┘ └────┘     │
│                       │                             │
│                       │  🔧 Canvas  📝 Markdown    │
│                       │  💻 Code    🌐 Web         │
│                       │                             │
│                       │  [What can I help with?__] │
│                       │                   [Send]   │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Components Implementation

#### Greeting with Gradient
```tsx
<h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
  Hi, I'm Vana
</h1>
```

#### Prompt Suggestions
```tsx
const suggestions = [
  { id: 1, text: "Help me plan a new React project", icon: "📋" },
  { id: 2, text: "Debug this TypeScript error", icon: "🐛" },
  { id: 3, text: "Write unit tests for my component", icon: "🧪" }
]

<div className="flex gap-4 overflow-x-auto pb-2">
  {suggestions.map(suggestion => (
    <Card 
      key={suggestion.id}
      className="min-w-[200px] cursor-pointer hover:border-primary transition-colors"
      onClick={() => handleSuggestionClick(suggestion)}
    >
      <CardContent className="p-4">
        <span className="text-2xl mb-2">{suggestion.icon}</span>
        <p className="text-sm">{suggestion.text}</p>
      </CardContent>
    </Card>
  ))}
</div>
```
```

## Critical Requirements & Guardrails

### 🔴 ABSOLUTE REQUIREMENTS
1. **GOOGLE GEMINI STYLE**: Homepage must visually match Gemini's aesthetic exactly
2. **GRADIENT TITLE**: "Hi, I'm Vana" with blue-to-purple gradient
3. **SUGGESTION CARDS**: Emoji + text cards with hover effects
4. **SIDEBAR SESSIONS**: Recent chats list with proper filtering
5. **PROGRESSIVE FLOW**: Homepage → Chat must be seamless
6. **NO LOADING FLICKERS**: Smooth transitions throughout

### 🟡 CRITICAL GUARDRAILS
- Suggestion cards must be responsive and scrollable
- Recent sessions filtered to homepage-origin only
- Tool buttons must immediately navigate with Canvas open
- Input field must be prominent and accessible
- No more than 6 suggestions visible at once

### 🟢 SUCCESS CRITERIA
- Homepage loads in under 1 second
- Suggestion clicks work immediately
- Session creation is instant
- Navigation feels seamless
- Recent chats load correctly

## Step-by-Step Implementation Guide

### Phase 1: Homepage Layout (45 minutes)

1. **Create Homepage Component**
   ```typescript
   // app/page.tsx
   import { Button } from "@/components/ui/button"
   import { Card, CardContent } from "@/components/ui/card"
   import { Input } from "@/components/ui/input"
   import { ScrollArea } from "@/components/ui/scroll-area"
   import { SessionSidebar } from "@/components/session/SessionSidebar"
   import { PromptSuggestions } from "@/components/homepage/PromptSuggestions"
   import { ToolGrid } from "@/components/homepage/ToolGrid"
   import { PromptInput } from "@/components/homepage/PromptInput"
   
   export default function HomePage() {
     return (
       <div className="flex h-screen bg-background">
         <SessionSidebar />
         <main className="flex-1 flex flex-col items-center justify-center p-8">
           <div className="max-w-2xl w-full space-y-8">
             <VanaGreeting />
             <PromptSuggestions />
             <ToolGrid />
             <PromptInput />
           </div>
         </main>
       </div>
     )
   }
   ```

2. **Vana Greeting Component**
   ```typescript
   // components/homepage/VanaGreeting.tsx
   export const VanaGreeting = () => {
     return (
       <div className="text-center space-y-4">
         <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
           Hi, I'm Vana
         </h1>
         <p className="text-xl text-muted-foreground">
           Multi-agent AI platform built on Google ADK
         </p>
       </div>
     )
   }
   ```

3. **Prompt Suggestions Component**
   ```typescript
   // components/homepage/PromptSuggestions.tsx
   import { Card, CardContent } from "@/components/ui/card"
   import { useRouter } from "next/navigation"
   import { useSessionStore } from "@/stores/sessionStore"
   
   interface Suggestion {
     id: number
     text: string
     icon: string
     category: 'planning' | 'coding' | 'debugging' | 'documentation'
   }
   
   const suggestions: Suggestion[] = [
     { id: 1, text: "Help me plan a new React project", icon: "📋", category: "planning" },
     { id: 2, text: "Debug this TypeScript error", icon: "🐛", category: "debugging" },
     { id: 3, text: "Write unit tests for my component", icon: "🧪", category: "coding" },
     { id: 4, text: "Create API documentation", icon: "📚", category: "documentation" },
     { id: 5, text: "Optimize component performance", icon: "⚡", category: "coding" },
     { id: 6, text: "Design a new feature", icon: "✨", category: "planning" }
   ]
   
   export const PromptSuggestions = () => {
     const router = useRouter()
     const { createSession } = useSessionStore()
     
     const handleSuggestionClick = (suggestion: Suggestion) => {
       const session = createSession('homepage', suggestion.text)
       router.push(`/chat?session=${session.id}`)
     }
   
     return (
       <div className="space-y-4">
         <h2 className="text-lg font-medium text-center">Get started with a suggestion</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {suggestions.map(suggestion => (
             <Card 
               key={suggestion.id}
               className="cursor-pointer hover:border-primary transition-all duration-200 hover:shadow-lg"
               onClick={() => handleSuggestionClick(suggestion)}
             >
               <CardContent className="p-4">
                 <div className="flex flex-col items-center text-center space-y-2">
                   <span className="text-3xl">{suggestion.icon}</span>
                   <p className="text-sm font-medium">{suggestion.text}</p>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       </div>
     )
   }
   ```

### Phase 2: Tool Grid (30 minutes)

4. **Tool Grid Component**
   ```typescript
   // components/homepage/ToolGrid.tsx
   import { Card, CardContent } from "@/components/ui/card"
   import { FileText, Code, Globe, Play } from "lucide-react"
   import { useRouter } from "next/navigation"
   import { useSessionStore } from "@/stores/sessionStore"
   import { useCanvasStore } from "@/stores/canvasStore"
   
   interface Tool {
     id: string
     name: string
     description: string
     icon: React.ComponentType<{ className?: string }>
     canvasType: 'markdown' | 'code' | 'web' | 'sandbox'
     color: string
   }
   
   const tools: Tool[] = [
     {
       id: 'markdown',
       name: 'Markdown',
       description: 'Write and preview markdown documents',
       icon: FileText,
       canvasType: 'markdown',
       color: 'text-blue-400'
     },
     {
       id: 'code',
       name: 'Code',
       description: 'Write and edit code with syntax highlighting',
       icon: Code,
       canvasType: 'code',
       color: 'text-green-400'
     },
     {
       id: 'web',
       name: 'Web Preview',
       description: 'Preview HTML/CSS in real-time',
       icon: Globe,
       canvasType: 'web',
       color: 'text-purple-400'
     },
     {
       id: 'sandbox',
       name: 'Sandbox',
       description: 'Run code in isolated environment',
       icon: Play,
       canvasType: 'sandbox',
       color: 'text-orange-400'
     }
   ]
   
   export const ToolGrid = () => {
     const router = useRouter()
     const { createSession } = useSessionStore()
     const { open: openCanvas } = useCanvasStore()
     
     const handleToolClick = (tool: Tool) => {
       const session = createSession('tool')
       openCanvas(tool.canvasType)
       router.push(`/chat?session=${session.id}&canvas=${tool.canvasType}`)
     }
   
     return (
       <div className="space-y-4">
         <h2 className="text-lg font-medium text-center">Or start with a tool</h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {tools.map(tool => {
             const IconComponent = tool.icon
             return (
               <Card 
                 key={tool.id}
                 className="cursor-pointer hover:border-primary transition-all duration-200 hover:shadow-lg"
                 onClick={() => handleToolClick(tool)}
               >
                 <CardContent className="p-4">
                   <div className="flex flex-col items-center text-center space-y-2">
                     <IconComponent className={`h-8 w-8 ${tool.color}`} />
                     <div>
                       <p className="font-medium">{tool.name}</p>
                       <p className="text-xs text-muted-foreground">{tool.description}</p>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             )
           })}
         </div>
       </div>
     )
   }
   ```

### Phase 3: Prompt Input (45 minutes)

5. **Prompt Input Component**
   ```typescript
   // components/homepage/PromptInput.tsx
   import { useState } from "react"
   import { Button } from "@/components/ui/button"
   import { Input } from "@/components/ui/input"
   import { Paperclip, Send } from "lucide-react"
   import { useRouter } from "next/navigation"
   import { useSessionStore } from "@/stores/sessionStore"
   import { FileUploader } from "@/components/upload/FileUploader"
   
   export const PromptInput = () => {
     const [prompt, setPrompt] = useState("")
     const [files, setFiles] = useState<File[]>([])
     const [isLoading, setIsLoading] = useState(false)
     const router = useRouter()
     const { createSession } = useSessionStore()
   
     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault()
       if (!prompt.trim() && files.length === 0) return
   
       setIsLoading(true)
       try {
         const session = createSession('homepage', prompt)
         
         // If files are attached, handle them
         if (files.length > 0) {
           // Check for .md files to auto-open Canvas
           const mdFile = files.find(f => f.name.endsWith('.md'))
           if (mdFile) {
             const content = await readFileContent(mdFile)
             // Canvas will auto-open via canvasStore
           }
         }
         
         router.push(`/chat?session=${session.id}`)
       } catch (error) {
         console.error('Failed to create session:', error)
       } finally {
         setIsLoading(false)
       }
     }
   
     return (
       <div className="space-y-4">
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="relative">
             <Input
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="What can I help you with?"
               className="w-full pr-24 h-12 text-base"
               disabled={isLoading}
             />
             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
               <FileUploader 
                 files={files} 
                 onFilesChange={setFiles}
                 maxFiles={3}
               />
               <Button 
                 type="submit" 
                 size="sm"
                 disabled={(!prompt.trim() && files.length === 0) || isLoading}
               >
                 <Send className="h-4 w-4" />
               </Button>
             </div>
           </div>
           
           {files.length > 0 && (
             <div className="flex gap-2 flex-wrap">
               {files.map((file, index) => (
                 <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                   <Paperclip className="h-3 w-3" />
                   {file.name}
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setFiles(files.filter((_, i) => i !== index))}
                   >
                     ×
                   </Button>
                 </div>
               ))}
             </div>
           )}
         </form>
         
         <p className="text-xs text-center text-muted-foreground">
           Start a conversation or upload files to get started
         </p>
       </div>
     )
   }
   ```

### Phase 4: Session Sidebar (30 minutes)

6. **Session Sidebar for Homepage**
   ```typescript
   // components/session/SessionSidebar.tsx
   import { ScrollArea } from "@/components/ui/scroll-area"
   import { Button } from "@/components/ui/button"
   import { Card, CardContent } from "@/components/ui/card"
   import { Plus, MessageSquare } from "lucide-react"
   import { useSessionStore } from "@/stores/sessionStore"
   import { useRouter } from "next/navigation"
   import { formatRelativeTime } from "@/lib/utils/format"
   
   export const SessionSidebar = () => {
     const { sessions, currentSessionId, createSession } = useSessionStore()
     const router = useRouter()
     
     // Only show homepage-origin sessions on homepage
     const homepageSessions = sessions
       .filter(s => s.origin === 'homepage')
       .sort((a, b) => b.updatedAt - a.updatedAt)
       .slice(0, 20) // Show last 20 sessions
   
     const handleNewChat = () => {
       router.push('/') // Stay on homepage for new chat
     }
   
     const handleSessionClick = (sessionId: string) => {
       router.push(`/chat?session=${sessionId}`)
     }
   
     return (
       <div className="w-64 border-r bg-card/50">
         <div className="p-4 border-b">
           <Button 
             onClick={handleNewChat}
             className="w-full justify-start"
             variant="ghost"
           >
             <Plus className="h-4 w-4 mr-2" />
             New Chat
           </Button>
         </div>
         
         <ScrollArea className="flex-1">
           <div className="p-2 space-y-2">
             {homepageSessions.length > 0 ? (
               homepageSessions.map(session => (
                 <Card
                   key={session.id}
                   className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                     currentSessionId === session.id ? 'border-primary' : ''
                   }`}
                   onClick={() => handleSessionClick(session.id)}
                 >
                   <CardContent className="p-3">
                     <div className="flex items-start gap-2">
                       <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-medium truncate">
                           {session.title}
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {formatRelativeTime(session.updatedAt)}
                         </p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               ))
             ) : (
               <div className="text-center text-muted-foreground text-sm p-4">
                 No recent chats
               </div>
             )}
           </div>
         </ScrollArea>
       </div>
     )
   }
   ```

## 🧠 THINK HARD Instructions

Before implementing ANY homepage component:

1. **Visual Consistency**: Does this match Google Gemini's homepage exactly?
2. **Performance First**: Will this render in under 1 second?
3. **Progressive Enhancement**: Does this work without JavaScript?
4. **Accessibility**: Can this be navigated with keyboard only?
5. **Mobile Responsive**: Does this work on mobile devices?
6. **Error States**: What happens if sessions fail to load?
7. **Loading States**: Are there loading indicators for all async operations?

### Extended Reasoning Prompts:
- "What would a first-time user think when they see this homepage?"
- "How does this homepage guide users to the most valuable features?"
- "What happens if the user clicks multiple suggestions rapidly?"
- "How does this homepage perform on a slow 3G connection?"
- "What accessibility features are needed for screen readers?"

## EXACT shadcn/ui Components for Chunk 2

### Required Components:
```bash
button       # Action buttons, submit
card         # Suggestion cards, session cards  
input        # Prompt input field
scroll-area  # Session sidebar scrolling
```

### New Components to Install:
```bash
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add sheet  # For mobile sidebar
```

### Forbidden Components:
- Any carousel/slider components
- Custom form libraries
- Animation libraries other than Framer Motion
- Grid layout libraries

## Real Validation Tests

### Test 1: Homepage Visual Validation
```bash
# Start dev server and navigate to homepage
npm run dev
# Open localhost:3000
# Check: 
# - Gradient title renders correctly
# - 6 suggestion cards in grid
# - 4 tool cards with icons
# - Prompt input with file upload
# - Sidebar with recent chats
```

### Test 2: Suggestion Click Flow
```typescript
// Test suggestion click creates session and navigates
// Should redirect to /chat?session={sessionId}
// Should create session with 'homepage' origin
// Should include suggestion text as initial prompt
```

### Test 3: Tool Click Flow
```typescript
// Test tool click opens Canvas and navigates
// Should redirect to /chat?session={sessionId}&canvas={type}
// Should create session with 'tool' origin
// Should open Canvas immediately
```

### Test 4: File Upload Integration
```bash
# Test .md file upload
# Should auto-open Canvas markdown mode
# Should include file content
# Should create session with file attachment
```

### Test 5: Responsive Layout Test
```bash
# Test mobile view (375px width)
# Grid should stack correctly
# Sidebar should be hidden/collapsible
# Input should remain accessible
```

## What NOT to Do

### 🚫 FORBIDDEN ACTIONS:
1. **NO** custom animations beyond Framer Motion
2. **NO** suggestion cards that don't navigate
3. **NO** tool buttons that don't open Canvas
4. **NO** non-responsive grid layouts
5. **NO** hardcoded session data
6. **NO** missing loading states
7. **NO** inaccessible keyboard navigation
8. **NO** missing error boundaries
9. **NO** non-semantic HTML elements
10. **NO** layout shift during loading

### 🚫 COMMON MISTAKES:
- Not filtering sessions by origin
- Forgetting to handle empty states
- Missing hover effects on cards
- Not implementing file upload properly
- Ignoring mobile layout considerations
- Missing keyboard shortcuts
- Not handling rapid clicking
- Forgetting loading indicators

### 🚫 ANTI-PATTERNS:
- Creating session without navigation
- Opening Canvas without session
- Missing file type validation
- Not sanitizing user input
- Hardcoding suggestion text
- Not implementing proper error handling
- Missing accessibility attributes

## Success Completion Criteria

✅ **Homepage & Flow is complete when:**
1. Homepage renders in under 1 second
2. All 6 suggestion cards work correctly
3. All 4 tool cards open Canvas properly
4. Prompt input creates sessions and navigates
5. File upload works with .md auto-Canvas
6. Session sidebar shows recent chats only
7. Mobile layout is fully responsive
8. All keyboard navigation works
9. Loading states are implemented
10. Error handling covers all edge cases

---

**Remember**: The homepage is the first impression. It must be perfect, fast, and guide users naturally to the most valuable features. Every click should feel instant and purposeful.