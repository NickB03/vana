# Frontend Rebuild Clean Slate - Specification

## Project Overview

**Vana** is a personal project being built to enterprise standards as a multi-agent AI research platform built on Google's Agent Development Kit (ADK). The current implementation has a robust FastAPI backend with 8 specialized AI agents, but the frontend is being rebuilt from a clean slate using modern React patterns and shadcn/ui components.

## Current Backend Architecture Analysis

### Core Backend Components
- **FastAPI Server** (`app/server.py`) - Main API gateway with SSE streaming
- **Authentication System** (`app/auth/`) - OAuth2/JWT with multiple providers
- **Agent System** (`app/agent.py`, `app/research_agents.py`) - 8 specialized AI agents
- **Real-time Broadcasting** (`app/utils/sse_broadcaster.py`) - Server-Sent Events
- **Session Management** - Google Cloud Storage backed persistence
- **Monitoring** (`app/monitoring/`) - Comprehensive metrics and alerting

### Key API Endpoints
- `POST /api/run_sse` - Main research execution with streaming
- `GET/POST /api/apps/{app}/users/{user}/sessions` - Session management
- `POST /auth/login` - Authentication endpoints
- `GET /health` - Health check and status

### AI Model Configuration
- **Primary**: OpenRouter + Qwen 3 Coder (free tier)
- **Fallback**: Google Gemini 2.5 Pro/Flash
- **Automatic switching** based on API key availability

## Frontend Requirements

### Functional Requirements

#### Core Features
1. **Chat Interface**
   - Input form for user prompts to Vana
   - Real-time progress tracking via SSE
   - Agent status and progress visualization
   - Results display in chat with citations and sources

2. **Authentication Flow**
   - Multiple auth providers (OAuth2, JWT)
   - User session persistence
   - Role-based access control

3. **Real-time Experience**
   - Live updates during task execution
   - Agent progress visualization
   - Stream reconnection and error handling

4. **Session Management**
   - Resume interrupted chat sessions
   - Session history and management
   - Export capabilities

#### User Experience Requirements
1. **Responsive Design**
   - Mobile-first approach
   - Desktop optimization
   - Touch-friendly interactions

2. **Accessibility**
   - WCAG 2.1 AA compliance
   - Screen reader compatibility
   - Keyboard navigation

3. **Performance**
   - Initial load < 3 seconds
   - Smooth animations (60fps)
   - Efficient memory usage

### Technical Requirements

#### Technology Stack
- **Framework**: React 18+ with TypeScript
- **UI Library**: shadcn/ui components via CLI and MCP tools
- **Component Library**: Prompt-Kit (shadcn registry) https://www.prompt-kit.com/llms-full.txt
- **Icons**: Lucide React
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand or React Query
- **Real-time**: EventSource API for SSE
- **Build Tool**: Turbopack
- **Testing**: React Testing Library

#### Component Installation Commands

**Prompt-Kit Components (AI-optimized chat interfaces):**
```bash
# Core chat components
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"

# Additional Prompt-Kit components
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-suggestion.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/scroll-button.json"
```

**shadcn/ui Components (Standard UI elements):**
```bash
# Essential UI components
npx shadcn@latest add avatar
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add separator
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add toast
npx shadcn@latest add alert
```

#### Installation Validation

```bash
# Verify component installation
ls components/ui/ # Should show installed components

# Check for required dependencies
npm list @radix-ui/react-avatar
npm list lucide-react
npm list class-variance-authority

# Test component imports
echo "import { Button } from '@/components/ui/button'" | npx tsc --noEmit --stdin
```

#### Architecture Patterns
- **Component Structure**: Atomic design principles
- **Data Flow**: Unidirectional data flow
- **Error Boundaries**: Comprehensive error handling
- **Code Splitting**: Route-based lazy loading

#### Integration Requirements
- **API Integration**: RESTful API with TypeScript SDK
- **Authentication**: JWT token management & oauth
- **Real-time Streaming**: SSE connection management
- **File Handling**: Upload/download capabilities

### Non-Functional Requirements

#### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 1MB gzipped
- **Lighthouse Score**: > 90

#### Security Requirements
- **HTTPS Only**: All communications encrypted
- **XSS Protection**: Content Security Policy
- **CSRF Protection**: Token-based validation
- **Input Sanitization**: All user inputs validated

#### Scalability Requirements
- **Concurrent Users**: Support 1000+ simultaneous users
- **SSE Connections**: Handle 500+ concurrent streams
- **Graceful Degradation**: Function without real-time features

## Constraints and Assumptions

### Technical Constraints
- Must integrate with existing FastAPI backend
- Must support existing authentication flows
- Must maintain backward compatibility with API
- No changes to backend required initially

### Assumptions
- Backend API remains stable during development
- Google Cloud infrastructure continues as-is
- OpenRouter API remains available
- No major dependency version conflicts

## Success Criteria

### Must-Have (P0)
- ✅ Complete agent workflow (query → plan → execution → results)
- ✅ Real-time streaming with progress visualization
- ✅ Authentication and session management
- ✅ Responsive design (mobile + desktop)
- ✅ Basic accessibility compliance

### Should-Have (P1)
- ✅ Advanced session management (history, export)
- ✅ Comprehensive error handling and recovery
- ✅ Performance optimization (< 3s load time)
- ✅ Offline capabilities (cached sessions)
- ✅ Advanced accessibility features

### Could-Have (P2)
- ✅ Advanced analytics and monitoring
- ✅ Customizable UI themes
- ✅ Collaborative features
- ✅ Advanced export formats
- ✅ Plugin architecture

## Risk Assessment

### High Risk
- **SSE Connection Stability**: Network issues affecting real-time features
- **Authentication Complexity**: Multiple auth providers integration
- **Performance**: Large result sets affecting UI responsiveness

### Medium Risk
- **Browser Compatibility**: EventSource API support variations
- **State Management**: Complex async state synchronization
- **Testing**: Integration testing with streaming APIs

### Low Risk
- **UI Components**: shadcn/ui library maturity
- **Build Process**: Vite toolchain stability
- **TypeScript**: Type safety and development experience

## Installation Prerequisites

### Pre-Installation Setup
```bash
# Ensure Tailwind CSS v4 is properly configured
npx tailwindcss --version # Should be v4.x

# Verify Next.js/React setup
npm list react react-dom
npm list next # If using Next.js

# Install shadcn/ui CLI if not already installed
npm install -g @shadcn/ui
```

### Component Installation Troubleshooting

**Common Issues:**
- **Registry URL errors**: Ensure URLs are exactly as specified with quotes
- **Missing dependencies**: Run `npm install` after component installation
- **TypeScript errors**: Verify `@/components/ui` path alias is configured
- **Style conflicts**: Check for conflicting CSS frameworks

## Next Steps

1. **Component Architecture Design** - Define component hierarchy and data flow
2. **Authentication Flow Design** - Map authentication states and transitions  
3. **Real-time Implementation** - Design SSE connection management
4. **Responsive UI Patterns** - Create design system with shadcn/ui
5. **Testing Strategy** - Define comprehensive testing approach