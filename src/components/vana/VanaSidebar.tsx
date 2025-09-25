'use client'

import React, { useMemo } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button'
import { ChatSession } from '@/hooks/useChatStream'
import { Search, Plus } from 'lucide-react'

interface VanaSidebarProps {
  sessions?: ChatSession[] | null
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => string
}

function getSessionTitle(session: ChatSession): string {
  // Defensive check for session object
  if (!session || typeof session !== 'object') {
    return 'Invalid session'
  }

  // Use explicit title if available
  const explicitTitle = session.title?.trim()
  if (explicitTitle) {
    return explicitTitle
  }

  // Safe array access with fallback
  const messages = Array.isArray(session.messages) ? session.messages : []
  const firstUserMessage = messages.find(message =>
    message &&
    typeof message === 'object' &&
    message.role === 'user' &&
    message.content?.trim()
  )

  if (firstUserMessage?.content) {
    const content = firstUserMessage.content.trim()

    // Clean up the title - remove URLs, excessive punctuation
    let title = content
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // If the message is a question, try to extract the key part
    if (title.includes('?')) {
      // Take the first question if there are multiple
      const firstQuestion = title.split('?')[0] + '?'
      title = firstQuestion.trim()
    }

    // Truncate smartly at word boundary
    if (title.length > 60) {
      title = title.slice(0, 57).trim()
      // Don't cut in the middle of a word
      const lastSpace = title.lastIndexOf(' ')
      if (lastSpace > 40) {
        title = title.slice(0, lastSpace)
      }
      title += '...'
    }

    return title
  }

  return 'New conversation'
}


function groupSessionsByDate(sessions: ChatSession[]) {
  // Defensive check for sessions array
  if (!Array.isArray(sessions)) {
    return []
  }

  const now = new Date()
  const buckets: Record<string, ChatSession[]> = {}

  // Safe iteration with validation
  sessions.forEach(session => {
    // Validate session object
    if (!session || typeof session !== 'object') {
      return // Skip invalid sessions
    }

    const activitySource = session.updated_at || session.created_at
    const activityDate = activitySource ? new Date(activitySource) : null
    
    // Safe date calculation with error handling
    let diffDays: number
    try {
      diffDays = activityDate && !isNaN(activityDate.getTime())
        ? Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
        : Number.POSITIVE_INFINITY
    } catch {
      diffDays = Number.POSITIVE_INFINITY
    }

    let label = 'Earlier'
    if (diffDays === 0) label = 'Today'
    else if (diffDays === 1) label = 'Yesterday'
    else if (diffDays < 7) label = 'Last 7 days'
    else if (diffDays < 30) label = 'Last month'

    if (!buckets[label]) {
      buckets[label] = []
    }
    buckets[label].push(session)
  })

  const order = ['Today', 'Yesterday', 'Last 7 days', 'Last month', 'Earlier']
  return order
    .filter(label => Array.isArray(buckets[label]) && buckets[label].length > 0)
    .map(label => ({ label, items: buckets[label] || [] }))
}

export function VanaSidebar({ sessions, activeSessionId, onSelectSession, onCreateSession }: VanaSidebarProps) {
  const handleNewChat = () => {
    const newSessionId = onCreateSession()
    onSelectSession(newSessionId)
  }

  // Memoized safe sessions processing
  const safeSessions = useMemo(() => {
    if (!Array.isArray(sessions)) return []
    return sessions.filter(session => 
      session && 
      typeof session === 'object' && 
      session.id
    )
  }, [sessions])

  const groupedSessions = useMemo(() => 
    groupSessionsByDate(safeSessions), 
    [safeSessions]
  )

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <div className="bg-primary/10 size-8 rounded-md"></div>
          <div className="text-md font-base text-primary tracking-tight">
            Vana
          </div>
        </div>
        <Button variant="ghost" className="size-8">
          <Search className="size-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={handleNewChat}
          >
            <Plus className="size-4" />
            <span>New Chat</span>
          </Button>
        </div>
        {groupedSessions.length === 0 ? (
          <SidebarGroup>
            <p className="px-4 py-2 text-sm text-muted-foreground">
              Start a conversation to see it listed here.
            </p>
          </SidebarGroup>
        ) : (
          groupedSessions.map(group => {
            // Additional validation for group structure
            if (!group || !group.label || !Array.isArray(group.items)) {
              return null
            }
            
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarMenu>
                {(group.items || []).map(session => {
                  // Additional safety check for each session
                  if (!session || !session.id) {
                    return null
                  }

                  const sessionTitle = getSessionTitle(session)

                  return (
                    <SidebarMenuButton
                      key={session.id}
                      isActive={session.id === activeSessionId}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <span className="truncate">{sessionTitle}</span>
                    </SidebarMenuButton>
                  )
                }).filter(Boolean)}
                </SidebarMenu>
              </SidebarGroup>
            )
          }).filter(Boolean)
        )}
      </SidebarContent>
    </Sidebar>
  )
}

export default VanaSidebar
