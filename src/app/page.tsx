'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useChatStream, ChatStreamReturn } from '@/hooks/useChatStream'
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
  ThumbsDown,
  ThumbsUp,
  Trash,
} from 'lucide-react'

function ChatView({ chat, onExit }: { chat: ChatStreamReturn; onExit: () => void }) {
  const { messages, sendMessage, isStreaming, currentSession, error } = chat
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

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

  const conversationTitle =
    currentSession?.title?.trim() ||
    currentSession?.messages[0]?.content.slice(0, 60) ||
    'Chat with Vana'
  const disableInput = isSubmitting || isStreaming

  return (
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
                          <MessageAction tooltip="Upvote" delayDuration={100}>
                            <Button variant="ghost" size="icon" className="rounded-full" disabled>
                              <ThumbsUp />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Downvote" delayDuration={100}>
                            <Button variant="ghost" size="icon" className="rounded-full" disabled>
                              <ThumbsDown />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      </div>
                    ) : (
                      <div className="group flex flex-col items-end gap-1">
                        <MessageContent className="max-w-[85%] rounded-3xl bg-muted px-5 py-2.5 text-primary sm:max-w-[75%]">
                          {message.content}
                        </MessageContent>
                        <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <MessageAction tooltip="Edit" delayDuration={100}>
                            <Button variant="ghost" size="icon" className="rounded-full" disabled>
                              <Pencil />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Delete" delayDuration={100}>
                            <Button variant="ghost" size="icon" className="rounded-full" disabled>
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
    <div className="flex h-full flex-col">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground">Home</div>
      </header>
      <div className="flex flex-1 items-center justify-center overflow-auto">
        <VanaHomePage onStartChat={onStartChat} isBusy={isBusy} />
      </div>
    </div>
  )
}

export default function HomePage() {
  const chat = useChatStream()
  const sessions = chat.getAllSessions()

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

  const handleExitChat = () => {
    chat.switchSession(null)
  }

  const isChatActive = Boolean(chat.sessionId)

  return (
    <div className="flex h-screen w-full">
      <VanaSidebar
        sessions={sessions}
        activeSessionId={chat.sessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
      />
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
  )
}
