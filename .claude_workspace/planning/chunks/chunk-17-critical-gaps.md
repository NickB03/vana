# Chunk 17: Critical Gap Resolutions

## PRD Section: 23. Critical Gap Resolutions

### Critical Requirements

1. **Canvas Backend Gap**: Progressive enhancement strategy for immediate functionality
2. **SSE Event Corrections**: Updated to actual backend endpoints and event names
3. **Authentication Reality**: Backend JWT system instead of direct Firebase integration
4. **Security Configurations**: Proper CSP for Monaco Editor and WASM support
5. **Model Provider Display**: Show LiteLLM/OpenRouter vs Gemini usage correctly

### Implementation Guide

#### Canvas Progressive Enhancement
```typescript
// Progressive Canvas implementation strategy
- Frontend Canvas works immediately with localStorage
- Agent suggestions trigger Canvas opening via SSE events
- Backend Canvas tools integration when available
- Seamless upgrade path from local to backend storage
- Version history management across storage layers

// Canvas Manager with fallback strategy
class CanvasManager {
  async save(content: string) {
    try {
      // Try backend Canvas API first
      await apiClient.saveCanvas(content)
    } catch (error) {
      // Fallback to localStorage with user notification
      localStorage.setItem('canvas_backup', content)
      showToast('Canvas saved locally - backend unavailable')
    }
  }
}
```

#### SSE Integration Corrections
```typescript
// Corrected SSE endpoint and event handling
- Endpoint: `/agent_network_sse/{sessionId}` (not /chat/stream)
- Events: agent_start, agent_complete, research_sources
- Connection management with automatic reconnection
- Heartbeat handling for connection health
- Proper error handling and user feedback

// SSE Connection with proper event names
class SSEConnection {
  connect(sessionId: string) {
    this.eventSource = new EventSource(
      `${API_URL}/agent_network_sse/${sessionId}`
    )
    
    // Correct event listeners
    this.eventSource.addEventListener('agent_start', this.handleAgentStart)
    this.eventSource.addEventListener('agent_complete', this.handleAgentComplete)
    this.eventSource.addEventListener('research_sources', this.handleResearch)
  }
}
```

### Real Validation Tests

1. **Canvas Fallback**: Backend down → Canvas still functional with localStorage
2. **SSE Reconnection**: Connection drops → Automatic reconnection with backoff
3. **Auth Integration**: Google OAuth → Proper JWT flow through backend
4. **Model Display**: OpenRouter response → Shows "Qwen 3" model badge
5. **CSP Compliance**: Monaco loads → No CSP violations in console

### THINK HARD

- How do you migrate from localStorage Canvas to backend seamlessly?
- What happens to pending SSE events during reconnection?
- How do you handle auth token refresh during long SSE sessions?
- What fallback UI should show when Canvas backend is unavailable?
- How do you test these edge cases and fallback scenarios?

### Component Specifications

#### Progressive Enhancement Manager
```typescript
// lib/progressive/CanvasEnhancement.ts
interface CanvasEnhancementStrategy {
  checkBackendAvailability: () => Promise<boolean>
  migrateLocalToBackend: () => Promise<void>
  syncCanvasState: () => Promise<void>
  handleBackendUnavailable: () => void
}

// Features:
- Backend availability detection
- Seamless migration from local to remote storage
- Conflict resolution for concurrent edits
- User notification of storage layer changes
- Performance optimization for sync operations
```

#### SSE Connection Manager
```typescript
// lib/sse/ConnectionManager.ts
interface SSEConnectionConfig {
  endpoint: string
  reconnectAttempts: number
  heartbeatInterval: number
  reconnectDelay: number
}

// Features:
- Robust reconnection logic with exponential backoff
- Heartbeat monitoring for connection health
- Event buffering during disconnection
- Connection state management and user feedback
- Performance monitoring and metrics collection
```

#### Authentication Bridge
```typescript
// lib/auth/BackendAuthBridge.ts
interface AuthBridgeConfig {
  googleClientId: string
  backendEndpoint: string
  tokenRefreshInterval: number
}

// Features:
- Google OAuth integration with backend JWT
- Automatic token refresh before expiration
- Session synchronization across tabs
- Secure token storage patterns
- Authentication state persistence
```

### What NOT to Do

❌ Don't assume Canvas backend tools exist - implement progressive enhancement
❌ Don't hardcode SSE event names without backend validation
❌ Don't bypass backend auth system for direct Firebase integration
❌ Don't ignore CSP requirements for Monaco Editor and WASM
❌ Don't show incorrect model information to users
❌ Don't implement workarounds that will break when gaps are filled

### Integration Points

- **Canvas System**: Progressive enhancement across storage layers
- **SSE Connection**: Proper event handling with backend reality
- **Authentication**: Backend JWT integration instead of Firebase
- **All Components**: Graceful degradation and enhancement strategies

---

*Implementation Priority: Critical - Ensures working system despite gaps*