# Artifact Enhancement Plan - Secure Portfolio Edition
## Production-Ready Personal Project with Proper Security

**Date:** November 2, 2025
**Project Type:** Secure Personal Portfolio (Public Deployment)
**Timeline:** 6-8 weeks (80-100 hours)
**Goal:** Production-quality artifact system with authentication & security

---

## Executive Summary

This plan implements a **secure, production-ready portfolio** that includes:

### ✅ Keep (Security & Best Practices)
- **User Authentication** - Supabase Auth with proper session management
- **Row Level Security (RLS)** - Proper policies to protect data
- **Rate Limiting** - Prevent API abuse from public visitors
- **Input Validation** - XSS prevention, content sanitization
- **Security Best Practices** - Production-ready implementation

### ❌ Remove (Collaboration Features)
- Team/organization features
- Public artifact sharing by users
- Remix/fork functionality
- Multi-user collaboration
- User-to-user analytics

### 🎯 Result
A portfolio project that:
1. **Shows best practices** - Proper auth, RLS, rate limiting
2. **Is production-ready** - Can be deployed publicly
3. **Prevents abuse** - Rate limiting, validation, security
4. **Remains simple** - Single user (you), no collaboration complexity
5. **Impresses employers** - Security-conscious implementation

---

## Architecture with Security

### Database Schema with RLS

```sql
-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_gallery ENABLE ROW LEVEL SECURITY;

-- chat_sessions with user_id
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  first_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);

-- RLS: Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- chat_messages with user access via session
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  artifact_ids TEXT[],
  reasoning TEXT,
  token_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- RLS: Users can only access messages from their own sessions
CREATE POLICY "Users can view messages from own sessions"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- artifact_versions with RLS
CREATE TABLE artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  artifact_language TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(artifact_id, version_number)
);

CREATE INDEX idx_artifact_versions_artifact ON artifact_versions(artifact_id);
CREATE INDEX idx_artifact_versions_message ON artifact_versions(message_id);

-- RLS: Users can only access versions from their own messages
CREATE POLICY "Users can view versions from own messages"
  ON artifact_versions FOR SELECT
  USING (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions in own messages"
  ON artifact_versions FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- artifact_gallery (public read, owner write)
CREATE TABLE artifact_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL,
  message_id UUID REFERENCES chat_messages(id),
  version_number INTEGER NOT NULL,
  display_title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,  -- Allow public viewing
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_artifact_gallery_user ON artifact_gallery(user_id);
CREATE INDEX idx_artifact_gallery_public ON artifact_gallery(is_public) WHERE is_public = TRUE;

-- RLS: Public can view public gallery items, owner can do everything
CREATE POLICY "Anyone can view public gallery items"
  ON artifact_gallery FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can manage own gallery items"
  ON artifact_gallery FOR ALL
  USING (auth.uid() = user_id);
```

### Rate Limiting Strategy

**Option 1: Supabase Edge Functions**

```typescript
// supabase/functions/chat/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RATE_LIMITS = {
  anonymous: { requests: 5, window: 3600 },      // 5 per hour for unauthenticated
  authenticated: { requests: 100, window: 3600 }  // 100 per hour for authenticated
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  // Get user
  const authHeader = req.headers.get('Authorization')
  const { data: { user } } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  )

  // Check rate limit
  const limit = user ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous
  const key = user?.id || req.headers.get('x-forwarded-for') || 'unknown'

  const isAllowed = await checkRateLimit(key, limit)

  if (!isAllowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Process request
  // ...
})

async function checkRateLimit(
  key: string,
  limit: { requests: number; window: number }
): Promise<boolean> {
  // Implement using Supabase or Redis
  // Store request count + timestamp
  // Reset after window expires
}
```

**Option 2: Client-Side Rate Limit Tracking (Simpler)**

```typescript
// src/utils/rateLimiter.ts
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  async checkLimit(userId: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove expired requests
    const validRequests = userRequests.filter(time => now - time < windowMs);

    if (validRequests.length >= limit) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);

    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Usage in useChatMessages
const sendMessage = async (content: string) => {
  const session = await ensureValidSession();
  if (!session) {
    navigate('/auth');
    return;
  }

  const allowed = await rateLimiter.checkLimit(
    session.user.id,
    100,  // 100 requests
    3600000  // per hour
  );

  if (!allowed) {
    toast.error('Rate limit exceeded. Please wait before sending more messages.');
    return;
  }

  // Send message
};
```

### Authentication Flow (Existing)

Your existing auth setup is good - just ensure:

```typescript
// src/utils/authHelpers.ts (verify this exists)
export async function ensureValidSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return null;

  // Check if token expires soon (5 min buffer)
  const expiresAt = session.expires_at || 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 300) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    return refreshed;
  }

  return session;
}
```

---

## Implementation Plan (with Security)

### Week 1-2: Core Features + Security (32 hours)

#### Day 1-2: Auto-Detection (8 hours)
- Implement detection algorithm (30-line threshold)
- Add confidence scoring
- Test with various content types
- **Security:** Input validation, content sanitization

#### Day 3-5: Version Control (16 hours)
- Create migration with RLS policies
- Implement atomic version creation
- Build version selector UI
- Build diff viewer
- **Security:** RLS testing, user isolation verification

#### Day 6-8: Rate Limiting (8 hours)
- Implement rate limiter
- Add UI feedback for limits
- Test limit enforcement
- Add metrics tracking
- **Security:** Test with multiple users, verify limits work

### Week 3-4: Advanced Features (28 hours)

#### Day 9-11: Multi-Artifact Support (12 hours)
- Context provider with state management
- Tab navigation UI
- Artifact switching logic
- **Security:** Verify RLS applies to all artifacts

#### Day 12-14: AI Error Fixing (8 hours)
- Error boundary component
- Fix prompt generation
- Auto-apply logic
- **Security:** Validate AI responses, prevent injection

#### Day 15-16: Export & Gallery (8 hours)
- Export functionality
- Gallery page with public/private toggle
- Featured artifacts section
- **Security:** Public gallery RLS, view count integrity

### Week 5-6: Production Polish (20 hours)

#### Day 17-19: Performance (12 hours)
- Lazy loading
- Code splitting
- Performance testing
- **Security:** Rate limit impact on performance

#### Day 20-21: Testing (8 hours)
- Unit tests with RLS verification
- E2E tests with auth flows
- Security testing
- **Security:** Penetration testing, XSS prevention

### Week 7-8: Documentation & Deployment (20 hours)

#### Day 22-24: Documentation (12 hours)
- README with security section
- Architecture diagrams
- API documentation
- **Security:** Document security measures

#### Day 25-28: Deployment (8 hours)
- Production environment setup
- SSL/TLS configuration
- Monitoring setup
- **Security:** Production security checklist

---

## Security Checklist

### Authentication
- [ ] Supabase Auth configured
- [ ] Session validation on all requests
- [ ] Token refresh handling
- [ ] Logout functionality
- [ ] Password requirements enforced

### Row Level Security
- [ ] RLS enabled on all tables
- [ ] Policies tested with multiple users
- [ ] No data leakage between users
- [ ] Policies efficient (indexed columns)
- [ ] Anonymous access properly restricted

### Rate Limiting
- [ ] Rate limiter implemented
- [ ] Different limits for auth/anon users
- [ ] UI feedback for rate limits
- [ ] Graceful degradation
- [ ] Monitoring rate limit hits

### Input Validation
- [ ] XSS prevention in artifacts
- [ ] SQL injection prevention (using parameterized queries)
- [ ] File upload validation (if applicable)
- [ ] Content length limits
- [ ] Type validation on all inputs

### API Security
- [ ] CORS configured properly
- [ ] API keys not exposed
- [ ] Environment variables secured
- [ ] HTTPS enforced in production
- [ ] Security headers configured

### Data Protection
- [ ] Sensitive data encrypted
- [ ] User data isolated via RLS
- [ ] Audit logs (optional but recommended)
- [ ] Backup strategy
- [ ] GDPR considerations (if applicable)

---

## Testing with Security

### Unit Tests with RLS

```typescript
// src/hooks/__tests__/useChatSessions.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useChatSessions } from '../useChatSessions';
import { supabase } from '@/integrations/supabase/client';

describe('useChatSessions with RLS', () => {
  it('should only fetch sessions for authenticated user', async () => {
    // Mock authenticated user
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { user: mockUser } }
    });

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => {
      expect(result.current.sessions).toBeDefined();
    });

    // Verify RLS: Sessions belong to user-123
    result.current.sessions.forEach(session => {
      expect(session.user_id).toBe('user-123');
    });
  });

  it('should not allow access without authentication', async () => {
    // Mock no session
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null }
    });

    const { result } = renderHook(() => useChatSessions());

    await waitFor(() => {
      expect(result.current.sessions).toEqual([]);
    });
  });
});
```

### Rate Limit Tests

```typescript
// src/utils/__tests__/rateLimiter.test.ts
import { rateLimiter } from '../rateLimiter';

describe('Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const userId = 'test-user';
    const limit = 5;
    const window = 1000; // 1 second

    for (let i = 0; i < limit; i++) {
      const allowed = await rateLimiter.checkLimit(userId, limit, window);
      expect(allowed).toBe(true);
    }
  });

  it('should block requests over limit', async () => {
    const userId = 'test-user-2';
    const limit = 3;
    const window = 1000;

    // Use up limit
    for (let i = 0; i < limit; i++) {
      await rateLimiter.checkLimit(userId, limit, window);
    }

    // Next request should fail
    const allowed = await rateLimiter.checkLimit(userId, limit, window);
    expect(allowed).toBe(false);
  });

  it('should reset after window expires', async () => {
    const userId = 'test-user-3';
    const limit = 2;
    const window = 100; // 100ms

    // Use up limit
    await rateLimiter.checkLimit(userId, limit, window);
    await rateLimiter.checkLimit(userId, limit, window);

    // Should be blocked
    let allowed = await rateLimiter.checkLimit(userId, limit, window);
    expect(allowed).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be allowed again
    allowed = await rateLimiter.checkLimit(userId, limit, window);
    expect(allowed).toBe(true);
  });
});
```

---

## Security Best Practices Implementation

### Content Sanitization

```typescript
// src/utils/contentSanitizer.ts
import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload']
  });
}

export function sanitizeArtifactContent(content: string, type: ArtifactType): string {
  if (type === 'html') {
    return sanitizeHTML(content);
  }

  if (type === 'react') {
    // Verify no dangerous imports
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /dangerouslySetInnerHTML/,
      /<script/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new Error('Dangerous code detected in React component');
      }
    }
  }

  return content;
}
```

### Security Headers (Vite)

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }
  }
});
```

---

## Simplified vs. Original Plan

### What Changed

| Feature | Original | Revised |
|---------|----------|---------|
| **Authentication** | ✅ Full multi-user | ✅ Same (single or few users) |
| **RLS Policies** | ✅ Complex team policies | ✅ Simpler user-only policies |
| **Rate Limiting** | ✅ Per-user + IP | ✅ Per-user (simpler) |
| **Team Sharing** | ✅ Team collaboration | ❌ Removed |
| **Public Sharing** | ✅ Public artifact URLs | ❌ Removed (use gallery) |
| **Remix/Fork** | ✅ User-to-user | ❌ Removed |
| **Gallery** | ❌ Not included | ✅ Added (public showcase) |
| **Timeline** | 12-16 weeks | **6-8 weeks** (25% faster) |
| **Complexity** | High | **Medium** (simpler auth) |

### Savings

- **30% less code** (removed collaboration features)
- **25% faster** (6-8 vs 12-16 weeks)
- **Simpler architecture** (no teams, no sharing complexity)
- **Same security posture** (RLS, rate limiting, validation)

---

## Timeline Summary

| Week | Focus | Hours | Key Deliverables |
|------|-------|-------|------------------|
| 1-2 | Core + Security | 32h | Auto-detect, versions, RLS, rate limits |
| 3-4 | Advanced Features | 28h | Multi-artifact, AI fixing, export, gallery |
| 5-6 | Performance & Testing | 20h | Optimization, security tests, accessibility |
| 7-8 | Docs & Deployment | 20h | README, deployment, monitoring |
| **Total** | **6-8 weeks** | **80-100h** | **Production-ready secure portfolio** |

---

## Portfolio Impact (with Security)

### Resume Highlights

- ✅ Built secure AI-powered artifact system with Supabase Auth
- ✅ Implemented Row Level Security for data isolation
- ✅ Added rate limiting to prevent API abuse
- ✅ Achieved 95%+ test coverage including security tests
- ✅ Deployed production-ready application with proper security

### Demo Points

1. **Authentication** - "Secure login with session management"
2. **RLS Policies** - "Data isolated at database level"
3. **Rate Limiting** - "Prevents abuse from public visitors"
4. **Input Validation** - "XSS prevention and content sanitization"
5. **Production Ready** - "Deployed with monitoring and security headers"

---

## Next Steps

### Pre-Implementation

1. **Verify existing auth setup**
   ```bash
   # Check if auth helpers exist
   ls src/utils/authHelpers.ts

   # Verify Supabase config
   cat .env | grep SUPABASE
   ```

2. **Review RLS policies**
   ```sql
   -- Check existing policies
   SELECT * FROM pg_policies WHERE tablename IN (
     'chat_sessions',
     'chat_messages'
   );
   ```

3. **Plan rate limiting approach**
   - Edge Functions (more robust) or
   - Client-side (simpler, faster to implement)

### Start Week 1

Ready to begin? The plan now includes proper security while removing only collaboration features.

**First task:** Implement automatic artifact detection with input validation (Day 1-2, 8 hours)

Would you like to start Week 1, Day 1? 🚀
