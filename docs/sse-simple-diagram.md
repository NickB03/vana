# Vana SSE Architecture - Simple Overview

```mermaid
flowchart TB
    subgraph Browser["🌐 Browser (Port 3000)"]
        User[User Types Message]
        UI[React UI Components]
        SSEHook[useSSE Hook]
    end

    subgraph Backend["⚡ FastAPI Backend (Port 8000)"]
        POST[POST /apps/.../sessions/{id}/run<br/>Triggers Research]
        GET[GET /apps/.../sessions/{id}/run<br/>SSE Stream]
        Broadcaster[SSE Broadcaster<br/>Memory-Optimized Queues]
        Session[Session Store<br/>In-Memory Dict<br/>Optional GCS Backup]
    end

    subgraph ADK["🤖 Google ADK (Port 8080)"]
        Agents[Research Agents<br/>Team Leader, Planner, etc.]
        Pipeline[Research Pipeline<br/>Plan → Research → Report]
    end

    User -->|1. Send Query| UI
    UI -->|2. POST Request| POST
    POST -->|3. Create Session| Session
    POST -->|4. Proxy Request| Agents

    Agents -->|5. Execute Research| Pipeline
    Pipeline -->|6. Stream Events| Broadcaster

    UI -->|7. Connect EventSource| GET
    GET -->|8. Subscribe| Broadcaster
    Broadcaster -->|9. SSE Events| SSEHook

    SSEHook -->|10. Update UI| UI

    style Browser fill:#e3f2fd
    style Backend fill:#f3e5f5
    style ADK fill:#e8f5e9
    style POST fill:#fff9c4
    style GET fill:#fff9c4
    style Broadcaster fill:#ffccbc
```

## 🔄 Data Flow

1. **User sends message** → React component
2. **POST request** → Creates/updates session, triggers research
3. **Backend proxies** → ADK service starts research
4. **Research executes** → Agents work through pipeline
5. **Events stream** → ADK sends progress updates
6. **Broadcaster distributes** → Events go to all subscribers
7. **SSE connection** → Frontend receives real-time updates
8. **UI updates** → React re-renders with new content

## 📡 Key SSE Events

- `research_update` - Streaming content chunks
- `research_complete` - Research finished
- `agent_status` - Agent network updates
- `error` - Error notifications
- `keepalive` - Connection heartbeat (30s)

## 🔒 Security

- JWT tokens in HTTP-only cookies (not in URLs)
- Next.js proxy prevents token exposure
- Rate limiting: 10 requests/60 seconds
- Session-based authentication

## ⚡ Performance

- **Connection pooling** - Multiple components share one SSE connection
- **Memory bounded** - Max 1000 events per queue
- **Auto-cleanup** - Stale connections removed every 60s
- **Timeout** - 300s (5 min) per research session
