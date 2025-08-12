'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { CanvasSystem } from '@/components/canvas/CanvasSystem'
import { AgentTaskDeck } from '@/components/agent/AgentTaskDeck'
import { useChatStore } from '@/stores/chatStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAgentDeckStore } from '@/stores/agentDeckStore'

// Chat components (to be created)
import { ChatHeader } from '@/components/chat/ChatHeader'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const canvasType = searchParams.get('canvas') as 'markdown' | 'code' | 'web' | 'sandbox' | null
  
  const { messages, isStreaming, streamingMessage } = useChatStore()
  const { isOpen: isCanvasOpen } = useCanvasStore()
  const { setVisible: setAgentDeckVisible } = useAgentDeckStore()

  // Initialize Canvas if URL parameter is present
  useEffect(() => {
    if (canvasType && !isCanvasOpen) {
      useCanvasStore.getState().open(canvasType)
    }
  }, [canvasType, isCanvasOpen])

  // Show agent deck when there are messages
  useEffect(() => {
    if (messages.length > 0) {
      setAgentDeckVisible(true)
    }
  }, [messages.length, setAgentDeckVisible])

  return (
    <div className="flex h-screen bg-background">
      <ResizablePanelGroup direction="horizontal">
        {/* Main chat area */}
        <ResizablePanel defaultSize={isCanvasOpen ? 60 : 100} minSize={40}>
          <div className="flex flex-col h-full">
            {/* Chat header */}
            <ChatHeader sessionId={sessionId} />
            
            {/* Messages area */}
            <div className="flex-1 overflow-hidden">
              <MessageList 
                messages={messages}
                isStreaming={isStreaming}
                streamingMessage={streamingMessage}
              />
            </div>
            
            {/* Input area */}
            <MessageInput />
          </div>
        </ResizablePanel>

        {/* Canvas panel */}
        {isCanvasOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40} minSize={30} maxSize={70}>
              <CanvasSystem />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Agent Task Deck - floating overlay */}
      <AgentTaskDeck />
    </div>
  )
}