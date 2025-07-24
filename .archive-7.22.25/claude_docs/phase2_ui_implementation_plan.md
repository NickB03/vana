# Phase 2: Core UI Implementation Plan

## 🎯 Goals
Build a simple, high-quality AI-focused frontend using Kibo UI components with minimal dependencies. Focus on the core chat experience with the innovative ThinkingPanel for transparency.

## 🏗️ Architecture Overview

### Component Hierarchy
```
App
├── Layout (Main container with Gemini gradient background)
│   ├── Header (Minimal - just VANA branding)
│   ├── MainContent
│   │   ├── ChatInterface
│   │   │   ├── MessageList (using AI Message components)
│   │   │   └── ChatInput (using AI Input)
│   │   └── ThinkingPanel (Collapsible side panel)
│   │       ├── AgentActivity (Real-time status)
│   │       └── ReasoningSteps (Using AI Reasoning)
│   └── WebSocketProvider (Context for real-time updates)
```

## 📦 Minimal Dependencies Strategy

### Core Dependencies (Already installed)
- React + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Radix UI (via Kibo UI)
- clsx + tailwind-merge (utilities)

### New Dependencies (Phase 2)
```json
{
  "socket.io-client": "^4.7.2",  // WebSocket for real-time
  "framer-motion": "^11.0.3"     // Animations for ThinkingPanel
}
```

### Explicitly NOT Adding
- ❌ State management libraries (use React Context)
- ❌ Form libraries (use native + Kibo components)
- ❌ Router (single page for now)
- ❌ HTTP client libraries (use native fetch)
- ❌ Additional UI libraries

## 🎨 UI Components Plan

### 1. **Layout Component** (30 min)
```tsx
// Simple container with Gemini gradient background
// Uses Tailwind classes, no extra dependencies
```

### 2. **ChatInterface Component** (1 hour)
Using Kibo AI components:
- `<AIConversation>` - Main chat container
- `<AIMessage>` - Individual messages
- `<AIInput>` - Chat input with AI features
- `<AISuggestion>` - Quick action buttons

### 3. **ThinkingPanel Component** (2 hours)
The core innovation, using:
- `<AIReasoning>` - Step-by-step thinking display
- `<AITool>` - Tool usage visualization
- `<Status>` - Real-time status indicators
- Framer Motion for smooth animations

### 4. **WebSocket Integration** (1 hour)
- Simple Context provider
- Minimal socket.io-client setup
- Event handlers for agent activity

## 🛠️ Implementation Steps

### Step 1: Install Minimal Dependencies (5 min)
```bash
npm install socket.io-client framer-motion
```

### Step 2: Create Base Layout (30 min)
- App layout with gradient background
- Header with VANA branding
- Content area setup

### Step 3: Implement Kibo UI Components Setup (30 min)
- Import and configure Kibo AI components
- Set up dark theme CSS variables
- Create component aliases for cleaner imports

### Step 4: Build ChatInterface (1 hour)
- Message list with AI components
- Input area with suggestions
- Basic message sending

### Step 5: Build ThinkingPanel (2 hours)
- Collapsible panel with Framer Motion
- Real-time agent activity display
- Step-by-step reasoning visualization
- Status indicators and timing

### Step 6: WebSocket Integration (1 hour)
- Context provider setup
- Connect to backend WebSocket
- Wire up real-time updates to ThinkingPanel

### Step 7: Polish & Animations (30 min)
- Gemini gradient animations
- Smooth transitions
- Loading states

## 🎯 Component Details

### ThinkingPanel Features
```typescript
interface ThinkingStep {
  id: string
  agent: string
  action: string
  status: 'pending' | 'active' | 'complete'
  duration?: number
  details?: string
}

// Visual indicators:
// 🟡 Active (pulsing animation)
// ✅ Complete
// ⏰ Pending
// 🔄 Processing (spinning)
```

### Message Types
```typescript
type MessageRole = 'user' | 'assistant' | 'system'
type MessageStatus = 'sending' | 'sent' | 'error'

interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  status?: MessageStatus
  tools?: AIToolUsage[]
}
```

## 🚀 Development Sequence

1. **Setup Phase** (35 min)
   - Install dependencies
   - Create folder structure
   - Set up base components

2. **Core UI Phase** (3 hours)
   - Layout implementation
   - ChatInterface with Kibo components
   - Basic styling with Tailwind

3. **ThinkingPanel Phase** (2 hours)
   - Component structure
   - Animation setup
   - Real-time updates

4. **Integration Phase** (1.5 hours)
   - WebSocket connection
   - Event handlers
   - Data flow

5. **Polish Phase** (30 min)
   - Animations
   - Error states
   - Final styling

**Total Time: ~7.5 hours**

## 🎨 Styling Guidelines

### Color Variables (from ui_design.md)
```css
:root {
  --bg-main: #1a1a1a;
  --bg-element: #2d2d2d;
  --bg-input: #3a3a3a;
  --border-primary: #4a4a4a;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  
  /* VANA Gradient Colors */
  --accent-blue: #7c9fff;
  --accent-purple: #b794f6;
  --accent-orange: #f6ad55;
  --accent-red: #fc8181;
}
```

### Animations
- Moving gradient border for active elements
- Pulse effects for thinking steps
- Smooth expand/collapse for panels
- Subtle hover states

## 📋 Success Criteria

1. **Minimal Dependencies**: Only socket.io-client and framer-motion added
2. **Kibo UI Integration**: Using AI-specific components throughout
3. **ThinkingPanel Works**: Real-time display of agent activity
4. **Clean Architecture**: Simple component structure, no over-engineering
5. **Dark Theme**: Consistent with VANA brand
6. **Responsive**: Works on desktop (mobile can wait)

## 🚫 Out of Scope (Save for Later)

- Authentication/user management
- Multiple chat sessions
- File uploads
- Voice input
- Mobile optimization
- PWA features
- Offline support
- Internationalization

## Next Immediate Action

Start with Step 1: Install the two minimal dependencies and begin creating the base layout component.