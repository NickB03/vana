# Component Architecture & Data Flow Design

## Phase 0: Foundation Setup (CRITICAL)

### ⚠️ MANDATORY PRE-IMPLEMENTATION VALIDATION
**CRITICAL**: Complete this entire section BEFORE any component implementation to prevent styling and configuration failures.

### 1. Tailwind v4 Configuration Validation
**Issue**: shadcn/ui components rely heavily on Tailwind classes - incorrect configuration breaks all styling.

**Required Configuration Verification**:
```javascript
// tailwind.config.js - VERIFY THIS EXISTS AND IS CORRECT
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Critical for Vana structure
  ],
  theme: {
    extend: {
      // shadcn/ui CSS variables integration required
    }
  },
  plugins: [],
}
```

**Validation Commands**:
```bash
# Verify Tailwind v4 installation
npx tailwindcss --version  # Should be 4.x

# Test configuration
cat tailwind.config.js | grep -E "content|src"

# Test compilation
npm run build  # Check for CSS generation errors
```

### 2. Global CSS Requirements Checklist
**Issue**: shadcn/ui requires specific global imports and Tailwind base layers - missing these breaks component styling.

**Required Global Styles Setup**:
```css
/* app/globals.css or src/styles/globals.css - VERIFY ALL IMPORTS */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* shadcn/ui CSS variables - REQUIRED */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}
```

**Validation**:
- [ ] Global CSS file exists and is imported in root layout
- [ ] All Tailwind directives present (@tailwind base, components, utilities)
- [ ] CSS variables defined for shadcn/ui theming
- [ ] No conflicting CSS imports

### 3. CSS Conflict Prevention Protocol
**Issue**: Multiple UI frameworks or legacy CSS can override shadcn/ui styles, causing component failures.

**Conflict Prevention Checklist**:
```bash
# Check for conflicting CSS frameworks
grep -r "bootstrap\|material-ui\|antd\|bulma\|foundation" package.json
find . -name "*.css" -o -name "*.scss" | grep -v node_modules | xargs grep -l "bootstrap\|material"

# Clean up legacy CSS files
find . -name "*.css" -not -path "./node_modules/*" -exec echo "Review: {}" \;
```

**Prevention Strategy**:
- [ ] ✅ Remove ANY existing UI frameworks (Bootstrap, Material-UI, Ant Design, etc.)
- [ ] ✅ Delete legacy CSS files from previous implementations
- [ ] ✅ Use ONLY Tailwind + shadcn/ui + Prompt-Kit combination
- [ ] ✅ Avoid custom CSS overrides that conflict with component styles
- [ ] ✅ Verify no global CSS rules targeting component classes

### 4. Version Compatibility Matrix
**Issue**: Incompatible package versions cause component import failures and runtime errors.

**Required Version Verification**:
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0", 
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-avatar": "^1.0.0",
    "@radix-ui/react-separator": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

**Validation Commands**:
```bash
# Check current versions
node --version  # Should be 18+
npm list react next tailwindcss
npm list @radix-ui/react-avatar @radix-ui/react-separator

# Verify compatibility
npm outdated  # Check for version conflicts
```

**Compatibility Requirements**:
- [ ] Node.js 18+ 
- [ ] React 18+
- [ ] Next.js 14+
- [ ] Tailwind CSS 4.x
- [ ] All Radix UI packages latest versions
- [ ] TypeScript 5.x (if using TypeScript)

### 5. Environment Verification Commands
**Critical Setup Validation**:
```bash
# Step 1: Environment Check
node --version && npm --version
npx create-next-app@latest --version

# Step 2: Tailwind Verification  
npx tailwindcss --version
cat tailwind.config.js | head -10

# Step 3: Dependency Audit
npm list --depth=0 | grep -E "react|next|tailwind"
npm audit --audit-level moderate

# Step 4: Build Test
npm run build 2>&1 | grep -E "error|warn"

# Step 5: shadcn/ui CLI Test
npx shadcn@latest --version
npx shadcn@latest init --help
```

### 6. Pre-Implementation Validation Checklist
**Complete ALL items before any component implementation**:

#### Environment Validation ✅
- [ ] Node.js 18+ installed and verified
- [ ] npm or yarn latest version
- [ ] Next.js project initialized
- [ ] Git repository clean (no conflicting changes)

#### Configuration Validation ✅
- [ ] `tailwind.config.js` exists with correct content paths
- [ ] Global CSS file contains all required Tailwind directives
- [ ] CSS variables defined for shadcn/ui theming
- [ ] No syntax errors in configuration files

#### Dependency Validation ✅
- [ ] All required packages installed at compatible versions
- [ ] No conflicting UI framework dependencies
- [ ] Radix UI packages installed (required for shadcn/ui)
- [ ] No npm audit warnings for critical dependencies

#### Build Validation ✅
- [ ] `npm run build` completes successfully
- [ ] No Tailwind compilation errors
- [ ] CSS output file generated correctly
- [ ] Development server starts without errors

#### Tool Validation ✅
- [ ] shadcn/ui CLI installed and responsive
- [ ] `npx shadcn@latest add --help` works
- [ ] Can add test component: `npx shadcn@latest add button`
- [ ] Test component renders with correct styling

### 7. Troubleshooting Guide
**Common failure patterns and solutions**:

#### Styles Not Applied
**Symptoms**: Components render but look unstyled, missing colors/spacing
**Causes & Solutions**:
```bash
# Check Tailwind compilation
npm run build 2>&1 | grep -i css
# Look for: "CSS generation errors" or "Missing @tailwind directives"

# Verify file scanning
npx tailwindcss -i ./src/styles/globals.css -o ./dist/test.css --watch
# Check if component files are being scanned

# Test CSS variables
grep -A 20 ":root" app/globals.css
# Ensure all shadcn/ui variables are defined
```

#### Component Import Errors  
**Symptoms**: "Module not found" for @/components/ui/*
**Solutions**:
```bash
# Check TypeScript paths
cat tsconfig.json | grep -A 5 "paths"
# Ensure "@/*": ["./src/*"] or similar is configured

# Verify shadcn/ui installation
ls components/ui/  # Should contain installed components
npx shadcn@latest add button --force  # Reinstall component
```

#### Version Conflicts
**Symptoms**: Runtime errors, dependency warnings
**Solutions**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check peer dependencies
npm ls --depth=0 2>&1 | grep -i "peer dep"
npm install --legacy-peer-deps  # If peer dependency issues
```

---

## Architecture Overview

The frontend follows a **layout-first architecture** with a persistent sidebar and conditional chat rendering, designed for optimal conversational AI interactions with seamless navigation and real-time multi-agent coordination.

**IMPORTANT**: Only proceed to implementation after completing Phase 0 validation checklist above.

## Component Hierarchy

### Persistent Sidebar + Conditional Chat Architecture

#### Core Layout Strategy
The application implements a **layout-first architecture** with a persistent sidebar that remains rendered across all pages, combined with conditional chat interface rendering based on user interaction state.

```
App (Root Provider)
├── AuthProvider (Authentication Context)
├── Router (React Router)
├── RootLayout (Persistent Layout Shell)
│   ├── VanaSidebar (Always Rendered - Navigation & Chat History)
│   │   ├── SidebarHeader (Vana Branding)
│   │   ├── SidebarNavigation (Main Navigation Links)
│   │   ├── SidebarSeparator
│   │   └── ChatHistorySection (Conversation History)
│   │       ├── SearchConversations
│   │       ├── ConversationGroups (Today, Yesterday, etc.)
│   │       └── ConversationList
│   └── MainContent (Conditional Content Area)
│       ├── HomePage (Default: Welcome + Capabilities)
│       │   ├── VanaWelcome (Centered "Hi, I'm Vana")
│       │   └── VanaCapabilitySuggestions (6 Universal Capabilities)
│       └── ChatInterface (Conditional: Active Chat)
│           ├── ChatContainer (Message History)
│           ├── AgentCoordination (Real-time Status)
│           └── ChatInput (PromptInput Component)
└── ErrorBoundary (Global Error Handling)
```

### Next.js Layout Implementation Pattern

#### Root Layout (app/layout.tsx)
```typescript
// app/layout.tsx - Persistent Layout with Sidebar
import { VanaSidebar } from '@/components/vana/VanaSidebar'
import { ChatStateProvider } from '@/providers/ChatStateProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <ChatStateProvider>
          <div className="flex h-full">
            {/* Persistent sidebar - always rendered */}
            <VanaSidebar className="w-64 border-r bg-background" />
            
            {/* Main content area - conditional rendering */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </ChatStateProvider>
      </body>
    </html>
  )
}
```

#### Home Page with Conditional Chat (app/page.tsx)
```typescript
// app/page.tsx - Conditional Chat Rendering
'use client'
import { VanaHomePage } from '@/components/vana/VanaHomePage'
import { VanaChatInterface } from '@/components/vana/VanaChatInterface'
import { useChatState } from '@/hooks/useChatState'

export default function HomePage() {
  const { isActive, startChat } = useChatState()
  
  const handleStartChat = (prompt: string) => {
    startChat(prompt)
    // Initialize chat session with user prompt
  }
  
  return (
    <div className="h-full">
      {isActive ? (
        // Render full chat interface when active
        <VanaChatInterface />
      ) : (
        // Render welcome page with capability suggestions
        <VanaHomePage onStartChat={handleStartChat} />
      )}
    </div>
  )
}
```

### Zustand State Management for Chat Activation

#### Chat State Store
```typescript
// hooks/useChatState.ts - Chat Activation State
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatState {
  isActive: boolean
  currentSession: string | null
  sessionHistory: ChatSession[]
  
  // Actions
  startChat: (prompt: string) => void
  endChat: () => void
  resumeSession: (sessionId: string) => void
  addToHistory: (session: ChatSession) => void
}

export const useChatState = create<ChatState>()(persist(
  (set, get) => ({
    isActive: false,
    currentSession: null,
    sessionHistory: [],
    
    startChat: (prompt) => {
      const sessionId = crypto.randomUUID()
      set({ 
        isActive: true, 
        currentSession: sessionId
      })
      // Initialize chat with first message
    },
    
    endChat: () => {
      const { currentSession } = get()
      if (currentSession) {
        // Save session to history before ending
        get().addToHistory({
          id: currentSession,
          createdAt: new Date(),
          // ... session data
        })
      }
      set({ 
        isActive: false, 
        currentSession: null 
      })
    },
    
    resumeSession: (sessionId) => {
      set({
        isActive: true,
        currentSession: sessionId
      })
    },
    
    addToHistory: (session) => {
      set(state => ({
        sessionHistory: [session, ...state.sessionHistory]
      }))
    }
  }),
  {
    name: 'vana-chat-state',
    partialize: (state) => ({ sessionHistory: state.sessionHistory })
  }
))
```

### Conditional Chat Interface Components

#### Chat Interface (Conditionally Rendered)
```
VanaChatInterface (Rendered when isActive: true)
├── ChatContainer (Prompt-Kit ChatContainerRoot)
│   ├── ChatHeader (Session Info, Agent Count, Controls)
│   │   ├── SessionTitle (Auto-generated from first prompt)
│   │   ├── AgentStatusSummary ("3 agents active")
│   │   └── ChatActions (Settings, Export, End Chat)
│   ├── ChatMessages (Real-time Message Stream)
│   │   ├── UserMessage (Prompt-Kit Message Component)
│   │   ├── AgentMessage (AI Response with MessageActions)
│   │   │   ├── MessageContent (Formatted response)
│   │   │   ├── CitationLinks (Source references)
│   │   │   └── MessageActions (Copy, Edit, Vote)
│   │   ├── AgentCoordinationMessage (Agent handoff notifications)
│   │   └── SystemMessage (Status updates, errors)
│   └── ChatScrollButton (Prompt-Kit auto-scroll)
├── AgentCoordinationPanel (Integrated in Main Chat)
│   ├── ActiveAgentsOverview (Compact status cards)
│   ├── AgentProgressTimeline (Current task phases)
│   └── AgentHandoffIndicators (Visual workflow)
└── ChatInputArea (Bottom-anchored)
    ├── PromptInput (Prompt-Kit component with auto-resize)
    │   ├── InputField (Multi-line with validation)
    │   ├── AttachmentSupport (File upload triggers)
    │   └── SendControls (Submit/Stop buttons)
    └── InputSuggestions (Context-aware prompt suggestions)
```

#### Home Page (Default Rendered)
```
VanaHomePage (Rendered when isActive: false)
├── VanaWelcome (Centered welcome experience)
│   ├── VanaLogo (Animated Vana branding)
│   ├── WelcomeMessage ("Hi, I'm Vana. Your AI assistant.")
│   └── UniversalCapabilityMessage ("I can help with...")
├── VanaCapabilitySuggestions (6 universal capabilities)
│   ├── ContentCreation (PromptSuggestion component)
│   ├── DataAnalysis (Business intelligence focus)
│   ├── CodeReview (Development assistance)
│   ├── ProjectPlanning (Strategy and roadmaps)
│   ├── ResearchSynthesis (Information gathering)
│   └── ProblemSolving (General assistance)
└── QuickStartSection
    ├── RecentConversations (From sidebar integration)
    └── TemplatePrompts (Common starting points)
```

### Shared Components
```
UI Library (shadcn/ui + Prompt-Kit)
├── Chat Components (Prompt-Kit Registry)
│   ├── MessageBubble (Chat message container)
│   ├── TypingIndicator (Agent thinking animation)
│   ├── CodeBlock (Syntax highlighted code)
│   └── CitationTooltip (Source reference popup)
├── Forms
│   ├── Input (Enhanced with validation)
│   ├── Textarea (Auto-resize, validation)
│   ├── Select (Multi-select support)
│   └── Button (Loading states, variants)
├── Data Display
│   ├── Card (Agent status, chat metadata)
│   ├── Badge (Status indicators, tags)
│   ├── Progress (Real-time progress bars)
│   └── Avatar (User, agent avatars)
├── Navigation
│   ├── Breadcrumb (Page navigation)
│   ├── Tabs (Interface sections)
│   └── Pagination (Chat history)
└── Feedback
    ├── Toast (Notifications, errors)
    ├── Alert (Important messages)
    ├── Loading (Spinner, skeleton)
    └── Empty (No chat history states)
```

## Component Installation Guide

### Phase 1: Core Chat Components (Prompt-Kit)

```bash
# Install AI-optimized chat components from Prompt-Kit registry
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-suggestion.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/scroll-button.json"
```

### Phase 2: Essential UI Components (shadcn/ui)

```bash
# Install fundamental UI building blocks
npx shadcn@latest add avatar
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add separator
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add badge
npx shadcn@latest add progress
```

### Phase 3: Advanced UI Components

```bash
# Install additional interface components
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add tabs
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet
```

### Installation Validation

```bash
# Verify component files exist
ls -la components/ui/

# Check for required component dependencies
npm list @radix-ui/react-avatar
npm list @radix-ui/react-progress
npm list class-variance-authority
npm list clsx
npm list tailwind-merge

# Test component imports
node -e "console.log(require('./components/ui/button.tsx'))"
```

## Data Flow Architecture

### State Management Strategy

#### Global State (Zustand) - Layout-First Architecture

```typescript
// Chat Activation Store (Primary)
interface ChatState {
  isActive: boolean                    // Core: determines UI rendering
  currentSession: string | null
  sessionHistory: ChatSession[]
  startChat: (prompt: string) => void  // Triggers conditional rendering
  endChat: () => void                  // Returns to home page
  resumeSession: (sessionId: string) => void
}

// Chat Content Store (Active when isActive: true)
interface ChatContentState {
  messages: ChatMessage[]
  isStreaming: boolean
  agentProgress: AgentProgress[]
  currentAgents: ActiveAgent[]
  error: Error | null
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  addMessage: (message: ChatMessage) => void
}

// Sidebar State Store (Always Active)
interface SidebarState {
  isCollapsed: boolean                 // Mobile/desktop responsive
  searchQuery: string
  filteredConversations: ChatSession[]
  selectedConversation: string | null
  conversationGroups: {
    today: ChatSession[]
    yesterday: ChatSession[]
    lastWeek: ChatSession[]
    older: ChatSession[]
  }
  searchConversations: (query: string) => void
  selectConversation: (id: string) => void
  toggleSidebar: () => void
}

// Auth Store (Global)
interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<AuthResult>
  logout: () => Promise<void>
}

// UI State Store (Layout & Theme)
interface UIState {
  theme: 'light' | 'dark'
  notifications: Notification[]
  modals: Modal[]
  isMobile: boolean
  screenSize: 'mobile' | 'tablet' | 'desktop'
  sidebarBreakpoint: boolean          // Responsive sidebar behavior
}
```

#### Local State (React useState/useReducer)
- Form inputs and validation
- Component-specific UI state
- Temporary data (draft edits)
- Animation states

#### Server State (React Query)
- API data caching
- Background refetching
- Optimistic updates
- Error retry logic

### Data Flow Patterns - Layout-First Architecture

#### Chat Activation Flow
```
1. User on Home Page → Capability Suggestion Click → useChatState.startChat()
2. ChatState.isActive = true → Conditional Rendering → VanaChatInterface
3. Chat Interface Mounts → Initialize Chat Content Store
4. Sidebar Updates → Add New Session → Conversation History
5. Layout Remains Persistent → Sidebar Always Available
```

#### Chat Session Data Flow
```
1. User Message → PromptInput Validation → ChatContentState
2. ChatContentState → API Call → Agent Coordination Backend
3. SSE Stream → Real-time Agent Updates → Agent Progress UI
4. Agent Progress → Sidebar Integration → Recent Activity
5. Agent Results → Chat Messages → Message History
6. Session End → Save to History → Return to Home Page
```

#### Sidebar Navigation Flow
```
1. Persistent Sidebar → Always Rendered in Layout
2. Conversation Click → useChatState.resumeSession()
3. Session Resume → ChatState.isActive = true → Chat Interface
4. Search Input → SidebarState.searchConversations()
5. Filter Results → Real-time Conversation Filtering
6. Mobile Breakpoint → Sidebar Collapse/Overlay Behavior
```

#### Authentication Flow
```
1. Login Form → Auth API → JWT Tokens
2. Token Storage → Auth Store → Global State
3. API Requests → Token Injection → Authenticated Calls
4. Token Refresh → Background Process → Updated Tokens
5. Logout → Token Cleanup → Reset Auth State
```

#### Session Management Flow
```
1. Session Creation → API Call → Session Store
2. Session Persistence → Local Storage → Restore State
3. Session History → API Fetch → Session List
4. Session Resume → State Restoration → UI Update
```

## Component Communication Patterns

### Parent-Child Communication
- Props for data down
- Callbacks for events up
- Ref for direct access (rare)

### Sibling Communication
- Shared state via context/store
- Event emitters for loose coupling
- URL state for page-level coordination

### Cross-Component Communication
- Global state stores (Zustand)
- Custom hooks for shared logic
- Event system for notifications

## Performance Optimization Strategies - Layout-First Architecture

### Component Optimization for Persistent Sidebar

#### Sidebar Performance
```typescript
// Memoized sidebar to prevent re-renders
const VanaSidebar = React.memo(() => {
  const { sessionHistory, searchQuery } = useSidebarState()
  
  // Memoize filtered conversations
  const filteredConversations = useMemo(() => {
    return sessionHistory.filter(session => 
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [sessionHistory, searchQuery])
  
  return (
    <aside className="w-64 border-r bg-background">
      <SidebarContent conversations={filteredConversations} />
    </aside>
  )
})

// Stable callbacks for sidebar interactions
const SidebarContent = ({ conversations }) => {
  const handleConversationClick = useCallback((sessionId: string) => {
    // Stable reference prevents child re-renders
    resumeSession(sessionId)
  }, [])
  
  return (
    <div>
      {conversations.map(conversation => (
        <ConversationItem 
          key={conversation.id}
          conversation={conversation}
          onClick={handleConversationClick}
        />
      ))}
    </div>
  )
}
```

#### Conditional Rendering Optimization
```typescript
// Lazy load chat interface only when needed
const VanaChatInterface = lazy(() => import('./VanaChatInterface'))

// Optimized conditional rendering with Suspense
function HomePage() {
  const { isActive } = useChatState()
  
  return (
    <div className="h-full">
      {isActive ? (
        <Suspense fallback={<ChatLoadingSkeleton />}>
          <VanaChatInterface />
        </Suspense>
      ) : (
        <VanaHomePage />
      )}
    </div>
  )
}
```

### State Optimization for Chat Activation

#### Selective Store Subscriptions
```typescript
// Only subscribe to specific state slices
const ChatActivationButton = () => {
  // Only re-renders when isActive changes
  const isActive = useChatState(state => state.isActive)
  const startChat = useChatState(state => state.startChat)
  
  return (
    <Button onClick={() => startChat('Hello')}>
      {isActive ? 'Continue Chat' : 'Start Chat'}
    </Button>
  )
}

// Sidebar only subscribes to conversation history
const ConversationHistory = () => {
  const conversations = useChatState(state => state.sessionHistory)
  
  return (
    <div>
      {conversations.map(conv => <ConversationItem key={conv.id} {...conv} />)}
    </div>
  )
}
```

### Rendering Optimization for Large Conversation Lists

#### Virtual Scrolling for Sidebar History
```typescript
// Virtual scrolling for conversation list
const VirtualConversationList = () => {
  const conversations = useSidebarState(state => state.filteredConversations)
  
  return (
    <FixedSizeList
      height={400}
      itemCount={conversations.length}
      itemSize={60}
      itemData={conversations}
    >
      {ConversationRow}
    </FixedSizeList>
  )
}

const ConversationRow = ({ index, style, data }) => (
  <div style={style}>
    <ConversationItem conversation={data[index]} />
  </div>
)
```

#### Code Splitting and Bundle Optimization
```typescript
// Route-level code splitting
const routes = [
  {
    path: '/',
    element: lazy(() => import('./pages/HomePage')),
  },
  {
    path: '/settings',
    element: lazy(() => import('./pages/SettingsPage')),
  },
]

// Component-level splitting for large chat features
const AgentCoordination = lazy(() => import('./components/AgentCoordination'))
const ChatExport = lazy(() => import('./components/ChatExport'))
```

## Error Handling Architecture

### Error Boundary Strategy
```typescript
// Global Error Boundary
<ErrorBoundary fallback={GlobalErrorFallback}>
  <App />
</ErrorBoundary>

// Feature Error Boundaries
<ErrorBoundary fallback={ResearchErrorFallback}>
  <ResearchPage />
</ErrorBoundary>

// Component Error Boundaries
<ErrorBoundary fallback={AgentErrorFallback}>
  <AgentGrid />
</ErrorBoundary>
```

### Error Types and Handling
- **Network Errors**: Retry mechanisms, offline fallbacks
- **Validation Errors**: Form-level error display
- **Authentication Errors**: Redirect to login, token refresh
- **SSE Errors**: Connection retry, graceful degradation
- **Unexpected Errors**: Error boundary with crash reporting

## Accessibility Architecture

### ARIA Implementation
- Semantic HTML structure
- ARIA labels and descriptions
- Focus management
- Screen reader announcements

### Keyboard Navigation
- Tab order optimization
- Keyboard shortcuts
- Focus indicators
- Escape key handling

### Color and Contrast
- High contrast mode support
- Color-blind friendly palettes
- Text scaling support
- Motion reduction preferences

## Testing Architecture - Layout-First + Conditional Rendering

### Unit Testing Strategy

#### Layout Component Testing
```typescript
// Test persistent sidebar rendering
describe('RootLayout', () => {
  it('always renders VanaSidebar regardless of chat state', () => {
    render(<RootLayout><TestPage /></RootLayout>)
    expect(screen.getByTestId('vana-sidebar')).toBeInTheDocument()
  })
})

// Test conditional chat rendering
describe('HomePage Conditional Rendering', () => {
  it('renders VanaHomePage when chat is inactive', () => {
    mockChatState({ isActive: false })
    render(<HomePage />)
    expect(screen.getByTestId('vana-home-page')).toBeInTheDocument()
    expect(screen.queryByTestId('chat-interface')).not.toBeInTheDocument()
  })
  
  it('renders VanaChatInterface when chat is active', () => {
    mockChatState({ isActive: true })
    render(<HomePage />)
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
    expect(screen.queryByTestId('vana-home-page')).not.toBeInTheDocument()
  })
})
```

#### State Store Testing
```typescript
// Test chat activation state transitions
describe('useChatState', () => {
  it('activates chat and creates session on startChat', () => {
    const { result } = renderHook(() => useChatState())
    
    act(() => {
      result.current.startChat('Test prompt')
    })
    
    expect(result.current.isActive).toBe(true)
    expect(result.current.currentSession).toBeTruthy()
  })
  
  it('deactivates chat and saves to history on endChat', () => {
    const { result } = renderHook(() => useChatState())
    
    act(() => {
      result.current.startChat('Test prompt')
      result.current.endChat()
    })
    
    expect(result.current.isActive).toBe(false)
    expect(result.current.sessionHistory).toHaveLength(1)
  })
})
```

### Integration Testing Strategy

#### Layout Integration Testing
- **Sidebar + Chat Coordination**: Test sidebar state updates when chat activates
- **Responsive Behavior**: Test sidebar collapse/expand on breakpoint changes
- **Session Resume**: Test clicking sidebar conversation loads chat interface
- **State Persistence**: Test page refresh maintains chat/sidebar state

#### Component Integration Testing
```typescript
// Test complete flow from home to chat
describe('Home to Chat Integration', () => {
  it('activates chat when capability suggestion is clicked', async () => {
    render(<App />)
    
    // Start on home page
    expect(screen.getByText('Hi, I\'m Vana')).toBeInTheDocument()
    
    // Click capability suggestion
    fireEvent.click(screen.getByText('Analyze business data'))
    
    // Should transition to chat interface
    await waitFor(() => {
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
    })
    
    // Sidebar should still be present
    expect(screen.getByTestId('vana-sidebar')).toBeInTheDocument()
  })
})
```

### E2E Testing Strategy

#### Complete User Workflows
- **Welcome to Chat Flow**: Home page → capability selection → chat activation
- **Chat Session Management**: Start chat → send messages → end chat → resume from sidebar
- **Responsive Layout**: Test sidebar behavior across mobile/tablet/desktop
- **Session Persistence**: Refresh page during chat → maintain state → continue conversation

## Mobile Architecture Considerations - Persistent Sidebar + Chat

### Responsive Breakpoints with Sidebar Behavior
- **Mobile (320px - 768px)**: Sidebar overlay with hamburger menu
- **Tablet (768px - 1024px)**: Sidebar overlay or slide-out panel
- **Desktop (1024px+)**: Persistent sidebar always visible

### Sidebar Responsive Patterns
```typescript
// Mobile: Overlay sidebar
<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
  <SheetContent side="left" className="w-64 p-0">
    <VanaSidebarContent onItemClick={() => setSidebarOpen(false)} />
  </SheetContent>
</Sheet>

// Desktop: Persistent sidebar
<aside className="w-64 border-r bg-background">
  <VanaSidebarContent />
</aside>

// Conditional rendering based on breakpoint
const SidebarWrapper = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return isMobile ? (
    <MobileSidebarOverlay>{children}</MobileSidebarOverlay>
  ) : (
    <DesktopSidebarFixed>{children}</DesktopSidebarFixed>
  )
}
```

### Touch Interactions for Sidebar + Chat
- **Sidebar**: Swipe from left edge to open overlay (mobile)
- **Chat Interface**: Touch-friendly message actions (copy, edit, vote)
- **Conversation History**: Long press for context menu (delete, export)
- **Chat Input**: Auto-resize with virtual keyboard handling

### Performance Optimizations
- **Conditional Mounting**: Chat interface only mounts when active
- **Virtual Scrolling**: Conversation history with large message counts
- **Optimistic Updates**: Immediate UI feedback for message sending
- **Session Persistence**: Save/restore chat state across page refreshes

### File Structure Implications
```
app/
├── layout.tsx                    # Persistent sidebar wrapper
├── page.tsx                      # Conditional chat rendering logic
├── globals.css                   # Sidebar + chat responsive styles

components/vana/
├── VanaSidebar.tsx              # Always-rendered navigation
│   ├── SidebarHeader.tsx        # Branding and search
│   ├── SidebarNavigation.tsx    # Main navigation links
│   └── ChatHistory.tsx          # Conversation list with grouping
├── VanaHomePage.tsx             # Default page (isActive: false)
├── VanaChatInterface.tsx        # Chat UI (isActive: true)
└── VanaCapabilitySuggestions.tsx # Universal capability triggers

hooks/
├── useChatState.ts              # Chat activation state
├── useSidebarState.ts           # Sidebar behavior state
└── useResponsiveLayout.ts       # Breakpoint-aware layout
```

## Component Installation Troubleshooting

### Common Installation Issues

**1. Registry URL Errors**
```bash
# Ensure exact URL format with quotes
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
# NOT: npx shadcn@latest add https://www.prompt-kit.com/c/prompt-input.json
```

**2. Missing TypeScript Paths**
```typescript
// Ensure tsconfig.json has correct paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./components/*"]
    }
  }
}
```

**3. Tailwind Configuration Issues**
```javascript
// tailwind.config.js must scan component files
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ]
}
```

### Installation Verification Script

```bash
#!/bin/bash
# verify-installation.sh

echo "Checking component installation..."

# Check for component files
if [ -d "components/ui" ]; then
  echo "✅ Components directory exists"
  echo "Installed components:"
  ls components/ui/ | grep -E '\.(tsx?|jsx?)$'
else
  echo "❌ Components directory missing"
fi

# Check dependencies
echo "\nChecking dependencies..."
npm list @radix-ui/react-avatar @radix-ui/react-progress class-variance-authority

# Test imports
echo "\nTesting component imports..."
node -e "try { require('./components/ui/button'); console.log('✅ Button import successful'); } catch(e) { console.log('❌ Button import failed:', e.message); }"
```

## Security Architecture - Layout-First Implementation

### Client-Side Security for Persistent Sidebar

#### Secure State Management
```typescript
// Secure chat state with data sanitization
const useChatState = create<ChatState>()(persist(
  (set, get) => ({
    startChat: (prompt) => {
      // Sanitize user input before storing
      const sanitizedPrompt = DOMPurify.sanitize(prompt)
      const sessionId = crypto.randomUUID()
      
      set({ 
        isActive: true, 
        currentSession: sessionId,
        initialPrompt: sanitizedPrompt
      })
    },
    
    addToHistory: (session) => {
      // Sanitize conversation data before persistence
      const sanitizedSession = {
        ...session,
        title: DOMPurify.sanitize(session.title),
        messages: session.messages.map(msg => ({
          ...msg,
          content: DOMPurify.sanitize(msg.content)
        }))
      }
      
      set(state => ({
        sessionHistory: [sanitizedSession, ...state.sessionHistory]
      }))
    }
  }),
  {
    name: 'vana-chat-state',
    // Only persist safe data, exclude sensitive session tokens
    partialize: (state) => ({ 
      sessionHistory: state.sessionHistory,
      // Exclude currentSession and isActive for security
    })
  }
))
```

#### Secure Component Rendering
```typescript
// Prevent XSS in chat messages and sidebar content
const ConversationItem = ({ conversation }) => {
  const sanitizedTitle = useMemo(() => 
    DOMPurify.sanitize(conversation.title), 
    [conversation.title]
  )
  
  return (
    <Button 
      variant="ghost" 
      className="w-full justify-start"
      dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
    />
  )
}

// Input validation for chat and search
const PromptInputSecure = ({ onSubmit }) => {
  const [input, setInput] = useState('')
  
  const handleSubmit = useCallback((value: string) => {
    // Validate and sanitize before submission
    const trimmed = value.trim()
    if (trimmed.length === 0 || trimmed.length > 2000) {
      throw new Error('Invalid input length')
    }
    
    const sanitized = DOMPurify.sanitize(trimmed)
    onSubmit(sanitized)
  }, [onSubmit])
  
  return (
    <PromptInput 
      value={input}
      onChange={setInput}
      onSubmit={handleSubmit}
      maxLength={2000}
    />
  )
}
```

### API Security with Layout Architecture

#### Token Management for Persistent Sessions
```typescript
// Secure token handling with automatic refresh
const useAuthWithLayout = () => {
  const { tokens, refreshToken } = useAuthState()
  
  // Auto-refresh tokens in background while sidebar is persistent
  useEffect(() => {
    const interval = setInterval(() => {
      if (tokens?.expiresAt && Date.now() > tokens.expiresAt - 60000) {
        refreshToken()
      }
    }, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [tokens, refreshToken])
  
  return { tokens, isAuthenticated: !!tokens }
}

// Secure logout with complete state cleanup
const useSecureLogout = () => {
  const clearAuthState = useAuthState(state => state.clear)
  const clearChatState = useChatState(state => state.clear)
  const clearSidebarState = useSidebarState(state => state.clear)
  
  return useCallback(async () => {
    // Clear all client state
    clearAuthState()
    clearChatState()
    clearSidebarState()
    
    // Clear browser storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Redirect to login
    window.location.href = '/login'
  }, [clearAuthState, clearChatState, clearSidebarState])
}
```

#### Secure Session Management
```typescript
// Rate limiting awareness for chat sessions
const useChatRateLimit = () => {
  const [requestCount, setRequestCount] = useState(0)
  const [lastRequest, setLastRequest] = useState(0)
  
  const canSendMessage = useCallback(() => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequest
    
    // Reset counter if more than 1 minute has passed
    if (timeSinceLastRequest > 60000) {
      setRequestCount(0)
    }
    
    // Allow max 30 requests per minute
    return requestCount < 30
  }, [requestCount, lastRequest])
  
  const trackRequest = useCallback(() => {
    setRequestCount(prev => prev + 1)
    setLastRequest(Date.now())
  }, [])
  
  return { canSendMessage, trackRequest }
}
```

## Deployment Architecture - Layout-First Approach

### Build Configuration for Persistent Sidebar + Conditional Chat

#### Environment-Specific Builds
```javascript
// next.config.js - Optimized for layout-first architecture
module.exports = {
  experimental: {
    turbopack: true,  // Fast builds for development
  },
  
  // Code splitting optimization for conditional rendering
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize for conditional chat loading
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        sidebar: {
          name: 'sidebar',
          chunks: 'all',
          test: /[\/\\]components[\/\\]vana[\/\\]VanaSidebar/,
          priority: 20,
        },
        chat: {
          name: 'chat-interface',
          chunks: 'async',
          test: /[\/\\]components[\/\\]vana[\/\\]VanaChatInterface/,
          priority: 19,
        },
        promptKit: {
          name: 'prompt-kit',
          chunks: 'all',
          test: /[\/\\]components[\/\\]ui[\/\\](prompt-|chat-|message)/,
          priority: 18,
        }
      }
    }
    return config
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization for agent avatars
  images: {
    domains: ['cdn.vana.ai'],
    formats: ['image/webp', 'image/avif'],
  }
}
```

#### Environment Management
```typescript
// lib/environment.ts - Configuration for layout features
export const ENV_CONFIG = {
  development: {
    enableDevTools: true,
    enableChatDebug: true,
    sidebarCollapseDelay: 0,
    chatLoadingSkeleton: false,
  },
  staging: {
    enableDevTools: true,
    enableChatDebug: false,
    sidebarCollapseDelay: 200,
    chatLoadingSkeleton: true,
    featureFlags: {
      newChatInterface: true,
      enhancedSidebar: true,
    }
  },
  production: {
    enableDevTools: false,
    enableChatDebug: false,
    sidebarCollapseDelay: 300,
    chatLoadingSkeleton: true,
    featureFlags: {
      newChatInterface: true,
      enhancedSidebar: false,  // Gradual rollout
    }
  }
}
```

### Progressive Deployment for Layout Changes

#### Feature Flags for Conditional Rendering
```typescript
// hooks/useFeatureFlags.ts
export const useFeatureFlags = () => {
  const [flags, setFlags] = useState(ENV_CONFIG[process.env.NODE_ENV].featureFlags)
  
  return {
    newChatInterface: flags.newChatInterface ?? true,
    enhancedSidebar: flags.enhancedSidebar ?? false,
    persistentSidebar: flags.persistentSidebar ?? true,
  }
}

// Conditional feature deployment
const HomePage = () => {
  const { newChatInterface } = useFeatureFlags()
  const { isActive } = useChatState()
  
  return (
    <div className="h-full">
      {isActive ? (
        newChatInterface ? (
          <VanaChatInterface />  // New implementation
        ) : (
          <LegacyChatInterface />  // Fallback
        )
      ) : (
        <VanaHomePage />
      )}
    </div>
  )
}
```

#### A/B Testing for Layout Patterns
```typescript
// lib/abTesting.ts - Layout pattern experiments
export const useLayoutExperiment = () => {
  const userId = useAuthState(state => state.user?.id)
  
  const variant = useMemo(() => {
    if (!userId) return 'control'
    
    // Hash user ID to determine variant
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return Math.abs(hash) % 100 < 50 ? 'control' : 'treatment'
  }, [userId])
  
  return {
    showPersistentSidebar: variant === 'treatment',
    showConditionalChat: variant === 'treatment',
    trackEvent: (event: string, data: any) => {
      analytics.track(event, { variant, ...data })
    }
  }
}
```

### CDN and Asset Optimization

#### Optimized Asset Loading for Layout Components
```typescript
// Pre-load critical layout assets
const useLayoutPreloading = () => {
  useEffect(() => {
    // Pre-load sidebar assets immediately
    import('@/components/vana/VanaSidebar')
    
    // Pre-load chat interface after sidebar loads
    setTimeout(() => {
      import('@/components/vana/VanaChatInterface')
    }, 100)
    
    // Pre-load Prompt-Kit components
    Promise.all([
      import('@/components/ui/prompt-input'),
      import('@/components/ui/prompt-suggestion'),
      import('@/components/ui/chat-container'),
    ])
  }, [])
}

// Asset optimization for responsive images
const optimizedImageConfig = {
  loader: 'custom',
  loaderFile: './lib/imageLoader.js',
  deviceSizes: [640, 768, 1024, 1280, 1536],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```