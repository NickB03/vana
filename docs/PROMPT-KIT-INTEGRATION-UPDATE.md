# Prompt-Kit Integration Update Requirements

## Current Implementation Status

### ✅ Already Implemented Components
The Vana project **already uses prompt-kit components** extensively:

1. **Chat Container** (`/frontend/src/components/prompt-kit/chat-container.tsx`)
   - ChatContainerRoot with auto-scroll
   - ChatContainerContent with proper spacing

2. **Message Components** (`/frontend/src/components/prompt-kit/message.tsx`)
   - Message wrapper
   - MessageContent with markdown support
   - MessageActions with tooltips
   - MessageAction for individual buttons

3. **Prompt Input** (`/frontend/src/components/prompt-kit/prompt-input.tsx`)
   - PromptInput with form handling
   - PromptInputTextarea with auto-resize
   - PromptInputActions container
   - PromptInputAction for buttons

4. **Current Actions Implemented**:
   - **Assistant Messages**: Copy, Upvote, Downvote
   - **User Messages**: Edit, Delete, Copy
   - **Input Actions**: Add, Search, More, Voice, Send

## 🔴 Missing Critical Features for MVP

### 1. **Regenerate Response Action** (PRIORITY: HIGH)
The conversation-actions pattern from prompt-kit includes a regenerate button, but it's not implemented:

```typescript
// MISSING: Regenerate action for assistant messages
<MessageAction tooltip="Regenerate response" delayDuration={100}>
  <Button
    variant="ghost"
    size="icon"
    className="rounded-full"
    onClick={() => handleRegenerateMessage(message.id)}
  >
    <RotateCcw />
  </Button>
</MessageAction>
```

### 2. **Functional Action Handlers** (PRIORITY: HIGH)
Currently, most actions are `disabled`. Need to implement:

```typescript
// Required handlers
const handleEditMessage = async (messageId: string, newContent: string) => {
  // Update message content
  // Re-trigger AI response if needed
}

const handleDeleteMessage = async (messageId: string) => {
  // Delete message and all responses after it
  // Update chat history
}

const handleRegenerateMessage = async (messageId: string) => {
  // Regenerate AI response for this message
  // Stream new response
}

const handleUpvote = async (messageId: string) => {
  // Send feedback to backend
  // Update UI state
}

const handleDownvote = async (messageId: string) => {
  // Send feedback to backend
  // Update UI state
}
```

### 3. **Thought Process Display** (PRIORITY: HIGH)
Missing the "thinking" indicator similar to ChatGPT:

```typescript
// MISSING: Thought bubble component
interface ThoughtBubbleProps {
  status: 'thinking' | 'searching' | 'analyzing' | 'writing'
  detail?: string
}

const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({ status, detail }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
    <div className="animate-pulse">●●●</div>
    <span className="capitalize">{status}</span>
    {detail && <span className="text-xs">({detail})</span>}
  </div>
)
```

### 4. **Streaming Message Display** (PRIORITY: HIGH)
Current implementation doesn't show character-by-character streaming:

```typescript
// MISSING: Streaming message component
const StreamingMessage: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => (
  <MessageContent className="prose" markdown>
    {content}
    {isStreaming && <span className="animate-pulse">▊</span>}
  </MessageContent>
)
```

### 5. **Edit Mode UI** (PRIORITY: MEDIUM)
Need inline editing capability:

```typescript
// MISSING: Edit mode for messages
const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
const [editContent, setEditContent] = useState('')

// In render:
{editingMessageId === message.id ? (
  <PromptInput
    value={editContent}
    onValueChange={setEditContent}
    onSubmit={() => handleSaveEdit(message.id, editContent)}
    onCancel={() => setEditingMessageId(null)}
  />
) : (
  <MessageContent>{message.content}</MessageContent>
)}
```

## 📋 Backend API Requirements

### New Endpoints Needed:

```typescript
// 1. Regenerate message
POST /api/messages/{id}/regenerate
Response: SSE stream with new response

// 2. Edit message
PUT /api/messages/{id}
Body: { content: string }
Response: Updated message + regenerated AI response

// 3. Delete message
DELETE /api/messages/{id}
Response: Success status

// 4. Feedback
POST /api/messages/{id}/feedback
Body: { type: 'upvote' | 'downvote', reason?: string }
Response: Feedback stored confirmation
```

## 🚀 Implementation Plan Updates

### Phase 1: Enable Existing Actions (2-3 days)
1. Remove `disabled` prop from all action buttons
2. Implement handler functions for:
   - Copy (✅ already working)
   - Edit (needs implementation)
   - Delete (needs implementation)
   - Upvote/Downvote (needs implementation)

### Phase 2: Add Missing Features (3-4 days)
1. Add Regenerate button to assistant messages
2. Implement thought process display
3. Add streaming cursor/animation
4. Create edit mode UI

### Phase 3: Backend Integration (3-4 days)
1. Create required API endpoints
2. Update SSE events for regeneration
3. Implement feedback storage
4. Add message history management

### Phase 4: Polish (2-3 days)
1. Add loading states for all actions
2. Implement optimistic updates
3. Add error handling and retry logic
4. Test all interaction flows

## 🎯 Success Criteria

- [ ] All action buttons functional (not disabled)
- [ ] Regenerate response working
- [ ] Edit message capability
- [ ] Delete with cascade deletion
- [ ] Upvote/Downvote feedback recorded
- [ ] Thought process visualization
- [ ] Smooth streaming display
- [ ] Error recovery for all actions

## 💡 Code Example: Complete Implementation

```typescript
// Complete conversation actions implementation
function ChatView() {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [thoughtProcess, setThoughtProcess] = useState<ThoughtProcess | null>(null)

  const handleRegenerateMessage = async (messageId: string) => {
    // Find the message and regenerate
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    // Clear subsequent messages
    const messageIndex = messages.findIndex(m => m.id === messageId)
    setMessages(messages.slice(0, messageIndex + 1))

    // Start regeneration
    setThoughtProcess({ status: 'thinking' })
    await sendMessage(messages[messageIndex - 1].content, true) // regenerate flag
    setThoughtProcess(null)
  }

  const handleEditMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (message) {
      setEditingMessageId(messageId)
      setEditContent(message.content)
    }
  }

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    // Update message
    await updateMessage(messageId, newContent)

    // If user message, regenerate assistant response
    const message = messages.find(m => m.id === messageId)
    if (message?.role === 'user') {
      const nextMessage = messages[messages.indexOf(message) + 1]
      if (nextMessage?.role === 'assistant') {
        await handleRegenerateMessage(nextMessage.id)
      }
    }

    setEditingMessageId(null)
  }

  const handleDeleteMessage = async (messageId: string) => {
    // Delete message and all subsequent
    const messageIndex = messages.findIndex(m => m.id === messageId)
    setMessages(messages.slice(0, messageIndex))
    await deleteMessage(messageId)
  }

  const handleFeedback = async (messageId: string, type: 'upvote' | 'downvote') => {
    await sendFeedback(messageId, type)
    // Update UI to show feedback recorded
  }

  return (
    // Render with all actions enabled
    <MessageActions>
      <MessageAction tooltip="Copy">
        <Button onClick={() => handleCopyMessage(message.content)}>
          <Copy />
        </Button>
      </MessageAction>

      {message.role === 'assistant' && (
        <>
          <MessageAction tooltip="Regenerate">
            <Button onClick={() => handleRegenerateMessage(message.id)}>
              <RotateCcw />
            </Button>
          </MessageAction>
          <MessageAction tooltip="Good response">
            <Button onClick={() => handleFeedback(message.id, 'upvote')}>
              <ThumbsUp />
            </Button>
          </MessageAction>
          <MessageAction tooltip="Bad response">
            <Button onClick={() => handleFeedback(message.id, 'downvote')}>
              <ThumbsDown />
            </Button>
          </MessageAction>
        </>
      )}

      {message.role === 'user' && (
        <>
          <MessageAction tooltip="Edit">
            <Button onClick={() => handleEditMessage(message.id)}>
              <Pencil />
            </Button>
          </MessageAction>
          <MessageAction tooltip="Delete">
            <Button onClick={() => handleDeleteMessage(message.id)}>
              <Trash />
            </Button>
          </MessageAction>
        </>
      )}
    </MessageActions>
  )
}
```

## 📊 Comparison with Reference Implementation

| Feature | Current Vana | Prompt-Kit Reference | Required Update |
|---------|--------------|---------------------|-----------------|
| Message Actions | ✅ Implemented | ✅ | Enable handlers |
| Copy Action | ✅ Working | ✅ | None |
| Edit Action | ⚠️ Disabled | ✅ | Implement handler |
| Delete Action | ⚠️ Disabled | ✅ | Implement handler |
| Regenerate | ❌ Missing | ✅ | Add button + handler |
| Upvote/Downvote | ⚠️ Disabled | ✅ | Implement handlers |
| Thought Process | ❌ Missing | ✅ | Add component |
| Streaming Display | ⚠️ Basic | ✅ | Add cursor animation |
| Edit Mode UI | ❌ Missing | ✅ | Add inline editing |

## Summary

The Vana project **already uses prompt-kit components correctly** but needs to:
1. **Enable disabled actions** by implementing handlers
2. **Add regenerate response** capability
3. **Implement thought process** visualization
4. **Enhance streaming display** with cursor
5. **Create backend endpoints** for all actions

The UI structure is correct and follows prompt-kit patterns. The main work is implementing the functionality behind the already-present UI elements.