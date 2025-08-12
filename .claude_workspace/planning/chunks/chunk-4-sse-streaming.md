# Chunk 4: SSE Streaming System (SSE Implementation Sections)

## 🌊 CRITICAL: Real-time communication backbone - this enables all agent features

### Extracted PRD Content (SSE Sections from Multiple Areas)

```
### 7.1 SSE Integration (Corrected Backend Endpoint)

```typescript
// lib/sse/connection.ts
export class SSEConnection {
  private eventSource: EventSource | null = null
  private sessionId: string
  private reconnectAttempts = 0
  
  connect(sessionId: string) {
    this.sessionId = sessionId
    
    // Use actual backend endpoint
    this.eventSource = new EventSource(
      `${API_URL}/agent_network_sse/${sessionId}`
    )
    
    this.setupEventHandlers()
    this.setupErrorHandling()
  }
  
  private setupEventHandlers() {
    // Connection event
    this.eventSource?.addEventListener('connection', (e) => {
      const data = JSON.parse(e.data)
      console.log('SSE connected:', data.sessionId)
    })
    
    // Heartbeat (every 30s from backend)
    this.eventSource?.addEventListener('heartbeat', (e) => {
      // Reset reconnect attempts on successful heartbeat
      this.reconnectAttempts = 0
    })
    
    // Agent events
    this.eventSource?.addEventListener('agent_start', (e) => {
      const data = JSON.parse(e.data)
      agentDeckStore.addAgent(data)
    })
    
    this.eventSource?.addEventListener('agent_complete', (e) => {
      const data = JSON.parse(e.data)
      agentDeckStore.updateAgent(data.agentId, { status: 'complete' })
    })
    
    // Research sources (from Brave Search)
    this.eventSource?.addEventListener('research_sources', (e) => {
      const data = JSON.parse(e.data)
      chatStore.addResearchSources(data.sources)
    })
  }
  
  private setupErrorHandling() {
    this.eventSource?.addEventListener('error', () => {
      this.handleReconnection()
    })
  }
  
  private handleReconnection() {
    if (this.reconnectAttempts >= 5) {
      chatStore.setStreamError(true)
      return
    }
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    
    setTimeout(() => {
      this.reconnectAttempts++
      this.connect(this.sessionId)
    }, delay)
  }
}
```

### 13.2 SSE Event Types (From Backend)

```typescript
// lib/sse/types.ts
export interface SSEEvents {
  // Connection events
  connection: {
    status: 'connected' | 'disconnected'
    sessionId: string
    authenticated: boolean
    userId?: string
  }
  
  // Keep-alive
  heartbeat: {
    timestamp: string
  }
  
  // Agent events
  agent_start: {
    agentId: string
    agentName: string
    agentType: string
    status: 'active'
    parentAgent?: string
  }
  
  agent_complete: {
    agentId: string
    status: 'completed'
    executionTime: number
    metrics?: AgentMetrics
  }
  
  // Research sources (Brave Search)
  research_sources: {
    sources: Array<{
      shortId: string
      title: string
      url: string
      domain: string
      supportedClaims: Array<{
        textSegment: string
        confidence: number
      }>
    }>
  }
  
  // Future Canvas events (when backend support added)
  canvas_open?: {
    canvasType: 'markdown' | 'code' | 'web' | 'sandbox'
    content: string
    title?: string
  }
}
```

### Backend Integration - Streaming
```
- **Streaming**: Server-Sent Events via `/agent_network_sse/{sessionId}`
```

### User Flow - Agent Response Processing
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
```

## Critical Requirements & Guardrails

### 🔴 ABSOLUTE REQUIREMENTS
1. **CORRECT ENDPOINT**: Use `/agent_network_sse/{sessionId}` exactly as backend provides
2. **EXPONENTIAL BACKOFF**: Reconnection with exponential delays (max 5 attempts)
3. **HEARTBEAT HANDLING**: Reset reconnection on heartbeat events
4. **EVENT TYPING**: Strongly typed SSE events for all message types
5. **STORE INTEGRATION**: Connect SSE events to appropriate Zustand stores
6. **ERROR RECOVERY**: Graceful handling of connection failures

### 🟡 CRITICAL GUARDRAILS
- Never create infinite reconnection loops
- Always parse JSON safely with try/catch
- Handle partial messages gracefully
- Implement connection state management
- Log all SSE events for debugging
- Clear old event listeners properly

### 🟢 SUCCESS CRITERIA
- SSE connection establishes within 500ms
- Reconnection works reliably
- All event types are handled correctly
- No memory leaks from event listeners
- Error states are user-friendly

## Step-by-Step Implementation Guide

### Phase 1: SSE Types and Constants (30 minutes)

1. **Define SSE Event Types**
   ```typescript
   // lib/sse/types.ts
   export interface SSEEventData {
     timestamp: string
     sessionId: string
     eventId: string
   }
   
   export interface ConnectionEvent extends SSEEventData {
     status: 'connected' | 'disconnected' | 'error'
     authenticated: boolean
     userId?: string
     message?: string
   }
   
   export interface HeartbeatEvent extends SSEEventData {
     serverTime: string
     uptime: number
   }
   
   export interface AgentStartEvent extends SSEEventData {
     agentId: string
     agentName: string
     agentType: 'researcher' | 'coder' | 'analyst' | 'coordinator' | 'planner'
     parentAgent?: string
     taskDescription: string
     priority: 'low' | 'medium' | 'high' | 'critical'
   }
   
   export interface AgentCompleteEvent extends SSEEventData {
     agentId: string
     status: 'completed' | 'failed' | 'cancelled'
     executionTime: number
     result?: any
     error?: string
     metrics?: {
       tokensUsed: number
       apiCalls: number
       computeTime: number
     }
   }
   
   export interface ResearchSourcesEvent extends SSEEventData {
     sources: Array<{
       shortId: string
       title: string
       url: string
       domain: string
       snippet: string
       confidence: number
       supportedClaims: Array<{
         textSegment: string
         confidence: number
         reasoning?: string
       }>
       datePublished?: string
       author?: string
     }>
     query: string
     totalResults: number
   }
   
   export interface MessageTokenEvent extends SSEEventData {
     token: string
     messageId: string
     isComplete: boolean
     metadata?: {
       model: string
       temperature: number
       tokensRemaining: number
     }
   }
   
   export interface TaskUpdateEvent extends SSEEventData {
     taskId: string
     status: 'pending' | 'running' | 'completed' | 'failed'
     progress: number
     description: string
     agent: string
     estimatedCompletion?: number
   }
   
   export interface CanvasOpenEvent extends SSEEventData {
     canvasType: 'markdown' | 'code' | 'web' | 'sandbox'
     content: string
     title?: string
     language?: string
     metadata?: {
       source: 'agent' | 'user' | 'upload'
       version: number
     }
   }
   
   export type SSEEvent = 
     | ConnectionEvent
     | HeartbeatEvent 
     | AgentStartEvent
     | AgentCompleteEvent
     | ResearchSourcesEvent
     | MessageTokenEvent
     | TaskUpdateEvent
     | CanvasOpenEvent
   
   export const SSE_EVENT_TYPES = {
     CONNECTION: 'connection',
     HEARTBEAT: 'heartbeat',
     AGENT_START: 'agent_start',
     AGENT_COMPLETE: 'agent_complete',
     RESEARCH_SOURCES: 'research_sources',
     MESSAGE_TOKEN: 'message_token',
     TASK_UPDATE: 'task_update',
     CANVAS_OPEN: 'canvas_open'
   } as const
   ```

2. **SSE Configuration**
   ```typescript
   // lib/sse/config.ts
   export const SSE_CONFIG = {
     ENDPOINT: '/agent_network_sse',
     MAX_RECONNECT_ATTEMPTS: 5,
     INITIAL_RECONNECT_DELAY: 1000,
     MAX_RECONNECT_DELAY: 30000,
     HEARTBEAT_TIMEOUT: 45000, // 45s (backend sends every 30s)
     CONNECTION_TIMEOUT: 10000,
     RETRY_BACKOFF_MULTIPLIER: 2
   } as const
   
   export const getSSEUrl = (sessionId: string): string => {
     const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
     return `${baseUrl}${SSE_CONFIG.ENDPOINT}/${sessionId}`
   }
   ```

### Phase 2: SSE Connection Manager (60 minutes)

3. **Core SSE Connection Class**
   ```typescript
   // lib/sse/connection.ts
   import { SSE_CONFIG, getSSEUrl } from './config'
   import { SSE_EVENT_TYPES, type SSEEvent } from './types'
   import { useAuthStore } from '@/stores/authStore'
   import { useChatStore } from '@/stores/chatStore'
   import { useCanvasStore } from '@/stores/canvasStore'
   import { useAgentDeckStore } from '@/stores/agentDeckStore'
   
   export enum SSEConnectionState {
     DISCONNECTED = 'disconnected',
     CONNECTING = 'connecting',
     CONNECTED = 'connected',
     RECONNECTING = 'reconnecting',
     FAILED = 'failed'
   }
   
   export class SSEConnection {
     private eventSource: EventSource | null = null
     private sessionId: string | null = null
     private reconnectAttempts = 0
     private connectionState = SSEConnectionState.DISCONNECTED
     private heartbeatTimer: NodeJS.Timeout | null = null
     private connectionTimeout: NodeJS.Timeout | null = null
     private eventListeners = new Map<string, (event: MessageEvent) => void>()
   
     // Callbacks
     private onStateChange?: (state: SSEConnectionState) => void
     private onError?: (error: Error) => void
   
     connect(sessionId: string, callbacks?: {
       onStateChange?: (state: SSEConnectionState) => void
       onError?: (error: Error) => void
     }) {
       this.sessionId = sessionId
       this.onStateChange = callbacks?.onStateChange
       this.onError = callbacks?.onError
   
       if (this.eventSource) {
         this.disconnect()
       }
   
       this.setState(SSEConnectionState.CONNECTING)
       this.createConnection()
     }
   
     private createConnection() {
       if (!this.sessionId) return
   
       try {
         const url = getSSEUrl(this.sessionId)
         const { accessToken } = useAuthStore.getState()
   
         // Add auth header if available
         const headers: Record<string, string> = {}
         if (accessToken) {
           headers['Authorization'] = `Bearer ${accessToken}`
         }
   
         this.eventSource = new EventSource(url)
         this.setupEventListeners()
         this.setupConnectionTimeout()
   
       } catch (error) {
         this.handleError(new Error(`Failed to create SSE connection: ${error}`))
       }
     }
   
     private setupEventListeners() {
       if (!this.eventSource) return
   
       // Connection opened
       this.eventSource.onopen = () => {
         console.log('SSE connection opened')
         this.setState(SSEConnectionState.CONNECTED)
         this.reconnectAttempts = 0
         this.clearConnectionTimeout()
         this.startHeartbeatMonitoring()
       }
   
       // Connection error
       this.eventSource.onerror = (error) => {
         console.error('SSE connection error:', error)
         this.handleConnectionError()
       }
   
       // Register specific event listeners
       this.addEventListener(SSE_EVENT_TYPES.CONNECTION, this.handleConnectionEvent)
       this.addEventListener(SSE_EVENT_TYPES.HEARTBEAT, this.handleHeartbeatEvent)
       this.addEventListener(SSE_EVENT_TYPES.AGENT_START, this.handleAgentStartEvent)
       this.addEventListener(SSE_EVENT_TYPES.AGENT_COMPLETE, this.handleAgentCompleteEvent)
       this.addEventListener(SSE_EVENT_TYPES.RESEARCH_SOURCES, this.handleResearchSourcesEvent)
       this.addEventListener(SSE_EVENT_TYPES.MESSAGE_TOKEN, this.handleMessageTokenEvent)
       this.addEventListener(SSE_EVENT_TYPES.TASK_UPDATE, this.handleTaskUpdateEvent)
       this.addEventListener(SSE_EVENT_TYPES.CANVAS_OPEN, this.handleCanvasOpenEvent)
     }
   
     private addEventListener(eventType: string, handler: (event: MessageEvent) => void) {
       if (!this.eventSource) return
   
       const wrappedHandler = (event: MessageEvent) => {
         try {
           console.log(`SSE ${eventType}:`, event.data)
           handler(event)
         } catch (error) {
           console.error(`Error handling ${eventType} event:`, error)
           this.onError?.(new Error(`Event handler error: ${error}`))
         }
       }
   
       this.eventSource.addEventListener(eventType, wrappedHandler)
       this.eventListeners.set(eventType, wrappedHandler)
     }
   
     private handleConnectionEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         console.log('SSE connected to session:', data.sessionId)
         useChatStore.getState().setStreamConnected(true)
       }
     }
   
     private handleHeartbeatEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         this.resetHeartbeatTimer()
         // Update connection health in store if needed
       }
     }
   
     private handleAgentStartEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         useAgentDeckStore.getState().addAgent({
           id: data.agentId,
           name: data.agentName,
           type: data.agentType,
           status: 'running',
           description: data.taskDescription,
           priority: data.priority,
           startTime: Date.now(),
           parentAgent: data.parentAgent
         })
       }
     }
   
     private handleAgentCompleteEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         useAgentDeckStore.getState().updateAgent(data.agentId, {
           status: data.status === 'completed' ? 'complete' : 'failed',
           endTime: Date.now(),
           executionTime: data.executionTime,
           result: data.result,
           error: data.error,
           metrics: data.metrics
         })
       }
     }
   
     private handleResearchSourcesEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         useChatStore.getState().addResearchSources(data.sources)
       }
     }
   
     private handleMessageTokenEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         useChatStore.getState().appendMessageToken(data.messageId, data.token, data.isComplete)
       }
     }
   
     private handleTaskUpdateEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         useAgentDeckStore.getState().updateTask(data.taskId, {
           status: data.status,
           progress: data.progress,
           description: data.description,
           estimatedCompletion: data.estimatedCompletion
         })
       }
     }
   
     private handleCanvasOpenEvent = (event: MessageEvent) => {
       const data = this.parseEventData(event.data)
       if (data) {
         useCanvasStore.getState().open(data.canvasType, data.content, data.title)
       }
     }
   
     private parseEventData(eventData: string): any {
       try {
         return JSON.parse(eventData)
       } catch (error) {
         console.error('Failed to parse SSE event data:', error)
         this.onError?.(new Error(`Invalid event data: ${error}`))
         return null
       }
     }
   
     private setupConnectionTimeout() {
       this.connectionTimeout = setTimeout(() => {
         if (this.connectionState === SSEConnectionState.CONNECTING) {
           this.handleError(new Error('SSE connection timeout'))
         }
       }, SSE_CONFIG.CONNECTION_TIMEOUT)
     }
   
     private clearConnectionTimeout() {
       if (this.connectionTimeout) {
         clearTimeout(this.connectionTimeout)
         this.connectionTimeout = null
       }
     }
   
     private startHeartbeatMonitoring() {
       this.resetHeartbeatTimer()
     }
   
     private resetHeartbeatTimer() {
       if (this.heartbeatTimer) {
         clearTimeout(this.heartbeatTimer)
       }
   
       this.heartbeatTimer = setTimeout(() => {
         console.warn('SSE heartbeat timeout - connection may be lost')
         this.handleConnectionError()
       }, SSE_CONFIG.HEARTBEAT_TIMEOUT)
     }
   
     private handleConnectionError() {
       if (this.connectionState === SSEConnectionState.FAILED) return
   
       this.setState(SSEConnectionState.RECONNECTING)
       this.disconnect(false)
       this.scheduleReconnect()
     }
   
     private scheduleReconnect() {
       if (this.reconnectAttempts >= SSE_CONFIG.MAX_RECONNECT_ATTEMPTS) {
         this.setState(SSEConnectionState.FAILED)
         this.onError?.(new Error('Max reconnection attempts reached'))
         useChatStore.getState().setStreamError(true)
         return
       }
   
       const delay = Math.min(
         SSE_CONFIG.INITIAL_RECONNECT_DELAY * Math.pow(SSE_CONFIG.RETRY_BACKOFF_MULTIPLIER, this.reconnectAttempts),
         SSE_CONFIG.MAX_RECONNECT_DELAY
       )
   
       console.log(`Scheduling SSE reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`)
   
       setTimeout(() => {
         this.reconnectAttempts++
         this.createConnection()
       }, delay)
     }
   
     private handleError(error: Error) {
       console.error('SSE connection error:', error)
       this.setState(SSEConnectionState.FAILED)
       this.onError?.(error)
     }
   
     private setState(state: SSEConnectionState) {
       this.connectionState = state
       console.log(`SSE connection state: ${state}`)
       this.onStateChange?.(state)
     }
   
     disconnect(clearSession = true) {
       if (this.eventSource) {
         this.eventSource.close()
         this.eventSource = null
       }
   
       if (this.heartbeatTimer) {
         clearTimeout(this.heartbeatTimer)
         this.heartbeatTimer = null
       }
   
       this.clearConnectionTimeout()
   
       if (clearSession) {
         this.sessionId = null
         this.reconnectAttempts = 0
         this.setState(SSEConnectionState.DISCONNECTED)
       }
   
       // Clear event listeners
       this.eventListeners.clear()
     }
   
     getState(): SSEConnectionState {
       return this.connectionState
     }
   
     isConnected(): boolean {
       return this.connectionState === SSEConnectionState.CONNECTED
     }
   }
   
   // Global SSE connection instance
   export const sseConnection = new SSEConnection()
   ```

### Phase 3: React Hook Integration (30 minutes)

4. **SSE React Hook**
   ```typescript
   // lib/hooks/useSSE.ts
   import { useEffect, useState, useRef } from 'react'
   import { sseConnection, SSEConnectionState } from '@/lib/sse/connection'
   import { useSessionStore } from '@/stores/sessionStore'
   import { useChatStore } from '@/stores/chatStore'
   
   export const useSSE = () => {
     const [connectionState, setConnectionState] = useState<SSEConnectionState>(SSEConnectionState.DISCONNECTED)
     const [error, setError] = useState<Error | null>(null)
     const { currentSessionId } = useSessionStore()
     const { setStreamError, setStreamConnected } = useChatStore()
     const previousSessionId = useRef<string | null>(null)
   
     useEffect(() => {
       if (!currentSessionId) {
         sseConnection.disconnect()
         setConnectionState(SSEConnectionState.DISCONNECTED)
         setStreamConnected(false)
         return
       }
   
       // Only reconnect if session changed
       if (currentSessionId !== previousSessionId.current) {
         previousSessionId.current = currentSessionId
   
         sseConnection.connect(currentSessionId, {
           onStateChange: (state) => {
             setConnectionState(state)
             setStreamConnected(state === SSEConnectionState.CONNECTED)
             
             if (state === SSEConnectionState.FAILED) {
               setStreamError(true)
             } else {
               setStreamError(false)
             }
           },
           onError: (error) => {
             setError(error)
             setStreamError(true)
           }
         })
       }
   
       return () => {
         // Don't disconnect on unmount, keep connection alive
       }
     }, [currentSessionId, setStreamConnected, setStreamError])
   
     const reconnect = () => {
       if (currentSessionId) {
         setError(null)
         sseConnection.connect(currentSessionId, {
           onStateChange: setConnectionState,
           onError: setError
         })
       }
     }
   
     const disconnect = () => {
       sseConnection.disconnect()
       setConnectionState(SSEConnectionState.DISCONNECTED)
       setStreamConnected(false)
     }
   
     return {
       connectionState,
       isConnected: connectionState === SSEConnectionState.CONNECTED,
       isConnecting: connectionState === SSEConnectionState.CONNECTING,
       isReconnecting: connectionState === SSEConnectionState.RECONNECTING,
       error,
       reconnect,
       disconnect
     }
   }
   ```

### Phase 4: Store Integration (45 minutes)

5. **Chat Store SSE Integration**
   ```typescript
   // stores/chatStore.ts (SSE-related additions)
   interface ChatStore {
     // ... existing state
     isStreamConnected: boolean
     streamError: boolean
     currentMessageId: string | null
     
     // SSE actions
     setStreamConnected: (connected: boolean) => void
     setStreamError: (error: boolean) => void
     appendMessageToken: (messageId: string, token: string, isComplete: boolean) => void
     addResearchSources: (sources: ResearchSource[]) => void
   }
   
   // Add to existing chat store
   export const useChatStore = create<ChatStore>()(
     immer((set, get) => ({
       // ... existing state
       isStreamConnected: false,
       streamError: false,
       currentMessageId: null,
       
       setStreamConnected: (connected) => {
         set(state => {
           state.isStreamConnected = connected
           if (connected) {
             state.streamError = false
           }
         })
       },
       
       setStreamError: (error) => {
         set(state => {
           state.streamError = error
           if (error) {
             state.isStreamConnected = false
           }
         })
       },
       
       appendMessageToken: (messageId, token, isComplete) => {
         set(state => {
           const message = state.messages.find(m => m.id === messageId)
           if (message) {
             message.content += token
             message.isStreaming = !isComplete
             
             if (isComplete) {
               message.completedAt = Date.now()
             }
           }
         })
       },
       
       addResearchSources: (sources) => {
         set(state => {
           const currentMessage = state.messages[state.messages.length - 1]
           if (currentMessage && currentMessage.role === 'assistant') {
             currentMessage.sources = sources
           }
         })
       }
     }))
   )
   ```

6. **Agent Deck Store SSE Integration**
   ```typescript
   // stores/agentDeckStore.ts (SSE-related additions)
   interface AgentDeckStore {
     // ... existing state
     
     // SSE actions
     addAgent: (agent: Omit<Agent, 'id'> & { id: string }) => void
     updateAgent: (agentId: string, updates: Partial<Agent>) => void
     updateTask: (taskId: string, updates: Partial<Task>) => void
   }
   
   // Add to existing agent deck store
   export const useAgentDeckStore = create<AgentDeckStore>()(
     immer((set, get) => ({
       // ... existing state
       
       addAgent: (agentData) => {
         set(state => {
           // Check if agent already exists
           const existingIndex = state.agents.findIndex(a => a.id === agentData.id)
           
           if (existingIndex >= 0) {
             // Update existing agent
             state.agents[existingIndex] = { ...state.agents[existingIndex], ...agentData }
           } else {
             // Add new agent
             state.agents.push({
               ...agentData,
               createdAt: Date.now()
             })
           }
           
           // Auto-show deck when agents are active
           if (state.agents.length > 0) {
             state.isVisible = true
           }
         })
       },
       
       updateAgent: (agentId, updates) => {
         set(state => {
           const agent = state.agents.find(a => a.id === agentId)
           if (agent) {
             Object.assign(agent, updates)
             
             // Update tasks for this agent if status changed
             if (updates.status === 'complete' || updates.status === 'failed') {
               state.tasks
                 .filter(t => t.agent === agent.name)
                 .forEach(task => {
                   task.status = updates.status === 'complete' ? 'complete' : 'failed'
                 })
             }
           }
         })
       },
       
       updateTask: (taskId, updates) => {
         set(state => {
           const task = state.tasks.find(t => t.id === taskId)
           if (task) {
             Object.assign(task, updates)
           } else {
             // Create new task if it doesn't exist
             state.tasks.push({
               id: taskId,
               ...updates,
               createdAt: Date.now()
             } as Task)
           }
         })
       }
     }))
   )
   ```

## 🧠 THINK HARD Instructions

Before implementing ANY SSE component:

1. **Connection Stability**: How does this handle network interruptions?
2. **Memory Management**: Are event listeners properly cleaned up?
3. **Error Recovery**: What happens when SSE fails completely?
4. **Performance Impact**: Will this cause re-renders or memory leaks?
5. **Race Conditions**: How do concurrent events get handled?
6. **Store Updates**: Are store mutations atomic and safe?
7. **Authentication**: How does this handle auth token changes?

### Extended Reasoning Prompts:
- "What happens if the user switches sessions rapidly?"
- "How does this perform when receiving 100+ events per second?"
- "What happens if JSON parsing fails on an event?"
- "How does this handle partial or malformed events?"
- "What happens when the backend changes event format?"

## EXACT shadcn/ui Components for Chunk 4

### Required Components:
```bash
badge        # Connection status indicators
alert        # Error messages
button       # Reconnect buttons
```

### No New Components Needed:
This chunk primarily uses existing components for status indicators.

## Real Validation Tests

### Test 1: Connection Establishment
```bash
# Test initial SSE connection
# 1. Create new session
# 2. SSE should connect within 500ms
# 3. Should receive 'connection' event
# 4. Should show connected status
```

### Test 2: Event Handling Test
```typescript
// Test all event types are processed
// Mock each SSE event type
// Verify store updates correctly
// Check UI reflects changes
```

### Test 3: Reconnection Test
```bash
# Test automatic reconnection
# 1. Disconnect network
# 2. Should attempt reconnection
# 3. Should use exponential backoff
# 4. Should succeed when network returns
```

### Test 4: Error Handling Test
```bash
# Test various error scenarios
# 1. Invalid JSON events
# 2. Network timeouts
# 3. Server errors
# 4. Should show user-friendly errors
```

### Test 5: Memory Leak Test
```bash
# Test for memory leaks
# 1. Connect and disconnect multiple times
# 2. Switch sessions rapidly
# 3. Check for growing memory usage
# 4. Verify event listeners are cleaned up
```

## What NOT to Do

### 🚫 FORBIDDEN ACTIONS:
1. **NO** infinite reconnection loops
2. **NO** storing event source instances in stores
3. **NO** synchronous event processing
4. **NO** missing error boundaries around event handlers
5. **NO** hardcoded event types
6. **NO** missing authentication in SSE requests
7. **NO** ignoring heartbeat events
8. **NO** blocking UI thread with event processing
9. **NO** missing cleanup on component unmount
10. **NO** exposing SSE internals to UI components

### 🚫 COMMON MISTAKES:
- Not handling partial JSON messages
- Missing exponential backoff in reconnection
- Not cleaning up event listeners
- Blocking the main thread with heavy processing
- Not validating event data structure
- Hardcoding timeouts and retry limits
- Missing authentication tokens in headers

### 🚫 ANTI-PATTERNS:
- Processing events synchronously
- Storing connection state in multiple places
- Not implementing proper error recovery
- Missing connection state management
- Creating multiple SSE connections
- Not handling network state changes

## Success Completion Criteria

✅ **SSE Streaming is complete when:**
1. SSE connection establishes reliably
2. All event types are handled correctly
3. Automatic reconnection works with backoff
4. Store integration is seamless
5. Error handling covers all scenarios
6. No memory leaks exist
7. Connection state is properly managed
8. Authentication works correctly
9. Performance is optimal
10. All edge cases are tested

---

**Remember**: SSE is the nervous system of the application. Every agent interaction, every real-time update, every streaming response flows through this system. It must be rock-solid and perform flawlessly under all conditions.