# Pure ADK Deployment Plan

## 1. Remove Custom Code
- Delete main.py (custom API)
- Delete response_formatter.py
- Delete custom streaming logic
- Keep only agent definitions

## 2. ADK Standard Structure
```
agents/
  vana/
    __init__.py  # Must export root_agent
    agent.py     # Contains enhanced_orchestrator as root_agent
```

## 3. Deployment Command
```bash
# ADK standard deployment
gcloud run deploy vana-dev \
  --source=. \
  --region=us-central1 \
  --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY" \
  --allow-unauthenticated
```

## 4. Frontend Integration with Kibo

### ADK API Format:
```typescript
// Create session
const session = await fetch('/apps/vana/users/{userId}/sessions', {
  method: 'POST',
  body: JSON.stringify({ sessionId: generateId() })
});

// Send message with streaming
const response = await fetch('/run', {
  method: 'POST',
  body: JSON.stringify({
    appName: 'vana',
    userId: 'user123',
    sessionId: session.id,
    newMessage: {
      parts: [{ text: userInput }],
      role: 'user'
    },
    streaming: true
  })
});

// Handle SSE stream
const reader = response.body.getReader();
// Process events...
```

### Kibo Components Needed:
1. **Chat Interface** - Standard chat UI
2. **Thinking Panel** - Show ADK agent events
3. **Session Manager** - Handle ADK sessions
4. **Error Boundary** - Handle ADK errors

## 5. Benefits:
- 90% less code to maintain
- Native Google Cloud integration
- Automatic updates from ADK team
- Standard monitoring/logging
- Compatible with ADK tools
- Faster deployment