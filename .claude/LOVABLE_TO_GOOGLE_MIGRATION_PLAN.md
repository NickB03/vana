# Migration Plan: Lovable Cloud → vana-dev + Google AI Studio

**Status**: Ready for Implementation
**Created**: 2025-01-07
**Estimated Time**: 2-3 hours
**Risk Level**: Medium (production data on vana-dev)

---

## 🎯 Migration Objectives

1. **Switch Supabase Instance**: `xfwlneedhqealtktaacv` (Lovable) → `vznhbocnuykdmjvujaka` (vana-dev)
2. **Replace AI Gateway**: Lovable AI Gateway → Google AI Studio Direct API
3. **Update Authentication**: `LOVABLE_API_KEY` → `GOOGLE_AI_STUDIO_KEY`
4. **Maintain Feature Parity**: Same models, same functionality, zero feature loss

---

## 📊 Current State Analysis

### Lovable Cloud Setup
```
┌─────────────────────────────────────────────┐
│      CURRENT ARCHITECTURE (BROKEN)          │
├─────────────────────────────────────────────┤
│                                             │
│  Supabase: xfwlneedhqealtktaacv (Lovable)  │
│  AI Gateway: ai.gateway.lovable.dev         │
│  Auth: Bearer ${LOVABLE_API_KEY} (missing) │
│  Status: ❌ BROKEN - Support Ticket Pending │
│                                             │
└─────────────────────────────────────────────┘
```

### Target Architecture
```
┌─────────────────────────────────────────────┐
│       TARGET ARCHITECTURE (WORKING)         │
├─────────────────────────────────────────────┤
│                                             │
│  Supabase: vznhbocnuykdmjvujaka (vana-dev) │
│  AI: generativelanguage.googleapis.com      │
│  Auth: x-goog-api-key: ${GOOGLE_AI_KEY}     │
│  Status: ✅ READY - API Key Already Present │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔧 Technical Changes Required

### 1. Environment Variables

#### Current (.env - Lovable Cloud)
```env
VITE_SUPABASE_URL="https://xfwlneedhqealtktaacv.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci...4rU"
# Note: LOVABLE_API_KEY stored in Lovable Cloud secrets (missing!)
```

#### Target (.env - vana-dev)
```env
VITE_SUPABASE_URL="https://vznhbocnuykdmjvujaka.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<vana-dev-anon-key>"
```

**Action Items**:
- [ ] Get vana-dev Supabase URL and anon key
- [ ] Update `.env` file with vana-dev credentials
- [ ] Set `GOOGLE_AI_STUDIO_KEY` as Supabase Edge Function secret
- [ ] Remove references to `LOVABLE_API_KEY`

---

### 2. Supabase Configuration

#### Current (supabase/config.toml)
```toml
project_id = "xfwlneedhqealtktaacv"

[functions.chat]
verify_jwt = true

[functions.generate-title]
verify_jwt = true

[functions.cache-manager]
verify_jwt = true

[functions.summarize-conversation]
verify_jwt = true

[functions.generate-image]
verify_jwt = true
```

#### Target (supabase/config.toml)
```toml
project_id = "vznhbocnuykdmjvujaka"

# JWT verification settings remain the same
[functions.chat]
verify_jwt = true

[functions.generate-title]
verify_jwt = true

[functions.cache-manager]
verify_jwt = true

[functions.summarize-conversation]
verify_jwt = true

[functions.generate-image]
verify_jwt = true
```

**Action Items**:
- [ ] Update `project_id` in `supabase/config.toml`
- [ ] Link Supabase CLI to vana-dev project: `supabase link --project-ref vznhbocnuykdmjvujaka`

---

### 3. Model Mapping

| Function | Current (Lovable) | Target (Google AI) | Status |
|----------|-------------------|-------------------|--------|
| Chat | `models/gemini-2.5-pro` | `gemini-2.5-pro` | ✅ Direct mapping |
| Image Gen | `google/gemini-2.5-flash-image-preview` | `gemini-2.5-flash-image` | ✅ Use `gemini-2.5-flash-image` |
| Title Gen | `google/gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` | ✅ Direct mapping |
| Summary | `google/gemini-2.5-flash` | `gemini-2.5-flash` | ✅ Direct mapping |

**Note**: Model names are nearly identical. Just remove vendor prefixes for Google AI Studio.

---

### 4. API Endpoint Changes

#### Lovable Gateway Format (Current)
```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "models/gemini-2.5-pro",
    messages: [...],
    stream: true
  })
});
```

#### Google AI Studio Format (Target)
```typescript
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY");
const model = "gemini-2.5-pro";

// For streaming
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    })
  }
);
```

**Key Differences**:
1. **Authentication**: Header (`Authorization: Bearer`) → Query param (`?key=`)
2. **Endpoint**: `ai.gateway.lovable.dev/v1/chat/completions` → `generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent`
3. **Request Format**: OpenAI-style (`messages`) → Gemini-native (`contents`)
4. **Role Names**: `assistant` → `model`, `system` → merged with user context
5. **Streaming**: Implicit (`stream: true`) → Explicit in URL (`?alt=sse`)

---

### 5. Edge Function Changes

#### Files to Modify:

##### A. `/chat/index.ts` (Main Chat Function)
**Current API Call** (lines ~253-290):
```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "models/gemini-2.5-pro",
    messages: [...],
    stream: true,
    tools: [{ google_search_retrieval: {} }]
  })
});
```

**Target API Call**:
```typescript
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY");

// Convert OpenAI-style messages to Gemini format
const geminiContents = messages
  .filter(msg => msg.role !== "system") // System messages handled separately
  .map(msg => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }]
  }));

// Prepend system message as first user context
const systemMessage = messages.find(msg => msg.role === "system");
if (systemMessage) {
  geminiContents.unshift({
    role: "user",
    parts: [{ text: systemMessage.content }]
  });
}

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: geminiContents,
      tools: [{ googleSearchRetrieval: {} }], // Note: camelCase
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    })
  }
);
```

**Response Parsing Changes**:
- **Current**: `data: {"choices":[{"delta":{"content":"..."}}]}`
- **Target**: `data: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}`

##### B. `/generate-image/index.ts` (Image Generation)
**Current** (lines ~98-109):
```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-image-preview",
    messages,
    modalities: ["image", "text"]
  })
});
```

**Target**:
```typescript
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY");

const geminiContents = messages.map(msg => ({
  role: msg.role === "user" ? "user" : "model",
  parts: msg.parts || [{ text: msg.content }]
}));

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: geminiContents,
      generationConfig: {
        responseMimeType: "image/png"
      }
    })
  }
);
```

**Important**: Image generation response format differs significantly. Need to extract base64 image from response.

##### C. `/generate-title/index.ts` (Title Generation)
**Minimal changes** - same pattern as chat, but simpler:
- Update endpoint to `gemini-2.5-flash-lite:generateContent`
- Convert message format
- Update response parsing

##### D. `/summarize-conversation/index.ts` (Summarization)
**Minimal changes** - same pattern as chat:
- Update endpoint to `gemini-2.5-flash:generateContent`
- Convert message format
- Update response parsing

##### E. `/cache-manager/index.ts`
**No changes required** - This function doesn't call any AI API.

---

### 6. Response Format Transformation

#### Streaming Response Parsing

**Current (Lovable/OpenAI Format)**:
```json
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

**Target (Google AI Studio Format)**:
```json
data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}
data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}]}
```

**Frontend Changes** (`src/hooks/useChatMessages.tsx`):
- SSE parsing logic remains the same (uses `getReader()`)
- Update JSON extraction:
  - **Before**: `response.choices[0]?.delta?.content`
  - **After**: `response.candidates[0]?.content?.parts[0]?.text`

---

### 7. Database Migration Status

**Current Databases**:
1. **Lovable Cloud** (`xfwlneedhqealtktaacv`): Production data (users, sessions, messages)
2. **vana-dev** (`vznhbocnuykdmjvujaka`): Development/testing (may be empty or stale)

**Migration Strategy**:

**Option A: Fresh Start (RECOMMENDED)**
- ✅ Clean slate with new database
- ✅ Simpler implementation (no data transfer)
- ✅ Faster migration (2-3 hours)
- ❌ Users lose chat history

**Option B: Data Migration**
- ✅ Preserve user data
- ❌ Complex (requires pg_dump/restore or manual export/import)
- ❌ Longer migration time (4-6 hours)
- ❌ Risk of data inconsistencies

**Recommendation**: Start with **Option A**. If users need history, implement data migration post-launch.

---

### 8. Error Handling Updates

| Lovable Error | Google AI Error | Mapping |
|--------------|----------------|---------|
| 429 - Rate Limit | 429 - Quota exceeded | Same handling |
| 402 - Payment Required | 429 - Quota exceeded | Map to quota error |
| 500 - Gateway Error | 500 - Server error | Same handling |
| 401 - Unauthorized | 403 - API key invalid | Update error message |

**Update error messages** in all edge functions to reference Google AI Studio instead of Lovable.

---

## 📝 Implementation Checklist

### Phase 1: Pre-Migration Setup (30 min)
- [ ] **Get vana-dev credentials**
  ```bash
  # Get project details from Supabase dashboard
  # Project: vznhbocnuykdmjvujaka
  # Need: Supabase URL + anon key
  ```
- [ ] **Verify Google AI Studio API key**
  ```bash
  # Already have: AIzaSyCTHZXV-s_RDANJGB908m78y3tbPv2oCEg
  # Test it works:
  curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
  ```
- [ ] **Backup current configuration**
  ```bash
  cp .env .env.lovable-backup
  cp supabase/config.toml supabase/config.toml.backup
  ```

### Phase 2: Configuration Updates (20 min)
- [ ] **Update `.env` file**
  ```env
  VITE_SUPABASE_URL="https://vznhbocnuykdmjvujaka.supabase.co"
  VITE_SUPABASE_PUBLISHABLE_KEY="<vana-dev-anon-key>"
  ```
- [ ] **Update `supabase/config.toml`**
  ```toml
  project_id = "vznhbocnuykdmjvujaka"
  ```
- [ ] **Link Supabase CLI to vana-dev**
  ```bash
  supabase link --project-ref vznhbocnuykdmjvujaka
  ```
- [ ] **Set Edge Function secret**
  ```bash
  supabase secrets set GOOGLE_AI_STUDIO_KEY="AIzaSyCTHZXV-s_RDANJGB908m78y3tbPv2oCEg"
  ```

### Phase 3: Edge Function Migration (90 min)

#### 3.1 Create Helper Utilities (15 min)
Create `supabase/functions/_shared/gemini-client.ts`:
```typescript
export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

export function convertToGeminiFormat(messages: Array<{role: string; content: string}>): GeminiMessage[] {
  return messages
    .filter(msg => msg.role !== "system")
    .map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));
}

export function extractSystemMessage(messages: Array<{role: string; content: string}>): string | null {
  const systemMsg = messages.find(msg => msg.role === "system");
  return systemMsg?.content || null;
}

export async function callGeminiStream(
  model: string,
  contents: GeminiMessage[],
  systemInstruction?: string,
  tools?: any[]
): Promise<Response> {
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY");
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_AI_STUDIO_KEY not configured");
  }

  const body: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    }
  );
}

export async function callGemini(
  model: string,
  contents: GeminiMessage[],
  systemInstruction?: string
): Promise<Response> {
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY");
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_AI_STUDIO_KEY not configured");
  }

  const body: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    }
  );
}
```

#### 3.2 Update `/chat/index.ts` (30 min)
- [ ] Import helper utilities
- [ ] Replace `LOVABLE_API_KEY` with `GOOGLE_AI_STUDIO_KEY`
- [ ] Convert message format using helper
- [ ] Update API endpoint to Google AI Studio
- [ ] Update streaming response parser:
  ```typescript
  // Old: response.choices[0]?.delta?.content
  // New: response.candidates[0]?.content?.parts[0]?.text
  ```
- [ ] Update Google Search tool format:
  ```typescript
  // Old: tools: [{ google_search_retrieval: {} }]
  // New: tools: [{ googleSearchRetrieval: {} }]
  ```
- [ ] Test streaming with simple prompt

#### 3.3 Update `/generate-image/index.ts` (20 min)
- [ ] Replace `LOVABLE_API_KEY` with `GOOGLE_AI_STUDIO_KEY`
- [ ] Update model: `gemini-2.5-flash-image`
- [ ] Convert message format
- [ ] Update response parsing for image data
- [ ] Handle image extraction (base64 or URL)
- [ ] Test image generation

#### 3.4 Update `/generate-title/index.ts` (10 min)
- [ ] Replace API key
- [ ] Update model: `gemini-2.5-flash-lite`
- [ ] Convert message format
- [ ] Update response parsing
- [ ] Test title generation

#### 3.5 Update `/summarize-conversation/index.ts` (10 min)
- [ ] Replace API key
- [ ] Update model: `gemini-2.5-flash`
- [ ] Convert message format
- [ ] Update response parsing
- [ ] Test summarization

#### 3.6 Leave `/cache-manager/index.ts` unchanged (0 min)

### Phase 4: Frontend Updates (15 min)
- [ ] **Update `src/hooks/useChatMessages.tsx`**
  - Update SSE parsing:
    ```typescript
    // Old
    const content = jsonData.choices?.[0]?.delta?.content;

    // New
    const content = jsonData.candidates?.[0]?.content?.parts?.[0]?.text;
    ```
- [ ] **No environment variable changes needed** (Vite will pick up new `.env` automatically)

### Phase 5: Testing & Validation (30 min)
- [ ] **Deploy edge functions to vana-dev**
  ```bash
  supabase functions deploy chat
  supabase functions deploy generate-image
  supabase functions deploy generate-title
  supabase functions deploy summarize-conversation
  supabase functions deploy cache-manager
  ```
- [ ] **Test basic chat**
  - Send simple message
  - Verify streaming works
  - Check response quality
- [ ] **Test artifact generation**
  - Request React component
  - Verify artifact XML parsing
  - Check import validation
- [ ] **Test image generation**
  - Generate simple image
  - Verify image uploads to storage
  - Check edit mode
- [ ] **Test title generation**
  - Create new session
  - Verify auto-title
- [ ] **Test conversation summary**
  - Send 10+ messages
  - Verify summarization triggers
- [ ] **Check error handling**
  - Test with invalid API key
  - Test with quota exceeded scenario

### Phase 6: Deployment & Monitoring (15 min)
- [ ] **Verify all functions deployed successfully**
  ```bash
  supabase functions list
  ```
- [ ] **Monitor edge function logs**
  ```bash
  supabase functions logs chat
  ```
- [ ] **Check Supabase advisors**
  ```bash
  # Via MCP tool
  await get_advisors({ type: "security" })
  await get_advisors({ type: "performance" })
  ```
- [ ] **Update documentation**
  - Update `CLAUDE.md` with new setup
  - Create migration notes in `.claude/`
  - Update README if needed

---

## 🔄 Rollback Plan

If migration fails, revert in reverse order:

```bash
# 1. Restore configuration
cp .env.lovable-backup .env
cp supabase/config.toml.backup supabase/config.toml

# 2. Relink to Lovable Cloud
supabase link --project-ref xfwlneedhqealtktaacv

# 3. Restore edge functions from git
git checkout supabase/functions/

# 4. Redeploy to Lovable Cloud
# (Note: Will still fail without LOVABLE_API_KEY, but gets back to known state)
```

---

## ⚠️ Potential Issues & Mitigation

### Issue 1: Response Format Differences
**Problem**: Gemini API response structure differs from OpenAI/Lovable format
**Mitigation**: Create response transformation layer in helper utilities
**Test**: Compare side-by-side responses before/after

### Issue 2: Model Availability
**Problem**: Some Lovable models may not exist in Google AI Studio
**Mitigation**: Use closest equivalent (already mapped above)
**Test**: Verify all models are accessible via API before migration

### Issue 3: Rate Limits
**Problem**: Google AI Studio has different quota limits than Lovable
**Mitigation**: Monitor usage in Google AI Studio dashboard
**Test**: Load test with multiple concurrent requests

### Issue 4: Image Generation Format
**Problem**: Image response format likely very different
**Mitigation**: Implement robust image extraction logic
**Test**: Test both generate and edit modes thoroughly

### Issue 5: Streaming Stability
**Problem**: SSE parsing may behave differently
**Mitigation**: Add extensive error handling and reconnection logic
**Test**: Test with long responses and network interruptions

---

## 📚 References & Resources

### Google AI Studio Documentation
- **Quickstart**: https://ai.google.dev/gemini-api/docs/quickstart
- **Models**: https://ai.google.dev/gemini-api/docs/models
- **Text Generation**: https://ai.google.dev/gemini-api/docs/text-generation
- **Streaming**: https://ai.google.dev/gemini-api/docs/text-generation#stream

### Supabase Documentation
- **Edge Functions**: https://supabase.com/docs/guides/functions
- **Secrets Management**: https://supabase.com/docs/guides/functions/secrets
- **Project Linking**: https://supabase.com/docs/guides/cli/local-development

### Internal Documentation
- `.claude/QUICK_FIX_GUIDE.md` - Current Lovable Cloud issues
- `.claude/EDGE_FUNCTION_500_DIAGNOSIS.md` - Detailed error analysis
- `.claude/mcp-supabase.md` - Supabase MCP tools guide

---

## ✅ Success Criteria

Migration is considered successful when:
- [ ] All edge functions deploy without errors
- [ ] Chat streaming works end-to-end
- [ ] Artifact generation produces valid React components
- [ ] Image generation creates and stores images
- [ ] Title auto-generation works on new sessions
- [ ] Conversation summarization triggers correctly
- [ ] No console errors in browser DevTools
- [ ] API response times < 3s for chat, < 5s for images
- [ ] Zero 500 errors from edge functions
- [ ] Security advisors show no new RLS issues

---

## 🎉 Post-Migration Tasks

- [ ] Document API usage patterns for cost monitoring
- [ ] Set up alerting for quota limits in Google Cloud Console
- [ ] Create backup/export script for vana-dev database
- [ ] Update team on new architecture
- [ ] Monitor error rates for first 24 hours
- [ ] Consider data migration from Lovable Cloud (if needed)

---

**Estimated Total Time**: 2-3 hours
**Confidence Level**: High (90%) - API key already available, models are compatible
**Next Steps**: Review plan, get approval, execute Phase 1
