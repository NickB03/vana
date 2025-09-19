'use client'

import { Suspense, useState, useRef } from 'react'
import { useChatState } from '@/hooks/useChatState'
import VanaHomePage from '@/components/vana/VanaHomePage'
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Button } from '@/components/ui/button'
import { SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
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
} from "lucide-react"

// Enhanced chat interface with Prompt-Kit components
function VanaChatInterface() {
  const { messages, endChat, sendMessage, sessionHistory, currentSession } = useChatState()
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async () => {
    if (!inputValue.trim()) return
    
    setIsLoading(true)
    try {
      await sendMessage(inputValue)
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

  // Get current conversation title from history
  const currentConversation = messages.length > 0 ? 
    (sessionHistory.find(session => session.id === currentSession)?.title || "Project roadmap discussion") : 
    "Chat with Vana"

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground">{currentConversation}</div>
        <div className="ml-auto">
          <Button 
            variant="ghost"
            size="sm"
            onClick={endChat}
          >
            Back to Home
          </Button>
        </div>
      </header>

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
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
                {messages.map((message, index) => {
                  const isAssistant = message.role === 'assistant'
                  const isLastMessage = index === messages.length - 1

                  return (
                    <Message
                      key={message.id}
                      className={cn(
                        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                        isAssistant ? "items-start" : "items-end"
                      )}
                    >
                      {isAssistant ? (
                        <div className="group flex w-full flex-col gap-0">
                          <MessageContent
                            className="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                            markdown
                          >
                            {message.content}
                          </MessageContent>
                          <MessageActions
                            className={cn(
                              "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                              isLastMessage && "opacity-100"
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <ThumbsUp />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Downvote" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <ThumbsDown />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </div>
                      ) : (
                        <div className="group flex flex-col items-end gap-1">
                          <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                            {message.content}
                          </MessageContent>
                          <MessageActions
                            className={cn(
                              "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                            )}
                          >
                            <MessageAction tooltip="Edit" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <Pencil />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Delete" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
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
                })}
              </>
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
            isLoading={isLoading}
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
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Plus size={18} />
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="Search">
                    <Button variant="outline" className="rounded-full">
                      <Globe size={18} />
                      Search
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="More actions">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Voice input">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

                  <Button
                    size="icon"
                    disabled={!inputValue.trim() || isLoading}
                    onClick={handleSubmit}
                    className="size-9 rounded-full"
                  >
                    {!isLoading ? (
                      <ArrowUp size={18} />
                    ) : (
                      <span className="size-3 rounded-xs bg-white" />
                    )}
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
  
  return (
    <SidebarInset>
      {isActive ? (
        // Chat Interface - Conditional rendering
        <Suspense fallback={<ChatLoadingSkeleton />}>
          <VanaChatInterface />
        </Suspense>
      ) : (
        // Home Page - Always available when not in chat
        <div className="flex h-full flex-col">
          <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="text-foreground">Home</div>
          </header>
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <VanaHomePage />
          </div>
        </div>
      )}
    </SidebarInset>
  )
}
