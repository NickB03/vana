# Frontend Architecture Documentation

## Overview

The Vana frontend is a modern React application built with TypeScript, featuring a mobile-first design approach and real-time AI interaction capabilities. It provides an intuitive interface for multi-agent research workflows with advanced UI components and responsive design patterns.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom design tokens
- **Animation**: Framer Motion for smooth transitions and interactions
- **State Management**: React Context API with custom hooks
- **Testing**: Vitest for unit testing, React Testing Library for component testing
- **Code Quality**: ESLint for linting, TypeScript for type checking

## Architecture Principles

### Mobile-First Design
- Responsive bottom sheet thinking panel
- Touch-optimized interactions
- Adaptive layouts for different screen sizes
- Progressive disclosure to reduce cognitive load

### Real-time Communication
- Server-Sent Events (SSE) for streaming updates
- WebSocket support for bidirectional communication
- Automatic reconnection and connection health monitoring
- Live thinking step visualization

### Component Architecture
- Atomic design principles with reusable UI components
- Custom AI-specific components (ContextualLoading, AgentProgress, MessageActions)
- Consistent design system with standardized tokens
- Accessibility-first approach with ARIA support

## Project Structure

```
frontend/
├── public/                     # Static assets
├── src/
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   │   ├── ContextualLoading.tsx
│   │   │   ├── kibo-ui/      # AI-specific components
│   │   │   └── ...
│   │   ├── AgentProgress.tsx  # Agent visualization
│   │   ├── MessageActions.tsx # Message interaction
│   │   └── ...
│   ├── contexts/             # React Context providers
│   │   ├── AppContext.tsx
│   │   ├── SSEContext.tsx
│   │   └── ...
│   ├── hooks/                # Custom React hooks
│   │   ├── useSSE.ts
│   │   └── ...
│   ├── services/             # API and service layer
│   │   ├── adk-client.ts
│   │   ├── sse-manager.ts
│   │   └── ...
│   ├── types/                # TypeScript definitions
│   └── utils/                # Utility functions
├── docs/                     # Component documentation
└── test/                     # Test utilities and specs
```

## Core Components

### ContextualLoading Component

**Purpose**: Provides phase-specific loading states with contextual messaging and progress tracking.

**Features**:
- Phase-aware messaging (Planning → Researching → Evaluating → Composing)
- Progress tracking with time estimates
- Animated state transitions
- Support for both determinate and indeterminate progress

**Usage**:
```tsx
<ContextualLoading 
  phase="researching"
  currentActivity="Searching for relevant sources..."
  estimatedTime={45}
  elapsedTime={12}
  agentName="section_researcher"
  showEstimate={true}
/>
```

**Phases**:
- `planning`: Research strategy development
- `researching`: Information gathering
- `evaluating`: Quality assessment
- `composing`: Report writing
- `processing`: General processing
- `idle`: Ready state

### AgentProgress Component

**Purpose**: Visualizes multi-agent activity with grouped progress tracking.

**Features**:
- Grouped agent activity display
- Collapsible detail levels (minimal, summary, detailed)
- Real-time status indicators
- Progress bars and confidence scoring

**Usage**:
```tsx
<AgentProgress 
  steps={thinkingSteps}
  detailLevel="summary"
  onDetailLevelChange={setDetailLevel}
/>
```

**Detail Levels**:
- `minimal`: Count-based summary
- `summary`: Agent cards with progress
- `detailed`: Full activity breakdown

### MessageActions Component

**Purpose**: Provides interaction capabilities for AI responses.

**Features**:
- Copy message content to clipboard
- Regenerate response functionality
- Feedback collection (positive/negative)
- Share via native browser API
- Download/save as text file

**Usage**:
```tsx
<MessageActions 
  content={message.content}
  messageId={message.id}
  onCopy={() => console.log('Copied')}
  onRegenerate={() => regenerateResponse()}
  onFeedback={(type, feedback) => submitFeedback(type, feedback)}
  isVisible={isHovered}
/>
```

## State Management

### Context Architecture

#### AppContext
- Global application state
- User preferences and settings
- Theme and UI configuration

#### SSEContext  
- Server-Sent Events connection management
- Real-time message streaming
- Connection health monitoring

#### SessionContext
- Session management and persistence
- Conversation history
- User authentication state

### Custom Hooks

#### useSSE
- SSE connection lifecycle management
- Event parsing and message handling
- Automatic reconnection logic

#### useElapsedTime
- Time tracking for loading states
- Phase duration measurement
- Progress calculation utilities

## Performance Optimizations

### Connection Management
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Timeout Handling**: Request timeouts with graceful failure modes
- **Health Monitoring**: Automatic connection health checks

### Resource Optimization
- **Code Splitting**: Lazy loading of components and routes
- **Memory Management**: Proper cleanup of event listeners and timers
- **Bundle Optimization**: Tree shaking and dead code elimination

### User Experience
- **Loading States**: Contextual loading with progress indication
- **Error Boundaries**: Graceful error handling and recovery
- **Accessibility**: Screen reader support and keyboard navigation

## Configuration

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:8000    # Backend API URL
VITE_APP_NAME=app                     # App name for API endpoints
VITE_ENVIRONMENT=development          # Environment setting

# Performance Configuration  
VITE_MAX_RETRIES=5                    # Maximum retry attempts
VITE_RETRY_DELAY=1000                 # Delay between retries (ms)
VITE_TIMEOUT=30000                    # Request timeout (ms)
VITE_ENABLE_LOGGING=true              # Enable debug logging
```

### Development Setup

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   # Or from project root: make dev-frontend
   ```

4. **Run Tests**:
   ```bash
   npm run test
   npm run test:coverage
   ```

## Design System

### Color Tokens
```css
:root {
  --vana-primary: #2563eb;
  --vana-success: #10b981;
  --accent-blue: #3b82f6;
  --accent-purple: #8b5cf6;
  --accent-orange: #f59e0b;
  --accent-red: #ef4444;
  
  --bg-primary: #0f0f0f;
  --bg-element: #1a1a1a;
  --bg-input: #262626;
  
  --text-primary: #ffffff;
  --text-secondary: #a3a3a3;
  --border-primary: #404040;
}
```

### Spacing Scale
- `xs`: 0.25rem (4px)
- `sm`: 0.5rem (8px)  
- `md`: 1rem (16px)
- `lg`: 1.5rem (24px)
- `xl`: 2rem (32px)
- `2xl`: 3rem (48px)

### Animation Standards
- **Duration**: 200ms for micro-interactions, 300ms for larger transitions
- **Easing**: `ease-out` for entering, `ease-in` for exiting
- **Motion**: Respect user's motion preferences

## Testing Strategy

### Component Testing
- **Unit Tests**: Individual component behavior
- **Integration Tests**: Component interaction and data flow
- **Accessibility Tests**: Screen reader and keyboard navigation

### Performance Testing
- **Loading Performance**: Measure loading state accuracy
- **Memory Leaks**: Monitor for proper cleanup
- **Connection Resilience**: Test retry and reconnection logic

### Mobile Testing
- **Touch Interactions**: Gesture handling and responsiveness
- **Viewport Adaptation**: Different screen sizes and orientations
- **Performance**: Mobile-specific performance characteristics

## Deployment Considerations

### Build Optimization
- **Bundle Analysis**: Monitor bundle size and dependencies
- **Asset Optimization**: Image compression and lazy loading
- **Caching Strategy**: Appropriate cache headers for static assets

### Production Configuration
- **Environment Variables**: Production-specific settings
- **Error Reporting**: Client-side error tracking
- **Analytics**: User interaction tracking (if applicable)

### Monitoring
- **Performance Metrics**: Core Web Vitals tracking
- **Error Tracking**: Client-side error monitoring
- **User Experience**: Real user monitoring (RUM)

## Contributing Guidelines

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Follow established linting rules
- **Prettier**: Consistent code formatting
- **Naming**: Use descriptive names for components and functions

### Component Development
- **Props Interface**: Always define TypeScript interfaces for props
- **Documentation**: Include JSDoc comments for complex logic
- **Testing**: Write tests for new components and features
- **Accessibility**: Include ARIA labels and keyboard support

### Git Workflow
- **Feature Branches**: Create feature branches for new development
- **Commit Messages**: Use conventional commit format
- **Pull Requests**: Include description and test results
- **Code Review**: Peer review for all changes

## Future Enhancements

### Planned Features
- **Offline Support**: Service worker for offline functionality
- **Theme System**: Multiple theme options and customization
- **Advanced Analytics**: Detailed user interaction tracking
- **Internationalization**: Multi-language support

### Technical Improvements
- **Performance**: Further bundle optimization and lazy loading
- **Accessibility**: Enhanced screen reader support
- **Testing**: Increased test coverage and E2E testing
- **Documentation**: Interactive component playground

---

*For more information about specific components or implementation details, see the individual component documentation files in the `/docs` directory.*