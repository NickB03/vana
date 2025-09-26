# Phase 3: Frontend-Backend Integration Handoff

## 🚨 CRITICAL: Model Configuration Change Required

**IMPORTANT**: Switch from current AI model to **Gemini 2.5 Flash** using the Google API key stored in `.env.local`

### Required Configuration:
1. Google API key is located in `/frontend/.env.local` and `.env.local` (root)
2. Model identifier: `gemini-2.0-flash-exp` or `gemini-2.5-flash` (verify latest)
3. Update AI model configuration in backend to use Gemini instead of current provider

---

## Current Status Summary

### ✅ Completed Phases:
- **Phase 1**: Frontend UI Implementation (COMPLETE)
  - All chat action buttons and handlers implemented in `/frontend/src/app/page.tsx`
  - State management ready in `/frontend/src/hooks/useChatStream.ts`
  - UI switches to edit mode, shows feedback states, displays thought process

- **Phase 2**: Backend API Implementation (COMPLETE)
  - All endpoints ready in `/app/routes/chat_actions.py`
  - SSE broadcasting configured for real-time updates
  - Backend server running on port 8000

### 🔄 Phase 3: Integration (TO BE COMPLETED)

---

## Environment Setup

### Running Servers:
```bash
# Frontend (port 3000)
cd frontend && npm run dev

# Backend (port 8000) - Use this exact command:
SESSION_INTEGRITY_KEY=65b45d5c55e8abab171ba84e7f9605e026ce6cf1f77ba26385f62dc7dc244742 \
ENVIRONMENT=development \
RUNNING_IN_CI=true \
uv run uvicorn app.server:app --reload --port 8000 --host 0.0.0.0
```

### Key Files:
- **Frontend**: `/frontend/src/app/page.tsx`
- **Backend**: `/app/routes/chat_actions.py`
- **API Config**: Update model configuration to use Gemini

---

## Phase 3 Implementation Tasks

### 1. Update AI Model Configuration (PRIORITY)

**File**: `/app/agent.py` or relevant model configuration file

```python
# Current configuration likely uses OpenAI or another provider
# Update to use Gemini 2.5 Flash:

import google.generativeai as genai
import os

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash-exp')  # or 'gemini-2.5-flash'
```

### 2. Connect Frontend Handlers to Backend APIs

**File**: `/frontend/src/app/page.tsx`

Update each handler to make actual API calls:

```typescript
// Example for handleEditMessage
const handleEditMessage = async (messageId: string) => {
  try {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    setEditingMessageId(messageId)
    setEditContent(message.content)
  } catch (error) {
    console.error('Error editing message:', error)
  }
}

const handleSaveEdit = async (messageId: string, newContent: string) => {
  try {
    const response = await fetch(`http://localhost:8000/chat/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}` // if auth is required
      },
      body: JSON.stringify({ content: newContent })
    })

    if (response.ok) {
      // Update will come via SSE
      setEditingMessageId(null)
    }
  } catch (error) {
    console.error('Error saving edit:', error)
  }
}

const handleDeleteMessage = async (messageId: string) => {
  const confirmDelete = window.confirm('Delete this message and all subsequent responses?')
  if (!confirmDelete) return

  try {
    const response = await fetch(`http://localhost:8000/chat/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}` // if needed
      }
    })

    if (response.ok) {
      // Update will come via SSE
      console.log('Message deleted successfully')
    }
  } catch (error) {
    console.error('Error deleting message:', error)
  }
}

const handleUpvote = async (messageId: string) => {
  try {
    const currentFeedback = messagesFeedback[messageId]
    const newFeedback = currentFeedback === 'upvote' ? null : 'upvote'

    const response = await fetch(`http://localhost:8000/chat/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}` // if needed
      },
      body: JSON.stringify({ feedback: newFeedback })
    })

    if (response.ok) {
      setMessagesFeedback(prev => ({
        ...prev,
        [messageId]: newFeedback
      }))
    }
  } catch (error) {
    console.error('Error submitting feedback:', error)
  }
}

const handleRegenerateMessage = async (messageId: string) => {
  if (isStreaming) return

  try {
    setThoughtProcess({
      messageId,
      status: 'Regenerating response...',
      isVisible: true
    })

    const response = await fetch(`http://localhost:8000/chat/messages/${messageId}/regenerate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}` // if needed
      }
    })

    if (response.ok) {
      // Response will come via SSE
      console.log('Regeneration started')
    }
  } catch (error) {
    console.error('Error regenerating message:', error)
    setThoughtProcess(null)
  }
}
```

### 3. Handle SSE Events

**File**: `/frontend/src/hooks/useChatStream.ts`

Add SSE event handlers for real-time updates:

```typescript
// In the existing SSE setup, add handlers for chat action events:

eventSource.addEventListener('message_edited', (event) => {
  const data = JSON.parse(event.data)
  // Update message in state
  updateMessage(data.message_id, data.new_content)
})

eventSource.addEventListener('message_deleted', (event) => {
  const data = JSON.parse(event.data)
  // Remove message and subsequent messages from state
  deleteMessageAndSubsequent(data.message_id)
})

eventSource.addEventListener('feedback_received', (event) => {
  const data = JSON.parse(event.data)
  // Update feedback state
  updateFeedback(data.message_id, data.feedback)
})

eventSource.addEventListener('regeneration_progress', (event) => {
  const data = JSON.parse(event.data)
  // Show thought process
  updateThoughtProcess(data.message_id, data.status)
})
```

### 4. Update Zustand Store Actions

**File**: `/frontend/src/hooks/useChatStream.ts`

Ensure all store actions are properly wired:

```typescript
// These should already exist from Phase 1, but verify they work:
- setEditingMessage
- updateMessageContent
- deleteMessage
- setMessageFeedback
```

### 5. Authentication Integration

If authentication is required, ensure session tokens are included in API calls:
- Get session token from auth context or cookies
- Include in Authorization header for all API calls
- Handle 401 responses appropriately

---

## Testing Checklist

### Functional Tests:
- [ ] Edit button opens edit mode with current content
- [ ] Save edit sends PUT request and updates via SSE
- [ ] Cancel edit reverts to normal view
- [ ] Delete shows confirmation and removes messages
- [ ] Upvote/Downvote toggle correctly and persist
- [ ] Regenerate shows thought process and updates content
- [ ] All SSE events update UI in real-time

### Integration Tests:
- [ ] Frontend connects to backend on port 8000
- [ ] CORS is properly configured
- [ ] Authentication headers work (if applicable)
- [ ] Error states are handled gracefully
- [ ] Network failures show appropriate messages

---

## API Endpoints Reference

All endpoints are prefixed with `/chat/messages/`:

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| PUT | `/{message_id}` | `{content: string}` | Edit message |
| DELETE | `/{message_id}` | - | Delete message |
| POST | `/{message_id}/feedback` | `{feedback: 'upvote'\|'downvote'\|null}` | Submit feedback |
| POST | `/{message_id}/regenerate` | - | Regenerate response |

### SSE Events:
- `message_edited` - When a message is edited
- `message_deleted` - When a message is deleted
- `feedback_received` - When feedback is submitted
- `regeneration_progress` - During regeneration (thought process)

---

## Known Issues & Solutions

### Issue: CORS errors
**Solution**: Backend CORS is configured in `/app/server.py` - verify `http://localhost:3000` is in allowed origins

### Issue: SESSION_INTEGRITY_KEY error
**Solution**: Always start backend with the environment variable provided above

### Issue: Google Cloud credentials error
**Solution**: Use `RUNNING_IN_CI=true` flag when starting backend

### Issue: Port conflicts
**Solution**: Kill existing processes:
```bash
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

---

## Model Migration Notes

### Current Model (to be replaced):
- Check `/app/agent.py` for current model configuration
- Likely using OpenAI, Claude, or another provider

### Target Model: Gemini 2.5 Flash
- API Key: Located in `.env.local` as `GOOGLE_API_KEY`
- Model ID: `gemini-2.0-flash-exp` or verify latest version
- Documentation: https://ai.google.dev/gemini-api/docs

### Migration Steps:
1. Install Google Generative AI package if needed: `pip install google-generativeai`
2. Update model initialization in agent configuration
3. Adjust prompt formatting if needed for Gemini
4. Test generation with new model
5. Verify SSE streaming works with Gemini responses

---

## Success Criteria

Phase 3 is complete when:
1. ✅ Gemini 2.5 Flash is configured and working
2. ✅ All buttons trigger actual API calls
3. ✅ SSE events update the UI in real-time
4. ✅ Edit/Delete/Feedback/Regenerate all work end-to-end
5. ✅ No console errors during normal operation
6. ✅ User can interact with chat actions seamlessly

---

## Quick Test Sequence

1. Start both servers (frontend & backend)
2. Send a chat message
3. Test edit: Click edit, modify text, save
4. Test feedback: Click upvote/downvote, verify toggle
5. Test regenerate: Click regenerate, see thought process
6. Test delete: Delete a message, confirm cascade deletion
7. Verify all changes persist and sync via SSE

---

Good luck with Phase 3! The foundation is solid - you just need to connect the wires and switch to Gemini.