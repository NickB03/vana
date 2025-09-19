# Responsive UI Patterns with shadcn/ui - Persistent Sidebar + Conditional Chat

## Component Installation for Responsive Design

### Essential Responsive Components Setup

**Phase 1: Install Core UI Components**
```bash
# Essential layout and responsive components
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add input
npx shadcn@latest add textarea

# Navigation and layout components
npx shadcn@latest add sheet          # For mobile sidebars
npx shadcn@latest add tabs           # For interface sections
npx shadcn@latest add dialog         # For modal interactions
npx shadcn@latest add dropdown-menu  # For user menus
```

**Phase 2: Install Prompt-Kit Chat Components**
```bash
# AI-optimized chat components for responsive design
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-suggestion.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/scroll-button.json"
```

**Phase 3: Install Advanced Responsive Components**
```bash
# Advanced components for complex responsive layouts
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add collapsible
npx shadcn@latest add select
npx shadcn@latest add toggle
```

### Responsive Design Dependencies

```bash
# Install responsive design utilities
npm install @radix-ui/react-collapsible
npm install @radix-ui/react-navigation-menu
npm install @radix-ui/react-sheet
npm install react-hook-form
npm install @hookform/resolvers
npm install zod
```

### Installation Validation for Responsive Components

```bash
# Verify responsive components are installed
echo "Checking responsive component installation..."
ls components/ui/ | grep -E "(sheet|tabs|dialog|collapsible|toggle)"

# Test responsive imports
node -e "console.log('Testing responsive component imports...');
try {
  require('./components/ui/sheet');
  require('./components/ui/tabs');
  require('./components/ui/dialog');
  console.log('✅ All responsive components imported successfully');
} catch(e) {
  console.log('❌ Responsive component import failed:', e.message);
}"
```

## Design System Foundation

### Theme Configuration

```typescript
// lib/theme.ts
THEME_CONFIG {
  colors: {
    primary: {
      50: "#f0f9ff",
      500: "#3b82f6", 
      900: "#1e3a8a"
    },
    secondary: {
      50: "#f8fafc",
      500: "#64748b",
      900: "#0f172a"
    },
    accent: {
      500: "#8b5cf6"
    },
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444"
  },
  
  breakpoints: {
    sm: "640px",    // Mobile landscape
    md: "768px",    // Tablet
    lg: "1024px",   // Desktop
    xl: "1280px",   // Large desktop
    "2xl": "1536px" // Extra large
  },
  
  spacing: {
    container: {
      sm: "2rem",
      md: "4rem", 
      lg: "6rem"
    },
    section: {
      sm: "3rem",
      md: "5rem",
      lg: "8rem"
    }
  },
  
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"]
    },
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }],
      sm: ["0.875rem", { lineHeight: "1.25rem" }],
      base: ["1rem", { lineHeight: "1.5rem" }],
      lg: ["1.125rem", { lineHeight: "1.75rem" }],
      xl: ["1.25rem", { lineHeight: "1.75rem" }],
      "2xl": ["1.5rem", { lineHeight: "2rem" }],
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }]
    }
  }
}
```

### Responsive Layout System

```typescript
// components/layout/Container.tsx
COMPONENT Container {
  PROPS {
    size?: "sm" | "md" | "lg" | "xl" | "full"
    padding?: "none" | "sm" | "md" | "lg"
    children: React.ReactNode
  }
  
  COMPUTED {
    containerClasses = cn(
      "mx-auto w-full",
      {
        "max-w-sm": size === "sm",
        "max-w-4xl": size === "md", 
        "max-w-6xl": size === "lg",
        "max-w-7xl": size === "xl",
        "max-w-none": size === "full"
      },
      {
        "px-4 sm:px-6 lg:px-8": padding === "sm",
        "px-6 sm:px-8 lg:px-12": padding === "md",
        "px-8 sm:px-12 lg:px-16": padding === "lg"
      }
    )
  }
  
  RENDER {
    <div className={containerClasses}>
      {children}
    </div>
  }
}

// components/layout/Grid.tsx
COMPONENT Grid {
  PROPS {
    cols?: number | { sm?: number, md?: number, lg?: number }
    gap?: "sm" | "md" | "lg"
    children: React.ReactNode
  }
  
  COMPUTED {
    gridClasses = cn(
      "grid",
      typeof cols === "number" 
        ? `grid-cols-${cols}`
        : [
            cols.sm && `grid-cols-${cols.sm}`,
            cols.md && `md:grid-cols-${cols.md}`, 
            cols.lg && `lg:grid-cols-${cols.lg}`
          ].filter(Boolean).join(" "),
      {
        "gap-2": gap === "sm",
        "gap-4": gap === "md", 
        "gap-6": gap === "lg"
      }
    )
  }
  
  RENDER {
    <div className={gridClasses}>
      {children}
    </div>
  }
}
```

## Mobile-First Responsive Patterns - Persistent Sidebar + Conditional Chat

### Layout-First Responsive Architecture

```typescript
// app/layout.tsx - Persistent Sidebar with Responsive Behavior
COMPONENT RootLayout {
  PROPS {
    children: React.ReactNode
  }
  
  STATE {
    sidebarOpen: boolean = false
  }
  
  HOOKS {
    breakpoint = useBreakpoint()
    sidebarState = useSidebarState()
  }
  
  EFFECTS {
    // Auto-close sidebar on mobile when breakpoint changes
    useEffect(() => {
      IF breakpoint.isMobile && sidebarOpen THEN
        SET sidebarOpen = false
      }
    }, [breakpoint.isMobile])
  }
  
  RENDER {
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <ChatStateProvider>
          <div className="flex h-full">
            {/* Responsive Sidebar Wrapper */}
            <ResponsiveSidebarWrapper 
              isOpen={sidebarOpen}
              onClose={() => SET sidebarOpen = false}
            >
              <VanaSidebar />
            </ResponsiveSidebarWrapper>
            
            {/* Main Content with Conditional Chat */}
            <main className={cn(
              "flex-1 transition-all duration-300",
              breakpoint.isDesktop ? "ml-0" : "ml-0",
              "overflow-hidden"
            )}>
              {/* Mobile Header */}
              {breakpoint.isMobile && (
                <MobileHeader 
                  onMenuToggle={() => SET sidebarOpen = !sidebarOpen}
                  title="Vana AI Assistant"
                />
              )}
              
              {/* Conditional Content Area */}
              <div className={cn(
                "h-full",
                breakpoint.isMobile ? "pt-16" : "pt-0"
              )}>
                {children}
              </div>
            </main>
          </div>
        </ChatStateProvider>
      </body>
    </html>
  }
}

// components/layout/ResponsiveSidebarWrapper.tsx
COMPONENT ResponsiveSidebarWrapper {
  PROPS {
    children: React.ReactNode
    isOpen: boolean
    onClose: () => void
  }
  
  HOOKS {
    breakpoint = useBreakpoint()
  }
  
  COMPUTED {
    sidebarMode = {
      mobile: "overlay",      // Sheet overlay on mobile
      tablet: "overlay",      // Sheet overlay on tablet  
      desktop: "persistent"    // Always visible on desktop
    }[breakpoint.current]
  }
  
  RENDER {
    IF sidebarMode === "persistent" THEN
      RETURN (
        <aside className="w-64 border-r bg-background flex-shrink-0">
          {children}
        </aside>
      )
    
    // Mobile/Tablet Overlay Sidebar
    RETURN (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="left" 
          className="w-64 p-0 border-r"
          hideCloseButton
        >
          {children}
        </SheetContent>
        
        {/* Custom overlay with blur effect */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </Sheet>
    )
  }
}
```

### Conditional Chat Interface Responsive Patterns

```typescript
// app/page.tsx - Responsive Conditional Rendering
COMPONENT HomePage {
  HOOKS {
    chatState = useChatState()
    breakpoint = useBreakpoint()
  }
  
  COMPUTED {
    // Responsive layout classes based on chat state and screen size
    layoutClasses = cn(
      "h-full transition-all duration-300",
      {
        // Home page layout
        "flex items-center justify-center p-4": !chatState.isActive,
        // Chat interface layout  
        "flex flex-col": chatState.isActive,
      }
    )
  }
  
  RENDER {
    <div className={layoutClasses}>
      {chatState.isActive ? (
        // Full-height chat interface
        <Suspense fallback={<ChatLoadingSkeleton />}>
          <VanaChatInterface />
        </Suspense>
      ) : (
        // Centered welcome experience
        <ResponsiveHomePage />
      )}
    </div>
  }
}

// components/vana/ResponsiveHomePage.tsx
COMPONENT ResponsiveHomePage {
  HOOKS {
    breakpoint = useBreakpoint()
    chatState = useChatState()
  }
  
  HANDLERS {
    handleCapabilityClick = (prompt: string) => {
      chatState.startChat(prompt)
    }
  }
  
  RENDER {
    <Container 
      size={breakpoint.isMobile ? "sm" : "lg"} 
      padding={breakpoint.isMobile ? "sm" : "md"}
    >
      <div className="w-full max-w-4xl mx-auto">
        {/* Welcome Section - Responsive */}
        <div className={cn(
          "text-center mb-8",
          breakpoint.isMobile ? "mb-6" : "mb-12"
        )}>
          <div className={cn(
            "mb-4",
            breakpoint.isMobile ? "mb-3" : "mb-6"
          )}>
            <VanaLogo 
              size={breakpoint.isMobile ? "md" : "lg"}
              animated={true}
            />
          </div>
          
          <ResponsiveText variant="h1" className="mb-4">
            Hi, I'm Vana
          </ResponsiveText>
          
          <ResponsiveText variant="body" className="text-muted-foreground">
            Your AI assistant for research, analysis, and creative work
          </ResponsiveText>
        </div>
        
        {/* Capability Suggestions - Responsive Grid */}
        <VanaCapabilitySuggestions 
          onCapabilityClick={handleCapabilityClick}
          layout={breakpoint.isMobile ? "stacked" : "grid"}
        />
      </div>
    </Container>
  }
}

// components/vana/VanaCapabilitySuggestions.tsx
COMPONENT VanaCapabilitySuggestions {
  PROPS {
    onCapabilityClick: (prompt: string) => void
    layout: "grid" | "stacked"
  }
  
  HOOKS {
    breakpoint = useBreakpoint()
  }
  
  COMPUTED {
    capabilities = [
      { id: "content", title: "Content Creation", prompt: "Help me create engaging content" },
      { id: "analysis", title: "Data Analysis", prompt: "Analyze my business data" },
      { id: "code", title: "Code Review", prompt: "Review my code for improvements" },
      { id: "planning", title: "Project Planning", prompt: "Help me plan a project roadmap" },
      { id: "research", title: "Research", prompt: "Research and synthesize information" },
      { id: "problem", title: "Problem Solving", prompt: "Help me solve a complex problem" }
    ]
    
    gridClasses = cn(
      "grid gap-3",
      {
        // Mobile: 1 column stacked
        "grid-cols-1": layout === "stacked" || breakpoint.isMobile,
        // Tablet: 2 columns
        "sm:grid-cols-2": layout === "grid" && !breakpoint.isMobile,
        // Desktop: 3 columns
        "lg:grid-cols-3": layout === "grid" && breakpoint.isDesktop,
      }
    )
  }
  
  RENDER {
    <div className={gridClasses}>
      {capabilities.map(capability => (
        <PromptSuggestion
          key={capability.id}
          variant="outline"
          size={breakpoint.isMobile ? "lg" : "default"}
          className={cn(
            "h-auto p-4 text-left justify-start",
            "hover:bg-accent hover:text-accent-foreground",
            "transition-all duration-200",
            breakpoint.isMobile && "min-h-[60px]"
          )}
          onClick={() => onCapabilityClick(capability.prompt)}
        >
          <div>
            <div className="font-medium">{capability.title}</div>
            {!breakpoint.isMobile && (
              <div className="text-sm text-muted-foreground mt-1">
                {capability.prompt}
              </div>
            )}
          </div>
        </PromptSuggestion>
      ))}
    </div>
  }
}
```

### Responsive Chat Interface with Sidebar Integration

```typescript
// components/vana/VanaChatInterface.tsx - Responsive Chat Layout
COMPONENT VanaChatInterface {
  HOOKS {
    breakpoint = useBreakpoint()
    chatContent = useChatContentState()
    sidebarState = useSidebarState()
  }
  
  STATE {
    showAgentPanel: boolean = !breakpoint.isMobile
  }
  
  EFFECTS {
    // Auto-hide agent panel on mobile
    useEffect(() => {
      IF breakpoint.isMobile THEN
        SET showAgentPanel = false
      ELSE
        SET showAgentPanel = true
      }
    }, [breakpoint.isMobile])
  }
  
  RENDER {
    <div className="flex flex-col h-full">
      {/* Chat Header - Responsive */}
      <ChatHeader 
        compact={breakpoint.isMobile}
        onToggleAgentPanel={() => SET showAgentPanel = !showAgentPanel}
        showAgentToggle={breakpoint.isMobile}
      />
      
      {/* Main Chat Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col">
          <ChatContainer 
            className={cn(
              "flex-1 overflow-auto",
              breakpoint.isMobile ? "px-3" : "px-6"
            )}
          >
            <ChatMessageList 
              messages={chatContent.messages}
              isStreaming={chatContent.isStreaming}
              compact={breakpoint.isMobile}
            />
          </ChatContainer>
          
          {/* Chat Input - Responsive */}
          <div className={cn(
            "border-t bg-background",
            breakpoint.isMobile ? "p-3" : "p-6"
          )}>
            <ResponsiveChatInput />
          </div>
        </div>
        
        {/* Agent Coordination Panel - Conditional */}
        {showAgentPanel && (
          <div className={cn(
            "border-l bg-background",
            breakpoint.isMobile 
              ? "absolute inset-y-0 right-0 w-80 z-50 shadow-lg" 
              : "w-80 flex-shrink-0"
          )}>
            <AgentCoordinationPanel 
              agents={chatContent.currentAgents}
              onClose={breakpoint.isMobile ? () => SET showAgentPanel = false : undefined}
            />
            
            {/* Mobile overlay */}
            {breakpoint.isMobile && (
              <div 
                className="fixed inset-0 bg-black/20 -z-10"
                onClick={() => SET showAgentPanel = false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  }
}

// components/chat/ResponsiveChatInput.tsx
COMPONENT ResponsiveChatInput {
  HOOKS {
    breakpoint = useBreakpoint()
    keyboard = useVirtualKeyboard()
    chatContent = useChatContentState()
  }
  
  STATE {
    input: string = ""
    isExpanded: boolean = false
  }
  
  EFFECTS {
    // Handle virtual keyboard on mobile
    useEffect(() => {
      IF breakpoint.isMobile && keyboard.isVisible THEN
        // Adjust chat container height for virtual keyboard
        document.documentElement.style.setProperty(
          '--chat-input-offset', 
          `${keyboard.height}px`
        )
      ELSE
        document.documentElement.style.removeProperty('--chat-input-offset')
      }
    }, [breakpoint.isMobile, keyboard.isVisible, keyboard.height])
  }
  
  HANDLERS {
    handleSubmit = async (message: string) => {
      IF !message.trim() THEN RETURN
      
      await chatContent.sendMessage(message)
      SET input = ""
      SET isExpanded = false
    }
    
    handleKeyDown = (e: KeyboardEvent) => {
      IF e.key === "Enter" && !e.shiftKey THEN
        e.preventDefault()
        handleSubmit(input)
      }
    }
  }
  
  RENDER {
    <div className="space-y-3">
      {/* Input suggestions - mobile only */}
      {breakpoint.isMobile && !input && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["Continue this", "Explain more", "Summarize"].map(suggestion => (
            <Button 
              key={suggestion}
              variant="outline" 
              size="sm"
              className="whitespace-nowrap"
              onClick={() => SET input = suggestion}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
      
      {/* Main input area */}
      <PromptInput
        value={input}
        onChange={SET input}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        placeholder="Message Vana..."
        className={cn(
          "w-full transition-all duration-200",
          breakpoint.isMobile && "text-base" // Prevent zoom on iOS
        )}
        maxHeight={breakpoint.isMobile ? 120 : 200}
        disabled={chatContent.isStreaming}
        autoFocus={!breakpoint.isMobile} // Avoid virtual keyboard on mobile
      />
      
      {/* Input controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Attachment button */}
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          {/* Voice input - mobile only */}
          {breakpoint.isMobile && (
            <Button variant="ghost" size="sm">
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Character count */}
          <span className={cn(
            "text-xs text-muted-foreground",
            input.length > 1800 && "text-warning",
            input.length > 1950 && "text-destructive"
          )}>
            {input.length}/2000
          </span>
          
          {/* Send/Stop button */}
          {chatContent.isStreaming ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={chatContent.stopGeneration}
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button 
              size="sm"
              disabled={!input.trim()}
              onClick={() => handleSubmit(input)}
            >
              <Send className="h-4 w-4" />
              {breakpoint.isMobile ? "" : "Send"}
            </Button>
          )}
        </div>
      </div>
    </div>
  }
}
```

## Responsive Navigation Patterns

### Persistent Vana Sidebar with Chat History Integration

```typescript
// components/vana/VanaSidebar.tsx - Always Rendered Sidebar
COMPONENT VanaSidebar {
  HOOKS {
    sidebarState = useSidebarState()
    chatState = useChatState()
    breakpoint = useBreakpoint()
  }
  
  HANDLERS {
    handleConversationClick = (sessionId: string) => {
      chatState.resumeSession(sessionId)
      // Auto-close mobile sidebar after selection
      IF breakpoint.isMobile THEN
        sidebarState.toggleSidebar()
      }
    }
    
    handleNewChat = () => {
      chatState.endChat() // Return to home page
      IF breakpoint.isMobile THEN
        sidebarState.toggleSidebar()
      }
    }
  }
  
  RENDER {
    <div className="flex flex-col h-full bg-background">
      {/* Sidebar Header */}
      <SidebarHeader onNewChat={handleNewChat} />
      
      {/* Search Conversations */}
      <div className="p-3 border-b">
        <SearchInput 
          placeholder="Search conversations..."
          value={sidebarState.searchQuery}
          onChange={sidebarState.searchConversations}
          className="w-full"
        />
      </div>
      
      {/* Navigation Section */}
      <div className="p-3 border-b">
        <SidebarNavigation onItemClick={breakpoint.isMobile ? sidebarState.toggleSidebar : undefined} />
      </div>
      
      {/* Chat History Section */}
      <div className="flex-1 overflow-auto">
        <ChatHistorySection 
          conversations={sidebarState.filteredConversations}
          currentSession={chatState.currentSession}
          onConversationClick={handleConversationClick}
          groupBy="date"
        />
      </div>
      
      {/* Sidebar Footer */}
      <SidebarFooter />
    </div>
  }
}

// components/vana/SidebarHeader.tsx
COMPONENT SidebarHeader {
  PROPS {
    onNewChat: () => void
  }
  
  HOOKS {
    breakpoint = useBreakpoint()
  }
  
  RENDER {
    <div className="p-4 border-b">
      <div className="flex items-center justify-between">
        {/* Vana Branding */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-lg">Vana</span>
        </div>
        
        {/* New Chat Button */}
        <Button 
          variant="ghost" 
          size={breakpoint.isMobile ? "sm" : "default"}
          onClick={onNewChat}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {!breakpoint.isMobile && "New"}
        </Button>
      </div>
    </div>
  }
}

// components/vana/ChatHistorySection.tsx
COMPONENT ChatHistorySection {
  PROPS {
    conversations: ChatSession[]
    currentSession: string | null
    onConversationClick: (sessionId: string) => void
    groupBy: "date" | "topic"
  }
  
  HOOKS {
    breakpoint = useBreakpoint()
  }
  
  COMPUTED {
    groupedConversations = useMemo(() => {
      IF groupBy === "date" THEN
        RETURN groupConversationsByDate(conversations)
      ELSE
        RETURN groupConversationsByTopic(conversations)
      }
    }, [conversations, groupBy])
  }
  
  RENDER {
    <div className="p-3 space-y-4">
      {Object.entries(groupedConversations).map(([group, sessions]) => (
        <div key={group}>
          {/* Group Header */}
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {group}
          </h3>
          
          {/* Conversation List */}
          <div className="space-y-1">
            {sessions.map(session => (
              <ConversationItem
                key={session.id}
                session={session}
                isActive={session.id === currentSession}
                onClick={() => onConversationClick(session.id)}
                compact={breakpoint.isMobile}
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Empty State */}
      {conversations.length === 0 && (
        <div className="text-center py-8">
          <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No conversations yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a chat to see your history here
          </p>
        </div>
      )}
    </div>
  }
}

// components/vana/ConversationItem.tsx
COMPONENT ConversationItem {
  PROPS {
    session: ChatSession
    isActive: boolean
    onClick: () => void
    compact?: boolean
  }
  
  STATE {
    showActions: boolean = false
  }
  
  COMPUTED {
    previewText = session.messages[0]?.content.slice(0, 60) + "..." || "New conversation"
    timeAgo = formatRelativeTime(session.createdAt)
  }
  
  RENDER {
    <div 
      className={cn(
        "group relative rounded-lg p-2 cursor-pointer transition-all duration-150",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
        compact && "p-1.5"
      )}
      onClick={onClick}
      onMouseEnter={() => SET showActions = true}
      onMouseLeave={() => SET showActions = false}
    >
      <div className="flex items-start gap-2">
        {/* Session Avatar/Icon */}
        <div className={cn(
          "flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center",
          compact ? "w-6 h-6" : "w-8 h-8"
        )}>
          <MessageCircle className={cn(
            "text-primary",
            compact ? "h-3 w-3" : "h-4 w-4"
          )} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium truncate",
            compact ? "text-sm" : "text-sm"
          )}>
            {session.title || previewText}
          </div>
          
          {!compact && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {previewText}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-1">
            {timeAgo}
          </div>
        </div>
        
        {/* Actions - Show on Hover */}
        {showActions && !compact && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  }
}
```

## Touch-Optimized Interactions - Sidebar + Chat

### Touch-Friendly Sidebar Navigation

```typescript
// components/research/TouchAgentCard.tsx
COMPONENT TouchAgentCard {
  PROPS {
    agent: AgentProgress
    compact?: boolean
  }
  
  STATE {
    isPressed: boolean = false
    isExpanded: boolean = false
  }
  
  HANDLERS {
    handleTouchStart = () -> void {
      SET isPressed = true
    }
    
    handleTouchEnd = () -> void {
      SET isPressed = false
    }
    
    handleTap = () -> void {
      IF compact THEN
        SET isExpanded = !isExpanded
      }
    }
    
    handleLongPress = () -> void {
      // Show context menu or detailed view
      showAgentDetails(agent)
    }
  }
  
  HOOKS {
    longPress = useLongPress(handleLongPress, {
      threshold: 500,
      captureEvent: true
    })
  }
  
  RENDER {
    <Card 
      className={cn(
        "touch-agent-card transition-all duration-150",
        "active:scale-95", // Tap feedback
        isPressed && "scale-95",
        compact ? "p-3" : "p-4",
        "cursor-pointer select-none"
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
      {...longPress}
    >
      <div className="space-y-3">
        {/* Agent header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AgentAvatar agent={agent} size={compact ? "sm" : "md"} />
            <div className="min-w-0">
              <h4 className={cn(
                "font-medium truncate",
                compact ? "text-sm" : "text-base"
              )}>
                {agent.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {agent.status}
              </p>
            </div>
          </div>
          
          <AgentStatusIndicator status={agent.status} />
        </div>
        
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{agent.progress}%</span>
          </div>
          <Progress 
            value={agent.progress} 
            className={cn(
              "transition-all duration-300",
              compact ? "h-1" : "h-2"
            )}
          />
        </div>
        
        {/* Expandable content on mobile */}
        {compact && (
          <Collapsible open={isExpanded}>
            <CollapsibleContent>
              <div className="pt-2 border-t space-y-2">
                {agent.currentTask && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Current Task
                    </p>
                    <p className="text-sm">{agent.currentTask}</p>
                  </div>
                )}
                
                {agent.estimatedTimeRemaining > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Time Remaining</span>
                    <span>{formatDuration(agent.estimatedTimeRemaining)}</span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </Card>
  }
}
```

### Swipe Gestures for Sidebar Navigation

```typescript
// hooks/useSidebarSwipeGestures.tsx
HOOK useSidebarSwipeGestures() {
  HOOKS {
    sidebarState = useSidebarState()
    breakpoint = useBreakpoint()
  }
  
  COMPUTED {
    swipeHandlers = useSwipeable({
      onSwipeStart: (eventData) => {
        // Only enable swipe on mobile/tablet
        IF !breakpoint.isMobile && !breakpoint.isTablet THEN
          RETURN
        }
      },
      
      onSwipedRight: (eventData) => {
        // Swipe right from left edge to open sidebar
        IF eventData.initial[0] < 50 && !sidebarState.isOpen THEN
          sidebarState.toggleSidebar()
        }
      },
      
      onSwipedLeft: (eventData) => {
        // Swipe left to close sidebar
        IF sidebarState.isOpen THEN
          sidebarState.toggleSidebar()
        }
      },
      
      trackMouse: false,
      preventDefaultTouchmoveEvent: false,
      delta: 50, // Minimum swipe distance
    })
  }
  
  RETURN swipeHandlers
}

// components/vana/SwipeableConversationItem.tsx
COMPONENT SwipeableConversationItem {
  PROPS {
    session: ChatSession
    onSelect: (sessionId: string) => void
    onDelete: (sessionId: string) => void
    onExport: (sessionId: string) => void
  }
  
  STATE {
    swipeOffset: number = 0
    isSwipeActive: boolean = false
    swipeDirection: "left" | "right" | null = null
  }
  
  HOOKS {
    swipeHandlers = useSwipeable({
      onSwipeStart: () => {
        SET isSwipeActive = true
      },
      
      onSwiping: (eventData) => {
        // Limit swipe distance and provide visual feedback
        const maxSwipe = 80
        const offset = Math.max(-maxSwipe, Math.min(maxSwipe, eventData.deltaX))
        SET swipeOffset = offset
        SET swipeDirection = offset > 0 ? "right" : "left"
      },
      
      onSwiped: (eventData) => {
        const threshold = 40
        
        IF Math.abs(eventData.deltaX) > threshold THEN
          IF eventData.deltaX > 0 THEN
            // Swipe right - Export
            onExport(session.id)
          ELSE
            // Swipe left - Delete
            onDelete(session.id)
          }
        }
        
        // Reset animation
        setTimeout(() => {
          SET swipeOffset = 0
          SET isSwipeActive = false
          SET swipeDirection = null
        }, 200)
      },
      
      trackMouse: false,
      preventDefaultTouchmoveEvent: true
    })
  }
  
  RENDER {
    <div className="relative overflow-hidden rounded-lg">
      {/* Background action indicators */}
      <div className="absolute inset-0 flex">
        {/* Export action (swipe right) */}
        <div className={cn(
          "flex items-center justify-center bg-blue-500 text-white transition-opacity duration-150",
          "w-16",
          swipeDirection === "right" && swipeOffset > 20 ? "opacity-100" : "opacity-0"
        )}>
          <Download className="h-4 w-4" />
        </div>
        
        <div className="flex-1" />
        
        {/* Delete action (swipe left) */}
        <div className={cn(
          "flex items-center justify-center bg-red-500 text-white transition-opacity duration-150",
          "w-16",
          swipeDirection === "left" && Math.abs(swipeOffset) > 20 ? "opacity-100" : "opacity-0"
        )}>
          <Trash2 className="h-4 w-4" />
        </div>
      </div>
      
      {/* Main conversation item */}
      <div 
        {...swipeHandlers}
        className={cn(
          "relative bg-background transition-transform duration-150",
          "touch-pan-y" // Allow vertical scrolling while capturing horizontal swipes
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`
        }}
        onClick={() => !isSwipeActive && onSelect(session.id)}
      >
        <ConversationItem 
          session={session}
          compact={true}
        />
      </div>
    </div>
  }
}

// components/layout/SwipeEnabledLayout.tsx - Apply to root layout
COMPONENT SwipeEnabledLayout {
  PROPS {
    children: React.ReactNode
  }
  
  HOOKS {
    swipeHandlers = useSidebarSwipeGestures()
    breakpoint = useBreakpoint()
  }
  
  RENDER {
    <div 
      {...(breakpoint.isMobile ? swipeHandlers : {})}
      className="h-full touch-pan-y"
    >
      {children}
    </div>
  }
}
```

## Responsive Typography and Spacing

### Adaptive Text Sizing

```typescript
// components/ui/ResponsiveText.tsx
COMPONENT ResponsiveText {
  PROPS {
    variant: "h1" | "h2" | "h3" | "h4" | "body" | "caption"
    className?: string
    children: React.ReactNode
  }
  
  COMPUTED {
    textClasses = cn(
      {
        // Responsive headings
        "text-2xl sm:text-3xl lg:text-4xl font-bold": variant === "h1",
        "text-xl sm:text-2xl lg:text-3xl font-semibold": variant === "h2", 
        "text-lg sm:text-xl lg:text-2xl font-semibold": variant === "h3",
        "text-base sm:text-lg lg:text-xl font-medium": variant === "h4",
        
        // Body text
        "text-sm sm:text-base": variant === "body",
        "text-xs sm:text-sm text-muted-foreground": variant === "caption"
      },
      className
    )
  }
  
  RENDER {
    <div className={textClasses}>
      {children}
    </div>
  }
}
```

### Responsive Spacing System

```typescript
// utils/spacing.ts
SPACING_UTILITIES {
  // Responsive margin/padding utilities
  responsive: {
    "space-y-responsive": "space-y-4 sm:space-y-6 lg:space-y-8",
    "space-x-responsive": "space-x-4 sm:space-x-6 lg:space-x-8", 
    "p-responsive": "p-4 sm:p-6 lg:p-8",
    "py-responsive": "py-4 sm:py-6 lg:py-8",
    "px-responsive": "px-4 sm:px-6 lg:px-8"
  },
  
  // Section spacing
  section: {
    "section-spacing": "py-8 sm:py-12 lg:py-16"
  },
  
  // Container spacing 
  container: {
    "container-padding": "px-4 sm:px-6 lg:px-8"
  }
}

// Hook for consistent spacing
HOOK useResponsiveSpacing() {
  breakpoint = useBreakpoint()
  
  RETURN {
    sectionSpacing: breakpoint.isMobile ? "py-8" : breakpoint.isTablet ? "py-12" : "py-16",
    containerPadding: breakpoint.isMobile ? "px-4" : breakpoint.isTablet ? "px-6" : "px-8",
    itemSpacing: breakpoint.isMobile ? "space-y-4" : "space-y-6"
  }
}
```

## Complete Installation Script for Responsive Design

### Automated Component Installation

```bash
#!/bin/bash
# install-responsive-components.sh
# Complete installation script for Vana responsive design

echo "Installing Vana Responsive Design Components..."

# Phase 1: Core UI Components
echo "Phase 1: Installing core UI components..."
npx shadcn@latest add card button separator avatar badge progress input textarea
npx shadcn@latest add sheet tabs dialog dropdown-menu

# Phase 2: Prompt-Kit Components  
echo "Phase 2: Installing Prompt-Kit chat components..."
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-suggestion.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/scroll-button.json"

# Phase 3: Advanced Components
echo "Phase 3: Installing advanced responsive components..."
npx shadcn@latest add toast alert collapsible select toggle

# Install dependencies
echo "Installing responsive design dependencies..."
npm install @radix-ui/react-collapsible @radix-ui/react-navigation-menu @radix-ui/react-sheet
npm install react-hook-form @hookform/resolvers zod

echo "Validating installation..."
# Run validation
if [ -d "components/ui" ]; then
  echo "✅ Components directory exists"
  echo "Installed components: $(ls components/ui/ | wc -l)"
else
  echo "❌ Components directory missing"
  exit 1
fi

echo "✅ Responsive design components installation complete!"
```

### Troubleshooting Responsive Component Installation

**Common Issues:**

1. **Missing mobile Sheet component:**
   ```bash
   npx shadcn@latest add sheet
   # Verify: ls components/ui/sheet.tsx
   ```

2. **Collapsible components not working:**
   ```bash
   npm install @radix-ui/react-collapsible
   npx shadcn@latest add collapsible
   ```

3. **Prompt-Kit components failing:**
   ```bash
   # Use exact URLs with quotes
   npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
   ```

This responsive UI pattern system ensures Vana's persistent sidebar + conditional chat architecture provides an optimal experience across all device sizes while maintaining seamless navigation and sophisticated AI interaction capabilities.