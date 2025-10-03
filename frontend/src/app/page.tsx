'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useChatStream, ChatStreamReturn, useChatStore } from '@/hooks/useChatStream'
import { apiClient } from '@/lib/api/client'
import VanaHomePage from '@/components/vana/VanaHomePage'
import VanaSidebar from '@/components/vana/VanaSidebar'
import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/prompt-kit/chat-container'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@/components/prompt-kit/message'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { ScrollButton } from '@/components/prompt-kit/scroll-button'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import {
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from 'lucide-react'

function ChatView({ chat, onExit }: { chat: ChatStreamReturn; onExit: () => void }) {
  const { messages, sendMessage, isStreaming, currentSession, error } = chat
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [messagesFeedback, setMessagesFeedback] = useState<Record<string, 'upvote' | 'downvote' | null>>({})
  const [thoughtProcess, setThoughtProcess] = useState<{
    messageId: string | null
    status: 'thinking' | 'complete' | null
    isVisible: boolean
  }>({
    messageId: null,
    status: null,
    isVisible: false
  })
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Console log to verify state initialization - removed to prevent infinite re-renders
  // Only log once on mount
  useEffect(() => {
    // ChatView state initialized - use proper logger if needed
  }, [])

  useEffect(() => {
    const viewport = chatContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | undefined
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length])

  const handleSubmit = async () => {
    if (!inputValue.trim()) return

    setIsSubmitting(true)
    try {
      await sendMessage(inputValue.trim())
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // Step 4: Edit message handlers with error handling
  const handleEditMessage = (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId)
      if (!message) {
        console.error('Message not found:', messageId)
        return
      }
      // Use Zustand store for edit state management
      if (currentSession?.id) {
        const { setEditingMessage } = useChatStore.getState()
        setEditingMessage(currentSession.id, messageId)
      }
      setEditingMessageId(messageId)
      setEditContent(message.content)
      // Edit message action - use proper logger if needed
    } catch (error) {
      console.error('Error in handleEditMessage:', error)
    }
  }

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    try {
      if (!newContent.trim()) {
        console.warn('Cannot save empty message')
        return
      }

      if (!currentSession?.id) {
        console.error('No current session for message edit')
        return
      }

      // Call backend API to save edit
      await apiClient.editMessage(messageId, newContent, false) // Don't trigger regeneration by default

      // Update local state
      setEditingMessageId(null)

      // Update in Zustand store
      const { updateMessageContent, setEditingMessage } = useChatStore.getState()
      updateMessageContent(currentSession.id, messageId, newContent)
      setEditingMessage(currentSession.id, null)

      // Message edit saved - use proper logger if needed
    } catch (error) {
      console.error('Error in handleSaveEdit:', error)
      // Keep edit mode active on error
    }
  }

  const handleCancelEdit = () => {
    try {
      setEditingMessageId(null)
      setEditContent('')
      // Edit cancelled - use proper logger if needed
    } catch (error) {
      console.error('Error in handleCancelEdit:', error)
    }
  }

  // Step 5: Delete message handler with error handling
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const confirmDelete = window.confirm('Delete this message and all subsequent responses?')
      if (!confirmDelete) return

      if (!currentSession?.id) {
        console.error('No current session for message deletion')
        return
      }

      // Deleting message - use proper logger if needed

      // Call backend API to delete message
      await apiClient.deleteMessage(messageId)

      // Update in Zustand store (this will be handled by SSE events from backend)
      // But we can also update locally for immediate feedback
      const { deleteMessageAndSubsequent } = useChatStore.getState()
      deleteMessageAndSubsequent(currentSession.id, messageId)

      // Message deleted successfully - use proper logger if needed
    } catch (error) {
      console.error('Error in handleDeleteMessage:', error)
    }
  }

  // Step 6: Feedback handlers with error handling
  const handleUpvote = async (messageId: string) => {
    try {
      if (!currentSession?.id) {
        console.error('No current session for feedback')
        return
      }

      const currentFeedback = messagesFeedback[messageId]
      const newFeedback = currentFeedback === 'upvote' ? null : 'upvote'

      // Update local state immediately for responsive UI
      setMessagesFeedback(prev => ({
        ...prev,
        [messageId]: newFeedback
      }))

      // Submit feedback to backend if not null
      if (newFeedback) {
        await apiClient.submitMessageFeedback(messageId, newFeedback)
      }

      // Update Zustand store
      const { updateFeedback } = useChatStore.getState()
      updateFeedback(currentSession.id, messageId, newFeedback)

      // Upvoted message - use proper logger if needed
    } catch (error) {
      console.error('Error in handleUpvote:', error)
      // Revert local state on error
      const originalFeedback = messagesFeedback[messageId]
      setMessagesFeedback(prev => ({
        ...prev,
        [messageId]: originalFeedback
      }))
    }
  }

  const handleDownvote = async (messageId: string) => {
    try {
      if (!currentSession?.id) {
        console.error('No current session for feedback')
        return
      }

      const currentFeedback = messagesFeedback[messageId]
      const newFeedback = currentFeedback === 'downvote' ? null : 'downvote'

      // Update local state immediately for responsive UI
      setMessagesFeedback(prev => ({
        ...prev,
        [messageId]: newFeedback
      }))

      // Submit feedback to backend if not null
      if (newFeedback) {
        await apiClient.submitMessageFeedback(messageId, newFeedback)
      }

      // Update Zustand store
      const { updateFeedback } = useChatStore.getState()
      updateFeedback(currentSession.id, messageId, newFeedback)

      // Downvoted message - use proper logger if needed
    } catch (error) {
      console.error('Error in handleDownvote:', error)
      // Revert local state on error
      const originalFeedback = messagesFeedback[messageId]
      setMessagesFeedback(prev => ({
        ...prev,
        [messageId]: originalFeedback
      }))
    }
  }

  // Step 7: Regenerate message handler with error handling
  const handleRegenerateMessage = async (messageId: string) => {
    try {
      if (isStreaming) {
        console.warn('Cannot regenerate while streaming')
        return
      }

      if (!currentSession?.id) {
        console.error('No current session for regeneration')
        return
      }

      // Regenerating message - use proper logger if needed

      // Find the assistant message
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) {
        console.error('Message not found for regeneration:', messageId)
        return
      }

      const message = messages[messageIndex]
      if (message.role !== 'assistant') {
        console.error('Only assistant messages can be regenerated')
        return
      }

      // Set thought process
      setThoughtProcess({
        messageId,
        status: 'thinking',
        isVisible: true
      })

      // Call backend API to regenerate message
      await apiClient.regenerateMessage(messageId)

      // The regeneration progress will be handled by SSE events
      // Update Zustand store to mark message as regenerating
      const { updateSessionMeta } = useChatStore.getState()
      updateSessionMeta(currentSession.id, {
        regeneratingMessageId: messageId
      })

      // Regeneration started - use proper logger if needed
    } catch (error) {
      console.error('Error in handleRegenerateMessage:', error)
      // Reset thought process on error
      setThoughtProcess({
        messageId: null,
        status: null,
        isVisible: false
      })
    }
  }

  const conversationTitle =
    currentSession?.title?.trim() ||
    currentSession?.messages[0]?.content.slice(0, 60) ||
    'Chat with Vana'
  const disableInput = isSubmitting || isStreaming

  return (
    <ErrorBoundary
      componentName="ChatView"
      allowRetry={true}
      showErrorDetails={false}
    >
      <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground truncate" title={conversationTitle}>
          {conversationTitle}
        </div>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={onExit}>
            Back to Home
          </Button>
        </div>
      </header>

      {error ? (
        <div className="border-b border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl">💬</span>
                  </div>
                  <h3 className="mb-2 font-semibold">Ready to start our conversation!</h3>
                  <p className="text-sm">
                    Ask me anything or choose from the suggestions below.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isAssistant = message.role === 'assistant'
                const isLastMessage = index === messages.length - 1

                return (
                  <Message
                    key={message.id}
                    className={cn(
                      'mx-auto flex w-full max-w-3xl flex-col gap-2 px-6',
                      isAssistant ? 'items-start' : 'items-end'
                    )}
                  >
                    {isAssistant ? (
                      <div className="group flex w-full flex-col gap-0">
                        {/* Thought process display */}
                        {thoughtProcess &&
                         thoughtProcess.messageId === message.id &&
                         thoughtProcess.isVisible && (
                          <MessageContent className="text-muted-foreground italic mb-2 opacity-80">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex space-x-1">
                                <span className="animate-pulse">●</span>
                                <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                                <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                              </div>
                              <span>{thoughtProcess.status === 'thinking' ? 'Regenerating response...' : 'Processing...'}</span>
                            </div>
                          </MessageContent>
                        )}
                        <MessageContent className="prose flex-1 rounded-lg bg-transparent p-0" markdown>
                          {message.content}
                        </MessageContent>
                        <MessageActions
                          className={cn(
                            '-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                            isLastMessage && 'opacity-100'
                          )}
                        >
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => handleCopyMessage(message.content)}
                            >
                              <Copy />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Regenerate response" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => handleRegenerateMessage(message.id)}
                              disabled={isStreaming}
                            >
                              <RefreshCw />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Upvote" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "rounded-full",
                                messagesFeedback[message.id] === 'upvote' && "text-green-600 bg-green-50"
                              )}
                              onClick={() => handleUpvote(message.id)}
                            >
                              <ThumbsUp />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Downvote" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "rounded-full",
                                messagesFeedback[message.id] === 'downvote' && "text-red-600 bg-red-50"
                              )}
                              onClick={() => handleDownvote(message.id)}
                            >
                              <ThumbsDown />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      </div>
                    ) : (
                      <div className="group flex flex-col items-end gap-1">
                        {/* Edit mode UI switching */}
                        {editingMessageId === message.id ? (
                          <div className="w-full max-w-[85%] sm:max-w-[75%]">
                            <PromptInput
                              value={editContent}
                              onValueChange={setEditContent}
                              onSubmit={() => handleSaveEdit(message.id, editContent)}
                              className="rounded-2xl"
                            >
                              <PromptInputTextarea
                                placeholder="Edit your message"
                                className="min-h-[40px] px-4 py-2"
                              />
                              <PromptInputActions>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(message.id, editContent)}
                                >
                                  Save
                                </Button>
                              </PromptInputActions>
                            </PromptInput>
                          </div>
                        ) : (
                          <MessageContent className="max-w-[85%] rounded-3xl bg-muted px-5 py-2.5 text-primary sm:max-w-[75%]">
                            {message.content}
                          </MessageContent>
                        )}
                        <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <MessageAction tooltip="Edit" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => handleEditMessage(message.id)}
                            >
                              <Pencil />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Delete" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => handleCopyMessage(message.content)}
                            >
                              <Copy />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      </div>
                    )}
                  </Message>
                )
              })
            )}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            isLoading={disableInput}
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="Ask anything"
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Add a new action">
                    <Button variant="outline" size="icon" className="size-9 rounded-full" disabled>
                      <Plus size={18} />
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="Search">
                    <Button variant="outline" className="rounded-full" disabled>
                      <Globe size={18} />
                      Search
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="More actions">
                    <Button variant="outline" size="icon" className="size-9 rounded-full" disabled>
                      <MoreHorizontal size={18} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Voice input">
                    <Button variant="outline" size="icon" className="size-9 rounded-full" disabled>
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

                  <Button
                    size="icon"
                    disabled={!inputValue.trim() || disableInput}
                    onClick={handleSubmit}
                    className="size-9 rounded-full"
                  >
                    <ArrowUp size={18} />
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
    </ErrorBoundary>
  )
}

function ChatLoadingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    </div>
  )
}

function HomeView({ onStartChat, isBusy }: { onStartChat: (prompt: string) => void; isBusy: boolean }) {
  return (
    <ErrorBoundary
      componentName="HomeView"
      allowRetry={true}
      showErrorDetails={false}
    >
      <div className="flex h-full flex-col">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground">Home</div>
      </header>
      <div className="flex flex-1 items-center justify-center overflow-auto">
        <VanaHomePage onStartChat={onStartChat} isBusy={isBusy} />
      </div>
    </div>
    </ErrorBoundary>
  )
}

export default function HomePage() {
  const chat = useChatStream()
  const sessions = chat.getAllSessions()

  // Clear session on mount to always show home page when navigating to /
  useEffect(() => {
    chat.switchSession(null)
  }, []) // Empty dependency array = run only once on mount

  // Use refs to access chat methods without dependency on chat object
  const chatRef = useRef(chat)
  chatRef.current = chat

  const handleStartChat = useCallback(async (prompt: string) => {
    const currentChat = chatRef.current
    let targetSessionId = currentChat.sessionId
    if (!targetSessionId) {
      targetSessionId = currentChat.createNewSession()
    }
    currentChat.switchSession(targetSessionId)
    await currentChat.sendMessage(prompt)
  }, [])

  const handleCreateSession = () => {
    const newSessionId = chat.createNewSession()
    chat.switchSession(newSessionId)
    return newSessionId
  }

  const handleSelectSession = (sessionId: string) => {
    chat.switchSession(sessionId)
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Delete from backend
      const result = await apiClient.deleteSession(sessionId)
      if (result.success) {
        // Delete from local store
        useChatStore.getState().deleteSession(sessionId)
        // Session deleted successfully - use proper logger if needed
      } else {
        console.error('Failed to delete session:', result.message)
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const handleExitChat = () => {
    chat.switchSession(null)
  }

  const isChatActive = Boolean(chat.sessionId)

  return (
    <ErrorBoundary
      componentName="HomePage"
      allowRetry={true}
      showErrorDetails={false}
      showHomeButton={false}
    >
      <div className="flex h-screen w-full">
        <ErrorBoundary
          componentName="VanaSidebar"
          allowRetry={true}
          showErrorDetails={false}
        >
          <VanaSidebar
            sessions={sessions}
            activeSessionId={chat.sessionId}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            onDeleteSession={handleDeleteSession}
          />
        </ErrorBoundary>
        <SidebarInset>
          {isChatActive ? (
            <Suspense fallback={<ChatLoadingSkeleton />}>
              <ChatView chat={chat} onExit={handleExitChat} />
            </Suspense>
          ) : (
            <HomeView onStartChat={handleStartChat} isBusy={chat.isStreaming} />
          )}
        </SidebarInset>
      </div>
    </ErrorBoundary>
  )
}
