'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  MessageSquare, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  ChevronLeft,
  Clock,
  Hash
} from 'lucide-react'
import { useSessionStore } from '@/stores/sessionStore'
import { formatRelativeTime, truncateText } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function SessionSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { sessions, currentSessionId, createSession, deleteSession, loadSession } = useSessionStore()
  
  // Filter for homepage-origin sessions only
  const homepageSessions = sessions
    .filter(s => s.origin === 'homepage')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20)

  const handleNewChat = () => {
    const session = createSession('homepage')
    // Don't navigate here, let the user input a message first
  }

  const handleSessionClick = (sessionId: string) => {
    loadSession(sessionId)
    window.location.href = `/chat?session=${sessionId}`
  }

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSession(sessionId)
  }

  if (isCollapsed) {
    return (
      <div className="w-16 bg-[#131314] border-r border-[#3c4043] flex flex-col">
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="w-full hover:bg-[#2a2b2c] text-[#e3e3e3]"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="w-10 h-10 hover:bg-[#2a2b2c] text-[#e3e3e3]"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {homepageSessions.slice(0, 5).map((session) => (
            <Button
              key={session.id}
              variant="ghost"
              size="icon"
              onClick={() => handleSessionClick(session.id)}
              className={`w-10 h-10 relative hover:bg-[#2a2b2c] text-[#e3e3e3] ${
                currentSessionId === session.id ? 'bg-[#2a2b2c]' : ''
              }`}
            >
              <Hash className="w-4 h-4" />
              {currentSessionId === session.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#8ab4f8] rounded-r" />
              )}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="gemini-sidebar flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#3c4043]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-[#e3e3e3] text-sm">Recent Chats</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8 hover:bg-[#2a2b2c] text-[#9aa0a6]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        
        <Button 
          className="w-full bg-[#8ab4f8] hover:bg-[#93b9f9] text-[#1e1f20] font-medium rounded-full" 
          onClick={handleNewChat}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
            {homepageSessions.length === 0 ? (
              <div className="text-center py-8 text-[#9aa0a6]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent chats</p>
                <p className="text-xs mt-1">Start a conversation to see your history</p>
              </div>
            ) : (
              homepageSessions.map((session, index) => (
                  <div 
                    key={session.id}
                    className={`group cursor-pointer rounded-lg p-3 mx-1 transition-all duration-200 relative ${
                      currentSessionId === session.id 
                        ? 'bg-[#2a2b2c]' 
                        : 'hover:bg-[#2a2b2c]'
                    }`}
                    onClick={() => handleSessionClick(session.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#e3e3e3] truncate">
                          {truncateText(session.title, 35)}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#9aa0a6]">
                          <span>{formatRelativeTime(session.updatedAt)}</span>
                          {session.messages.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{session.messages.length} msgs</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#3a3b3c] text-[#9aa0a6]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#2a2b2c] border-[#3c4043]">
                          <DropdownMenuItem className="text-[#e3e3e3] hover:bg-[#3a3b3c]">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="text-red-400 hover:bg-[#3a3b3c] hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Preview of last message */}
                    {session.messages.length > 0 && (
                      <p className="text-xs text-[#9aa0a6] mt-2 line-clamp-2 leading-relaxed">
                        {truncateText(session.messages[session.messages.length - 1]?.content || '', 60)}
                      </p>
                    )}
                    
                    {/* Active indicator */}
                    {currentSessionId === session.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#8ab4f8] rounded-r" />
                    )}
                  </div>
              ))
            )}
        </div>
      </ScrollArea>
      
      {/* Footer info */}
      <div className="p-4 border-t border-[#3c4043]">
        <p className="text-xs text-[#9aa0a6] text-center">
          Chats from homepage only • Encrypted & secure
        </p>
      </div>
    </div>
  )
}