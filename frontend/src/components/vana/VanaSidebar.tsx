'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button'
import { ChatSession } from '@/hooks/useChatStream'
import { Search, Plus, MoreHorizontal, Share, Pen, Archive, Trash2, Settings } from 'lucide-react'
import { SettingsModal } from '@/components/settings/SettingsModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface VanaSidebarProps {
  sessions?: ChatSession[] | null
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => string
  onDeleteSession?: (sessionId: string) => void
  onRenameSession?: (sessionId: string, newTitle: string) => void
  onArchiveSession?: (sessionId: string) => void
  onClearSession?: () => void
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

function SessionMenuItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onArchive
}: {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete?: () => void
  onRename?: () => void
  onArchive?: () => void
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleDelete = () => {
    setShowDeleteDialog(false)
    onDelete?.()
  }

  const sessionTitle = getSessionTitle(session)

  return (
    <>
      <div
        className="group/session relative flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarMenuButton
          isActive={isActive}
          onClick={onSelect}
          className="flex-1 pr-8"
        >
          <span className="truncate">{sessionTitle}</span>
        </SidebarMenuButton>

        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`absolute right-1 transition-opacity h-6 w-6 p-0 border-0 focus-visible:ring-2 focus-visible:ring-offset-0 ${
                isHovered || dropdownOpen ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
              tabIndex={isHovered || dropdownOpen ? 0 : -1}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Session options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => {}}>
              <Share className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename?.()}>
              <Pen className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive?.()}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{sessionTitle}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function VanaSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  onArchiveSession,
  onClearSession
}: VanaSidebarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleNewChat = () => {
    // Clear the active session before navigating to ensure clean state
    onClearSession?.()
    // Navigate to homepage with auto-focus parameter
    router.push('/?focus=true')
  }

  const toggleSearch = () => {
    setIsSearching(!isSearching)
    if (isSearching) {
      setSearchQuery('')
    }
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

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return safeSessions

    const query = searchQuery.toLowerCase()
    return safeSessions.filter(session => {
      const title = getSessionTitle(session).toLowerCase()
      const messages = Array.isArray(session.messages) ? session.messages : []
      const hasMatchingMessage = messages.some(msg =>
        msg && msg.content && msg.content.toLowerCase().includes(query)
      )
      return title.includes(query) || hasMatchingMessage
    })
  }, [safeSessions, searchQuery])

  const groupedSessions = useMemo(() =>
    groupSessionsByDate(filteredSessions),
    [filteredSessions]
  )

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        {isSearching ? (
          <div className="flex flex-1 items-center gap-2 px-2">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              autoFocus
            />
            <Button variant="ghost" size="sm" className="size-8" onClick={toggleSearch}>
              <span className="text-xs">✕</span>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-row items-center gap-2 px-2">
              <div className="bg-primary/10 size-8 rounded-md"></div>
              <div className="text-md font-base text-primary tracking-tight">
                Vana
              </div>
            </div>
            <Button variant="ghost" className="size-8" onClick={toggleSearch}>
              <Search className="size-4" />
            </Button>
          </>
        )}
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

                  return (
                    <SessionMenuItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => onSelectSession(session.id)}
                      onDelete={() => onDeleteSession?.(session.id)}
                      onRename={() => onRenameSession?.(session.id, session.title || '')}
                      onArchive={() => onArchiveSession?.(session.id)}
                    />
                  )
                }).filter(Boolean)}
                </SidebarMenu>
              </SidebarGroup>
            )
          }).filter(Boolean)
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="size-4" />
          <span>Settings</span>
        </Button>
      </SidebarFooter>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  )
}

export default VanaSidebar
