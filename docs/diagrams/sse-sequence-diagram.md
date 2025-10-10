# SSE Message Flow - Sequence Diagram

## Complete SSE Sequence from User Action to UI Update

```mermaid
sequenceDiagram
    autonumber

    participant User
    participant ChatUI as Chat UI Component
    participant ChatStream as useChatStream Hook
    participant SSEHook as useSSE Hook
    participant EventSource as Browser EventSource
    participant Proxy as Next.js Proxy (/api/sse)
    participant FastAPI as FastAPI Backend (8000)
    participant ADK as Google ADK (8080)
    participant Store as Zustand Store

    %% Initial Setup
    Note over User,Store: Session Initialization
    User->>ChatUI: Opens chat interface
    ChatUI->>ChatStream: Initialize chat stream
    ChatStream->>Store: Create session ID
    Store-->>ChatStream: Returns session ID
    ChatStream->>SSEHook: Connect SSE (sessionId)

    %% SSE Connection Establishment
    Note over SSEHook,FastAPI: SSE Connection Phase
    SSEHook->>SSEHook: buildSSEUrl() - Create proxy path
    SSEHook->>EventSource: new EventSource(/api/sse/...)
    EventSource->>Proxy: HTTP GET with credentials
    Proxy->>Proxy: Extract JWT from cookie/header
    Proxy->>FastAPI: Forward with Authorization header
    FastAPI->>FastAPI: Validate authentication
    FastAPI-->>Proxy: 200 OK - text/event-stream
    Proxy-->>EventSource: Stream response
    EventSource-->>SSEHook: onopen event
    SSEHook->>SSEHook: setState('connected')
    SSEHook->>ChatStream: onConnect callback
    ChatStream->>Store: Update connection state
    Store-->>ChatUI: Re-render (connected)

    %% User sends message
    Note over User,ADK: Message Send Phase
    User->>ChatUI: Types message & clicks send
    ChatUI->>ChatStream: sendMessage(query)
    ChatStream->>FastAPI: POST /apps/vana/users/default/sessions/{sessionId}/run
    FastAPI->>FastAPI: validate_chat_input()
    FastAPI->>Store: Add user message
    FastAPI->>ADK: POST /run_sse with ADK Event format
    FastAPI-->>ChatStream: 200 OK {success: true}
    ChatStream->>Store: Add user message locally
    Store-->>ChatUI: Re-render (message added)

    %% ADK Processing & Streaming
    Note over FastAPI,Store: Research Streaming Phase
    ADK->>ADK: Process with LLM (Gemini)

    loop Streaming Response
        ADK->>FastAPI: SSE event: data: {"content": {"parts": [{"text": "..."}]}}
        FastAPI->>FastAPI: Extract text from ADK Event
        FastAPI->>FastAPI: Broadcast to session
        FastAPI->>Proxy: SSE event: research_update
        Proxy->>EventSource: event: research_update\ndata: {...}
        EventSource->>SSEHook: onmessage event
        SSEHook->>SSEHook: parseEventData()
        SSEHook->>SSEHook: setState(events + new event)
        SSEHook->>ChatStream: Event handler
        ChatStream->>Store: Update message content
        Store-->>ChatUI: Re-render (streaming text)
        ChatUI-->>User: Display updated response
    end

    %% Agent Status Updates
    Note over FastAPI,Store: Agent Coordination Phase
    FastAPI->>Proxy: SSE event: agent_status
    Proxy->>EventSource: event: agent_status\ndata: {...}
    EventSource->>SSEHook: onmessage event
    SSEHook->>ChatStream: Agent status handler
    ChatStream->>Store: Update agent states
    Store-->>ChatUI: Re-render (agent indicators)

    %% Completion
    Note over ADK,Store: Completion Phase
    ADK->>FastAPI: Stream complete
    FastAPI->>FastAPI: Update session status
    FastAPI->>Proxy: SSE event: research_complete
    Proxy->>EventSource: event: research_complete\ndata: {...}
    EventSource->>SSEHook: onmessage event
    SSEHook->>ChatStream: Completion handler
    ChatStream->>ChatStream: setIsStreaming(false)
    ChatStream->>Store: Update session status
    Store->>Store: Persist session state
    Store-->>ChatUI: Re-render (complete state)
    ChatUI-->>User: Display final result

    %% Error Handling Path
    Note over EventSource,Store: Error Recovery Path
    alt Connection Error
        EventSource->>SSEHook: onerror event
        SSEHook->>SSEHook: setState('error')
        SSEHook->>SSEHook: Exponential backoff delay
        SSEHook->>SSEHook: reconnect() after delay
        SSEHook->>EventSource: new EventSource (retry)
        EventSource-->>SSEHook: onopen (reconnected)
    end

    %% Cleanup
    Note over User,Store: Cleanup Phase
    User->>ChatUI: Closes chat / switches session
    ChatUI->>ChatStream: Component unmount
    ChatStream->>SSEHook: disconnect()
    SSEHook->>EventSource: close()
    EventSource->>Proxy: Close connection
    Proxy->>FastAPI: Connection closed
    FastAPI->>FastAPI: Clear session resources
```

## Key Timing Considerations

### Async Operations Timeline

```mermaid
gantt
    title SSE Message Processing Timeline
    dateFormat X
    axisFormat %L ms

    section Connection
    EventSource Creation :a1, 0, 50
    Proxy Authentication :a2, after a1, 100
    Backend Validation :a3, after a2, 50
    Stream Established :milestone, after a3, 0

    section Message Send
    User Input :b1, 200, 10
    API Request :b2, after b1, 50
    Input Validation :b3, after b2, 30
    ADK Forwarding :b4, after b3, 100

    section Streaming
    LLM Processing :c1, after b4, 2000
    First Chunk :milestone, 500, 0
    Chunk Processing (10x) :c2, after c1, 100
    Final Chunk :milestone, 2500, 0

    section UI Update
    Parse Event :d1, 0, 20
    Update Store :d2, after d1, 10
    React Re-render :d3, after d2, 30
    DOM Update :d4, after d3, 20
    Paint :milestone, after d4, 0
```

## Event Types & Data Structures

### Research Events
- `research_update`: Incremental content chunks
- `research_complete`: Final status (no content)
- `agent_status`: Agent coordination updates
- `error`: Error messages with codes

### Message Action Events
- `message_regenerating`: Regeneration started
- `regeneration_progress`: Progress updates
- `message_regenerated`: Regeneration complete
- `message_edited`: Content edited
- `message_deleted`: Message removed

## Security Flow

```mermaid
sequenceDiagram
    participant Client
    participant Proxy as Next.js Proxy
    participant Backend as FastAPI

    Note over Client,Backend: Token never exposed in browser URLs

    Client->>Proxy: GET /api/sse/... (no token in URL)
    Note right of Client: Secure HTTP-only cookie<br/>or x-auth-token header
    Proxy->>Proxy: Extract token from cookie
    Proxy->>Backend: Forward with Authorization: Bearer {token}
    Backend->>Backend: Validate JWT token
    Backend-->>Proxy: Authenticated stream
    Proxy-->>Client: Proxied stream (no token exposure)
```
