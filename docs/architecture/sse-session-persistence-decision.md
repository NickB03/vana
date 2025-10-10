# SSE Session Persistence Architecture Decision Record (ADR)

**Status:** Proposed
**Date:** 2025-10-10
**Decision Makers:** System Architect, Product Owner
**Context:** Personal high-quality project, not enterprise scale

---

## Context and Problem Statement

SSE chat sessions currently use in-memory storage (`app/utils/session_store.py`), which means:
- ❌ Chat history is lost on server restart
- ❌ Users cannot resume conversations after logout/login
- ❌ Development workflow is interrupted by data loss

The project already has:
- ✅ SQLite for ADK agent sessions (`/tmp/vana_sessions.db`)
- ✅ SQLite for authentication (`./auth.db`)
- ✅ Redis implementation pattern (`redis_session_store.py`)
- ✅ User authentication system

**Question:** Should we persist SSE chat sessions to SQLite?

---

## Decision Drivers

1. **User Experience** - Users expect chat history to persist
2. **Privacy** - Anonymous users should remain anonymous
3. **Complexity** - Minimize operational overhead for personal project
4. **Cost** - Keep storage costs negligible
5. **Development** - Improve dev workflow with persistent data
6. **Scalability** - Design for future growth without over-engineering now

---

## Considered Options

### Option 1: Keep In-Memory Only (Status Quo)
- **Pros:** Zero implementation cost, maximum privacy
- **Cons:** Poor UX, data loss on restart, frustrating dev workflow
- **Verdict:** ❌ Not acceptable for high-quality project

### Option 2: Full Persistence (All Sessions → SQLite)
- **Pros:** Best UX, complete history
- **Cons:** Privacy concerns for anonymous users, unnecessary storage
- **Verdict:** ⚠️ Over-stores, privacy issues

### Option 3: Hybrid Persistence (Authenticated → SQLite, Anonymous → Memory)
- **Pros:** Best UX for logged-in users, privacy for anonymous, clear boundary
- **Cons:** Medium implementation complexity
- **Verdict:** ✅ **RECOMMENDED**

### Option 4: Redis (Using Existing Implementation)
- **Pros:** Production-ready, multi-instance support
- **Cons:** Requires Redis server, operational complexity, overkill for single instance
- **Verdict:** ⚠️ Future option, not now

---

## Decision Outcome

**Chosen Option:** Option 3 - Hybrid Persistence Strategy

### Implementation Strategy:

```python
# Authentication-based routing
if session.user_id is not None:
    backend = SQLiteBackend()  # Authenticated → Persist
else:
    backend = InMemoryBackend()  # Anonymous → Ephemeral
```

---

## Pros and Cons of the Decision

### Pros:

1. **Superior User Experience** ⭐⭐⭐⭐⭐
   - Logged-in users: Chat history persists across sessions
   - Matches modern chat app expectations (ChatGPT, Claude.ai)
   - No data loss on server restarts

2. **Privacy by Default** 🔒
   - Anonymous users: No tracking, ephemeral sessions
   - Authenticated users: Explicit opt-in via account creation
   - GDPR compliant (clear data ownership)

3. **Minimal Complexity** 🎯
   - Leverage existing SQLite infrastructure
   - Simple routing logic (~200 lines of code)
   - Low operational overhead

4. **Cost-Effective** 💰
   - SQLite database: ~10KB per session
   - 10,000 sessions = ~100MB (negligible)
   - No additional infrastructure required

5. **Better Development Workflow** 🛠️
   - Server restarts don't lose chat data
   - Easier debugging with persistent logs
   - Can inspect database for troubleshooting

### Cons:

1. **Implementation Effort** ⚠️
   - Estimated: 13 hours of development
   - Requires database migrations
   - Need comprehensive testing

2. **Storage Management** ⚠️
   - Database grows over time
   - Requires retention policy (90 days)
   - Need automated cleanup job

3. **Privacy Disclosure** ⚠️
   - Must inform users about data persistence
   - Need clear terms of service
   - GDPR compliance requirements

---

## Architecture Design

### Component Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                   HybridSessionStore                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Decision Logic:                                         │  │
│  │   if session.user_id is not None:                      │  │
│  │       use SQLiteBackend()                               │  │
│  │   else:                                                 │  │
│  │       use InMemoryBackend()                             │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
              ↓                              ↓
   ┌──────────────────────┐      ┌──────────────────────┐
   │  SQLiteBackend       │      │  InMemoryBackend     │
   │  ─────────────       │      │  ───────────────     │
   │  Authenticated       │      │  Anonymous           │
   │  User Sessions       │      │  User Sessions       │
   │                      │      │                      │
   │  Storage:            │      │  Storage:            │
   │  chat_sessions.db    │      │  dict[str, Session]  │
   │                      │      │                      │
   │  Retention:          │      │  Retention:          │
   │  90 days             │      │  24 hours (TTL)      │
   └──────────────────────┘      └──────────────────────┘
```

### Database Schema

```sql
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,  -- Required for persistence
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    last_access_at TIMESTAMP,
    status TEXT NOT NULL,
    title TEXT,
    messages_json TEXT NOT NULL,  -- JSON array of messages

    -- Security metadata
    client_ip TEXT,
    user_agent TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at);
```

### Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    User Interaction Flow                       │
└────────────────────────────────────────────────────────────────┘

  Anonymous User                     Authenticated User
       │                                     │
       ↓                                     ↓
  ┌─────────┐                          ┌─────────┐
  │ Create  │                          │ Create  │
  │ Session │                          │ Session │
  └────┬────┘                          └────┬────┘
       │                                     │
       ↓                                     ↓
  Check user_id                         Check user_id
  (user_id = None)                      (user_id = 123)
       │                                     │
       ↓                                     ↓
  ┌──────────────┐                    ┌──────────────┐
  │ InMemory     │                    │ SQLite       │
  │ Backend      │                    │ Backend      │
  └──────┬───────┘                    └──────┬───────┘
       │                                     │
       ↓                                     ↓
  Session lost                          Session persisted
  on restart                            to database
       │                                     │
       ↓                                     ↓
  Privacy preserved                     History available
  (no tracking)                         after logout/login
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Files to Create:**
```
app/utils/sqlite_session_backend.py       # SQLite persistence layer
app/utils/hybrid_session_store.py         # Hybrid routing logic
migrations/001_create_chat_sessions.sql    # Database schema
```

**Tasks:**
- [ ] Implement SQLite backend with CRUD operations
- [ ] Create hybrid storage wrapper
- [ ] Write database migration script
- [ ] Add configuration environment variables

### Phase 2: Integration (Week 1)

**Files to Modify:**
```
app/server.py                             # Switch to HybridSessionStore
.env.local                                # Add CHAT_SESSION_DB_PATH
```

**Tasks:**
- [ ] Update server initialization
- [ ] Ensure user_id is passed to sessions
- [ ] Add cleanup job for old sessions
- [ ] Verify user isolation in queries

### Phase 3: Testing (Week 1)

**Files to Create:**
```
tests/unit/test_sqlite_session_backend.py
tests/integration/test_hybrid_persistence.py
```

**Tasks:**
- [ ] Unit tests for SQLite backend
- [ ] Integration tests for hybrid strategy
- [ ] Manual testing: authenticated vs anonymous
- [ ] Performance testing: write latency

### Phase 4: Documentation & Deployment (Week 2)

**Files to Create/Update:**
```
docs/CHAT_HISTORY.md                      # User-facing documentation
docs/architecture/STORAGE.md              # Developer guide
```

**Tasks:**
- [ ] User documentation (privacy policy)
- [ ] Developer guide (architecture)
- [ ] API documentation updates
- [ ] Production deployment checklist

---

## Success Metrics

### Key Performance Indicators:

1. **User Retention** 📈
   - **Metric:** Weekly active users
   - **Target:** +20% retention (users return for history)

2. **System Performance** ⚡
   - **Metric:** Average response time
   - **Target:** <100ms overhead for persistence

3. **Storage Efficiency** 💾
   - **Metric:** Database size
   - **Target:** <1GB per 10,000 active users

4. **Privacy Compliance** 🔒
   - **Metric:** Data retention adherence
   - **Target:** 100% compliance with 90-day policy

### Acceptance Criteria:

- ✅ Authenticated users can access chat history after logout/login
- ✅ Anonymous users have ephemeral sessions (no persistence)
- ✅ Server restarts don't lose authenticated user data
- ✅ Database cleanup runs successfully every 24 hours
- ✅ Storage overhead <100ms per message write
- ✅ User can export chat history (GDPR compliance)
- ✅ User can delete chat history (right to deletion)
- ✅ All tests passing with >85% coverage

---

## Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **SQLite locking** | Low | Medium | Use WAL mode, connection pooling |
| **Database corruption** | Very Low | High | Regular backups, checksum validation |
| **Performance degradation** | Low | Medium | Async writes, batch operations |
| **Privacy violations** | Very Low | High | User isolation, access logging |
| **Storage overflow** | Low | Low | Automated cleanup, monitoring |

**Overall Risk Level:** LOW

---

## Compliance Considerations

### GDPR Requirements:

1. **Right to Access** (Article 15)
   - Endpoint: `GET /api/users/{user_id}/chat-sessions`
   - Returns all user's chat sessions

2. **Right to Deletion** (Article 17)
   - Endpoint: `DELETE /api/users/{user_id}/chat-sessions`
   - Cascade delete when user account deleted

3. **Right to Data Portability** (Article 20)
   - Endpoint: `GET /api/users/{user_id}/export`
   - Returns JSON export of all chat history

4. **Privacy by Default** (Article 25)
   - Anonymous users: No persistence (privacy-preserving)
   - Authenticated users: Explicit consent via terms

### Data Retention Policy:

```python
# Automated cleanup job
RETENTION_POLICY = {
    "active_sessions": "indefinite",      # While user is active
    "inactive_sessions": "90 days",       # No access for 90 days → delete
    "deleted_users": "immediate",          # Cascade delete all sessions
}
```

---

## Future Considerations

### Scaling Path:

**Current State (Personal Project):**
```
Single instance → SQLite → Local storage
```

**Future State (Multi-Instance):**
```
Multiple instances → Redis → Shared storage
```

**Migration Path:**
1. Implement Redis backend (already exists: `redis_session_store.py`)
2. Update `HybridSessionStore` to use Redis instead of SQLite
3. Migrate data from SQLite to Redis
4. Deploy multi-instance architecture

### Advanced Features (Future):

- Full-text search across chat history
- Conversation tagging and categorization
- Export to multiple formats (PDF, Markdown)
- Shared conversations (collaboration)
- Conversation forking (branching discussions)

---

## Related Decisions

- **ADR-001**: Choice of SQLite for authentication (already decided)
- **ADR-002**: ADK session persistence strategy (already decided)
- **ADR-003**: SSE session persistence (this document)

---

## References

- [Storage Architecture Analysis](../../STORAGE_ARCHITECTURE_ANALYSIS.md)
- [SSE Session Store Implementation](../../app/utils/session_store.py)
- [Redis Session Store (Alternative)](../../app/utils/redis_session_store.py)
- [Authentication Models](../../app/auth/models.py)

---

## Decision

**Status:** ✅ RECOMMENDED

**Rationale:**
- Best balance of UX, privacy, simplicity, and cost
- Leverages existing SQLite infrastructure
- Appropriate for personal project scale
- Clear upgrade path to Redis if needed

**Timeline:** 2 weeks (13 hours effort)

**Next Actions:**
1. Review and approve this ADR
2. Create implementation tickets
3. Begin Phase 1 development
4. Track progress against success metrics

---

**Document Owner:** System Architect
**Last Updated:** 2025-10-10
**Review Date:** 2025-11-10 (1 month after implementation)
