# Nodus Agent Template - Component Requirements & Implementation Plan

## Executive Summary
Replicating the Nodus Agent Template using shadcn/ui components with full backend integration to the Vana FastAPI backend.

## 🎨 Design System

### Color Palette
```css
/* Light Mode */
--background: #ffffff;
--foreground: #0a0a0a;
--muted: #f4f4f5;
--muted-foreground: #71717a;
--border: #e4e4e7;
--accent: #f4f4f5;

/* Dark Mode */
--background: #0a0a0a;
--foreground: #fafafa;
--muted: #18181b;
--muted-foreground: #a1a1aa;
--border: #27272a;
--accent: #27272a;
```

### Typography
- Font: Inter / System font stack
- Headings: Bold, variable sizes
- Body: Regular, 16px base

## 📦 Required shadcn Components

### Core Components Needed
- **Navigation**: `navigation-menu`, `dropdown-menu`, `sheet` (mobile)
- **Layout**: `card`, `separator`, `scroll-area`
- **Forms**: `form`, `input`, `button`, `label`, `select`, `textarea`
- **Feedback**: `alert`, `toast` (sonner), `dialog`, `alert-dialog`
- **Data Display**: `badge`, `avatar`, `tabs`, `accordion`
- **Loading**: `skeleton`, `progress`
- **Theme**: Custom theme toggle component

### Additional Components for Chat Interface
- `scroll-area` - For message history
- `textarea` - For message input
- `button` - Send button
- `avatar` - User/AI avatars
- `badge` - Status indicators
- `tooltip` - Hover information

## 🏗️ Page Structure

### 1. Landing Page (`/`)
```
Header
├── Logo
├── Navigation (Pricing, About, Careers, Blog)
├── Theme Toggle
└── Sign In Button

Hero Section
├── Main Headline
├── Subheadline
├── CTA Buttons (Start Building, View Pricing)
└── Logo Cloud

Features Grid
├── Feature Cards (6 main features)
└── Icons + Descriptions

Pricing Section
├── Pricing Cards (3 tiers)
└── Feature Comparison

Footer
├── Product Links
├── Company Links
├── Legal Links
└── Compliance Badges
```

### 2. Authentication Pages (`/auth/*`)
```
/auth/login
├── Email/Username Input
├── Password Input
├── Remember Me Checkbox
├── Submit Button
├── Google OAuth Button
└── Link to Register

/auth/register
├── Email Input
├── Username Input
├── Password Input
├── First/Last Name (optional)
├── Submit Button
├── Google OAuth Button
└── Link to Login
```

### 3. Dashboard (`/dashboard`)
```
Sidebar
├── User Profile
├── Navigation Items
│   ├── Workflows
│   ├── Agents
│   ├── Tools
│   ├── Analytics
│   └── Settings
└── Logout

Main Content Area
├── Header with Breadcrumbs
├── Stats Cards
├── Recent Activity
└── Quick Actions
```

### 4. Chat Interface (`/chat`)
```
Chat Layout
├── Conversation List (left sidebar)
│   ├── Search
│   ├── Conversation Items
│   └── New Chat Button
├── Chat Window (main)
│   ├── Message History
│   ├── Typing Indicators
│   ├── Message Input
│   └── Send Button
└── Agent Info Panel (right sidebar)
    ├── Agent Status
    ├── Active Tools
    └── Session Info
```

## 🔌 Backend Integration Points

### Authentication Flow
```typescript
// Login flow
POST /auth/login → JWT tokens → Store in httpOnly cookies
GET /auth/me → User profile
POST /auth/refresh → Token refresh

// Google OAuth
POST /auth/google → Token exchange
```

### Chat System
```typescript
// Message flow
POST /chat/{chat_id}/message → Returns task_id
GET /chat/{chat_id}/stream?task_id={task_id} → SSE stream

// Memory integration
POST /api/memory/sessions → Create session
POST /api/memory/messages → Add to memory
POST /api/memory/context → Get ADK context
```

### SSE Event Handling
```typescript
// Event types to handle
- connection: Connection established
- message_delta: Streaming text
- message_complete: Full message
- agent_start: Agent activity
- network_topology: Agent coordination
- error: Error handling
```

## 🚀 Implementation Phases

### Phase 1: Foundation (Day 1)
- [x] Analyze requirements
- [ ] Setup Next.js with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Install shadcn/ui
- [ ] Create layout components
- [ ] Implement theme toggle

### Phase 2: Authentication (Day 2)
- [ ] Build login/register pages
- [ ] Implement JWT management
- [ ] Add Google OAuth
- [ ] Create auth context/hooks
- [ ] Add protected routes

### Phase 3: Landing Page (Day 3)
- [ ] Hero section
- [ ] Features grid
- [ ] Pricing section
- [ ] Navigation
- [ ] Footer

### Phase 4: Dashboard (Day 4)
- [ ] Sidebar navigation
- [ ] Dashboard layout
- [ ] Stats cards
- [ ] Activity feed

### Phase 5: Chat Interface (Day 5-6)
- [ ] Chat layout
- [ ] Message components
- [ ] SSE integration
- [ ] Message streaming
- [ ] Agent status display

### Phase 6: Advanced Features (Day 7)
- [ ] Workflow builder UI
- [ ] Agent management
- [ ] Analytics dashboard
- [ ] Settings pages

## 🎯 Component Hierarchy

```
App
├── ThemeProvider
├── AuthProvider
│   ├── LoginPage
│   ├── RegisterPage
│   └── ProtectedRoute
├── LandingPage
│   ├── Header
│   ├── Hero
│   ├── Features
│   ├── Pricing
│   └── Footer
├── Dashboard
│   ├── DashboardLayout
│   │   ├── Sidebar
│   │   └── MainContent
│   ├── WorkflowBuilder
│   ├── AgentManager
│   └── Analytics
└── ChatInterface
    ├── ConversationList
    ├── ChatWindow
    │   ├── MessageList
    │   ├── MessageInput
    │   └── StreamingMessage
    └── AgentInfoPanel
```

## 🔧 Key Implementation Details

### 1. SSE Memory Management
- Use refs for EventSource
- Cleanup on unmount
- Implement reconnection logic
- Handle all event types

### 2. Token Management
- httpOnly cookies for storage
- Automatic refresh before expiry
- Cross-tab synchronization
- Logout handling

### 3. Chat Streaming
- Progressive message rendering
- Typing indicators
- Error recovery
- Agent status updates

### 4. Responsive Design
- Mobile-first approach
- Breakpoints: sm(640px), md(768px), lg(1024px)
- Touch-friendly interactions
- Collapsible sidebars

## 📝 File Structure
```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── workflows/page.tsx
│   │   ├── agents/page.tsx
│   │   └── settings/page.tsx
│   ├── chat/
│   │   ├── [id]/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── [...proxy]/route.ts
│   └── page.tsx (landing)
├── components/
│   ├── ui/ (shadcn components)
│   ├── auth/
│   ├── chat/
│   ├── dashboard/
│   └── landing/
├── hooks/
│   ├── use-auth.ts
│   ├── use-sse.ts
│   └── use-chat.ts
├── lib/
│   ├── api-client.ts
│   ├── auth-manager.ts
│   ├── sse-manager.ts
│   └── memory-manager.ts
└── styles/
    └── globals.css
```

## ✅ Success Criteria
- [ ] Pixel-perfect recreation of Nodus design
- [ ] Full authentication flow working
- [ ] Chat interface with streaming
- [ ] SSE events properly handled
- [ ] Memory integration functional
- [ ] Responsive on all devices
- [ ] Dark/light mode toggle
- [ ] No memory leaks
- [ ] Production-ready error handling