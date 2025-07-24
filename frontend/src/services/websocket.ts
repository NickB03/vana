import { io, Socket } from 'socket.io-client'

export interface ThinkingUpdate {
  stepId: string
  agent: string
  action: string
  status: 'pending' | 'active' | 'complete'
  duration?: string
}

export interface MessageUpdate {
  messageId: string
  content: string
  isComplete: boolean
}

class WebSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  connect(url?: string) {
    if (this.socket?.connected) {
      return
    }

    // Use environment variable or default to current host
    const wsUrl = url || import.meta.env.VITE_WS_URL || window.location.origin

    this.socket = io(wsUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.emit('connected', true)
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.emit('connected', false)
    })

    // Handle thinking updates
    this.socket.on('thinking_update', (data: ThinkingUpdate) => {
      this.emit('thinking_update', data)
    })

    // Handle message updates
    this.socket.on('message_update', (data: MessageUpdate) => {
      this.emit('message_update', data)
    })

    // Handle errors
    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  sendMessage(message: string) {
    if (this.socket?.connected) {
      this.socket.emit('user_message', { content: message })
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data))
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// Singleton instance
export const wsService = new WebSocketService()