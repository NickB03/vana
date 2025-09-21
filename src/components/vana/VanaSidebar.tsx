'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'
import { ChatSession } from '@/hooks/useChatStream'
import { Search, Plus } from 'lucide-react'

interface VanaSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => string
}

function getSessionTitle(session: ChatSession): string {
  const explicitTitle = session.title?.trim()
  if (explicitTitle) {
    return explicitTitle
  }

  const firstUserMessage = session.messages.find(message =>
    message.role === 'user' && message.content?.trim()
  )

  if (firstUserMessage?.content) {
    return firstUserMessage.content.trim().slice(0, 60)
  }

  return 'New conversation'
}

function getSessionPreview(session: ChatSession): string {
  const messagesInReverse = [...session.messages].reverse()
  const lastMeaningfulMessage = messagesInReverse.find(message =>
    message.role !== 'system' && message.content?.trim()
  )

  if (lastMeaningfulMessage?.content) {
    return lastMeaningfulMessage.content.trim().slice(0, 80)
  }

  if (session.final_report?.trim()) {
    return session.final_report.trim().slice(0, 80)
  }

  return 'No messages yet'
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const now = new Date()
  const buckets: Record<string, ChatSession[]> = {}

  sessions.forEach(session => {
    const activitySource = session.updated_at || session.created_at
    const activityDate = activitySource ? new Date(activitySource) : null
    const diffDays = activityDate
      ? Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
      : Number.POSITIVE_INFINITY

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
    .filter(label => buckets[label]?.length)
    .map(label => ({ label, items: buckets[label] }))
}

export function VanaSidebar({ sessions, activeSessionId, onSelectSession, onCreateSession }: VanaSidebarProps) {
  const handleNewChat = () => {
    const newSessionId = onCreateSession()
    onSelectSession(newSessionId)
  }

  const groupedSessions = groupSessionsByDate(sessions)

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
            <SidebarGroupContent>
              <p className="px-4 py-2 text-sm text-muted-foreground">
                Start a conversation to see it listed here.
              </p>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          groupedSessions.map(group => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(session => {
                    const sessionTitle = getSessionTitle(session)
                    const preview = getSessionPreview(session)
                    const activitySource = session.updated_at || session.created_at
                    const relativeTime = activitySource
                      ? formatRelativeTime(activitySource)
                      : 'Just now'

                    return (
                      <SidebarMenuItem key={session.id}>
                        <SidebarMenuButton
                          isActive={session.id === activeSessionId}
                          onClick={() => onSelectSession(session.id)}
                        >
                          <div className="flex flex-col gap-1 overflow-hidden text-left">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">{sessionTitle}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {relativeTime}
                              </span>
                            </div>
                            <span className="truncate text-xs text-muted-foreground">
                              {preview}
                            </span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
    </Sidebar>
  )
}

export default VanaSidebar
