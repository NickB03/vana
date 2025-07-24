import { useState, useRef, useEffect } from 'react'
import { AIMessage } from './ui/AIMessage'
import { AIInput } from './ui/ai-input'
import { AIConversation } from './ui/ai-conversation'
import type { ThinkingStep } from './ui/AIReasoning'
import { useWebSocket } from '../hooks/useWebSocket'

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
  thinkingSteps?: ThinkingStep[]
  isProcessing?: boolean
}


export function ChatInterface({ onSendMessage, initialMessages = [], thinkingSteps = [], isProcessing = false }: ChatInterfaceProps) {
  const { isConnected, sendMessage: wsSendMessage, onThinkingUpdate, onMessageUpdate } = useWebSocket()
  const [localThinkingSteps, setLocalThinkingSteps] = useState<ThinkingStep[]>(thinkingSteps)
  const [messages, setMessages] = useState<Message[]>(() => {
    // Convert initial messages to full Message objects
    const converted = initialMessages.map((msg, idx) => ({
      id: idx.toString(),
      role: msg.role,
      content: msg.content,
      timestamp: new Date(),
      status: 'sent' as const
    }))
    
    // Add welcome message if no initial messages
    if (converted.length === 0) {
      converted.push({
        id: '0',
        role: 'system' as const,
        content: 'Welcome to VANA! I\'m your multi-agent AI assistant. How can I help you today?',
        timestamp: new Date(),
        status: 'sent' as const
      })
    }
    
    return converted
  })
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentMessageIdRef = useRef<string | null>(null)
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Update thinking steps from props
  useEffect(() => {
    setLocalThinkingSteps(thinkingSteps)
  }, [thinkingSteps])
  
  // Set up WebSocket listeners
  useEffect(() => {
    const unsubThinking = onThinkingUpdate((update) => {
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
  
  const handleFileUpload = (files: FileList) => {
    // For now, just log the files - later we can implement actual file processing
    console.log('Files selected:', Array.from(files).map(f => f.name));
    
    // Create a message about the uploaded files
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    const message = `Please analyze these files: ${fileNames}`;
    handleSendMessage(message);
  };

  const handleSendMessage = async (content: string) => {
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
    
    // Use WebSocket if connected, otherwise fall back to parent handler
    if (isConnected) {
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
      
      // Send via WebSocket
      wsSendMessage(content)
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
  }
  
  // Add AI response when processing completes (only for non-WebSocket mode)
  useEffect(() => {
    if (!isConnected && !isProcessing && thinkingSteps.length > 0 && thinkingSteps.every(s => s.status === 'complete')) {
      // Check if we already have an AI message being displayed
      const hasAIMessage = messages.some(m => m.role === 'assistant' && m.id !== '0')
      if (!hasAIMessage) {
        // Add the AI response with the completed thinking steps
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Based on my analysis, here is what I found for you...',
          timestamp: new Date(),
          status: 'sent',
          thinkingSteps: localThinkingSteps // Use localThinkingSteps to avoid reload
        }
        setMessages(prev => [...prev, aiMessage])
      }
      setIsTyping(false)
    }
  }, [isProcessing, thinkingSteps, isConnected, messages, localThinkingSteps])
  
  return (
    <div className="flex flex-col h-full">
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
        
        {/* Processing indicator with thinking steps */}
        {(isTyping || localThinkingSteps.length > 0) && !messages.some(m => m.thinkingSteps && m.thinkingSteps.length > 0) && (
          <AIMessage
            role="assistant"
            content=""
            isThinking={isTyping || isProcessing}
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
            disabled={isTyping || isProcessing}
            placeholder="Message VANA..."
            showTools={false}
          />
          {/* Connection status indicator */}
          {!isConnected && (
            <div className="text-xs text-yellow-500 mt-2">
              WebSocket disconnected - using fallback mode
            </div>
          )}
        </div>
      </div>
    </div>
  )
}