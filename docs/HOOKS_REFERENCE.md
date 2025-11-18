# React Hooks Reference

**Last Updated**: 2025-11-17

Comprehensive documentation for all custom React hooks used in Vana.

---

## Table of Contents

- [Chat & Messaging](#chat--messaging)
  - [useChatMessages](#usechatmessages)
  - [useChatSessions](#usechatsessions)
- [Authentication](#authentication)
  - [useGoogleAuth](#usegoogleauth)
  - [useGuestSession](#useguestsession)
  - [useAuthUserRateLimit](#useauthuserratelimit)
- [UI & UX](#ui--ux)
  - [use-toast](#use-toast)
  - [use-theme](#use-theme)
  - [use-mobile](#use-mobile)
  - [useScrollTransition](#usescrolltransition)
- [Artifacts](#artifacts)
  - [use-multi-artifact](#use-multi-artifact)
  - [useArtifactVersions](#useartifactversions)
- [Utilities](#utilities)
  - [useThrottle](#usethrottle)
  - [useServiceWorkerUpdate](#useserviceworkerupdate)
  - [use-rate-limit-warning](#use-rate-limit-warning)

---

## Chat & Messaging

### useChatMessages

Manages chat messages, streaming, and real-time message updates.

**Location**: `src/hooks/useChatMessages.tsx`

#### Usage

```typescript
import { useChatMessages } from '@/hooks/useChatMessages';

function ChatComponent({ sessionId }: { sessionId: string }) {
  const {
    messages,
    isStreaming,
    streamChat,
    saveMessage,
    deleteMessage,
    error
  } = useChatMessages(sessionId);

  const handleSend = async (content: string) => {
    await streamChat(content);
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {isStreaming && <div>AI is typing...</div>}
    </div>
  );
}
```

#### API

**Parameters**:
- `sessionId: string` - Unique session identifier

**Returns**:
```typescript
{
  messages: ChatMessage[];           // Array of chat messages
  isStreaming: boolean;              // Whether AI is currently responding
  streamChat: (content: string) => Promise<void>;  // Send message and stream response
  saveMessage: (message: ChatMessage) => Promise<void>;  // Save message to database
  deleteMessage: (messageId: string) => Promise<void>;   // Delete message
  error: Error | null;               // Error state
}
```

**Message Schema**:
```typescript
interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning_steps?: ReasoningStep[];
  created_at: string;
  token_count?: number;
}
```

#### Features

- ✅ Real-time message streaming with Server-Sent Events (SSE)
- ✅ Automatic message persistence to Supabase
- ✅ Optimistic UI updates
- ✅ Error handling and retry logic
- ✅ Chain of Thought reasoning support
- ✅ Rate limit handling

#### Example: Stream with Reasoning

```typescript
const { streamChat } = useChatMessages(sessionId);

await streamChat('Create a todo list component', {
  includeReasoning: true,
  onReasoning: (reasoning) => {
    console.log('Reasoning steps:', reasoning);
  },
  onDelta: (content) => {
    console.log('New content:', content);
  },
  onComplete: (fullMessage) => {
    console.log('Complete message:', fullMessage);
  }
});
```

---

### useChatSessions

Manages chat sessions (create, read, update, delete).

**Location**: `src/hooks/useChatSessions.tsx`

#### Usage

```typescript
import { useChatSessions } from '@/hooks/useChatSessions';

function SessionList() {
  const {
    sessions,
    currentSession,
    createSession,
    deleteSession,
    isLoading
  } = useChatSessions();

  const handleNewChat = async () => {
    const newSession = await createSession('New Chat');
    // Navigate to new session
  };

  return (
    <div>
      {sessions.map(session => (
        <div key={session.id}>{session.title}</div>
      ))}
    </div>
  );
}
```

#### API

**Returns**:
```typescript
{
  sessions: ChatSession[];          // All user sessions
  currentSession: ChatSession | null;  // Active session
  createSession: (title?: string) => Promise<ChatSession>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, data: Partial<ChatSession>) => Promise<void>;
  isLoading: boolean;
}
```

**Session Schema**:
```typescript
interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  first_message?: string;
  conversation_summary?: string;
  created_at: string;
  updated_at: string;
}
```

#### Features

- ✅ Automatic session grouping (Today, Yesterday, Last 7 Days)
- ✅ Auto-generated titles from first message
- ✅ Conversation summarization for long chats
- ✅ Real-time session updates via Supabase subscriptions

---

## Authentication

### useGoogleAuth

Handles Google OAuth authentication.

**Location**: `src/hooks/useGoogleAuth.ts`

#### Usage

```typescript
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

function LoginButton() {
  const { signInWithGoogle, isLoading, error } = useGoogleAuth();

  return (
    <button onClick={signInWithGoogle} disabled={isLoading}>
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}
```

#### API

**Returns**:
```typescript
{
  signInWithGoogle: () => Promise<void>;  // Initiate Google OAuth flow
  signOut: () => Promise<void>;           // Sign out user
  user: User | null;                      // Current authenticated user
  isLoading: boolean;
  error: Error | null;
}
```

#### Features

- ✅ Google OAuth 2.0 integration
- ✅ Automatic redirect handling
- ✅ Session persistence
- ✅ Error handling

---

### useGuestSession

Manages guest user sessions with rate limiting.

**Location**: `src/hooks/useGuestSession.ts`

#### Usage

```typescript
import { useGuestSession } from '@/hooks/useGuestSession';

function GuestModeIndicator() {
  const { isGuest, remainingMessages, upgradePrompt } = useGuestSession();

  if (!isGuest) return null;

  return (
    <div>
      <p>Guest Mode: {remainingMessages} messages remaining</p>
      {remainingMessages <= 5 && <button onClick={upgradePrompt}>Sign up</button>}
    </div>
  );
}
```

#### API

**Returns**:
```typescript
{
  isGuest: boolean;                // Whether user is in guest mode
  remainingMessages: number;       // Messages left in current window
  totalLimit: number;              // Total message limit (20)
  windowHours: number;             // Rate limit window (5 hours)
  upgradePrompt: () => void;       // Show upgrade/signup prompt
}
```

#### Features

- ✅ IP-based rate limiting (20 messages per 5 hours)
- ✅ Automatic rate limit tracking
- ✅ Upgrade prompts when limit approached
- ✅ Graceful degradation when limit exceeded

---

### useAuthUserRateLimit

Tracks rate limits for authenticated users.

**Location**: `src/hooks/useAuthUserRateLimit.ts`

#### Usage

```typescript
import { useAuthUserRateLimit } from '@/hooks/useAuthUserRateLimit';

function RateLimitStatus() {
  const { remaining, total, resetTime } = useAuthUserRateLimit();

  return (
    <div>
      <p>Requests: {remaining}/{total}</p>
      <p>Resets in: {resetTime}</p>
    </div>
  );
}
```

#### API

**Returns**:
```typescript
{
  remaining: number;     // Remaining requests in current window
  total: number;         // Total requests allowed (100)
  resetTime: Date;       // When rate limit resets
  isNearLimit: boolean;  // True if < 10 requests remaining
}
```

---

## UI & UX

### use-toast

Display toast notifications.

**Location**: `src/hooks/use-toast.ts`

#### Usage

```typescript
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Success!",
      description: "Your changes have been saved.",
      variant: "default"
    });
  };

  const handleError = () => {
    toast({
      title: "Error",
      description: "Something went wrong.",
      variant: "destructive"
    });
  };

  return <button onClick={handleSuccess}>Save</button>;
}
```

#### API

**toast() Options**:
```typescript
{
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;  // milliseconds, default: 5000
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

### use-theme

Manage dark/light theme with system preference detection.

**Location**: `src/hooks/use-theme.ts`

#### Usage

```typescript
import { useTheme } from '@/hooks/use-theme';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

#### API

**Returns**:
```typescript
{
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  systemTheme: "light" | "dark";  // Detected system preference
}
```

---

### use-mobile

Detect mobile device and screen size.

**Location**: `src/hooks/use-mobile.tsx`

#### Usage

```typescript
import { useMobile } from '@/hooks/use-mobile';

function ResponsiveComponent() {
  const isMobile = useMobile();

  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

#### API

**Returns**: `boolean` - `true` if viewport width < 768px

---

### useScrollTransition

Smooth scroll transitions for landing page.

**Location**: `src/hooks/useScrollTransition.ts`

#### Usage

```typescript
import { useScrollTransition } from '@/hooks/useScrollTransition';

function LandingPage() {
  const { scrollY, shouldShowApp } = useScrollTransition();

  return (
    <div>
      <Hero opacity={1 - scrollY / 1000} />
      {shouldShowApp && <ChatInterface />}
    </div>
  );
}
```

#### API

**Returns**:
```typescript
{
  scrollY: number;           // Current scroll position
  scrollProgress: number;    // Scroll progress (0-1)
  shouldShowApp: boolean;    // Whether to show main app
  scrollToApp: () => void;   // Programmatically scroll to app
}
```

---

## Artifacts

### use-multi-artifact

Manage multiple artifacts in a single session.

**Location**: `src/hooks/use-multi-artifact.ts`

#### Usage

```typescript
import { useMultiArtifact } from '@/hooks/use-multi-artifact';

function ArtifactPanel() {
  const {
    artifacts,
    currentArtifact,
    setCurrentArtifact,
    addArtifact
  } = useMultiArtifact(sessionId);

  return (
    <div>
      {artifacts.map(artifact => (
        <button
          key={artifact.id}
          onClick={() => setCurrentArtifact(artifact.id)}
        >
          {artifact.title}
        </button>
      ))}
    </div>
  );
}
```

#### API

**Parameters**:
- `sessionId: string` - Session identifier

**Returns**:
```typescript
{
  artifacts: Artifact[];                    // All artifacts in session
  currentArtifact: Artifact | null;         // Currently selected artifact
  setCurrentArtifact: (id: string) => void; // Select an artifact
  addArtifact: (artifact: Artifact) => void; // Add new artifact
  updateArtifact: (id: string, data: Partial<Artifact>) => void;
  deleteArtifact: (id: string) => void;
}
```

---

### useArtifactVersions

Manage artifact version history.

**Location**: `src/hooks/useArtifactVersions.ts`

#### Usage

```typescript
import { useArtifactVersions } from '@/hooks/useArtifactVersions';

function VersionControl({ artifactId }: { artifactId: string }) {
  const {
    versions,
    currentVersion,
    saveVersion,
    restoreVersion
  } = useArtifactVersions(artifactId);

  return (
    <div>
      {versions.map(version => (
        <button
          key={version.id}
          onClick={() => restoreVersion(version.id)}
        >
          {version.timestamp} - {version.description}
        </button>
      ))}
    </div>
  );
}
```

#### API

**Parameters**:
- `artifactId: string` - Artifact identifier

**Returns**:
```typescript
{
  versions: ArtifactVersion[];       // All versions
  currentVersion: number;            // Current version index
  saveVersion: (description?: string) => void;
  restoreVersion: (versionId: string) => void;
  compareVersions: (v1: string, v2: string) => DiffResult;
}
```

---

## Utilities

### useThrottle

Throttle function calls to prevent excessive executions.

**Location**: `src/hooks/useThrottle.ts`

#### Usage

```typescript
import { useThrottle } from '@/hooks/useThrottle';

function SearchInput() {
  const [query, setQuery] = useState('');
  const throttledSearch = useThrottle((value: string) => {
    performSearch(value);
  }, 500);

  return (
    <input
      onChange={(e) => {
        setQuery(e.target.value);
        throttledSearch(e.target.value);
      }}
    />
  );
}
```

#### API

**Parameters**:
- `callback: (...args: any[]) => void` - Function to throttle
- `delay: number` - Delay in milliseconds

**Returns**: `(...args: any[]) => void` - Throttled function

---

### useServiceWorkerUpdate

Detect and handle service worker updates.

**Location**: `src/hooks/useServiceWorkerUpdate.ts`

#### Usage

```typescript
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';

function UpdateNotification() {
  const { updateAvailable, updateServiceWorker } = useServiceWorkerUpdate();

  if (!updateAvailable) return null;

  return (
    <div>
      <p>New version available!</p>
      <button onClick={updateServiceWorker}>Update Now</button>
    </div>
  );
}
```

#### API

**Returns**:
```typescript
{
  updateAvailable: boolean;           // Whether update is available
  updateServiceWorker: () => void;    // Apply update
  skipWaiting: () => void;            // Skip waiting for update
}
```

---

### use-rate-limit-warning

Show warnings when approaching rate limits.

**Location**: `src/hooks/use-rate-limit-warning.tsx`

#### Usage

```typescript
import { useRateLimitWarning } from '@/hooks/use-rate-limit-warning';

function RateLimitNotification() {
  const { shouldWarn, remainingRequests } = useRateLimitWarning();

  if (!shouldWarn) return null;

  return (
    <div className="warning">
      Only {remainingRequests} requests remaining!
    </div>
  );
}
```

#### API

**Returns**:
```typescript
{
  shouldWarn: boolean;         // True if < 5 requests remaining
  remainingRequests: number;   // Requests left
  showUpgradePrompt: () => void;
}
```

---

## Best Practices

### 1. Error Handling

Always handle errors from hooks:

```typescript
const { streamChat, error } = useChatMessages(sessionId);

useEffect(() => {
  if (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    });
  }
}, [error]);
```

### 2. Loading States

Use loading states for better UX:

```typescript
const { isLoading, createSession } = useChatSessions();

<button disabled={isLoading}>
  {isLoading ? 'Creating...' : 'New Chat'}
</button>
```

### 3. Cleanup

Always cleanup subscriptions:

```typescript
useEffect(() => {
  const subscription = subscribeToUpdates();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 4. Memoization

Memoize expensive operations:

```typescript
const processedData = useMemo(() => {
  return messages.map(processMessage);
}, [messages]);
```

---

## Testing Hooks

### Unit Testing Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useChatMessages } from '@/hooks/useChatMessages';

describe('useChatMessages', () => {
  it('should stream chat messages', async () => {
    const { result } = renderHook(() => useChatMessages('test-session'));

    await act(async () => {
      await result.current.streamChat('Hello');
    });

    expect(result.current.messages).toHaveLength(2); // User + AI message
    expect(result.current.isStreaming).toBe(false);
  });
});
```

---

## Performance Tips

1. **Avoid Unnecessary Re-renders**: Use `useMemo` and `useCallback` appropriately
2. **Debounce/Throttle**: Use throttling for expensive operations (search, scroll)
3. **Lazy Loading**: Load hooks only when needed
4. **Pagination**: For large datasets (messages, sessions), implement pagination

---

## Support

For issues or questions about hooks:
- **GitHub Issues**: [https://github.com/NickB03/llm-chat-site/issues](https://github.com/NickB03/llm-chat-site/issues)
- **Documentation**: See README.md and API_REFERENCE.md

---

**Last Updated**: 2025-11-17
