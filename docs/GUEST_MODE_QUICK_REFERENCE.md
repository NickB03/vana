# Guest Mode Quick Reference Guide

**Feature:** Enhanced Guest Mode with SystemMessage Integration
**Version:** 1.0
**Last Updated:** November 4, 2025

---

## 🎯 Quick Summary

**What Changed:**
- Guest message limit: 5 → **10 messages**
- New **SystemMessage** component from prompt-kit
- Fixed first message bug for guests
- Backend now supports unauthenticated requests
- Real-time counter with sign-in CTA

---

## 📦 Key Components

### 1. useGuestSession Hook
```typescript
import { useGuestSession } from "@/hooks/useGuestSession";

const guestSession = useGuestSession(isAuthenticated);

// Returns:
// {
//   isGuest: boolean,
//   messageCount: number,        // Current count (0-10)
//   maxMessages: number,          // Always 10
//   canSendMessage: boolean,      // auth OR count < 10
//   incrementMessageCount: () => void,
//   resetSession: () => void,
//   hasReachedLimit: boolean      // count >= 10
// }
```

### 2. SystemMessage Component
```tsx
import { SystemMessage } from "@/components/ui/system-message";

<SystemMessage
  variant="action"     // "action" | "error" | "warning"
  fill                 // Filled background
  cta={{
    label: "Sign In",
    onClick: () => navigate("/auth")
  }}
>
  You have <strong>5</strong> free messages remaining...
</SystemMessage>
```

### 3. ChatInterface Props
```tsx
<ChatInterface
  sessionId={currentSessionId}          // undefined for guests
  initialPrompt={guestInitialPrompt}    // First message for guests
  isGuest={!isAuthenticated}            // Guest mode flag
  guestMessageCount={messageCount}      // Current count
  guestMaxMessages={maxMessages}        // Limit (10)
  // ...other props
/>
```

---

## 🔄 User Flow

### Guest Journey
```
1. Homepage → Type message → Submit
   ↓
2. Chat interface appears
   ↓
3. First message auto-sends
   ↓
4. SystemMessage appears: "You have 9 free messages remaining"
   ↓
5. User continues chatting (messages 2-9)
   ↓
6. Counter updates: 9 → 8 → 7 → ... → 1
   ↓
7. Message 10 sends
   ↓
8. SystemMessage: "You've reached your free message limit"
   ↓
9. Message 11 → GuestLimitDialog blocks
   ↓
10. User clicks "Sign In" → Navigate to /auth
```

### Authenticated Journey
```
1. Sign in
   ↓
2. Guest session cleared
   ↓
3. No SystemMessage
   ↓
4. Unlimited messages
   ↓
5. Messages persist in database
```

---

## 🎨 UI/UX Specifications

### SystemMessage Positioning
- **Location:** Top of chat messages
- **Container:** `max-w-3xl` (same as chat)
- **Spacing:** `px-6 py-3`
- **Alignment:** Centered

### Visual Design
- **Variant:** Action (info)
- **Fill:** Yes (blue/zinc background)
- **Icon:** Info icon (lucide-react)
- **Border:** Rounded 12px
- **Dark Mode:** Fully supported

### Text Variants
```typescript
// Active state (1-9 messages remaining)
`You have ${remaining} free message${plural} remaining. Sign in for increased limits on the free tier!`

// Limit reached (10 messages used)
"You've reached your free message limit. Sign in to continue chatting with increased limits!"
```

---

## 💾 Data Storage

### localStorage Structure
```json
{
  "vana_guest_session": {
    "id": "uuid-v4",
    "messageCount": 5,
    "createdAt": 1699132800000,
    "sessionExpiry": 1699219200000
  }
}
```

### Expiry
- **Duration:** 24 hours
- **Cleanup:** Automatic on expiry check
- **Reset:** On sign-in

---

## 🔧 API Changes

### Frontend Request
```typescript
// Guest request
{
  messages: [...],
  sessionId: undefined,     // No session for guests
  currentArtifact: null,
  isGuest: true            // NEW flag
}
// Headers: No Authorization

// Authenticated request
{
  messages: [...],
  sessionId: "abc-123",
  currentArtifact: null,
  isGuest: false
}
// Headers: Authorization: Bearer <token>
```

### Backend Handling
```typescript
// supabase/functions/chat/index.ts

if (isGuest) {
  // Skip authentication
  // Skip database session check
  // Proceed to OpenAI API
} else {
  // Validate auth token
  // Check session ownership
  // Proceed to OpenAI API
}
```

---

## 🐛 Bug Fixes

### Issue #1: First Message Lost
**Problem:** Guest's first message from homepage never sent

**Root Cause:** Input not passed to ChatInterface

**Fix:**
```typescript
// Home.tsx
const [guestInitialPrompt, setGuestInitialPrompt] = useState<string | undefined>();

if (!isAuthenticated) {
  setGuestInitialPrompt(input);  // Store
  setInput("");                  // Clear
  setShowChat(true);
}

// Pass to ChatInterface
<ChatInterface initialPrompt={!isAuthenticated ? guestInitialPrompt : input} />
```

### Issue #2: Auto-Send Required sessionId
**Problem:** Auto-send effect required sessionId, blocking guests

**Fix:**
```typescript
// ChatInterface.tsx
useEffect(() => {
- if (initialPrompt && sessionId && !hasInitialized) {
+ if (initialPrompt && !hasInitialized) {
    handleSend(initialPrompt);
  }
}, [sessionId, initialPrompt, hasInitialized]);
```

---

## 🔒 Security Considerations

### What's Protected ✅
- Authenticated user sessions
- Database access (RLS policies)
- Session ownership verification
- Token validation for auth users

### What's Open ⚠️
- Guest chat API endpoint (no auth)
- Guest message sending (rate limited by frontend only)

### Recommendations
```typescript
// Add to backend:
1. IP-based rate limiting (10 req/min)
2. Message length limits for guests
3. Cost tracking per IP
4. Monitor guest API usage
```

---

## 📊 Configuration

### Environment Variables
```bash
# Current (hardcoded)
MAX_GUEST_MESSAGES = 10

# Recommended
VITE_GUEST_MESSAGE_LIMIT=10
VITE_GUEST_SESSION_DURATION=86400000
```

### Feature Flags
```typescript
// Future enhancement
const GUEST_MODE_ENABLED = import.meta.env.VITE_GUEST_MODE_ENABLED === "true";
```

---

## 🧪 Testing Checklist

**Critical Tests:**
- [x] Build successful
- [ ] First message sends
- [ ] SystemMessage appears
- [ ] Counter updates correctly
- [ ] Limit enforced at 10 messages
- [ ] Sign-in button navigates
- [ ] No console errors

**Edge Cases:**
- [ ] Private browsing
- [ ] Page refresh
- [ ] Session expiry (24h)
- [ ] Network errors
- [ ] Mobile responsive

**Regression:**
- [ ] Authenticated users unaffected
- [ ] Session persistence works
- [ ] Artifacts still generate

---

## 🚀 Deployment

### Pre-Deployment
1. Complete manual testing
2. Add rate limiting (recommended)
3. Update environment variables
4. Clear staging cache

### Post-Deployment
1. Monitor guest API usage
2. Track conversion rate (guest → sign-up)
3. Check error logs
4. Verify SystemMessage appears

### Rollback Plan
```bash
# If issues occur:
1. Revert to commit: <previous-commit-hash>
2. Deploy rollback build
3. Clear CDN cache
4. Notify users of temporary guest mode limitation
```

---

## 📈 Analytics Events

### Recommended Tracking
```typescript
// Guest events
analytics.track("guest_message_sent", { messageNumber: 1-10 });
analytics.track("guest_limit_reached");
analytics.track("guest_clicked_sign_in", { source: "system_message" });

// Conversion events
analytics.track("guest_signed_up", { messagesUsed: 5 });
analytics.track("guest_to_paid_conversion");
```

---

## 🔗 Related Files

```
Frontend:
  src/hooks/useGuestSession.ts
  src/components/ui/system-message.tsx
  src/components/ChatInterface.tsx
  src/pages/Home.tsx
  src/hooks/useChatMessages.tsx

Backend:
  supabase/functions/chat/index.ts

Documentation:
  docs/PEER_REVIEW_GUEST_MODE.md
  docs/MANUAL_TEST_PLAN_GUEST_MODE.md
  docs/GUEST_MODE_QUICK_REFERENCE.md (this file)
```

---

## 🆘 Troubleshooting

### SystemMessage Not Appearing
1. Check `isGuest` prop is true
2. Verify `messages.length > 0`
3. Check console for errors
4. Verify SystemMessage import

### Counter Not Updating
1. Check localStorage: `localStorage.getItem('vana_guest_session')`
2. Verify `incrementMessageCount()` called
3. Check private browsing mode (uses in-memory)
4. Verify guestSession hook initialized

### First Message Not Sending
1. Check `guestInitialPrompt` state
2. Verify `setInput("")` called
3. Check auto-send effect dependencies
4. Verify initialPrompt passed correctly

### Backend 401 Errors for Guests
1. Check `isGuest: true` in request body
2. Verify no Authorization header sent
3. Check backend isGuest condition
4. Verify CORS headers

---

## 📞 Support

**Questions?** Contact: [Team Chat Link]
**Issues?** File at: [GitHub Issues]
**Docs:** [Notion/Confluence Link]

---

**Last Updated:** November 4, 2025
**Version:** 1.0
**Maintained By:** Engineering Team
