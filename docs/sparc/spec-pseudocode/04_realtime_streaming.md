# Real-time Streaming Implementation (SSE)

## Overview

The real-time streaming system enables live updates during conversational AI interactions, providing users with immediate feedback on agent coordination, message generation progress, and real-time responses as they're being composed.

## Server-Sent Events Architecture

### Secure Next.js API Route for SSE

```typescript
// /app/api/sse/route.ts - Secure SSE proxy endpoint
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

// Secure CORS origin validation
function validateOrigin(requestOrigin: string | null): { isValid: boolean; allowedOrigin?: string } {
  // Get trusted origins from environment variable
  const allowedOriginsEnv = process.env.ALLOW_ORIGINS || process.env.CORS_ALLOWED_ORIGINS
  
  if (!allowedOriginsEnv) {
    console.error('SECURITY WARNING: No ALLOW_ORIGINS configured in environment')
    return { isValid: false }
  }
  
  // Parse allowed origins from comma-separated string
  const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim())
  
  // If no origin header provided, reject (browsers always send origin for CORS requests)
  if (!requestOrigin) {
    return { isValid: false }
  }
  
  // Check if the requesting origin is in the allowlist
  const isValid = allowedOrigins.includes(requestOrigin)
  
  return {
    isValid,
    allowedOrigin: isValid ? requestOrigin : undefined
  }
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  const requestOrigin = request.headers.get('origin')
  const { isValid, allowedOrigin } = validateOrigin(requestOrigin)
  
  if (!isValid) {
    return new Response('Origin not allowed', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }
  
  // Return proper CORS headers for preflight
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin!,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    // Validate CORS origin before processing request
    const requestOrigin = request.headers.get('origin')
    const { isValid, allowedOrigin } = validateOrigin(requestOrigin)
    
    if (!isValid) {
      return new Response('Origin not allowed', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    }
    
    // Extract session ID from query params (safe to expose)
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 })
    }
    
    // Get auth token from secure cookie (preferred) or Authorization header
    const cookieStore = cookies()
    const authToken = cookieStore.get('auth_token')?.value || 
                     request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!authToken) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Validate the token
    try {
      const decoded = verify(authToken, process.env.JWT_SECRET!)
      // Token is valid, proceed with SSE connection
    } catch (error) {
      return new Response('Invalid token', { status: 401 })
    }
    
    // Create SSE connection to backend with auth in headers (NOT URL)
    const backendURL = `${process.env.BACKEND_URL}/api/run_sse/${sessionId}`
    const backendResponse = await fetch(backendURL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,  // Secure: token in headers
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    
    if (!backendResponse.ok) {
      return new Response('Backend connection failed', { status: 502 })
    }
    
    // Set up secure SSE response headers - only for validated origins
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': allowedOrigin!, // Only validated origins
      'Access-Control-Allow-Credentials': 'true',
    })
    
    // Create readable stream to proxy backend SSE data
    const readable = new ReadableStream({
      start(controller) {
        const reader = backendResponse.body?.getReader()
        
        if (!reader) {
          controller.close()
          return
        }
        
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                controller.close()
                break
              }
              
              // Forward SSE data to client
              controller.enqueue(value)
            }
          } catch (error) {
            console.error('SSE stream error:', error)
            controller.error(error)
          }
        }
        
        pump()
      },
      
      cancel() {
        // Clean up when client disconnects
        backendResponse.body?.cancel()
      }
    })
    
    return new Response(readable, { headers })
    
  } catch (error) {
    console.error('SSE API route error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
```

### Security Architecture

**🔒 Secure Authentication & CORS Flow:**

1. **Origin Validation**: Validates requesting origin against environment-configured allowlist
2. **Preflight Handling**: Properly handles OPTIONS requests with secure CORS headers
3. **Client Side**: Connects to `/api/sse?sessionId=...` with `credentials: 'include'`
4. **API Route**: Extracts auth token from secure httpOnly cookies or Authorization header
5. **Token Validation**: Verifies JWT token server-side before establishing backend connection
6. **Backend Proxy**: Forwards authenticated request to backend with token in headers (never URL)
7. **Stream Proxy**: Pipes backend SSE response to client while maintaining security boundaries

**Security Benefits:**
- ✅ **CORS Security**: Origin allowlist prevents unauthorized cross-origin access
- ✅ **No Wildcard Risk**: Never uses '*' with credentials, only validated origins
- ✅ **403 for Invalid Origins**: Explicitly rejects disallowed origins with proper status
- ✅ **Preflight Support**: Handles OPTIONS requests for complex CORS scenarios
- ✅ No auth tokens in URLs (prevents exposure in logs, referrer headers, browser history)
- ✅ httpOnly cookies prevent XSS token theft
- ✅ Server-side token validation before backend connection
- ✅ Environment-based origin configuration for different deployment stages
- ✅ Clean separation between client auth and backend communication

**🚨 CORS Security Requirements:**

**Environment Configuration:**
```bash
# Required: Define allowed origins in environment
ALLOW_ORIGINS=https://app.yourdomain.com,https://yourdomain.com
# Development example:
ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173
# Production example:
ALLOW_ORIGINS=https://app.example.com,https://api.example.com
```

**Security Validation:**
- Origins are validated against exact match from environment allowlist
- No fallback to wildcard '*' - missing/invalid origins receive 403
- Preflight requests handled with same origin validation
- Credentials only allowed for explicitly validated origins

### SSE Connection Management

```typescript
interface SSEConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  timeout: number
  withCredentials: boolean
}

interface SSEMessage {
  type: string
  data: any
  timestamp: number
  sessionId: string
  agentId?: string
}

class SSEManager {
  private eventSource: EventSource | null = null
  private config: SSEConfig
  private reconnectAttempts: number = 0
  private isConnected: boolean = false
  private messageQueue: SSEMessage[] = []
  private listeners: Map<string, Function[]> = new Map()
  
  // Event handler references for cleanup
  private eventHandlers: {
    onOpen: (() => void) | null
    onMessage: ((event: MessageEvent) => void) | null
    onError: ((event: Event) => void) | null
    agentProgress: ((event: MessageEvent) => void) | null
    researchPlan: ((event: MessageEvent) => void) | null
    researchResults: ((event: MessageEvent) => void) | null
    errorEvent: ((event: MessageEvent) => void) | null
  } = {
    onOpen: null,
    onMessage: null,
    onError: null,
    agentProgress: null,
    researchPlan: null,
    researchResults: null,
    errorEvent: null
  }
  
  constructor(config: SSEConfig) {
    this.config = config
    this.setupHeartbeat()
  }
  
  async connect(sessionId: string): Promise<void> {
    try {
      // Connect to secure Next.js API route that handles auth server-side
      // No auth tokens in URL - handled via secure cookies/headers
      this.eventSource = new EventSource(`/api/sse?sessionId=${sessionId}`, {
        withCredentials: true  // Send cookies for authentication
      })
      
      this.setupEventHandlers()
      await this.waitForConnection()
      
    } catch (error) {
      console.error('SSE connection failed:', error)
      this.handleConnectionError(error)
    }
  }
  
  private setupEventHandlers(): void {
    if (!this.eventSource) return
    
    // Create named handler functions for proper cleanup
    this.eventHandlers.onOpen = () => {
      this.isConnected = true
      this.reconnectAttempts = 0
      this.processMessageQueue()
      this.emit('connected')
    }
    
    this.eventHandlers.onMessage = (event: MessageEvent) => {
      this.handleMessage(event)
    }
    
    this.eventHandlers.onError = (error: Event) => {
      this.handleConnectionError(error)
    }
    
    this.eventHandlers.agentProgress = (event: MessageEvent) => {
      this.handleAgentProgress(event)
    }
    
    this.eventHandlers.researchPlan = (event: MessageEvent) => {
      this.handleResearchPlan(event)
    }
    
    this.eventHandlers.researchResults = (event: MessageEvent) => {
      this.handleResearchResults(event)
    }
    
    this.eventHandlers.errorEvent = (event: MessageEvent) => {
      this.handleErrorEvent(event)
    }
    
    // Attach event handlers
    this.eventSource.onopen = this.eventHandlers.onOpen
    this.eventSource.onmessage = this.eventHandlers.onMessage
    this.eventSource.onerror = this.eventHandlers.onError
    
    // Custom event types
    this.eventSource.addEventListener('agent_progress', this.eventHandlers.agentProgress)
    this.eventSource.addEventListener('research_plan', this.eventHandlers.researchPlan)
    this.eventSource.addEventListener('research_results', this.eventHandlers.researchResults)
    this.eventSource.addEventListener('error_event', this.eventHandlers.errorEvent)
  }
  
  private cleanupEventHandlers(): void {
    if (!this.eventSource) return
    
    // Remove custom event listeners using stored references
    if (this.eventHandlers.agentProgress) {
      this.eventSource.removeEventListener('agent_progress', this.eventHandlers.agentProgress)
    }
    if (this.eventHandlers.researchPlan) {
      this.eventSource.removeEventListener('research_plan', this.eventHandlers.researchPlan)
    }
    if (this.eventHandlers.researchResults) {
      this.eventSource.removeEventListener('research_results', this.eventHandlers.researchResults)
    }
    if (this.eventHandlers.errorEvent) {
      this.eventSource.removeEventListener('error_event', this.eventHandlers.errorEvent)
    }
    
    // Clear standard event handlers
    this.eventSource.onopen = null
    this.eventSource.onmessage = null
    this.eventSource.onerror = null
    
    // Clear all handler references
    this.eventHandlers = {
      onOpen: null,
      onMessage: null,
      onError: null,
      agentProgress: null,
      researchPlan: null,
      researchResults: null,
      errorEvent: null
    }
  }
  
  disconnect(): void {
    this.cleanupEventHandlers()
    
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    
    this.isConnected = false
    this.messageQueue = []
    this.emit('disconnected')
  }
  
  cleanup(): void {
    this.disconnect()
    this.listeners.clear()
  }
}
```

### Message Types and Handlers

```typescript
enum SSEMessageType {
  MESSAGE_STARTED = 'message_started',
  MESSAGE_CHUNK = 'message_chunk',
  MESSAGE_COMPLETED = 'message_completed',
  AGENT_STARTED = 'agent_started',
  AGENT_PROGRESS = 'agent_progress',
  AGENT_COMPLETED = 'agent_completed',
  TYPING_INDICATOR = 'typing_indicator',
  THINKING_STATUS = 'thinking_status',
  ERROR_OCCURRED = 'error_occurred',
  CONNECTION_HEARTBEAT = 'heartbeat'
}

interface AgentProgressMessage {
  type: SSEMessageType.AGENT_PROGRESS
  data: {
    agentId: string
    agentName: string
    status: 'idle' | 'working' | 'completed' | 'error'
    progress: number // 0-100
    currentTask: string
    estimatedTimeRemaining: number
    results?: any
  }
}

interface MessageChunkMessage {
  type: SSEMessageType.MESSAGE_CHUNK
  data: {
    messageId: string
    content: string
    isComplete: boolean
    agentId?: string
    metadata?: {
      tokens: number
      citations?: Citation[]
    }
  }
}

interface TypingIndicatorMessage {
  type: SSEMessageType.TYPING_INDICATOR
  data: {
    isTyping: boolean
    agentId?: string
    estimatedDuration?: number
  }
}

class MessageHandler {
  handleAgentProgress(message: AgentProgressMessage): void {
    const { agentId, status, progress, currentTask } = message.data
    
    // Update agent store
    useAgentStore.getState().updateAgentProgress(agentId, {
      status,
      progress,
      currentTask,
      lastUpdate: new Date()
    })
    
    // Update UI components
    this.notifyComponents('agent_progress', message.data)
    
    // Handle agent completion
    if (status === 'completed') {
      this.handleAgentCompletion(message.data)
    }
    
    // Handle agent errors
    if (status === 'error') {
      this.handleAgentError(message.data)
    }
  }
  
  handleMessageChunk(message: MessageChunkMessage): void {
    const { messageId, content, isComplete, agentId, metadata } = message.data
    
    // Update chat store with streaming content
    useChatStore.getState().updateMessageChunk(messageId, content, isComplete)
    
    // Update typing indicator
    if (isComplete) {
      this.handleTypingIndicator({ type: SSEMessageType.TYPING_INDICATOR, data: { isTyping: false } })
    }
    
    // Show agent attribution if provided
    if (agentId) {
      this.updateAgentContribution(agentId, content)
    }
  }
  
  handleTypingIndicator(message: TypingIndicatorMessage): void {
    const { isTyping, agentId, estimatedDuration } = message.data
    
    // Update chat store typing state
    useChatStore.getState().setTyping(isTyping)
    
    // Update UI with typing animation
    this.updateTypingIndicator(isTyping, agentId, estimatedDuration)
  }
  
  handleMessageCompleted(message: any): void {
    const { messageId, sessionId, finalContent } = message.data
    
    // Update chat store with final message
    useChatStore.getState().completeMessage(messageId, finalContent)
    
    // Update session store
    useSessionStore.getState().updateLastActivity(sessionId)
    
    // Re-enable chat input
    this.enableChatInput()
    
    // Auto-scroll to bottom
    this.scrollToBottom()
  }
}
```

### Connection Resilience

```typescript
class SSEResilience {
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private lastHeartbeat: number = 0
  
  handleConnectionError(error: Event): void {
    console.error('SSE connection error:', error)
    this.isConnected = false
    
    // Attempt reconnection with exponential backoff
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++
        this.reconnect()
      }, delay)
      
      this.emit('reconnecting', { attempt: this.reconnectAttempts, delay })
    } else {
      this.emit('connection_failed')
      this.showConnectionError()
    }
  }
  
  private async reconnect(): Promise<void> {
    try {
      this.cleanup()
      
      // Get current session ID
      const sessionId = useSessionStore.getState().currentSessionId
      
      if (!sessionId) {
        throw new Error('No active session for reconnection')
      }
      
      // Reconnect using secure API route - no auth token needed
      await this.connect(sessionId)
      
    } catch (error) {
      console.error('Reconnection failed:', error)
      this.handleConnectionError(error as Event)
    }
  }
  
  private setupHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        const now = Date.now()
        if (now - this.lastHeartbeat > this.config.heartbeatInterval * 2) {
          console.warn('Heartbeat timeout, attempting reconnection')
          this.handleConnectionError(new Event('heartbeat_timeout'))
        }
      }
    }, this.config.heartbeatInterval)
  }
  
  private handleHeartbeat(event: MessageEvent): void {
    this.lastHeartbeat = Date.now()
    this.emit('heartbeat')
  }
}
```

### Message Queue and Persistence

```typescript
class MessageQueue {
  private queue: SSEMessage[] = []
  private processing: boolean = false
  private storage: Storage
  
  constructor() {
    this.storage = window.localStorage
    this.loadPersistedMessages()
  }
  
  enqueue(message: SSEMessage): void {
    this.queue.push(message)
    this.persistMessage(message)
    
    if (!this.processing) {
      this.processQueue()
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true
    
    while (this.queue.length > 0) {
      const message = this.queue.shift()!
      
      try {
        await this.processMessage(message)
        this.removePersistedMessage(message)
      } catch (error) {
        console.error('Message processing failed:', error)
        // Re-queue message for retry
        this.queue.unshift(message)
        break
      }
    }
    
    this.processing = false
  }
  
  private persistMessage(message: SSEMessage): void {
    const key = `sse_message_${message.timestamp}`
    this.storage.setItem(key, JSON.stringify(message))
  }
  
  private loadPersistedMessages(): void {
    const keys = Object.keys(this.storage).filter(key => 
      key.startsWith('sse_message_')
    )
    
    keys.forEach(key => {
      try {
        const message = JSON.parse(this.storage.getItem(key)!)
        this.queue.push(message)
      } catch (error) {
        console.error('Failed to load persisted message:', error)
        this.storage.removeItem(key)
      }
    })
    
    // Sort by timestamp
    this.queue.sort((a, b) => a.timestamp - b.timestamp)
  }
}
```

## SSE Component Dependencies

### Required Components for Real-time UI

**Core Real-time Components:**
```bash
# Install Prompt-Kit chat components for streaming
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/scroll-button.json"

# Install UI components for progress and status
npx shadcn@latest add progress
npx shadcn@latest add badge
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add card
npx shadcn@latest add avatar
```

**Streaming-specific Dependencies:**
```bash
# Install packages for real-time functionality
npm install @tanstack/react-query      # For caching and synchronization
npm install zustand                    # For real-time state management
npm install eventemitter3              # For event handling
npm install reconnecting-eventsource   # For robust SSE connections
```

### Component Setup Validation

```bash
# Verify streaming components are installed
ls components/ui/ | grep -E "(progress|badge|toast|alert|card)"

# Check for chat components from Prompt-Kit
find components -name "*chat*" -o -name "*message*" -o -name "*prompt*"

# Test streaming dependencies
node -e "console.log('Testing streaming deps...');
try {
  require('@tanstack/react-query');
  require('zustand');
  require('eventemitter3');
  console.log('✅ All streaming dependencies available');
} catch(e) {
  console.log('❌ Dependency missing:', e.message);
}"
```

## React Integration

### SSE Hook Implementation

```typescript
interface UseSSEOptions {
  sessionId: string
  autoConnect?: boolean
  onMessage?: (message: SSEMessage) => void
  onError?: (error: Error) => void
  onReconnect?: (attempt: number) => void
}

function useSSE(options: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [messages, setMessages] = useState<SSEMessage[]>([])
  
  const sseManagerRef = useRef<SSEManager | null>(null)
  const { getAuthToken } = useAuth()
  
  const connect = useCallback(async () => {
    try {
      // No need to get auth token - handled by secure API route via cookies
      if (!sseManagerRef.current) {
        sseManagerRef.current = new SSEManager({
          url: '/api/sse',  // Secure Next.js API route
          reconnectInterval: 5000,
          maxReconnectAttempts: 10,
          heartbeatInterval: 30000,
          timeout: 60000,
          withCredentials: true  // Essential for sending auth cookies
        })
      }
      
      // Connect without passing auth token - handled by API route
      await sseManagerRef.current.connect(options.sessionId)
      setIsConnected(true)
      setError(null)
      
    } catch (err) {
      const error = err as Error
      setError(error)
      options.onError?.(error)
    }
  }, [options.sessionId])  // Removed getAuthToken dependency
  
  const disconnect = useCallback(() => {
    sseManagerRef.current?.disconnect()
    setIsConnected(false)
    setIsReconnecting(false)
  }, [])
  
  const sendMessage = useCallback((message: any) => {
    sseManagerRef.current?.sendMessage(message)
  }, [])
  
  useEffect(() => {
    if (options.autoConnect) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [options.autoConnect, connect, disconnect])
  
  useEffect(() => {
    const manager = sseManagerRef.current
    if (!manager) return
    
    const handleMessage = (message: SSEMessage) => {
      setMessages(prev => [...prev, message])
      options.onMessage?.(message)
    }
    
    const handleReconnecting = (data: { attempt: number }) => {
      setIsReconnecting(true)
      options.onReconnect?.(data.attempt)
    }
    
    const handleConnected = () => {
      setIsConnected(true)
      setIsReconnecting(false)
    }
    
    manager.on('message', handleMessage)
    manager.on('reconnecting', handleReconnecting)
    manager.on('connected', handleConnected)
    
    return () => {
      manager.off('message', handleMessage)
      manager.off('reconnecting', handleReconnecting)
      manager.off('connected', handleConnected)
    }
  }, [options.onMessage, options.onReconnect])
  
  return {
    isConnected,
    isReconnecting,
    error,
    messages,
    connect,
    disconnect,
    sendMessage
  }
}
```

### Real-time Component Integration Example

```typescript
// Import required components (ensure they're installed first)
import { ChatContainer } from '@/components/ui/chat-container'    // Prompt-Kit
import { Message } from '@/components/ui/message'                  // Prompt-Kit  
import { PromptInput } from '@/components/ui/prompt-input'        // Prompt-Kit
import { Progress } from '@/components/ui/progress'               // shadcn/ui
import { Badge } from '@/components/ui/badge'                     // shadcn/ui
import { Card } from '@/components/ui/card'                       // shadcn/ui
import { Avatar } from '@/components/ui/avatar'                   // shadcn/ui
import { toast } from '@/components/ui/use-toast'                 // shadcn/ui

function ResearchProgress() {
  const { currentSessionId } = useSession()
  const { agentProgress } = useAgentStore()
  
  const { isConnected, isReconnecting, error } = useSSE({
    sessionId: currentSessionId!,
    autoConnect: true,
    onMessage: (message) => {
      // Handle different message types
      switch (message.type) {
        case SSEMessageType.AGENT_PROGRESS:
          // UI updates handled by store
          break
        case SSEMessageType.RESEARCH_COMPLETED:
          toast({
            title: 'Research completed!',
            description: 'Your research has finished successfully.'
          })
          break
      }
    },
    onError: (error) => {
      showErrorToast(`Connection error: ${error.message}`)
    },
    onReconnect: (attempt) => {
      showInfoToast(`Reconnecting... (attempt ${attempt})`)
    }
  })
  
  return (
    <div className="research-progress">
      <ConnectionStatus 
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        error={error}
      />
      
      <AgentGrid agents={agentProgress} />
      
      {isReconnecting && (
        <ReconnectingIndicator />
      )}
    </div>
  )
}
```

## Error Handling and Recovery

### Connection Error Types

```typescript
enum SSEErrorType {
  NETWORK_ERROR = 'network_error',
  AUTH_ERROR = 'auth_error',
  SESSION_EXPIRED = 'session_expired',
  SERVER_ERROR = 'server_error',
  HEARTBEAT_TIMEOUT = 'heartbeat_timeout',
  MAX_RECONNECT_REACHED = 'max_reconnect_reached'
}

class SSEErrorHandler {
  handleError(error: SSEError): void {
    switch (error.type) {
      case SSEErrorType.NETWORK_ERROR:
        this.handleNetworkError(error)
        break
        
      case SSEErrorType.AUTH_ERROR:
        this.handleAuthError(error)
        break
        
      case SSEErrorType.SESSION_EXPIRED:
        this.handleSessionExpired(error)
        break
        
      case SSEErrorType.SERVER_ERROR:
        this.handleServerError(error)
        break
        
      case SSEErrorType.HEARTBEAT_TIMEOUT:
        this.handleHeartbeatTimeout(error)
        break
        
      case SSEErrorType.MAX_RECONNECT_REACHED:
        this.handleMaxReconnectReached(error)
        break
    }
  }
  
  private handleNetworkError(error: SSEError): void {
    // Show network error notification
    // Attempt reconnection with exponential backoff
    // Enable offline mode if available
  }
  
  private handleAuthError(error: SSEError): void {
    // Refresh authentication tokens
    // Re-establish SSE connection
    // Redirect to login if refresh fails
  }
  
  private handleSessionExpired(error: SSEError): void {
    // Clear expired session data
    // Create new session
    // Reconnect with new session ID
  }
}
```

### Graceful Degradation

```typescript
class SSEFallback {
  private polling: boolean = false
  private pollingInterval: NodeJS.Timeout | null = null
  
  enablePollingFallback(sessionId: string): void {
    if (this.polling) return
    
    this.polling = true
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForUpdates(sessionId)
      } catch (error) {
        console.error('Polling failed:', error)
      }
    }, 5000) // Poll every 5 seconds
  }
  
  private async pollForUpdates(sessionId: string): Promise<void> {
    const response = await fetch(`/api/sessions/${sessionId}/updates`, {
      credentials: 'include'  // Send auth cookies instead of Authorization header
    })
    
    if (response.ok) {
      const updates = await response.json()
      updates.forEach((update: any) => {
        this.processUpdate(update)
      })
    }
  }
  
  disablePollingFallback(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.polling = false
  }
}
```

## Performance Optimization

### Message Batching
```typescript
class MessageBatcher {
  private batch: SSEMessage[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private batchSize: number = 10
  private batchTimeout: number = 100
  
  addMessage(message: SSEMessage): void {
    this.batch.push(message)
    
    if (this.batch.length >= this.batchSize) {
      this.flushBatch()
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch()
      }, this.batchTimeout)
    }
  }
  
  private flushBatch(): void {
    if (this.batch.length === 0) return
    
    const batchToProcess = [...this.batch]
    this.batch = []
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    
    this.processBatch(batchToProcess)
  }
}
```

### Memory Management
```typescript
class SSEMemoryManager {
  private maxMessages: number = 1000
  private messages: SSEMessage[] = []
  
  addMessage(message: SSEMessage): void {
    this.messages.push(message)
    
    // Limit message history to prevent memory leaks
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages)
    }
  }
  
  cleanup(): void {
    this.messages = []
  }
  
  getRecentMessages(count: number = 50): SSEMessage[] {
    return this.messages.slice(-count)
  }
}
```

## Testing Strategy

### SSE Testing with Mock EventSource
```typescript
// Mock EventSource for testing
class MockEventSource {
  private listeners: { [key: string]: Function[] } = {}
  
  addEventListener(type: string, listener: Function): void {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(listener)
  }
  
  simulate(type: string, data: any): void {
    const listeners = this.listeners[type] || []
    listeners.forEach(listener => {
      listener({ type, data: JSON.stringify(data) })
    })
  }
  
  close(): void {
    // Mock close implementation
  }
}

// Test SSE functionality
describe('SSE Manager', () => {
  test('handles agent progress messages correctly', () => {
    const sseManager = new SSEManager(mockConfig)
    const mockEventSource = new MockEventSource()
    
    // Simulate agent progress message
    mockEventSource.simulate('agent_progress', {
      agentId: 'agent_1',
      status: 'working',
      progress: 50
    })
    
    // Assert state updates
    expect(useAgentStore.getState().agents['agent_1'].progress).toBe(50)
  })
  
  test('reconnects after connection loss', async () => {
    const sseManager = new SSEManager(mockConfig)
    
    // Simulate connection error
    mockEventSource.simulate('error', new Error('Connection lost'))
    
    // Wait for reconnection attempt
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Assert reconnection was attempted
    expect(sseManager.reconnectAttempts).toBe(1)
  })
})
```