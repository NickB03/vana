# SPARC Component Research - Vana Frontend Implementation

## 📋 Architecture Summary

Based on SPARC handoff, the frontend uses a hybrid component strategy:
- **Primary**: Prompt-Kit blocks for AI-optimized chat interface
- **Supporting**: shadcn/ui components for layout and interactions
- **Layout**: Sidebar-based responsive design with mobile-first approach

## ⚙️ Configuration Requirements

### Critical Setup Checklist (Complete BEFORE Component Installation)

#### 1. Tailwind CSS v4 Configuration
**Issue**: shadcn/ui components rely heavily on Tailwind classes - incorrect config breaks styling

**Required Configuration**:
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Important for Vana structure
  ],
  theme: {
    extend: {
      // shadcn/ui CSS variables integration
    }
  },
  plugins: [],
}
```

**Validation**: Ensure file scanning covers all component directories

#### 2. Global CSS and Base Styles
**Issue**: shadcn/ui requires specific global imports and Tailwind base layers

**Required Global Styles**:
```css
/* app/globals.css or src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* shadcn/ui CSS variables */
@layer base {
  :root {
    /* shadcn/ui CSS variables */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 9% 13%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 10% 3.9%;
    --radius: 0.5rem;
    
    /* Chart colors for agent status visualization */
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }
  
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

**Validation**: Import global CSS in root layout/app file

#### 3. CSS Conflict Prevention
**Issue**: Multiple UI frameworks or legacy CSS can override shadcn/ui styles

**Prevention Strategy**:
- ✅ Remove any existing UI frameworks (Bootstrap, Material-UI, etc.)
- ✅ Clean up legacy CSS files from previous implementations
- ✅ Use only Tailwind + shadcn/ui + Prompt-Kit combination
- ✅ Avoid custom CSS overrides that conflict with component styles

#### 4. Version Compatibility Matrix
**Issue**: Incompatible versions cause component failures

**Required Versions**:
```json
{
  "react": "^18.0.0",
  "next": "^14.0.0", 
  "tailwindcss": "^4.0.0",
  "@radix-ui/react-*": "latest",
  "class-variance-authority": "^0.7.0"
}
```

**Validation**: Check package.json before installation

## 🏗️ Layout Architecture Strategy

### Persistent Sidebar + Conditional Chat Pattern

#### Core Concept
**Sidebar**: Always rendered as a layout component across all pages
**Chat Area**: Conditionally rendered based on user interaction state

#### Next.js Implementation Pattern
```tsx
// app/layout.tsx (App Router) or _app.tsx (Pages Router)
import { VanaSidebar } from '@/components/vana/VanaSidebar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen">
          {/* Persistent sidebar - always rendered */}
          <VanaSidebar />
          
          {/* Main content area */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

#### Conditional Chat Rendering
```tsx
// pages/index.tsx or app/page.tsx
'use client'
import { useState } from 'react'
import { VanaHomePage } from '@/components/vana/VanaHomePage'
import { VanaChatInterface } from '@/components/vana/VanaChatInterface'

export default function HomePage() {
  const [isChatActive, setIsChatActive] = useState(false)
  
  const handleStartChat = (prompt: string) => {
    setIsChatActive(true)
    // Initialize chat with user prompt
  }
  
  return (
    <div className="h-full">
      {isChatActive ? (
        // Render chat interface when active
        <VanaChatInterface />
      ) : (
        // Render welcome page with capability suggestions
        <VanaHomePage onStartChat={handleStartChat} />
      )}
    </div>
  )
}
```

#### State Management for Chat Activation
```tsx
// hooks/useChatState.ts
import { create } from 'zustand'

interface ChatState {
  isActive: boolean
  currentSession: string | null
  startChat: (prompt: string) => void
  endChat: () => void
}

export const useChatState = create<ChatState>((set) => ({
  isActive: false,
  currentSession: null,
  startChat: (prompt) => set({ 
    isActive: true, 
    currentSession: typeof crypto !== "undefined" && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }),
  endChat: () => set({ 
    isActive: false, 
    currentSession: null 
  }),
}))
```

#### Benefits of This Architecture
1. **Consistent Navigation**: Sidebar always available for context switching
2. **Clean State Management**: Simple boolean for chat activation
3. **ShadCN Compliance**: Uses components as documented, no custom implementations
4. **Performance**: Conditional rendering prevents unnecessary chat component mounting
5. **User Experience**: Smooth transition from welcome to chat without layout shifts

#### File Structure Impact
```
app/
├── layout.tsx                 # Contains persistent VanaSidebar
├── page.tsx                   # Home page with conditional chat rendering
└── globals.css               # Global styles and CSS variables

components/vana/
├── VanaSidebar.tsx           # Persistent sidebar (always rendered)
├── VanaHomePage.tsx          # Welcome screen (conditionally rendered)
├── VanaChatInterface.tsx     # Full chat UI (conditionally rendered)
└── VanaCapabilitySuggestions.tsx  # Part of home page
```

## 🚀 Installation Commands

### Prompt-Kit Components (Primary)

**⚠️ Installation Validation Required**

Before using these commands, validate Prompt-Kit compatibility:

```bash
# Test installation with dry-run first
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json" --dry-run

# If successful, install core components:
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-suggestion.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/scroll-button.json"
```

**Alternative Manual Installation**

If CLI installation fails:

```bash
# Clone components manually from Prompt-Kit repository
# Verify Radix UI dependencies are compatible
npm install @radix-ui/react-avatar @radix-ui/react-separator
npm install class-variance-authority clsx tailwind-merge
```

**Validation Steps**

```bash
# Verify component installation
ls src/components/ui/ | grep -E "prompt-input|chat-container|message"

# Test component imports
echo "import { PromptInput } from '@/components/ui/prompt-input'" | npx tsc --noEmit --stdin
```

### shadcn/ui Components (Supporting)
```bash
# Core UI components for layout and interactions
npx shadcn@latest add avatar card button separator
```

## 📦 Component Specifications

### Prompt-Kit Components

#### PromptInput
**Installation**: `npx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"`

**Key Features**:
- Customizable input field optimized for AI interactions
- Built-in submission handling and loading states
- Configurable max height with auto-resize
- Actions and tooltips support

**Usage Example**:
```tsx
import { PromptInput } from "@/components/ui/prompt-input";

function ChatInterface() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (message: string) => {
    setIsLoading(true);
    // Handle AI message submission
    setIsLoading(false);
  };

  return (
    <PromptInput 
      onSubmit={handleSubmit}
      isLoading={isLoading}
      placeholder="Ask Vana anything..."
      maxHeight={200}
    />
  );
}
```

#### PromptSuggestion
**Installation**: `npx shadcn@latest add "https://prompt-kit.com/c/prompt-suggestion.json"`

**Key Features**:
- Two modes: Normal (clickable pills) and Highlight (text highlighting)
- Configurable variants and sizes
- Optimized for AI prompt suggestions

**Usage Example**:
```tsx
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";

function CapabilitySuggestions() {
  const suggestions = [
    "Analyze business data",
    "Generate creative content", 
    "Review code quality",
    "Plan project roadmap"
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {suggestions.map((suggestion) => (
        <PromptSuggestion 
          key={suggestion}
          variant="outline" 
          size="lg"
          onClick={() => handleSuggestionClick(suggestion)}
        >
          {suggestion}
        </PromptSuggestion>
      ))}
    </div>
  );
}
```

#### Sidebar with Chat History (Prompt-Kit Block)
**Reference**: Available as a complete block pattern on Prompt-Kit

**Key Features**:
- Grouped conversation history by time periods (Today, Yesterday, Last 7 days, Last month)
- Integrated search functionality
- Responsive sidebar with SidebarProvider
- Chat history management and navigation

**Implementation Components**:
```tsx
import { SidebarProvider } from "@/components/ui/sidebar";
// Uses Prompt-Kit SidebarProvider and related components
// Combines with ChatContainer for complete interface
```

**Usage Pattern**:
```tsx
function VanaChatSidebar() {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar>
          {/* Conversation history with time grouping */}
          <SidebarHeader>Search and navigation</SidebarHeader>
          <SidebarContent>
            {/* Grouped conversation list */}
          </SidebarContent>
        </Sidebar>
        <main>
          {/* Chat interface */}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

#### Full Chat App (Prompt-Kit Block)
**Reference**: Complete chat interface combining all Prompt-Kit components

**Key Features**:
- Combined sidebar, chat container, and prompt input
- Message interactions (copy, edit, upvote/downvote)
- Scroll functionality and responsive design
- Real-time message streaming support

**Implementation Components**:
```tsx
import { ChatContainerRoot } from "@/components/prompt-kit/chat-container";
import { PromptInput } from "@/components/prompt-kit/prompt-input";
import { Message, MessageActions } from "@/components/prompt-kit/message";
```

**Usage Pattern**:
```tsx
function VanaFullChatApp() {
  return (
    <div className="flex h-screen">
      <VanaChatSidebar />
      <div className="flex-1 flex flex-col">
        <ChatContainerRoot>
          {messages.map(message => (
            <Message key={message.id} {...message}>
              <MessageActions />
            </Message>
          ))}
        </ChatContainerRoot>
        <PromptInput onSubmit={handleSubmit} />
      </div>
    </div>
  );
}

### shadcn/ui Supporting Components

#### Avatar
**Installation**: Included in `npx shadcn@latest add avatar`

**Implementation**:
```tsx
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
```

**Usage Example**:
```tsx
// Agent avatars in chat interface
<div className="flex -space-x-2">
  <Avatar className="ring-2 ring-background">
    <AvatarImage src="/agent-researcher.png" alt="Researcher" />
    <AvatarFallback>R</AvatarFallback>
  </Avatar>
  <Avatar className="ring-2 ring-background">
    <AvatarImage src="/agent-coder.png" alt="Coder" />
    <AvatarFallback>C</AvatarFallback>
  </Avatar>
</div>
```

#### Card
**Installation**: Included in `npx shadcn@latest add card`

**Implementation**: Full Card component system with Header, Content, Footer, Action, Title, and Description subcomponents.

**Key Props**:
- `className` - Custom styling
- Flexible layout with grid-based header system
- Built-in action button positioning
- Border and shadow styling

**Usage Example**:
```tsx
// Agent coordination display
<Card className="w-full">
  <CardHeader>
    <CardTitle>Active Agents</CardTitle>
    <CardDescription>
      3 agents currently processing your request
    </CardDescription>
    <CardAction>
      <Button variant="outline" size="sm">View All</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {agents.map(agent => (
        <div key={agent.id} className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{agent.name[0]}</AvatarFallback>
          </Avatar>
          <span>{agent.name}</span>
          <Badge variant={agent.status}>{agent.status}</Badge>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

#### Button
**Installation**: Included in `npx shadcn@latest add button`

**Variants**:
- `default` - Primary button with background
- `destructive` - Red destructive actions
- `outline` - Outlined secondary button
- `secondary` - Secondary background
- `ghost` - Transparent background
- `link` - Link-style button

**Sizes**: `default`, `sm`, `lg`, `icon`

**Usage Example**:
```tsx
// Chat interface controls
<div className="flex gap-2">
  <Button onClick={handleSend} disabled={isLoading}>
    {isLoading ? <Spinner /> : <Send />}
    Send
  </Button>
  <Button variant="outline" onClick={handleClear}>
    Clear
  </Button>
</div>
```

#### Separator
**Installation**: Included in `npx shadcn@latest add separator`

**Orientations**: `horizontal` (default), `vertical`

**Usage Example**:
```tsx
// Section dividers in chat history
<div className="space-y-4">
  <div>Recent Conversations</div>
  <Separator />
  <div>Archived Conversations</div>
</div>
```

## 🏗 Planned File Structure

Based on SPARC architecture decisions:

```
src/components/vana/
├── VanaHomePage.tsx           # Centered welcome + capability suggestions
├── VanaCapabilitySuggestions.tsx  # 6 universal capability categories
├── VanaChatPage.tsx           # Main chat interface (full-chat-app pattern)
└── VanaChatSidebar.tsx        # Conversation history (sidebar-chat-history pattern)

src/components/ui/
├── prompt-input.tsx           # Prompt-Kit PromptInput
├── prompt-suggestion.tsx      # Prompt-Kit PromptSuggestion  
├── avatar.tsx                 # shadcn/ui Avatar
├── card.tsx                   # shadcn/ui Card system
├── button.tsx                 # shadcn/ui Button
└── separator.tsx              # shadcn/ui Separator
```

## 🔧 Pre-Implementation Validation

### Step 1: Environment Verification
```bash
# Check current versions
node --version  # Should be 18+ 
npm list react next tailwindcss

# Verify Tailwind v4 installation
npx tailwindcss --version
```

### Step 2: Configuration Audit
```bash
# Check for conflicting CSS frameworks
find . -name "*.css" -o -name "*.scss" | grep -v node_modules
grep -r "bootstrap\|material-ui\|antd" package.json

# Verify Tailwind config
cat tailwind.config.js | grep -E "content|src"
```

### Step 3: Clean Slate Validation
- [ ] Remove any existing UI framework dependencies
- [ ] Clean legacy CSS files from previous implementations  
- [ ] Verify Tailwind v4 config includes all source directories
- [ ] Test Tailwind compilation with `npm run build`
- [ ] Confirm global CSS imports in root layout

## 🎯 Implementation Priorities

### Phase 0: Foundation Setup (CRITICAL)
1. **Environment Validation** - Complete pre-implementation checklist
2. **Tailwind v4 Configuration** - Proper file scanning and CSS variables
3. **Global Styles Setup** - shadcn/ui base styles and Tailwind layers
4. **Dependency Cleanup** - Remove conflicting frameworks

### Phase 1: Layout Foundation  
1. **app/layout.tsx** - Persistent sidebar layout wrapper
2. **VanaSidebar.tsx** - Always-rendered navigation and chat history
3. **useChatState.ts** - Zustand store for chat activation state

### Phase 2: Home Page Foundation
1. **VanaHomePage.tsx** - Centered welcome with universal AI messaging
2. **VanaCapabilitySuggestions.tsx** - 6 capability categories using PromptSuggestion
3. **app/page.tsx** - Conditional rendering logic (home vs chat)

### Phase 3: Chat Interface Core  
1. **VanaChatInterface.tsx** - Complete chat UI (conditionally rendered)
2. **Prompt-Kit Integration** - ChatContainer, Message, PromptInput components
3. SSE integration for real-time streaming

### Phase 4: Agent Coordination
1. Real-time agent status display using Card components in sidebar
2. Agent avatars and progress indicators
3. Multi-agent workflow visualization

### Phase 5: Responsive Polish
1. Mobile-first responsive design with sidebar collapse
2. Touch interactions and gestures  
3. Progressive enhancement and accessibility

## 🚨 Common Issues & Troubleshooting

### Issue 1: Styles Not Applied
**Symptoms**: Components render but look unstyled
**Causes**: 
- Tailwind config not scanning component files
- Missing global CSS imports
- CSS variables not loaded

**Solutions**:
```bash
# Check Tailwind compilation
npm run build
# Look for CSS generation errors

# Verify file scanning
npx tailwindcss -i ./src/styles/globals.css -o ./dist/output.css --watch
```

### Issue 2: Component Import Errors
**Symptoms**: "Module not found" errors for shadcn/ui components
**Causes**:
- Incorrect installation paths
- Missing dependencies
- Version mismatches

**Solutions**:
```bash
# Reinstall shadcn/ui CLI
npm install -g shadcn-ui@latest

# Check installation
npx shadcn-ui@latest add --help
```

### Issue 3: Prompt-Kit Components Not Working
**Symptoms**: Prompt-Kit components fail to render or behave incorrectly
**Causes**:
- Registry URL issues
- Missing Radix UI dependencies
- Tailwind class conflicts

**Solutions**:
```bash
# Verify Prompt-Kit installation
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json" --force

# Check Radix dependencies
npm list @radix-ui/react-avatar @radix-ui/react-separator
```

## 🔧 Key Architectural Decisions

1. **Configuration First**: Mandatory pre-implementation validation prevents styling issues
2. **Hybrid Component Strategy**: Prompt-Kit for AI-specific patterns + shadcn/ui for layout
3. **Universal Positioning**: Multi-capability AI platform (not research-specific)
4. **Clean Environment**: No conflicting frameworks to ensure component integrity
5. **Version Compatibility**: Strict version requirements for stable operation
6. **Mobile-First**: Progressive enhancement from mobile base
7. **SSE Integration**: Real-time streaming for chat and agent coordination

## ✅ Success Criteria

- [ ] Centered "Hi, I'm Vana" welcome page with universal capabilities
- [ ] Prompt-Kit chat interface with conversation history
- [ ] Real-time agent coordination display
- [ ] Responsive design working on mobile/desktop
- [ ] Ready to connect to existing FastAPI backend
- [ ] Component library properly installed and configured

---

## 📋 Implementation Readiness Checklist

### Pre-Development Validation
- [ ] Node.js 18+ and npm/yarn installed
- [ ] Tailwind CSS v4 configuration verified
- [ ] Global CSS variables and dark theme configured
- [ ] Prompt-Kit component installation tested
- [ ] shadcn/ui components installed and verified
- [ ] TypeScript configuration with proper path aliases
- [ ] Environment variables configured for all environments

### Development Phase Readiness
- [ ] VanaHomePage component with accessibility features
- [ ] useChatStream hook with SSE reconnection logic
- [ ] AgentCoordinationPanel with real-time updates
- [ ] Comprehensive test suite with SSE mocking
- [ ] Keyboard navigation and focus management
- [ ] Error boundaries and fallback UI components

### Production Deployment Readiness
- [ ] Performance optimization and bundle analysis
- [ ] Security headers and Content Security Policy
- [ ] Accessibility audit with automated testing
- [ ] Cross-browser compatibility testing
- [ ] Mobile responsiveness validation
- [ ] API integration testing with FastAPI backend

**Next Steps**: 
1. Complete pre-development validation checklist
2. Begin implementation with layout foundation (app/layout.tsx)
3. Implement VanaHomePage with accessibility features
4. Add SSE streaming integration with agent coordination
5. Conduct comprehensive testing and accessibility audit

## 💾 Memory Integration

```typescript
// Store implementation progress and discoveries
mcp__claude-flow__memory_usage --action store --key "implementation/component-research-updated" --value "Complete component research updated with all refinement areas: CSS variables, crypto fallback, SSE implementation, agent coordination UX, accessibility, testing strategy, deployment prep. Ready for implementation with comprehensive validation checklist."
```

Remember: **Accessibility First, Testing Early, Deploy Confidently!**