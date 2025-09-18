'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useChatState } from '@/hooks/useChatState'
import { cn } from '@/lib/utils'

interface VanaSidebarProps {
  className?: string
}

export function VanaSidebar({ className }: VanaSidebarProps) {
  const { sessionHistory, resumeSession, startChat, currentSession } = useChatState()
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredConversations = sessionHistory.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleConversationClick = (sessionId: string) => {
    resumeSession(sessionId)
  }
  
  const handleNewChat = () => {
    startChat("Hello, I'd like to start a new conversation.")
  }
  
  return (
    <aside className={cn("flex flex-col h-full", className)} data-testid="vana-sidebar">
      {/* Sidebar Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary">Vana</h1>
        <p className="text-sm text-muted-foreground">AI Assistant Platform</p>
      </div>
      
      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          onClick={handleNewChat}
          className="w-full"
          variant="outline"
        >
          + New Chat
        </Button>
      </div>
      
      {/* Search */}
      <div className="px-4 pb-4">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      
      {/* Conversation History */}
      <div className="flex-1 overflow-auto px-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Conversations</h3>
          {filteredConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          ) : (
            filteredConversations.map((session) => (
              <Button
                key={session.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start text-left h-auto p-3",
                  currentSession === session.id && "bg-accent"
                )}
                onClick={() => handleConversationClick(session.id)}
              >
                <div className="truncate">
                  <div className="font-medium text-sm truncate">{session.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Recent conversation
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          Multi-agent AI coordination
        </div>
      </div>
    </aside>
  )
}

export default VanaSidebar