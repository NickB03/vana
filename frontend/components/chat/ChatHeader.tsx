'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  PanelLeftOpen, 
  PanelLeftClose, 
  Settings, 
  Share, 
  MoreHorizontal,
  Zap,
  Clock
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSessionStore } from '@/stores/sessionStore'
import { useChatStore } from '@/stores/chatStore'
import { useUIStore } from '@/stores/uiStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { cn } from '@/lib/utils'

interface ChatHeaderProps {
  sessionId?: string | null
}

export function ChatHeader({ sessionId }: ChatHeaderProps) {
  const { sessions } = useSessionStore()
  const { isStreaming, messages } = useChatStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { isOpen: isCanvasOpen, open: openCanvas } = useCanvasStore()
  
  const currentSession = sessions.find(s => s.id === sessionId)
  
  const handleCanvasToggle = () => {
    if (isCanvasOpen) {
      useCanvasStore.getState().close()
    } else {
      openCanvas('markdown')
    }
  }

  const handleNewChat = () => {
    const { createSession } = useSessionStore.getState()
    const { clearChat } = useChatStore.getState()
    
    const newSession = createSession('homepage')
    clearChat()
    
    // Navigate to new session
    window.location.href = `/chat?session=${newSession.id}`
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>

        {/* Session info */}
        <div className="flex items-center gap-3">
          {currentSession ? (
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold truncate max-w-[300px]">
                {currentSession.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(currentSession.updatedAt)}
                <Separator orientation="vertical" className="h-3" />
                <span>{messages.length} messages</span>
              </div>
            </div>
          ) : (
            <h1 className="text-lg font-semibold">New Chat</h1>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <Badge variant="secondary" className="animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              Streaming...
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Canvas toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCanvasToggle}
          className={cn(
            "transition-colors",
            isCanvasOpen && "bg-accent text-accent-foreground"
          )}
        >
          <span className="hidden sm:inline mr-2">Canvas</span>
          <div className={cn(
            "w-4 h-4 border-2 rounded transition-colors",
            isCanvasOpen ? "border-primary bg-primary/20" : "border-muted-foreground"
          )} />
        </Button>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleNewChat}>
              <span>New chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share className="h-4 w-4 mr-2" />
              <span>Share chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}