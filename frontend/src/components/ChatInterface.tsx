import { useState, useRef, useEffect, useCallback } from 'react'
import { AIMessage } from './ui/AIMessage'
import { AIInput } from './ui/ai-input'
import { AIConversation } from './ui/ai-conversation'
import type { ThinkingStep } from './ui/AIReasoning'
import { useWebSocket } from '../hooks/useSSE'
import { ConnectionStatus } from './ConnectionStatus'

// Global state to prevent duplicate initial messages across StrictMode mounts
const globalInitialMessageState = new Map<string, boolean>();

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
  thinkingSteps?: ThinkingStep[]
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void
  initialMessages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}


export function ChatInterface({ onSendMessage, initialMessages = [] }: ChatInterfaceProps) {
  console.log('[ChatInterface] Component initializing');
  const { isConnected, sendMessage: wsSendMessage, onThinkingUpdate, onMessageUpdate, connectionStatus } = useWebSocket()
  console.log('[ChatInterface] WebSocket hook loaded, isConnected:', isConnected, 'status:', connectionStatus);
  
  const [localThinkingSteps, setLocalThinkingSteps] = useState<ThinkingStep[]>([])
  const [messages, setMessages] = useState<Message[]>(() => {
    // Don't convert initial messages here - we'll add them after sending
    // Just show welcome message if no initial messages
    if (initialMessages.length === 0) {
      return [{
        id: '0',
        role: 'system' as const,
        content: 'Welcome to VANA! I\'m your multi-agent AI assistant. How can I help you today?',
        timestamp: new Date(),
        status: 'sent' as const
      }];
    }
    
    // Return empty array if we have initial messages (they'll be added after connection)
    return [];
  })
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentMessageIdRef = useRef<string | null>(null)
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  
  
  // Set up WebSocket listeners
  useEffect(() => {
    console.log('[ChatInterface] Setting up WebSocket listeners');
    const unsubThinking = onThinkingUpdate((update) => {
      console.log('[ChatInterface] Thinking update received:', update);
      setLocalThinkingSteps(prev => {
        const newSteps = [...prev]
        const index = newSteps.findIndex(s => s.id === update.stepId)
        if (index !== -1) {
          newSteps[index] = {
            ...newSteps[index],
            status: update.status,
            duration: update.duration
          }
        } else {
          newSteps.push({
            id: update.stepId,
            agent: update.agent,
            action: update.action,
            status: update.status,
            duration: update.duration
          })
        }
        return newSteps
      })
    })
    
    const unsubMessage = onMessageUpdate((update) => {
      console.log('[ChatInterface] Message update received:', update);
      if (currentMessageIdRef.current === update.messageId) {
        setMessages(prev => {
          const newMessages = [...prev]
          const index = newMessages.findIndex(m => m.id === update.messageId)
          if (index !== -1) {
            newMessages[index] = {
              ...newMessages[index],
              content: update.content,
              status: update.isComplete ? 'sent' : 'sending'
            }
            if (update.isComplete) {
              setIsTyping(false)
              currentMessageIdRef.current = null
            }
          }
          return newMessages
        })
      }
    })
    
    return () => {
      unsubThinking()
      unsubMessage()
    }
  }, [onThinkingUpdate, onMessageUpdate])
  
  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sent'
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)
    setLocalThinkingSteps([]) // Reset thinking steps for new message
    currentMessageIdRef.current = null // Reset current message reference
    
    // Use WebSocket if connected, otherwise fall back to parent handler
    if (isConnected) {
      console.log('[ChatInterface] Sending via SSE:', content);
      
      // Create placeholder AI message
      const aiMessageId = (Date.now() + 1).toString()
      currentMessageIdRef.current = aiMessageId
      const aiMessage: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
        thinkingSteps: []
      }
      setMessages(prev => [...prev, aiMessage])
      
      // Send via WebSocket/SSE with the same message ID
      wsSendMessage(content, aiMessageId)
    } else if (onSendMessage) {
      // Fall back to parent handler
      onSendMessage(content)
    } else {
      // Simulate AI response for demo
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you want to: "${content}". Let me help you with that.`,
          timestamp: new Date(),
          status: 'sent'
        }
        setMessages(prev => [...prev, aiMessage])
        setIsTyping(false)
      }, 1500)
    }
  }, [isConnected, wsSendMessage, onSendMessage])
  
  const handleFileUpload = (files: FileList) => {
    // For now, just log the files - later we can implement actual file processing
    console.log('Files selected:', Array.from(files).map(f => f.name));
    
    // Create a message about the uploaded files
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    const message = `Please analyze these files: ${fileNames}`;
    handleSendMessage(message);
  };
  
  // Send initial message if provided
  useEffect(() => {
    if (initialMessages.length > 0 && isConnected) {
      const userMessage = initialMessages.find(msg => msg.role === 'user');
      if (userMessage) {
        // Use message content + timestamp as key to prevent race conditions across multiple component instances
        const messageKey = `${userMessage.content}_${Date.now()}`;
        
        // Atomic check-and-set operation to prevent race conditions
        const isAlreadySent = globalInitialMessageState.has(userMessage.content);
        if (!isAlreadySent) {
          // Immediately set the flag BEFORE any async operations
          globalInitialMessageState.set(userMessage.content, true);
          console.log('[ChatInterface] Processing initial message (first time):', userMessage.content);
          
          // Send the message
          handleSendMessage(userMessage.content);
          
          // Clear the flag after a delay to allow re-sending if user navigates away and back
          setTimeout(() => {
            globalInitialMessageState.delete(userMessage.content);
          }, 5000);
        } else {
          console.log('[ChatInterface] Skipping duplicate initial message:', userMessage.content);
        }
      }
    }
  }, [isConnected, handleSendMessage, initialMessages]);
  
  return (
    <div className="flex flex-col h-full relative">
      {/* Connection status indicator */}
      <ConnectionStatus 
        status={connectionStatus} 
        className="absolute top-4 right-4 z-10"
      />
      
      {/* Messages area with AI conversation wrapper */}
      <AIConversation>
        {messages.map((message) => (
          <AIMessage
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
            status={message.status}
            thinkingSteps={
              message.id === currentMessageIdRef.current 
                ? localThinkingSteps 
                : message.thinkingSteps
            }
            isThinking={
              message.id === currentMessageIdRef.current && 
              message.status === 'sending'
            }
          />
        ))}
        
        {/* Processing indicator with thinking steps - only show if no current message exists or it doesn't have thinking steps */}
        {(isTyping || localThinkingSteps.length > 0) && 
         (!currentMessageIdRef.current || 
          !messages.find(m => m.id === currentMessageIdRef.current)) && (
          <AIMessage
            key="processing-indicator"
            role="assistant"
            content=""
            isThinking={isTyping}
            thinkingSteps={localThinkingSteps}
          />
        )}
        
        <div ref={messagesEndRef} />
      </AIConversation>
      
      {/* Fixed input area at bottom */}
      <div className="sticky bottom-0 bg-black">
        <div className="max-w-2xl mx-auto p-4">
          <AIInput 
            onSend={handleSendMessage}
            onFileUpload={handleFileUpload}
            disabled={isTyping}
            placeholder="Message VANA..."
            showTools={false}
          />
        </div>
      </div>
    </div>
  )
}