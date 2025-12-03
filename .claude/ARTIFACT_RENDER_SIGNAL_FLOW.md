# Artifact Render Signal Flow Diagram

## Component Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Requests Artifact                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ChatInterface.tsx                                               │
│  • streamChat() called                                           │
│  • artifactRenderStatus = 'pending'                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  useChatMessages.tsx                                             │
│  • Calls /generate-artifact endpoint                             │
│  • Receives SSE stream with reasoning + artifact code            │
│  • Shows ReasoningDisplay with isStreaming=true                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ReasoningDisplay.tsx (DURING STREAMING)                         │
│  • isStreaming = true                                            │
│  • artifactRendered = false (pending)                            │
│  • Shows: Spinner + "Thinking..." or step titles                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Streaming Completes                                             │
│  • useChatMessages calls saveMessage()                           │
│  • Artifact iframe is created and loaded                         │
│  • isStreaming = false                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ReasoningDisplay.tsx (WAITING FOR RENDER)                       │
│  • isStreaming = false                                           │
│  • artifactRendered = false (still pending!)                     │
│  • Shows: Spinner + "Rendering..."  ← NEW BEHAVIOR               │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴──────────────────────┐
        ▼                                            ▼
┌──────────────────────┐                  ┌──────────────────────┐
│ Server Bundle        │                  │ Client Babel         │
│ (bundle-artifact/)   │                  │ (ArtifactRenderer)   │
│                      │                  │                      │
│ 1. Load HTML         │                  │ 1. Load HTML         │
│ 2. Load React UMD    │                  │ 2. Load React UMD    │
│ 3. Render component  │                  │ 3. Render component  │
│ 4. Send signal:      │                  │ 4. Send signal:      │
│                      │                  │                      │
│    postMessage({     │                  │    postMessage({     │
│      type:           │                  │      type:           │
│      'artifact-      │                  │      'artifact-      │
│      rendered-       │                  │      rendered-       │
│      complete',      │                  │      complete',      │
│      success: true   │                  │      success: true   │
│    })                │                  │    })                │
└──────────────────────┘                  └──────────────────────┘
        │                                            │
        └─────────────────────┬──────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  useChatMessages.tsx (Message Listener)                          │
│  • window.addEventListener('message', ...)                       │
│  • Receives: { type: 'artifact-rendered-complete', success }     │
│  • Sets: artifactRenderStatus = 'rendered'                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ChatInterface.tsx                                               │
│  • Receives updated artifactRenderStatus                         │
│  • Passes to ReasoningDisplay:                                   │
│    artifactRendered={artifactRenderStatus === 'rendered'}        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ReasoningDisplay.tsx (FINAL STATE)                              │
│  • isStreaming = false                                           │
│  • artifactRendered = true  ✓                                    │
│  • Shows: Last step title + expandable                           │
│  • No spinner, user can expand/collapse                          │
└─────────────────────────────────────────────────────────────────┘
```

## State Timeline

```
TIME →

[Streaming]        [Waiting]         [Complete]
─────────────────▶│◀────────────────▶│
                  │                  │
isStreaming:      true              false             false
artifactRendered: false             false   →         true
Display:          "Thinking..."     "Rendering..."    Last step title
Spinner:          ✓ Visible         ✓ Visible         ✗ Hidden
Expandable:       ✓ Yes             ✓ Yes             ✓ Yes
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│  Artifact Render Error                                           │
│  • Component fails to render                                     │
│  • postMessage({ type: 'artifact-rendered-complete',             │
│                  success: false, error: '...' })                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  useChatMessages.tsx                                             │
│  • Sets: artifactRenderStatus = 'error'                          │
│  • Treats 'error' same as 'rendered' (complete)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ReasoningDisplay.tsx                                            │
│  • artifactRendered = true (error counts as complete)            │
│  • Hides spinner, prevents infinite loading                      │
└─────────────────────────────────────────────────────────────────┘
```

## Key Benefits

1. **User Feedback**: Shows "Rendering..." instead of appearing stuck
2. **Accurate State**: Only shows "complete" when artifact actually renders
3. **Error Resilience**: Handles render failures gracefully
4. **Performance**: Minimal overhead (single postMessage per artifact)
5. **Backward Compatible**: Default prop value maintains existing behavior
