# VANA UI Architecture Plan
## Comprehensive Frontend Design with Kibo UI Integration

### Executive Summary

This document outlines the architectural plan for VANA's frontend interface, built on Kibo UI (shadcn-based component library) with React and TypeScript. The architecture emphasizes real-time communication, transparent AI operations through the innovative ThinkingPanel, and a sophisticated dark theme that aligns with VANA's brand identity.

**Key Features:**
- Real-time agent activity visualization
- WebSocket-based live updates
- Kibo UI component integration
- Responsive, accessible design
- Performance-optimized architecture

---

## 1. Technology Stack

### Core Technologies
- **Framework**: React 18+ with TypeScript
- **UI Library**: Kibo UI (built on shadcn/ui)
- **Styling**: Tailwind CSS with custom configuration
- **State Management**: React Context API with custom hooks
- **Real-time**: WebSocket with SSE fallback
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite
- **Animation**: Framer Motion + CSS animations

### Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "kibo-ui": "latest",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.0",
    "axios": "^1.6.0",
    "framer-motion": "^11.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

---

## 2. Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    VANA Frontend                         │
├─────────────────────────────────────────────────────────┤
│  Presentation Layer                                      │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │   Layout    │ │Chat Interface│ │ ThinkingPanel   │  │
│  │  Component  │ │  Components  │ │   Components    │  │
│  └─────────────┘ └──────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  State Management Layer                                  │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │Chat Context │ │Agent Context │ │WebSocket Context│  │
│  └─────────────┘ └──────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  API Integration Layer                                   │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │  REST API   │ │  WebSocket   │ │     SSE         │  │
│  │   Client    │ │   Client     │ │   Fallback      │  │
│  └─────────────┘ └──────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  VANA Backend   │
                    │  (ADK FastAPI)  │
                    └─────────────────┘
```

---

## 3. Component Architecture

### Component Hierarchy
```
App.tsx
├── Providers/
│   ├── ThemeProvider.tsx
│   ├── AuthProvider.tsx
│   ├── WebSocketProvider.tsx
│   └── ChatProvider.tsx
├── Layout/
│   ├── Layout.tsx
│   ├── Sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── Logo.tsx
│   │   ├── Navigation.tsx
│   │   └── AgentStatusList.tsx
│   └── MainContent.tsx
├── Chat/
│   ├── ChatInterface.tsx
│   ├── MessageList.tsx
│   ├── Message.tsx
│   ├── MessageInput.tsx
│   └── TypingIndicator.tsx
└── ThinkingPanel/
    ├── ThinkingPanel.tsx
    ├── ThinkingHeader.tsx
    ├── ThinkingStep.tsx
    └── TimingInfo.tsx
```

### Kibo UI Component Mapping

#### Chat Interface Components
```typescript
// MessageList.tsx
import { ScrollArea } from 'kibo-ui/scroll-area';
import { Card } from 'kibo-ui/card';

// MessageInput.tsx
import { Textarea } from 'kibo-ui/textarea';
import { Button } from 'kibo-ui/button';

// Message.tsx
import { Avatar } from 'kibo-ui/avatar';
import { Badge } from 'kibo-ui/badge';
```

#### ThinkingPanel Components
```typescript
// ThinkingPanel.tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'kibo-ui/collapsible';
import { Progress } from 'kibo-ui/progress';
import { Badge } from 'kibo-ui/badge';
import { Separator } from 'kibo-ui/separator';
import { Tooltip } from 'kibo-ui/tooltip';
```

#### Sidebar Components
```typescript
// Sidebar.tsx
import { Sheet } from 'kibo-ui/sheet';
import { NavigationMenu } from 'kibo-ui/navigation-menu';
import { Card } from 'kibo-ui/card';
import { Badge } from 'kibo-ui/badge';
```

---

## 4. Real-time Communication

### WebSocket Architecture

```typescript
// types/websocket.ts
export interface ThinkingEvent {
  type: 'thinking_start' | 'thinking_step' | 'thinking_complete';
  agentId: string;
  agentName: string;
  step: {
    id: string;
    description: string;
    status: 'active' | 'complete' | 'pending';
    duration?: number;
    details?: string;
  };
  timestamp: number;
}

export interface ChatEvent {
  type: 'message' | 'typing' | 'error';
  data: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: number;
  };
}

// hooks/useWebSocket.ts
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  
  const connect = useCallback(() => {
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.current.onclose = () => {
      setIsConnected(false);
      // Implement reconnection logic
      setTimeout(connect, 5000);
    };
  }, []);
  
  return { isConnected, connect, disconnect };
};
```

### Event Flow
1. User sends message → REST API POST /chat
2. Backend processes → Emits WebSocket events
3. Frontend receives events → Updates ThinkingPanel
4. Final response → Updates chat interface

---

## 5. State Management

### Context Architecture

```typescript
// contexts/ChatContext.tsx
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
}

interface ChatContextValue extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

// contexts/AgentContext.tsx
interface AgentState {
  activeAgent: string | null;
  specialists: Agent[];
  thinkingSteps: ThinkingStep[];
}

// contexts/WebSocketContext.tsx
interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (event: string, handler: Function) => void;
  unsubscribe: (event: string, handler: Function) => void;
}
```

### Data Flow Pattern
```
User Action → Dispatch → Context Update → Component Re-render
     ↓                        ↓
API Call → WebSocket Event → State Update
```

---

## 6. Theme System

### VANA Theme Configuration

```typescript
// theme/vana-theme.ts
export const vanaTheme = {
  extend: {
    colors: {
      background: {
        DEFAULT: '#1a1a1a',
        element: '#2d2d2d',
        input: '#3a3a3a',
      },
      border: {
        DEFAULT: '#4a4a4a',
      },
      primary: {
        DEFAULT: '#7c9fff',
        foreground: '#ffffff',
      },
      secondary: {
        DEFAULT: '#b794f6',
        foreground: '#ffffff',
      },
      accent: {
        orange: '#f6ad55',
        red: '#fc8181',
      },
      muted: {
        DEFAULT: '#3a3a3a',
        foreground: '#a0a0a0',
      },
    },
    backgroundImage: {
      'gemini-gradient': 'linear-gradient(135deg, #7c9fff 0%, #b794f6 35%, #fc8181 70%, #f6ad55 100%)',
    },
    animation: {
      'border-spin': 'border-spin 3s linear infinite',
      'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
    },
  },
};

// CSS animations
@keyframes border-spin {
  0% { --angle: 0deg; }
  100% { --angle: 360deg; }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

### Gradient Border Implementation
```css
.gradient-border {
  --angle: 0deg;
  border: 2px solid;
  border-image: conic-gradient(
    from var(--angle),
    #7c9fff,
    #b794f6,
    #fc8181,
    #f6ad55,
    #7c9fff
  ) 1;
  animation: border-spin 3s linear infinite;
}
```

---

## 7. API Integration

### API Client Setup

```typescript
// api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle authentication error
    }
    return Promise.reject(error);
  }
);
```

### API Endpoints

```typescript
// api/chat.ts
export const chatAPI = {
  sendMessage: async (message: string) => {
    const response = await apiClient.post('/chat', { message });
    return response.data;
  },
  
  getHistory: async (sessionId: string) => {
    const response = await apiClient.get(`/chat/history/${sessionId}`);
    return response.data;
  },
};

// api/agents.ts
export const agentsAPI = {
  getAgents: async () => {
    const response = await apiClient.get('/agents');
    return response.data;
  },
  
  getAgentStatus: async (agentId: string) => {
    const response = await apiClient.get(`/agents/${agentId}/status`);
    return response.data;
  },
};
```

---

## 8. Performance Optimization

### Optimization Strategies

1. **Component Memoization**
```typescript
// Memoize expensive components
export const Message = React.memo(({ message }: MessageProps) => {
  // Component implementation
});

// Use useMemo for expensive computations
const processedSteps = useMemo(() => 
  thinkingSteps.filter(step => step.status === 'complete'),
  [thinkingSteps]
);
```

2. **Lazy Loading**
```typescript
// Lazy load heavy components
const ThinkingPanel = lazy(() => import('./ThinkingPanel'));
const AgentDetails = lazy(() => import('./AgentDetails'));
```

3. **Virtual Scrolling**
```typescript
// Use react-window for long message lists
import { FixedSizeList } from 'react-window';
```

4. **WebSocket Optimization**
- Debounce rapid updates
- Batch state updates
- Use message queuing

---

## 9. Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup with Vite + React + TypeScript
- [ ] Kibo UI integration and theme configuration
- [ ] Basic layout components (Layout, Sidebar)
- [ ] Context providers setup

### Phase 2: Core Features (Week 3-4)
- [ ] Chat interface implementation
- [ ] Message input and display
- [ ] API client integration
- [ ] Basic WebSocket connection

### Phase 3: ThinkingPanel (Week 5-6)
- [ ] ThinkingPanel component structure
- [ ] Real-time update integration
- [ ] Animation implementation
- [ ] Status indicators and timing

### Phase 4: Polish & Optimization (Week 7-8)
- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] Accessibility improvements
- [ ] Testing implementation

---

## 10. Testing Strategy

### Testing Approach

1. **Unit Tests** (Jest + React Testing Library)
   - Component rendering
   - Hook functionality
   - Utility functions

2. **Integration Tests**
   - API communication
   - WebSocket events
   - Context updates

3. **E2E Tests** (Playwright)
   - User flows
   - Real-time features
   - Error scenarios

### Example Test
```typescript
// __tests__/ThinkingPanel.test.tsx
describe('ThinkingPanel', () => {
  it('should display thinking steps in real-time', async () => {
    const { getByText } = render(<ThinkingPanel />);
    
    // Simulate WebSocket event
    act(() => {
      mockWebSocket.emit('thinking_step', {
        step: { description: 'Analyzing request' }
      });
    });
    
    expect(getByText('Analyzing request')).toBeInTheDocument();
  });
});
```

---

## 11. Deployment Configuration

### Environment Variables
```env
VITE_API_URL=https://api.vana.ai
VITE_WS_URL=wss://api.vana.ai/ws
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'kibo-ui': ['kibo-ui'],
          'vendor': ['react', 'react-dom'],
        },
      },
    },
  },
});
```

---

## Conclusion

This architectural plan provides a comprehensive foundation for building VANA's frontend interface. The combination of Kibo UI's component library, React's powerful ecosystem, and thoughtful real-time architecture will create an engaging and transparent AI interaction experience.

The key innovation—the ThinkingPanel—will set VANA apart by providing users with unprecedented visibility into AI decision-making processes, while the sophisticated dark theme and smooth animations create a premium user experience.

### Next Steps
1. Set up the development environment
2. Implement the foundation components
3. Establish WebSocket communication
4. Build the ThinkingPanel MVP
5. Iterate based on user feedback