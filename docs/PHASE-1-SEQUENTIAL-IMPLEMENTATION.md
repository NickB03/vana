# Phase 1: Sequential Implementation Guide

## Frontend Button Wiring - Step-by-Step Instructions

### Prerequisites
- Ensure you're on branch: `feature/chat-actions-implementation`
- Frontend dev server running: `cd frontend && npm run dev`
- Have the following files open in your editor:
  - `/frontend/src/app/page.tsx`
  - `/frontend/src/hooks/useChatStream.ts`

---

## 📝 Step-by-Step Implementation Sequence

### Step 1: Update Imports (5 min)
**File**: `/frontend/src/app/page.tsx` (line 28-38)

```typescript
import {
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,  // ADD THIS LINE (Note: some versions use RotateCcw)
  ThumbsDown,
  ThumbsUp,
  Trash,
} from 'lucide-react'
```

**Verify**: Check that RefreshCw icon imports without errors

---

### Step 2: Add State Variables (10 min)
**File**: `/frontend/src/app/page.tsx` (after line 44)

```typescript
function ChatView({ chat, onExit }: { chat: ChatStreamReturn; onExit: () => void }) {
  const { messages, sendMessage, isStreaming, currentSession, error } = chat
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ADD THESE NEW STATE VARIABLES
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [messagesFeedback, setMessagesFeedback] = useState<Record<string, 'upvote' | 'downvote' | null>>({})
  const [thoughtProcess, setThoughtProcess] = useState<{
    messageId: string;
    status: string;
    isVisible: boolean;
  } | null>(null)
```

---

### Step 3: Extend Zustand Store (20 min)
**File**: `/frontend/src/hooks/useChatStream.ts`

Add to the ChatSession interface (around line 50):
```typescript
interface ChatSession {
  // ... existing properties
  editingMessageId?: string | null;
  messagesFeedback?: Record<string, 'upvote' | 'downvote' | null>;
}
```

Add new actions to the store (around line 100):
```typescript
// In the useChatStore definition, add:
setEditingMessage: (sessionId: string, messageId: string | null) => {
  set(state => ({
    sessions: {
      ...state.sessions,
      [sessionId]: {
        ...state.sessions[sessionId],
        editingMessageId: messageId
      }
    }
  }))
},

updateMessageContent: (sessionId: string, messageId: string, content: string) => {
  set(state => {
    const session = state.sessions[sessionId]
    if (!session) return state

    const messages = session.messages.map(msg =>
      msg.id === messageId
        ? { ...msg, content, timestamp: new Date().toISOString() }
        : msg
    )

    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          messages,
          editingMessageId: null
        }
      }
    }
  })
},

deleteMessage: (sessionId: string, messageId: string) => {
  set(state => {
    const session = state.sessions[sessionId]
    if (!session) return state

    const messageIndex = session.messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return state

    const messages = session.messages.slice(0, messageIndex)

    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          messages
        }
      }
    }
  })
},

setMessageFeedback: (sessionId: string, messageId: string, feedback: 'upvote' | 'downvote' | null) => {
  set(state => ({
    sessions: {
      ...state.sessions,
      [sessionId]: {
        ...state.sessions[sessionId],
        messagesFeedback: {
          ...state.sessions[sessionId]?.messagesFeedback,
          [messageId]: feedback
        }
      }
    }
  }))
}
```

---

### Step 4: Implement handleEditMessage (10 min)
**File**: `/frontend/src/app/page.tsx` (after line 69)

```typescript
const handleEditMessage = (messageId: string) => {
  const message = messages.find(m => m.id === messageId)
  if (message) {
    setEditingMessageId(messageId)
    setEditContent(message.content)
  }
}

const handleSaveEdit = (messageId: string, newContent: string) => {
  if (!newContent.trim()) return

  // Update local state
  setEditingMessageId(null)

  // Update in store if we have session
  if (currentSession?.id) {
    // This would call the Zustand action we added
    console.log('Updating message:', messageId, 'with content:', newContent)
    // TODO: Wire to Zustand store action
  }
}

const handleCancelEdit = () => {
  setEditingMessageId(null)
  setEditContent('')
}
```

---

### Step 5: Implement handleDeleteMessage (10 min)
**File**: `/frontend/src/app/page.tsx` (continue from Step 4)

```typescript
const handleDeleteMessage = (messageId: string) => {
  const confirmDelete = window.confirm('Delete this message and all subsequent responses?')
  if (!confirmDelete) return

  console.log('Deleting message:', messageId)

  // Find message index
  const messageIndex = messages.findIndex(m => m.id === messageId)
  if (messageIndex === -1) return

  // This would remove the message and all after it
  // TODO: Wire to Zustand store action

  // For now, just log
  console.log(`Would delete message at index ${messageIndex} and ${messages.length - messageIndex - 1} subsequent messages`)
}
```

---

### Step 6: Implement Feedback Handlers (10 min)
**File**: `/frontend/src/app/page.tsx` (continue from Step 5)

```typescript
const handleUpvote = (messageId: string) => {
  const currentFeedback = messagesFeedback[messageId]
  const newFeedback = currentFeedback === 'upvote' ? null : 'upvote'

  setMessagesFeedback(prev => ({
    ...prev,
    [messageId]: newFeedback
  }))

  console.log('Upvoted message:', messageId, 'New state:', newFeedback)
  // TODO: Send to backend API
}

const handleDownvote = (messageId: string) => {
  const currentFeedback = messagesFeedback[messageId]
  const newFeedback = currentFeedback === 'downvote' ? null : 'downvote'

  setMessagesFeedback(prev => ({
    ...prev,
    [messageId]: newFeedback
  }))

  console.log('Downvoted message:', messageId, 'New state:', newFeedback)
  // TODO: Send to backend API
}
```

---

### Step 7: Implement handleRegenerateMessage (10 min)
**File**: `/frontend/src/app/page.tsx` (continue from Step 6)

```typescript
const handleRegenerateMessage = async (messageId: string) => {
  if (isStreaming) return

  console.log('Regenerating message:', messageId)

  // Find the assistant message
  const messageIndex = messages.findIndex(m => m.id === messageId)
  if (messageIndex === -1) return

  // Find the preceding user message
  const userMessage = [...messages.slice(0, messageIndex)]
    .reverse()
    .find(m => m.role === 'user')

  if (!userMessage) {
    console.error('Could not find user message to regenerate from')
    return
  }

  // Set thought process
  setThoughtProcess({
    messageId,
    status: 'Regenerating response...',
    isVisible: true
  })

  // Delete the current assistant response
  handleDeleteMessage(messageId)

  // Resend the user message
  console.log('Resending user message:', userMessage.content)
  await sendMessage(userMessage.content)

  // Clear thought process after a delay
  setTimeout(() => setThoughtProcess(null), 2000)
}
```

---

### Step 8: Remove disabled from Edit/Delete buttons (5 min)
**File**: `/frontend/src/app/page.tsx` (around lines 164-172)

Find the user message actions section and update:
```typescript
{/* Edit button - REMOVE disabled */}
<MessageAction tooltip="Edit" delayDuration={100}>
  <Button
    variant="ghost"
    size="icon"
    className="rounded-full"
    onClick={() => handleEditMessage(message.id)}
    // REMOVE: disabled
  >
    <Pencil />
  </Button>
</MessageAction>

{/* Delete button - REMOVE disabled */}
<MessageAction tooltip="Delete" delayDuration={100}>
  <Button
    variant="ghost"
    size="icon"
    className="rounded-full"
    onClick={() => handleDeleteMessage(message.id)}
    // REMOVE: disabled
  >
    <Trash />
  </Button>
</MessageAction>
```

---

### Step 9: Remove disabled from Upvote/Downvote (5 min)
**File**: `/frontend/src/app/page.tsx` (around lines 146-154)

Find the assistant message actions and update:
```typescript
{/* Upvote button - REMOVE disabled */}
<MessageAction tooltip="Upvote" delayDuration={100}>
  <Button
    variant="ghost"
    size="icon"
    className={cn(
      "rounded-full",
      messagesFeedback[message.id] === 'upvote' && "text-green-600 bg-green-50"
    )}
    onClick={() => handleUpvote(message.id)}
    // REMOVE: disabled
  >
    <ThumbsUp />
  </Button>
</MessageAction>

{/* Downvote button - REMOVE disabled */}
<MessageAction tooltip="Downvote" delayDuration={100}>
  <Button
    variant="ghost"
    size="icon"
    className={cn(
      "rounded-full",
      messagesFeedback[message.id] === 'downvote' && "text-red-600 bg-red-50"
    )}
    onClick={() => handleDownvote(message.id)}
    // REMOVE: disabled
  >
    <ThumbsDown />
  </Button>
</MessageAction>
```

---

### Step 10: Add Regenerate Button (10 min)
**File**: `/frontend/src/app/page.tsx` (after Copy button, around line 145)

```typescript
{/* Copy button - existing */}
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

{/* ADD REGENERATE BUTTON HERE */}
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

{/* Upvote button - existing */}
```

---

### Step 11: Implement Edit Mode UI (15 min)
**File**: `/frontend/src/app/page.tsx` (in user message rendering, around line 159)

Replace the MessageContent with conditional rendering:
```typescript
{/* User message content - switch to edit mode if editing */}
{editingMessageId === message.id ? (
  <div className="w-full max-w-[85%] sm:max-w-[75%]">
    <PromptInput
      value={editContent}
      onValueChange={setEditContent}
      onSubmit={(value) => handleSaveEdit(message.id, value)}
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
```

---

### Step 12: Add Thought Process Display (10 min)
**File**: `/frontend/src/app/page.tsx` (in assistant message rendering, before MessageContent)

```typescript
{isAssistant ? (
  <div className="group flex w-full flex-col gap-0">
    {/* ADD THOUGHT PROCESS DISPLAY */}
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
          <span>{thoughtProcess.status}</span>
        </div>
      </MessageContent>
    )}

    {/* Existing MessageContent */}
    <MessageContent className="prose flex-1 rounded-lg bg-transparent p-0" markdown>
      {message.content}
    </MessageContent>
```

---

### Step 13: Wire Up All onClick Handlers (5 min)
Double-check that all buttons have their onClick handlers properly connected:
- Edit → `handleEditMessage`
- Delete → `handleDeleteMessage`
- Upvote → `handleUpvote`
- Downvote → `handleDownvote`
- Regenerate → `handleRegenerateMessage`
- Copy → `handleCopyMessage` (existing)

---

### Step 14: Test Locally (15 min)
1. Save all files
2. Check frontend dev server for any errors
3. Open browser to `http://localhost:3000`
4. Test each button:
   - Click Edit on a user message → Should log to console
   - Click Delete → Should show confirm dialog and log
   - Click Upvote/Downvote → Should toggle visual state and log
   - Click Regenerate → Should show thought process briefly and log
   - Click Copy → Should copy to clipboard (existing functionality)

Open browser DevTools Console to see all the console.log outputs.

---

### Step 15: Add Error Handling (10 min)
Wrap each handler in try-catch blocks:

```typescript
const handleEditMessage = (messageId: string) => {
  try {
    const message = messages.find(m => m.id === messageId)
    if (!message) {
      console.error('Message not found:', messageId)
      return
    }
    setEditingMessageId(messageId)
    setEditContent(message.content)
  } catch (error) {
    console.error('Error in handleEditMessage:', error)
  }
}

// Apply similar pattern to all other handlers
```

---

## ✅ Verification Checklist

- [ ] RefreshCw icon imports without error
- [ ] All state variables are defined
- [ ] Zustand store has new actions
- [ ] All handler functions are implemented
- [ ] No buttons have `disabled` prop (except Regenerate during streaming)
- [ ] Regenerate button appears in UI
- [ ] Edit mode switches UI correctly
- [ ] Thought process displays when regenerating
- [ ] All buttons log to console when clicked
- [ ] Error handling added to all functions
- [ ] No TypeScript errors in terminal
- [ ] No errors in browser console

---

## 🎯 Expected Outcome

After completing all steps:
1. **Visual**: All buttons should be clickable (not grayed out)
2. **Edit**: Clicking edit should switch to input mode
3. **Delete**: Should show confirmation dialog
4. **Upvote/Downvote**: Should toggle visual state (green/red)
5. **Regenerate**: Should show thought process animation
6. **Console**: Should see logs for all actions

---

## 🚀 Next Steps

Once all buttons are working with console logs:
1. Connect to Zustand store actions (currently just local state)
2. Implement actual API calls (Phase 2)
3. Handle SSE events for real-time updates (Phase 3)
4. Add comprehensive error handling and loading states

---

## 📝 Notes

- This implementation uses **only existing prompt-kit components**
- No new component files are created
- All functionality is added to existing files
- Console logs are temporary for testing
- Real backend integration comes in Phase 2

Total estimated time: **2-3 hours** for complete Phase 1 implementation