# Component Pseudocode - Chat Interface & Home Page

## Overview

This document provides pseudocode for the main chat interface components and home page, based on the layout-first architecture with persistent sidebar and conditional chat rendering using Prompt-Kit and shadcn/ui components.

## Core Layout Components

### VanaHomePage Component

```typescript
// VanaHomePage.tsx
COMPONENT VanaHomePage {
  PROPS {
    onStartChat: (prompt: string) -> void
  }
  
  STATE {
    selectedCapability: string | null = null
    isTransitioning: boolean = false
  }
  
  HOOKS {
    chatState = useChatState()
  }
  
  FUNCTIONS {
    handleSuggestionClick = (suggestion: string) -> void {
      SET isTransitioning = true
      
      // Brief animation delay for smooth transition
      setTimeout(() => {
        onStartChat(suggestion)
        SET isTransitioning = false
      }, 200)
    }
    
    handleCustomPromptSubmit = (prompt: string) -> void {
      IF prompt.trim().length === 0 THEN RETURN
      
      onStartChat(prompt.trim())
    }
    
    getCapabilitySuggestions = () -> string[] {
      RETURN [
        "Analyze business data and generate insights",
        "Generate creative content and marketing copy", 
        "Review code quality and suggest improvements",
        "Plan project roadmap and timeline",
        "Research market trends and competitors",
        "Create technical documentation and guides"
      ]
    }
  }
  
  RENDER {
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">V</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Hi, I'm Vana</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your Virtual Autonomous Network Agent. I can help you with research, 
            analysis, content creation, and complex problem-solving using 
            coordinated AI agents.
          </p>
        </div>
      </div>
      
      {/* Capability Suggestions */}
      <div className="w-full mb-8">
        <h2 className="text-lg font-semibold mb-4 text-center">
          What can I help you with today?
        </h2>
        
        <VanaCapabilitySuggestions
          suggestions={getCapabilitySuggestions()}
          onSuggestionClick={handleSuggestionClick}
          isLoading={isTransitioning}
        />
      </div>
      
      {/* Custom Prompt Input */}
      <div className="w-full max-w-2xl">
        <PromptInput
          onSubmit={handleCustomPromptSubmit}
          placeholder="Or describe your specific needs..."
          isLoading={isTransitioning}
          className="w-full"
          autoFocus={false}
          showActions={false}
        />
      </div>
      
      {/* Feature Highlights */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold mb-2">Multi-Agent Coordination</h3>
          <p className="text-sm text-muted-foreground">
            Multiple specialized AI agents work together on complex tasks
          </p>
        </div>
        
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold mb-2">Real-time Processing</h3>
          <p className="text-sm text-muted-foreground">
            Watch AI agents collaborate in real-time with live updates
          </p>
        </div>
        
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold mb-2">Advanced Reasoning</h3>
          <p className="text-sm text-muted-foreground">
            Sophisticated analysis and problem-solving capabilities
          </p>
        </div>
      </div>
    </div>
  }
}
```

### VanaCapabilitySuggestions Component

```typescript
// VanaCapabilitySuggestions.tsx
COMPONENT VanaCapabilitySuggestions {
  PROPS {
    suggestions: string[]
    onSuggestionClick: (suggestion: string) -> void
    isLoading: boolean = false
  }
  
  STATE {
    hoveredIndex: number | null = null
  }
  
  FUNCTIONS {
    handleSuggestionClick = (suggestion: string, index: number) -> void {
      SET hoveredIndex = index
      onSuggestionClick(suggestion)
    }
    
    getSuggestionIcon = (index: number) -> ReactNode {
      icons = [
        <BarChart className="h-4 w-4" />,
        <PenTool className="h-4 w-4" />,
        <Code className="h-4 w-4" />,
        <Calendar className="h-4 w-4" />,
        <Search className="h-4 w-4" />,
        <FileText className="h-4 w-4" />
      ]
      
      RETURN icons[index % icons.length]
    }
  }
  
  RENDER {
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {suggestions.map((suggestion, index) => (
        <PromptSuggestion
          key={index}
          variant="outline"
          size="lg"
          disabled={isLoading}
          className={cn(
            "p-4 h-auto text-left justify-start transition-all duration-200",
            "hover:scale-105 hover:shadow-md",
            hoveredIndex === index && "ring-2 ring-primary"
          )}
          onClick={() => handleSuggestionClick(suggestion, index)}
          onMouseEnter={() => SET hoveredIndex = index}
          onMouseLeave={() => SET hoveredIndex = null}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getSuggestionIcon(index)}
            </div>
            <div className="text-sm leading-relaxed">
              {suggestion}
            </div>
          </div>
        </PromptSuggestion>
      ))}
    </div>
  }
}
```

### VanaChatInterface Component

```typescript
// VanaChatInterface.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

COMPONENT VanaChatInterface {
  PROPS {
    initialPrompt?: string
  }
  
  STATE {
    messages: ChatMessage[] = []
    isLoading: boolean = false
    currentAgents: AgentStatus[] = []
    streamingMessageId: string | null = null
  }
  
  HOOKS {
    chatState = useChatState()
    sseConnection = useSSE({
      sessionId: chatState.currentSession,
      onMessage: handleSSEMessage
    })
    messagesEndRef = useRef<HTMLDivElement>(null)
  }
  
  FUNCTIONS {
    initializeChat = ASYNC () -> void {
      IF initialPrompt THEN
        AWAIT sendMessage(initialPrompt)
      }
    }
    
    sendMessage = ASYNC (content: string) -> void {
      IF NOT content.trim() THEN RETURN
      
      SET isLoading = true
      
      // Add user message
      userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString()
      }
      
      SET messages = [...messages, userMessage]
      
      // Add placeholder assistant message
      assistantMessageId = crypto.randomUUID()
      assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant", 
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true
      }
      
      SET messages = [...messages, assistantMessage]
      SET streamingMessageId = assistantMessageId
      
      TRY {
        // Send to backend via SSE
        AWAIT chatAPI.sendMessage({
          sessionId: chatState.currentSession,
          content: content.trim(),
          messageId: assistantMessageId
        })
        
      } CATCH (error) {
        // Remove assistant message on error
        SET messages = messages.filter(m => m.id !== assistantMessageId)
        SET streamingMessageId = null
        
        // Show error message
        errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "An error occurred while processing your message. Please try again.",
          timestamp: new Date().toISOString(),
          isError: true
        }
        
        // Log actual error for debugging
        console.error('Chat message error:', error)
        
        SET messages = [...messages, errorMessage]
      } FINALLY {
        SET isLoading = false
      }
    }
    
    handleSSEMessage = (event: SSEEvent) -> void {
      SWITCH event.type {
        CASE "message_chunk":
          updateStreamingMessage(event.data.messageId, event.data.chunk)
          BREAK
          
        CASE "message_complete":
          finalizeStreamingMessage(event.data.messageId)
          BREAK
          
        CASE "agent_status":
          updateAgentStatus(event.data.agents)
          BREAK
          
        CASE "error":
          handleStreamingError(event.data.error)
          BREAK
      }
    }
    
    updateStreamingMessage = (messageId: string, chunk: string) -> void {
      SET messages = messages.map(message => 
        message.id === messageId
          ? { ...message, content: message.content + chunk }
          : message
      )
      
      scrollToBottom()
    }
    
    finalizeStreamingMessage = (messageId: string) -> void {
      SET messages = messages.map(message => 
        message.id === messageId
          ? { ...message, isStreaming: false }
          : message
      )
      
      SET streamingMessageId = null
      SET isLoading = false
    }
    
    updateAgentStatus = (agents: AgentStatus[]) -> void {
      SET currentAgents = agents
    }
    
    scrollToBottom = () -> void {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    
    handleRetry = (messageId: string) -> void {
      message = messages.find(m => m.id === messageId)
      IF message AND message.role === "user" THEN
        sendMessage(message.content)
      }
    }
    
    handleCopy = (content: string) -> void {
      navigator.clipboard.writeText(content)
      // Show toast notification
    }
    
    handleEdit = (messageId: string, newContent: string) -> void {
      SET messages = messages.map(message => 
        message.id === messageId
          ? { ...message, content: newContent, isEdited: true }
          : message
      )
    }
  }
  
  EFFECTS {
    useEffect(() => {
      initializeChat()
    }, [])
    
    useEffect(() => {
      scrollToBottom()
    }, [messages])
  }
  
  RENDER {
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer className="h-full">
          <div className="space-y-4 p-4">
            {messages.map((message, index) => (
              <Message
                key={message.id}
                variant={message.role === "user" ? "user" : "assistant"}
                className={cn(
                  "max-w-none",
                  message.isError && "border-destructive"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {message.role === "user" ? (
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                        <span className="text-white font-bold">V</span>
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {message.role === "user" ? "You" : "Vana"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.isEdited && (
                        <Badge variant="secondary" className="text-xs">
                          edited
                        </Badge>
                      )}
                    </div>
                    
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {message.isStreaming ? (
                        <div className="flex items-center gap-2">
                          <span>{message.content}</span>
                          <div className="w-2 h-4 bg-primary animate-pulse rounded" />
                        </div>
                      ) : (
                        <ReactMarkdown
                          skipHtml={true}
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[
                            [
                              rehypeSanitize,
                              {
                                ...defaultSchema,
                                attributes: {
                                  ...defaultSchema.attributes,
                                  code: [
                                    ...(defaultSchema.attributes?.code || []),
                                    ['className', 'language-*']
                                  ]
                                },
                                tagNames: [
                                  'p', 'br', 'strong', 'em', 'code', 'pre',
                                  'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 
                                  'h3', 'h4', 'h5', 'h6', 'a', 'img'
                                ],
                                protocols: {
                                  href: ['http', 'https', 'mailto'],
                                  src: ['http', 'https']
                                }
                              }
                            ]
                          ]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                    
                    {/* Message Actions */}
                    {NOT message.isStreaming && (
                      <MessageActions className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(message.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        
                        {message.role === "user" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(message.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {message.isError && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(message.id)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </MessageActions>
                    )}
                  </div>
                </div>
              </Message>
            ))}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ChatContainer>
      </div>
      
      {/* Agent Status Panel */}
      {currentAgents.length > 0 && (
        <div className="border-t p-4 bg-muted/50">
          <VanaAgentStatus agents={currentAgents} />
        </div>
      )}
      
      {/* Prompt Input */}
      <div className="border-t p-4">
        <PromptInput
          onSubmit={sendMessage}
          isLoading={isLoading}
          placeholder={isLoading ? "Vana is thinking..." : "Continue the conversation..."}
          disabled={Boolean(streamingMessageId)}
          maxHeight={200}
          showActions={true}
        />
      </div>
    </div>
  }
}
```

### VanaSidebar Component

```typescript
// VanaSidebar.tsx
COMPONENT VanaSidebar {
  STATE {
    isCollapsed: boolean = false
    conversations: ConversationSummary[] = []
    searchQuery: string = ""
    filteredConversations: ConversationSummary[] = []
  }
  
  HOOKS {
    chatState = useChatState()
    isMobile = useMediaQuery("(max-width: 768px)")
  }
  
  FUNCTIONS {
    loadConversations = ASYNC () -> void {
      TRY {
        conversations = AWAIT chatAPI.getConversations()
        SET conversations = conversations
        SET filteredConversations = conversations
      } CATCH (error) {
        console.error("Failed to load conversations:", error)
      }
    }
    
    handleSearch = (query: string) -> void {
      SET searchQuery = query
      
      IF query.trim() === "" THEN
        SET filteredConversations = conversations
      ELSE
        filtered = conversations.filter(conv => 
          conv.title.toLowerCase().includes(query.toLowerCase()) ||
          conv.preview.toLowerCase().includes(query.toLowerCase())
        )
        SET filteredConversations = filtered
      }
    }
    
    handleNewChat = () -> void {
      chatState.endChat()
    }
    
    handleConversationSelect = (conversationId: string) -> void {
      chatState.startChat("", conversationId)
    }
    
    handleConversationDelete = ASYNC (conversationId: string) -> void {
      TRY {
        AWAIT chatAPI.deleteConversation(conversationId)
        SET conversations = conversations.filter(c => c.id !== conversationId)
        SET filteredConversations = filteredConversations.filter(c => c.id !== conversationId)
      } CATCH (error) {
        console.error("Failed to delete conversation:", error)
      }
    }
    
    groupConversationsByTime = (conversations: ConversationSummary[]) -> GroupedConversations {
      now = new Date()
      today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      groups = {
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: []
      }
      
      conversations.forEach(conv => {
        convDate = new Date(conv.updatedAt)
        
        IF convDate >= today THEN
          groups.today.push(conv)
        ELSE IF convDate >= yesterday THEN
          groups.yesterday.push(conv)
        ELSE IF convDate >= lastWeek THEN
          groups.lastWeek.push(conv)
        ELSE IF convDate >= lastMonth THEN
          groups.lastMonth.push(conv)
        ELSE
          groups.older.push(conv)
        }
      })
      
      RETURN groups
    }
  }
  
  EFFECTS {
    useEffect(() => {
      loadConversations()
    }, [])
  }
  
  RENDER {
    groupedConversations = groupConversationsByTime(filteredConversations)
    
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar 
        className="w-80 border-r"
        collapsible="icon"
      >
        <SidebarHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <h2 className="font-semibold">Vana</h2>
          </div>
          
          <Button 
            onClick={handleNewChat}
            className="w-full mt-3"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </SidebarHeader>
        
        <SidebarContent>
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto">
            {Object.entries(groupedConversations).map(([groupKey, conversations]) => (
              conversations.length > 0 && (
                <div key={groupKey} className="p-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
                    {groupKey === "today" ? "Today" :
                     groupKey === "yesterday" ? "Yesterday" :
                     groupKey === "lastWeek" ? "Last 7 days" :
                     groupKey === "lastMonth" ? "Last 30 days" :
                     "Older"}
                  </h3>
                  
                  <div className="space-y-1">
                    {conversations.map(conversation => (
                      <div
                        key={conversation.id}
                        className={cn(
                          "group relative rounded-lg p-2 cursor-pointer hover:bg-accent transition-colors",
                          chatState.currentSession === conversation.id && "bg-accent"
                        )}
                        onClick={() => handleConversationSelect(conversation.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {conversation.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {conversation.preview}
                            </p>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleConversationDelete(conversation.id)
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </SidebarContent>
        
        <SidebarFooter className="border-t p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>{conversations.length} conversations</span>
          </div>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  }
}
```

## State Management Hooks

### useChatState Hook

```typescript
// hooks/useChatState.ts
HOOK useChatState() {
  STORE ChatState {
    isActive: boolean = false
    currentSession: string | null = null
    messages: ChatMessage[] = []
    agentStatus: AgentStatus[] = []
    isLoading: boolean = false
    error: string | null = null
  }
  
  ACTIONS {
    startChat = (prompt: string, existingSessionId?: string) -> void {
      IF existingSessionId THEN
        SET currentSession = existingSessionId
      ELSE
        SET currentSession = crypto.randomUUID()
      }
      
      SET isActive = true
      SET error = null
      
      IF prompt.trim() THEN
        // Add initial user message
        initialMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: prompt.trim(),
          timestamp: new Date().toISOString()
        }
        
        SET messages = [initialMessage]
      }
    }
    
    endChat = () -> void {
      SET isActive = false
      SET currentSession = null
      SET messages = []
      SET agentStatus = []
      SET isLoading = false
      SET error = null
    }
    
    addMessage = (message: ChatMessage) -> void {
      SET messages = [...get().messages, message]
    }
    
    updateMessage = (messageId: string, updates: Partial<ChatMessage>) -> void {
      SET messages = get().messages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    }
    
    setAgentStatus = (agents: AgentStatus[]) -> void {
      SET agentStatus = agents
    }
    
    setLoading = (loading: boolean) -> void {
      SET isLoading = loading
    }
    
    setError = (error: string | null) -> void {
      SET error = error
    }
    
    clearMessages = () -> void {
      SET messages = []
    }
  }
  
  COMPUTED {
    hasActiveConversation = () -> boolean {
      RETURN get().isActive && get().messages.length > 0
    }
    
    lastMessage = () -> ChatMessage | null {
      messages = get().messages
      RETURN messages.length > 0 ? messages[messages.length - 1] : null
    }
    
    isStreaming = () -> boolean {
      RETURN get().messages.some(msg => msg.isStreaming === true)
    }
  }
  
  PERSISTENCE {
    name: "vana-chat-state"
    partialize: (state) => ({
      currentSession: state.currentSession,
      messages: state.messages
    })
  }
}
```

### useSSE Hook

```typescript
// hooks/useSSE.ts
HOOK useSSE(config: SSEConfig) {
  PROPS {
    sessionId: string | null
    onMessage: (event: SSEEvent) -> void
    onError?: (error: Error) -> void
    onOpen?: () -> void
    onClose?: () -> void
  }
  
  STATE {
    isConnected: boolean = false
    isReconnecting: boolean = false
    connectionAttempts: number = 0
    eventSource: EventSource | null = null
  }
  
  CONSTANTS {
    MAX_RECONNECT_ATTEMPTS = 5
    RECONNECT_DELAY_BASE = 1000
    RECONNECT_DELAY_MAX = 30000
  }
  
  FUNCTIONS {
    connect = () -> void {
      IF NOT config.sessionId OR eventSource THEN RETURN
      
      url = `/api/chat/stream?sessionId=${config.sessionId}`
      
      TRY {
        SET eventSource = new EventSource(url)
        
        eventSource.onopen = () => {
          SET isConnected = true
          SET isReconnecting = false
          SET connectionAttempts = 0
          config.onOpen?.()
        }
        
        eventSource.onmessage = (event: MessageEvent) -> void {
          TRY {
            data = JSON.parse(event.data)
            config.onMessage(data)
          } CATCH (parseError) {
            console.error("Failed to parse SSE message:", parseError)
          }
        }
        
        eventSource.onerror = (error: Event) -> void {
          SET isConnected = false
          
          IF eventSource?.readyState === EventSource.CLOSED THEN
            handleReconnect()
          ELSE
            config.onError?.(new Error("SSE connection error"))
          }
        }
        
        eventSource.onclose = () -> void {
          SET isConnected = false
          config.onClose?.()
        }
        
      } CATCH (error) {
        console.error("Failed to create SSE connection:", error)
        config.onError?.(error)
      }
    }
    
    disconnect = () -> void {
      IF eventSource THEN
        eventSource.close()
        SET eventSource = null
      }
      
      SET isConnected = false
      SET isReconnecting = false
      SET connectionAttempts = 0
    }
    
    handleReconnect = () -> void {
      IF connectionAttempts >= MAX_RECONNECT_ATTEMPTS THEN
        config.onError?.(new Error("Max reconnection attempts reached"))
        RETURN
      }
      
      SET isReconnecting = true
      SET connectionAttempts = connectionAttempts + 1
      
      delay = Math.min(
        RECONNECT_DELAY_BASE * Math.pow(2, connectionAttempts - 1),
        RECONNECT_DELAY_MAX
      )
      
      setTimeout(() => {
        disconnect()
        connect()
      }, delay)
    }
  }
  
  EFFECTS {
    useEffect(() => {
      IF config.sessionId THEN
        connect()
      }
      
      RETURN () => disconnect()
    }, [config.sessionId])
    
    useEffect(() => {
      RETURN () => disconnect()
    }, [])
  }
  
  RETURN {
    isConnected,
    isReconnecting,
    connectionAttempts,
    connect,
    disconnect
  }
}
```

## Agent Status Components

### VanaAgentStatus Component

```typescript
// VanaAgentStatus.tsx
COMPONENT VanaAgentStatus {
  PROPS {
    agents: AgentStatus[]
  }
  
  STATE {
    expandedAgent: string | null = null
  }
  
  FUNCTIONS {
    // Static mapping to prevent Tailwind purging dynamic classes
    statusColorClasses = {
      idle: "bg-gray-500",
      thinking: "bg-yellow-500", 
      working: "bg-blue-500",
      completed: "bg-green-500",
      error: "bg-red-500"
    } as const
    
    getStatusColorClass = (status: string) -> string {
      RETURN statusColorClasses[status as keyof typeof statusColorClasses] || "bg-gray-500"
    }
    
    getStatusIcon = (status: string) -> ReactNode {
      SWITCH status {
        CASE "idle": RETURN <Clock className="h-3 w-3" />
        CASE "thinking": RETURN <Brain className="h-3 w-3 animate-pulse" />
        CASE "working": RETURN <Loader2 className="h-3 w-3 animate-spin" />
        CASE "completed": RETURN <CheckCircle className="h-3 w-3" />
        CASE "error": RETURN <AlertCircle className="h-3 w-3" />
        DEFAULT: RETURN <Circle className="h-3 w-3" />
      }
    }
    
    calculateOverallProgress = () -> number {
      IF agents.length === 0 THEN RETURN 0
      
      totalProgress = agents.reduce((sum, agent) => sum + (agent.progress || 0), 0)
      RETURN Math.round(totalProgress / agents.length)
    }
  }
  
  RENDER {
    overallProgress = calculateOverallProgress()
    activeAgents = agents.filter(agent => agent.status !== "idle")
    
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Agent Coordination
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {activeAgents.length} active
          </Badge>
        </div>
        
        {overallProgress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-1" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {agents.map(agent => (
            <div 
              key={agent.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                "hover:bg-accent cursor-pointer",
                expandedAgent === agent.id && "bg-accent"
              )}
              onClick={() => 
                SET expandedAgent = expandedAgent === agent.id ? null : agent.id
              }
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getStatusColorClass(agent.status)
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {agent.name}
                    </span>
                    {getStatusIcon(agent.status)}
                  </div>
                  
                  {agent.currentTask && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {agent.currentTask}
                    </p>
                  )}
                </div>
              </div>
              
              {agent.progress !== undefined && agent.progress > 0 && (
                <div className="text-xs text-muted-foreground">
                  {agent.progress}%
                </div>
              )}
              
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                expandedAgent === agent.id && "rotate-180"
              )} />
            </div>
            
            {expandedAgent === agent.id && agent.details && (
              <div className="ml-5 p-2 bg-muted rounded-lg">
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                  {JSON.stringify(agent.details, null, 2)}
                </pre>
              </div>
            )}
          ))}
        </div>
      </CardContent>
    </Card>
  }
}
```

## Utility Functions

### Chat API Client

```typescript
// utils/chatAPI.ts
CLASS ChatAPI {
  PROPERTIES {
    baseURL: string = "/api/chat"
    apiClient: ApiClient
  }
  
  CONSTRUCTOR() {
    this.apiClient = new ApiClient({
      baseURL: this.baseURL
    })
  }
  
  METHODS {
    sendMessage = ASYNC (params: SendMessageParams) -> ChatResponse {
      RETURN AWAIT this.apiClient.request({
        url: "/send",
        method: "POST",
        data: {
          sessionId: params.sessionId,
          content: params.content,
          messageId: params.messageId
        }
      })
    }
    
    getConversations = ASYNC () -> ConversationSummary[] {
      RETURN AWAIT this.apiClient.request({
        url: "/conversations",
        method: "GET"
      })
    }
    
    getConversation = ASYNC (conversationId: string) -> Conversation {
      RETURN AWAIT this.apiClient.request({
        url: `/conversations/${conversationId}`,
        method: "GET"
      })
    }
    
    deleteConversation = ASYNC (conversationId: string) -> void {
      AWAIT this.apiClient.request({
        url: `/conversations/${conversationId}`,
        method: "DELETE"
      })
    }
    
    createSession = ASYNC () -> ChatSession {
      RETURN AWAIT this.apiClient.request({
        url: "/sessions",
        method: "POST"
      })
    }
  }
}

// Export singleton instance
export const chatAPI = new ChatAPI()
```

## Security Configuration

### ReactMarkdown Security Implementation

The `ReactMarkdown` component has been secured with comprehensive sanitization to prevent XSS attacks and malicious HTML injection:

```typescript
// Security Configuration Details:
<ReactMarkdown
  skipHtml={true}                    // Blocks all HTML tags by default
  remarkPlugins={[remarkGfm]}       // GitHub Flavored Markdown support
  rehypePlugins={[
    [
      rehypeSanitize,
      {
        ...defaultSchema,            // Base security schema
        attributes: {
          ...defaultSchema.attributes,
          code: [
            ...(defaultSchema.attributes?.code || []),
            ['className', 'language-*'] // Allow syntax highlighting classes
          ]
        },
        tagNames: [                  // Strict allowlist of safe elements
          'p', 'br', 'strong', 'em', 'code', 'pre',
          'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 
          'h3', 'h4', 'h5', 'h6', 'a', 'img'
        ],
        protocols: {                 // Restrict link/image protocols
          href: ['http', 'https', 'mailto'],
          src: ['http', 'https']
        }
      }
    ]
  ]}
>
  {message.content}
</ReactMarkdown>
```

### Blocked Malicious Content Examples

The following malicious markdown patterns will be safely sanitized:

```markdown
<!-- XSS via script tags - BLOCKED -->
<script>alert('XSS')</script>

<!-- XSS via img onerror - BLOCKED -->
<img src="x" onerror="alert('XSS')">

<!-- XSS via javascript protocol - BLOCKED -->
[Click me](javascript:alert('XSS'))

<!-- XSS via data URLs - BLOCKED -->
<img src="data:text/html,<script>alert('XSS')</script>">

<!-- HTML injection - BLOCKED -->
<iframe src="http://malicious.site"></iframe>

<!-- Event handlers - BLOCKED -->
<div onclick="alert('XSS')">Click me</div>

<!-- Form elements - BLOCKED -->
<form><input type="text"></form>
```

### Allowed Safe Content

The configuration allows these safe markdown elements:

```markdown
<!-- Text formatting - ALLOWED -->
**Bold text** and *italic text*

<!-- Code blocks with syntax highlighting - ALLOWED -->
```javascript
console.log('Hello, world!');
```

<!-- Lists - ALLOWED -->
1. Ordered list item
- Unordered list item

<!-- Safe links - ALLOWED -->
[Safe link](https://example.com)

<!-- Safe images - ALLOWED -->
![Alt text](https://example.com/image.jpg)

<!-- Headers and quotes - ALLOWED -->
# Header 1
> Blockquote text
```

### Dependencies Required

Install these security dependencies in your project:

```bash
npm install remark-gfm rehype-sanitize
```

### Security Best Practices

1. **Never disable sanitization** - Always use `skipHtml: true` and `rehypeSanitize`
2. **Minimal allowlist** - Only allow HTML elements that are absolutely necessary
3. **Protocol restrictions** - Limit link/image protocols to `http`, `https`, and `mailto`
4. **Regular updates** - Keep sanitization libraries updated to latest versions
5. **Content validation** - Validate user input on the backend before storing
6. **CSP headers** - Implement Content Security Policy headers as additional protection

This comprehensive pseudocode provides the foundation for implementing a modern chat interface with Vana that uses:

1. **Layout-first architecture** with persistent sidebar and conditional chat rendering
2. **Prompt-Kit components** for AI-optimized chat patterns
3. **Zustand state management** for clean chat activation state
4. **Real-time SSE streaming** for live agent coordination
5. **shadcn/ui components** for consistent UI patterns
6. **Mobile-responsive design** with proper touch interactions
7. **Comprehensive security** with sanitized markdown rendering

The pseudocode aligns with the component research findings and implements the corrected architecture patterns documented in memory with enterprise-grade security controls.