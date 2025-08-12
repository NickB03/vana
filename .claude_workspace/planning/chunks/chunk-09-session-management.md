# Chunk 9: Session Management

## PRD Section: 11. Session Management

### Critical Requirements

1. **Session Types**: Distinguish homepage vs tool-initiated sessions
2. **Persistence**: Local storage with 20-session limit
3. **Session Sidebar**: Clean session list with relative timestamps
4. **Context Switching**: Seamless session switching with state restoration
5. **Auto-titling**: Smart session titles from first message

### Implementation Guide

#### Core Components
```typescript
// components/session/SessionSidebar.tsx
- Scrollable session list with search
- Session cards with title, timestamp, preview
- New session button and session actions
- Context menu for rename/delete operations

// components/session/SessionCard.tsx
- Session metadata display
- Click to switch sessions
- Hover actions (rename, delete, share)
- Active session highlighting

// components/session/SessionActions.tsx
- Dropdown menu with session operations
- Rename session with inline editing
- Delete with confirmation modal
- Export/share functionality
```

#### Store Integration
```typescript
// stores/sessionStore.ts
interface SessionStore {
  currentSessionId: string | null
  sessions: Session[]
  createSession: (origin: 'homepage' | 'tool', prompt?: string) => Session
  loadSession: (sessionId: string) => void
  updateTitle: (sessionId: string, title: string) => void
  deleteSession: (sessionId: string) => void
  getHomepageSessions: () => Session[]
}
```

### Real Validation Tests

1. **Session Creation**: Click "New Chat" → Creates session with unique ID
2. **Session Switching**: Click different session → Messages/Canvas load correctly
3. **Persistence**: Refresh page → Current session and list preserved
4. **Auto-title**: Send first message → Session title updates automatically
5. **Cleanup**: 21st session created → Oldest session removed

### THINK HARD

- How do you handle session conflicts when multiple tabs are open?
- What happens to unsaved Canvas content when switching sessions?
- How do you optimize session loading for large chat histories?
- What metadata should be stored vs. computed on demand?
- How do you handle session corruption or invalid data?

### Component Specifications

#### SessionSidebar Component
```typescript
interface SessionSidebarProps {
  width?: number
  collapsible?: boolean
  showSearch?: boolean
  groupBy?: 'date' | 'type' | 'none'
}

// Features:
- Responsive width with drag resize
- Search sessions by title/content
- Group sessions by date or type
- Virtualized scrolling for large lists
- Keyboard navigation support
```

#### SessionCard Component  
```typescript
interface SessionCardProps {
  session: Session
  isActive?: boolean
  showPreview?: boolean
  onSelect: (sessionId: string) => void
  onAction: (action: string, sessionId: string) => void
}

// Features:
- Session title with truncation
- Relative timestamp display
- Message preview snippet
- Visual active state indicator
- Context menu trigger
```

#### SessionActions Component
```typescript
interface SessionActionsProps {
  session: Session
  onRename: (newTitle: string) => void
  onDelete: () => void
  onDuplicate?: () => void
  onExport?: () => void
}

// Features:
- Dropdown menu with keyboard support
- Inline rename with validation
- Delete confirmation dialog
- Export to various formats
- Share link generation
```

### What NOT to Do

❌ Don't store entire chat history in sessionStore (keep metadata only)
❌ Don't allow unlimited session creation without cleanup
❌ Don't switch sessions without saving current Canvas state
❌ Don't show tool-initiated sessions in homepage sidebar
❌ Don't forget to handle concurrent session modifications
❌ Don't block UI while loading large session histories

### Integration Points

- **Chat Store**: Load messages when session changes
- **Canvas Store**: Save/restore Canvas state per session
- **Auth Store**: Associate sessions with authenticated users
- **Upload Store**: Session-scoped file management

---

*Implementation Priority: High - Core navigation feature*