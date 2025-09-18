'use client'

import { Suspense, useState, useRef } from 'react'
import { useChatState } from '@/hooks/useChatState'
import VanaHomePage from '@/components/vana/VanaHomePage'
import { ChatContainer } from '@/components/chat/chat-container'
import { Message } from '@/components/chat/message'
import { PromptInput } from '@/components/chat/prompt-input'
import { ScrollButton } from '@/components/chat/scroll-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Enhanced chat interface with Prompt-Kit components
function VanaChatInterface() {
  const { messages, endChat, sendMessage } = useChatState()
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return
    
    setIsLoading(true)
    try {
      await sendMessage(value)
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="flex flex-col h-full" ref={chatContainerRef}>
      {/* Chat Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">V</span>
            </div>
            <div>
              <h2 className="font-semibold">Chat with Vana</h2>
              <p className="text-xs text-muted-foreground">AI Assistant Platform</p>
            </div>
          </div>
          <Button 
            variant="ghost"
            size="sm"
            onClick={endChat}
          >
            Back to Home
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      <ChatContainer.Root className="flex-1">
        <ChatContainer.Content>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="font-semibold mb-2">Ready to start our conversation!</h3>
                <p className="text-sm">Ask me anything or choose from the suggestions below.</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <Message 
                  key={message.id} 
                  variant={message.role === 'user' ? 'user' : 'assistant'}
                >
                  <Message.Avatar 
                    variant={message.role === 'user' ? 'user' : 'assistant'}
                  />
                  <Message.Content variant={message.role === 'user' ? 'user' : 'assistant'}>
                    {message.content}
                  </Message.Content>
                  {message.role === 'assistant' && (
                    <Message.Actions 
                      onCopy={() => handleCopyMessage(message.content)}
                    />
                  )}
                </Message>
              ))}
              <ChatContainer.ScrollAnchor />
            </>
          )}
        </ChatContainer.Content>
      </ChatContainer.Root>
      
      {/* Scroll to Bottom Button */}
      <ScrollButton.Floating 
        position="bottom-right"
        offset={{ bottom: 140, right: 24 }}
      />
      
      {/* Input Area */}
      <PromptInput
        value={inputValue}
        onValueChange={setInputValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder="Type your message..."
        maxHeight={200}
      />
    </div>
  )
}

function ChatLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { isActive } = useChatState()
  
  // Layout-first conditional rendering based on chat state
  const layoutClasses = cn(
    "h-full transition-all duration-300",
    {
      // Home page layout - centered content
      "flex items-center justify-center": !isActive,
      // Chat interface layout - full height
      "flex flex-col": isActive,
    }
  )
  
  return (
    <div className={layoutClasses}>
      {isActive ? (
        // Chat Interface - Conditional rendering
        <Suspense fallback={<ChatLoadingSkeleton />}>
          <VanaChatInterface />
        </Suspense>
      ) : (
        // Home Page - Always available when not in chat
        <VanaHomePage />
      )}
    </div>
  )
}