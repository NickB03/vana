# Lovable → Google AI Studio Migration: Action Plan

**Migration Status**: Technically complete, awaiting verification  
**Project Type**: Personal portfolio (zero production traffic)  
**Last Updated**: 2025-01-07

---

## 1. Critical Pre-Launch Tasks (Must Do Before Showing)

### ✅ Task 1.1: Verify Edge Functions Work
**Time**: 30-45 minutes  
**Why**: If edge functions fail, the entire app is broken  
**Status**: ⏳ PENDING

```bash
# Start dev server
npm run dev

# Test each edge function manually
# 1. Chat streaming
curl -X POST http://localhost:54321/functions/v1/chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "sessionId": "test-session"
  }'

# 2. Image generation
curl -X POST http://localhost:54321/functions/v1/generate-image \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A sunset over mountains"}'

# 3. Title generation
curl -X POST http://localhost:54321/functions/v1/generate-title \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'

# 4. Summarization
curl -X POST http://localhost:54321/functions/v1/summarize-conversation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

**Success Criteria**:
- ✅ All 4 functions return 200 status
- ✅ Chat streams SSE events with `data:` prefix
- ✅ Image returns base64 data
- ✅ No 500 errors in console

---

### ✅ Task 1.2: Browser End-to-End Test
**Time**: 20-30 minutes  
**Why**: Verify the full user experience works  
**Status**: ⏳ PENDING

```bash
# Start Chrome DevTools MCP
chrome-mcp start

# Start dev server
npm run dev
```

**Manual Test Checklist**:
```
□ Navigate to http://localhost:8080
□ Sign in (or use as guest)
□ Send message: "Write a simple HTML page with a button"
  - Verify streaming works (text appears gradually)
  - Verify artifact renders in right panel
  - Check browser console for errors
□ Click "Generate Image" and enter: "A sunset"
  - Verify image appears
  - Check for 429 errors (quota issues)
□ Create new chat session
  - Verify title auto-generates
□ Send 5+ messages in one session
  - Verify conversation summarization triggers
□ Check Network tab
  - Verify requests go to vana-dev Supabase instance
  - Verify no requests to lovable.dev
```

**Screenshot Evidence**: Take screenshots of working features for portfolio documentation

---

### ✅ Task 1.3: Update README.md
**Time**: COMPLETED ✅  
**Why**: Outdated docs make the project look abandoned/unprofessional  
**Status**: ✅ DONE

**Changes Made**:
- ✅ Replaced "Lovable API" with "Google AI Studio"
- ✅ Updated architecture diagram
- ✅ Fixed deployment instructions (GOOGLE_AI_STUDIO_KEY)
- ✅ Removed Lovable project links

---

### ✅ Task 1.4: Add API Key Validation
**Time**: COMPLETED ✅  
**Why**: Prevents cryptic errors if API key is missing/invalid  
**Status**: ✅ DONE

**Changes Made**:
- ✅ Created `getValidatedApiKey()` helper in `gemini-client.ts`
- ✅ Validates key format (starts with "AIza", length check)
- ✅ Provides helpful error messages with setup instructions
- ✅ Updated both `callGeminiStream()` and `callGemini()` to use helper

---

### ✅ Task 1.5: Verify Environment Variables
**Time**: 5 minutes  
**Why**: Prevents "it works on my machine" issues  
**Status**: ⏳ PENDING

```bash
# Check local .env file
cat .env | grep GOOGLE_AI_STUDIO_KEY

# Check Supabase secrets (if deployed)
supabase secrets list

# If missing, set it:
supabase secrets set GOOGLE_AI_STUDIO_KEY=your_key_here
```

**Success Criteria**:
- ✅ Key is set in both local `.env` and Supabase secrets
- ✅ Key starts with `AIza` and is ~39 characters

---

## 2. Important Follow-ups (Within 1-2 Weeks)

### 📋 Task 2.1: Add Structured Logging
**Time**: 30-45 minutes
**Why**: Demonstrates observability best practices for portfolio
**Status**: ⏳ PENDING

**Implementation**:
```typescript
// Add to supabase/functions/_shared/logger.ts
export interface ApiCallLog {
  type: "api_call";
  function: string;
  model: string;
  duration_ms: number;
  tokens?: number;
  user_id?: string;
  status: "success" | "error";
  error_code?: string;
  timestamp: string;
}

export function logApiCall(log: Omit<ApiCallLog, "type" | "timestamp">) {
  console.log(JSON.stringify({
    type: "api_call",
    ...log,
    timestamp: new Date().toISOString()
  }));
}

// Usage in chat/index.ts
const startTime = Date.now();
try {
  const response = await fetch(...);
  logApiCall({
    function: "chat",
    model: "gemini-2.5-pro",
    duration_ms: Date.now() - startTime,
    user_id: user?.id,
    status: "success"
  });
} catch (error) {
  logApiCall({
    function: "chat",
    model: "gemini-2.5-pro",
    duration_ms: Date.now() - startTime,
    user_id: user?.id,
    status: "error",
    error_code: error.message
  });
}
```

**Benefits for Portfolio**:
- Shows understanding of production monitoring
- Enables performance analysis
- Demonstrates structured logging best practices

---

### 📋 Task 2.2: Add Performance Metrics Dashboard
**Time**: 1-2 hours
**Why**: Visual demonstration of system performance
**Status**: ⏳ PENDING

**Implementation**:
```typescript
// Create src/pages/AdminDashboard.tsx
// Query Supabase logs for:
// - Average response time per model
// - Request volume over time
// - Error rate
// - Token usage trends

// Use Recharts (already in project) for visualization
```

**Benefits for Portfolio**:
- Demonstrates data visualization skills
- Shows full-stack capabilities
- Provides talking point in interviews

---

### 📋 Task 2.3: Document Migration in Portfolio
**Time**: 30-45 minutes
**Why**: Demonstrates technical writing and decision-making
**Status**: ⏳ PENDING

**Create**: `docs/MIGRATION_CASE_STUDY.md`

**Content Outline**:
1. **Problem**: Why migrate from Lovable Cloud?
   - Cost considerations
   - API limitations
   - Learning opportunity

2. **Solution**: Direct Google AI Studio integration
   - Architecture diagram (before/after)
   - Technical decisions (shared utilities, backward compatibility)
   - Implementation timeline

3. **Results**:
   - Performance improvements (latency reduction)
   - Cost savings (if applicable)
   - Lessons learned

4. **Code Highlights**:
   - Format conversion logic
   - Streaming implementation
   - Error handling

**Benefits for Portfolio**:
- Shows migration experience
- Demonstrates technical communication
- Provides interview talking points

---

### 📋 Task 2.4: Add Basic Rate Limiting
**Time**: 45-60 minutes
**Why**: Prevents quota exhaustion, demonstrates security awareness
**Status**: ⏳ PENDING

**Implementation**:
```typescript
// Create supabase/functions/_shared/rate-limiter.ts
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests = 10,
  windowMs = 60000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (userLimit.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((userLimit.resetAt - now) / 1000)
    };
  }

  userLimit.count++;
  return { allowed: true };
}

// Usage in chat/index.ts
const rateLimit = checkRateLimit(user?.id || req.headers.get("x-forwarded-for") || "guest");
if (!rateLimit.allowed) {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      retryAfter: rateLimit.retryAfter
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Retry-After": String(rateLimit.retryAfter)
      }
    }
  );
}
```

**Benefits for Portfolio**:
- Shows security awareness
- Demonstrates resource management
- Prevents accidental quota exhaustion during demos

---

## 3. Nice-to-Haves (Optional Improvements)

### 🎨 Task 3.1: Add Response Caching
**Time**: 2-3 hours
**Why**: Demonstrates caching strategies, reduces API costs
**Status**: ⏳ PENDING

**Implementation**:
```typescript
// Use Supabase as cache layer
// Cache key: hash(messages + model + temperature)
// TTL: 1 hour for identical requests

// Benefits:
// - Instant responses for repeated queries
// - Reduced API costs
// - Demonstrates caching best practices
```

---

### 🎨 Task 3.2: Add Retry Logic with Exponential Backoff
**Time**: 1-2 hours
**Why**: Demonstrates resilience patterns
**Status**: ⏳ PENDING

**Implementation**:
```typescript
// Create supabase/functions/_shared/retry.ts
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

// Usage for transient failures (429, 503)
```

**Benefits for Portfolio**:
- Shows understanding of distributed systems
- Demonstrates error recovery patterns
- Improves reliability

---

### 🎨 Task 3.3: Add Cost Tracking
**Time**: 1-2 hours
**Why**: Demonstrates business awareness
**Status**: ⏳ PENDING

**Implementation**:
```typescript
// Track token usage per request
// Estimate costs based on Gemini pricing
// Display in admin dashboard

// Gemini 2.5 Pro pricing (as of Jan 2025):
// - Input: $1.25 / 1M tokens
// - Output: $5.00 / 1M tokens

// Benefits:
// - Shows cost consciousness
// - Enables budget planning
// - Demonstrates business acumen
```

---

## Summary & Next Steps

### Immediate Priority (This Week)
1. ✅ **Task 1.1**: Test all edge functions (30-45 min)
2. ✅ **Task 1.2**: Browser end-to-end test (20-30 min)
3. ✅ **Task 1.5**: Verify environment variables (5 min)

**Total Time**: ~1-1.5 hours

### Short-Term (Next 1-2 Weeks)
4. 📋 **Task 2.1**: Add structured logging (30-45 min)
5. 📋 **Task 2.3**: Document migration case study (30-45 min)
6. 📋 **Task 2.4**: Add basic rate limiting (45-60 min)

**Total Time**: ~2-3 hours

### Optional Enhancements (When Time Permits)
7. 🎨 **Task 3.1**: Response caching (2-3 hours)
8. 🎨 **Task 3.2**: Retry logic (1-2 hours)
9. 🎨 **Task 3.3**: Cost tracking (1-2 hours)

**Total Time**: ~5-7 hours

---

## Portfolio Impact

### What This Migration Demonstrates

**Technical Skills**:
- ✅ API integration and migration
- ✅ Streaming data handling (SSE)
- ✅ Format conversion and data transformation
- ✅ Error handling and resilience
- ✅ Backward compatibility design

**Engineering Practices**:
- ✅ DRY principles (shared utilities)
- ✅ Separation of concerns
- ✅ Defensive programming (validation)
- ✅ Documentation and communication

**Business Awareness**:
- ✅ Cost optimization
- ✅ Performance monitoring
- ✅ Resource management

### Interview Talking Points

1. **"Tell me about a challenging migration you've done"**
   - Lovable Cloud → Google AI Studio
   - Maintained backward compatibility
   - Zero downtime approach

2. **"How do you handle API integrations?"**
   - Format conversion strategies
   - Error handling patterns
   - Streaming data implementation

3. **"Describe your approach to observability"**
   - Structured logging
   - Performance metrics
   - Error tracking

---

## Checklist for "Migration Complete"

Before marking this migration as complete:

- [ ] All edge functions tested and working
- [ ] Browser end-to-end test passed
- [ ] Documentation updated (README, case study)
- [ ] Environment variables verified
- [ ] Screenshots taken for portfolio
- [ ] Structured logging implemented
- [ ] Rate limiting added
- [ ] Performance baseline established

**Estimated Total Time to Complete**: 4-6 hours

---

*Last Updated: 2025-01-07*
*Status: 2/5 critical tasks complete, ready for testing phase*


