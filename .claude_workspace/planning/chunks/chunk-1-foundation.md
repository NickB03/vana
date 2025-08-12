# Chunk 1: Foundation (Lines 1-196)

## 🚨 CRITICAL: This is the FOUNDATION chunk - everything depends on this

### Extracted PRD Content (Lines 1-196)

```
# Vana Frontend PRD – Complete Build Specification (FINAL)

**Version:** 2.0 FINAL  
**Date:** 2025-08-11  
**Status:** Production-Ready  
**Purpose:** Complete, accurate, and actionable product requirements document for Vana AI frontend rebuild, validated by multi-specialist review and aligned with existing backend implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
[... complete table of contents ...]

---

## 1. Executive Summary

### 1.1 Product Vision
Vana is a multi-agent AI platform built on Google's Agent Development Kit (ADK) that differentiates itself through:
- **Progressive Canvas System**: Frontend-first implementation that works immediately, enhances with backend
- **Multi-agent orchestration**: Real-time visualization via Agent Task Deck
- **Research Integration**: Brave Search API with confidence scoring
- **shadcn/ui foundation**: Enterprise-grade, accessible components
- **Dark-theme primary**: Professional interface matching Gemini/Claude aesthetic

### 1.2 Core Features
- Conversational AI chat with SSE token streaming
- Progressive Canvas with four modes (Markdown, Code, Web, Sandbox)
- Agent Task Deck for multi-agent workflow visualization
- File upload with intelligent .md routing to Canvas
- Session persistence with GCS backup
- JWT-based authentication with Google OAuth support

### 1.3 Technical Foundation
- **Frontend**: React + Next.js 14 (App Router)
- **Backend**: Google ADK with FastAPI (existing, functional)
- **Streaming**: Server-Sent Events via `/agent_network_sse/{sessionId}`
- **LLM Provider**: LiteLLM/OpenRouter (primary) with Gemini fallback
- **State**: Zustand with modular stores and persistence
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Monitoring**: OpenTelemetry, Cloud Trace, BigQuery
- **Session Storage**: SQLite with GCS backup (dev), Cloud Run persistence (prod)

### 1.4 Critical Resolutions
- **Canvas Gap**: Frontend-first implementation, no backend dependency
- **SSE Endpoints**: Corrected to actual backend paths
- **Security**: CSP configuration for Monaco Editor
- **Testing**: Comprehensive strategy from unit to E2E

---

## 2. Technology Stack

### 2.1 Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 14+ | React framework with App Router |
| UI Components | shadcn/ui | Latest | Radix-based accessible components |
| Styling | Tailwind CSS | 3.x | Utility-first CSS framework |
| State Management | Zustand | 4.x | Lightweight state with TypeScript |
| Authentication | JWT + Google OAuth | - | Backend JWT with Google identity |
| Code Editor | Monaco Editor | Latest | VS Code editor in browser |
| Markdown | react-markdown | 9.x | Markdown rendering with remark-gfm |
| Animation | Framer Motion | 11.x | Smooth transitions and micro-animations |
| Icons | lucide-react | Latest | Consistent icon set |
| SSE Client | EventSource | Native | Server-sent events for streaming |
| Sanitization | DOMPurify | Latest | XSS prevention for user content |

### 2.2 Development Tools

| Tool | Purpose | Configuration |
|------|---------|--------------|
| TypeScript | Type safety | Strict mode enabled |
| ESLint | Code quality | Airbnb config + custom rules |
| Prettier | Code formatting | 2 spaces, single quotes |
| Vitest | Unit testing | Coverage target: 80% |
| Playwright | E2E testing | Multi-browser support |
| MSW | API mocking | Development and testing |
| Lighthouse | Performance | CI/CD integration |

---

## 3. Architecture Overview

### 3.1 Application Structure

```
/app                       # Next.js 14 App Router
  /auth                   # Authentication pages
    page.tsx             # Combined login/register
  /chat                  # Main application
    page.tsx            # Chat interface with Canvas
  /api                  # API route handlers
    /auth              # Auth endpoints proxy
  layout.tsx           # Root layout with providers
  page.tsx            # Homepage/landing

/components
  /ui                  # shadcn/ui components
  /chat               # Chat-specific components
    MessageList.tsx
    MessageInput.tsx
    AgentMessage.tsx
  /canvas             # Canvas system
    CanvasEditor.tsx
    CanvasToolbar.tsx
    CanvasVersions.tsx
  /agent              # Agent visualization
    AgentTaskDeck.tsx
    AgentPipeline.tsx
    InlineTaskList.tsx
  /upload            # File upload
    FileUploader.tsx
    FilePreview.tsx
  /session          # Session management
    SessionSidebar.tsx
    SessionCard.tsx

/stores              # Zustand state management
  authStore.ts
  sessionStore.ts
  chatStore.ts
  canvasStore.ts
  uploadStore.ts
  agentDeckStore.ts
  uiStore.ts

/lib
  /api              # API client
    client.ts
    types.ts
  /sse             # SSE handling
    connection.ts
    handlers.ts
    reconnection.ts
  /canvas          # Canvas utilities
    converters.ts
    versions.ts
  /hooks          # Custom React hooks
    useSSE.ts
    useCanvas.ts
    useAuth.ts
  /utils          # Utilities
    sanitize.ts
    format.ts
```

### 3.2 Data Flow Architecture

```
User Input → Frontend State → API Request → ADK Backend
                                    ↓
                              Agent Processing
                                    ↓
Canvas Update ← SSE Stream ← Agent Response
     ↓              ↓              ↓
   UI Update   Task Updates  Research Sources
```

### 3.3 Progressive Enhancement Strategy

```typescript
// Canvas works immediately on frontend
Frontend Canvas → Local Storage → User Editing
                        ↓
                  Backend Ready?
                   /          \
                 No            Yes
                 ↓              ↓
           Continue Local   Sync with Backend
```
```

## Critical Requirements & Guardrails

### 🔴 ABSOLUTE REQUIREMENTS
1. **NO PACKAGE BLOAT**: Only install packages listed in PRD Technology Stack
2. **GOOGLE GEMINI STYLE**: Dark theme with precise color matching
3. **Progressive Canvas**: Must work without backend dependency
4. **shadcn/ui ONLY**: No other UI libraries allowed
5. **Next.js 14 App Router**: No Pages Router usage
6. **TypeScript Strict**: All files must be TypeScript with strict types

### 🟡 CRITICAL GUARDRAILS
- No custom CSS files - only Tailwind utilities
- No inline styles - use className with Tailwind
- No component libraries except shadcn/ui
- No state libraries except Zustand
- File structure MUST match PRD exactly

### 🟢 SUCCESS CRITERIA
- All files in correct directories
- TypeScript compiles without errors
- ESLint passes with zero warnings
- Prettier formatting applied
- Dark theme renders correctly

## Step-by-Step Implementation Guide

### Phase 1: Project Initialization (30 minutes)

1. **Initialize Next.js Project**
   ```bash
   npx create-next-app@latest vana-frontend --typescript --tailwind --eslint --app --no-src-dir
   cd vana-frontend
   ```

2. **Install Core Dependencies**
   ```bash
   # UI Framework
   npx shadcn-ui@latest init
   
   # State Management & Utilities
   npm install zustand immer
   npm install react-markdown remark-gfm
   npm install framer-motion
   npm install lucide-react
   npm install dompurify @types/dompurify
   
   # Development Tools
   npm install -D @types/node @typescript-eslint/eslint-plugin
   npm install -D vitest @vitejs/plugin-react jsdom
   npm install -D @playwright/test
   npm install -D msw
   ```

3. **Setup shadcn/ui Configuration**
   ```json
   // components.json
   {
     "style": "default",
     "rsc": true,
     "tsx": true,
     "tailwind": {
       "config": "tailwind.config.ts",
       "css": "app/globals.css",
       "baseColor": "slate",
       "cssVariables": true
     },
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/utils"
     }
   }
   ```

### Phase 2: Project Structure Setup (45 minutes)

4. **Create Directory Structure**
   ```bash
   mkdir -p app/{auth,chat,api/auth}
   mkdir -p components/{ui,chat,canvas,agent,upload,session}
   mkdir -p stores
   mkdir -p lib/{api,sse,canvas,hooks,utils}
   ```

5. **Setup Tailwind Configuration**
   ```typescript
   // tailwind.config.ts
   export default {
     darkMode: 'class',
     content: [
       './pages/**/*.{ts,tsx}',
       './components/**/*.{ts,tsx}',
       './app/**/*.{ts,tsx}',
       './src/**/*.{ts,tsx}',
     ],
     theme: {
       extend: {
         colors: {
           background: '#131314',
           foreground: '#E3E3E3',
           card: {
             DEFAULT: '#1E1F20',
             foreground: '#E3E3E3'
           },
           primary: {
             DEFAULT: '#3B82F6',
             foreground: '#FFFFFF'
           },
           muted: {
             DEFAULT: '#2A2B2C',
             foreground: '#9CA3AF'
           },
           accent: {
             DEFAULT: '#8B5CF6',
             foreground: '#FFFFFF'
           }
         }
       }
     }
   }
   ```

6. **Setup TypeScript Configuration**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "target": "ES2017",
       "lib": ["dom", "dom.iterable", "ES6"],
       "allowJs": true,
       "skipLibCheck": true,
       "strict": true,
       "noEmit": true,
       "esModuleInterop": true,
       "module": "esnext",
       "moduleResolution": "bundler",
       "resolveJsonModule": true,
       "isolatedModules": true,
       "jsx": "preserve",
       "incremental": true,
       "plugins": [
         {
           "name": "next"
         }
       ],
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"]
       }
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

### Phase 3: Core Foundation Files (60 minutes)

7. **Root Layout with Dark Theme**
   ```typescript
   // app/layout.tsx
   import './globals.css'
   import type { Metadata } from 'next'
   import { Inter } from 'next/font/google'
   
   const inter = Inter({ subsets: ['latin'] })
   
   export const metadata: Metadata = {
     title: 'Vana - AI Agent Development Platform',
     description: 'Multi-agent AI platform built on Google ADK'
   }
   
   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <html lang="en" className="dark">
         <body className={`${inter.className} bg-background text-foreground`}>
           {children}
         </body>
       </html>
     )
   }
   ```

8. **Global CSS with Dark Theme**
   ```css
   /* app/globals.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   
   @layer base {
     :root {
       --background: 19 19 20;
       --foreground: 227 227 227;
       --card: 30 31 32;
       --card-foreground: 227 227 227;
       --popover: 19 19 20;
       --popover-foreground: 227 227 227;
       --primary: 59 130 246;
       --primary-foreground: 255 255 255;
       --secondary: 42 43 44;
       --secondary-foreground: 227 227 227;
       --muted: 42 43 44;
       --muted-foreground: 156 163 175;
       --accent: 139 92 246;
       --accent-foreground: 255 255 255;
       --destructive: 239 68 68;
       --destructive-foreground: 255 255 255;
       --border: 42 43 44;
       --input: 42 43 44;
       --ring: 59 130 246;
       --radius: 0.5rem;
     }
   }
   
   @layer base {
     * {
       @apply border-border;
     }
     body {
       @apply bg-background text-foreground;
     }
   }
   ```

9. **Install Required shadcn/ui Components**
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   npx shadcn-ui@latest add input
   npx shadcn-ui@latest add label
   npx shadcn-ui@latest add tabs
   npx shadcn-ui@latest add textarea
   npx shadcn-ui@latest add scroll-area
   npx shadcn-ui@latest add dropdown-menu
   npx shadcn-ui@latest add progress
   npx shadcn-ui@latest add badge
   npx shadcn-ui@latest add tooltip
   npx shadcn-ui@latest add resizable
   ```

## 🧠 THINK HARD Instructions

Before implementing ANY component:

1. **Stop and Read**: Re-read the exact PRD section 3 times
2. **Question Everything**: Is this component absolutely necessary for the Foundation?
3. **Progressive Enhancement**: Will this work without the backend?
4. **Dark Theme First**: Does this look like Google Gemini?
5. **TypeScript Strict**: Are all types defined and exported?
6. **No Shortcuts**: Are you following the exact file structure?
7. **shadcn/ui Only**: Are you using ONLY the approved components?

### Extended Reasoning Prompts:
- "What would happen if the backend is completely offline?"
- "How does this component contribute to the Progressive Canvas vision?"
- "Is this component accessible to screen readers?"
- "Will this component perform well with 1000+ messages?"
- "Does this component match the exact Gemini dark theme colors?"

## EXACT shadcn/ui Components for Chunk 1

### Required Components:
```bash
button     # Navigation, actions
card       # Content containers
input      # Form inputs
label      # Form labels
tabs       # Navigation tabs
textarea   # Text input areas
scroll-area # Scrollable content
dropdown-menu # Context menus
progress   # Loading states
badge      # Status indicators
tooltip    # Help text
resizable  # Layout panels
```

### Forbidden Components:
- Any component not listed above
- Custom UI libraries
- Material-UI, Ant Design, etc.
- Custom CSS components

## Real Validation Tests

### Test 1: Project Structure Validation
```bash
# Run after setup
find . -name "*.tsx" -o -name "*.ts" | grep -E "(app|components|stores|lib)" | sort
# Should match PRD structure exactly
```

### Test 2: TypeScript Compilation
```bash
npx tsc --noEmit
# Must pass with zero errors
```

### Test 3: Dark Theme Validation
```bash
# Start dev server
npm run dev
# Navigate to localhost:3000
# Background should be #131314
# Text should be #E3E3E3
```

### Test 4: Dependency Audit
```bash
npm ls --depth=0
# Should only show PRD-approved packages
```

### Test 5: ESLint Clean
```bash
npm run lint
# Must show 0 warnings, 0 errors
```

## What NOT to Do

### 🚫 FORBIDDEN ACTIONS:
1. **NO** custom CSS files beyond globals.css
2. **NO** inline styles with style prop
3. **NO** component libraries other than shadcn/ui
4. **NO** state management other than Zustand
5. **NO** routing other than Next.js App Router
6. **NO** light theme implementation
7. **NO** backend dependencies in components
8. **NO** hardcoded API URLs
9. **NO** non-TypeScript files
10. **NO** console.log statements in production code

### 🚫 COMMON MISTAKES:
- Installing extra packages "just in case"
- Using `any` type instead of proper TypeScript
- Creating components in wrong directories
- Not following naming conventions
- Skipping accessibility attributes
- Ignoring responsive design
- Not implementing loading states
- Missing error boundaries

### 🚫 ANTI-PATTERNS:
- Prop drilling instead of proper state management
- Mixing styles systems (CSS + Tailwind)
- Creating unnecessary abstraction layers
- Not following the Progressive Enhancement strategy
- Implementing backend-dependent features first

## Success Completion Criteria

✅ **Foundation is complete when:**
1. All directories exist per PRD structure
2. TypeScript compiles without errors
3. Dark theme renders correctly
4. All shadcn/ui components installed
5. ESLint and Prettier configured
6. No forbidden packages installed
7. Project starts without errors
8. Responsive layout foundation works
9. All validation tests pass
10. Ready for Chunk 2 implementation

---

**Remember**: This Foundation chunk is the bedrock. Everything else builds on this. Take time to get it perfect - rushing here will cause cascading failures in all subsequent chunks.