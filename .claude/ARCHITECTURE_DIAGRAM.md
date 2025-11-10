# Model Architecture Diagram

## Request Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SENDS MESSAGE                          │
│                    "Create a todo list app"                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CHAT FUNCTION (Edge Function)                    │
│                 /supabase/functions/chat/index.ts                   │
│                                                                     │
│  1. Rate Limiting Check                                            │
│  2. Intent Detection                                               │
│     ├─ shouldGenerateImage(message)                                │
│     ├─ shouldGenerateArtifact(message)                             │
│     └─ Default: Regular chat                                       │
└─────────────┬───────────────┬──────────────┬────────────────────────┘
              │               │              │
    Image?    │    Artifact?  │     Chat?    │
              │               │              │
              ▼               ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────────────┐
│ GENERATE-IMAGE  │ │GENERATE-ARTIFACT│ │   REGULAR CHAT (Flash)   │
│  Edge Function  │ │  Edge Function  │ │                          │
│                 │ │                 │ │  Model: gemini-2.5-flash │
│ Model:          │ │ Model:          │ │  Keys: GOOGLE_KEY_1,2    │
│ gemini-2.5-     │ │ gemini-2.5-pro  │ │  Method: Streaming SSE   │
│ flash-image     │ │                 │ │                          │
│                 │ │ Keys:           │ │  Use: Q&A, conversation  │
│ Keys:           │ │ GOOGLE_KEY_5,6  │ │                          │
│ GOOGLE_KEY_3,4  │ │                 │ │  Speed: 1-3 seconds      │
│                 │ │ Method:         │ │  Quality: Good           │
│ Method:         │ │ Non-streaming   │ │  Cost: Low               │
│ Non-streaming   │ │                 │ └──────────────────────────┘
│                 │ │ Use: React/HTML │
│ Use: Images     │ │ artifacts       │
│                 │ │                 │
│ Speed: 5-15s    │ │ Speed: 5-10s    │
│ Quality: Good   │ │ Quality: High   │
│ Cost: Moderate  │ │ Cost: Higher    │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
    ┌─────────────────────────────┐
    │    SUPABASE STORAGE         │
    │  (Images only)              │
    │                             │
    │  - Uploads base64 → blob    │
    │  - Generates signed URL     │
    │  - 7 day expiry             │
    │  - Falls back to base64     │
    └─────────────────────────────┘
```

---

## Round-Robin Key Rotation

```
┌────────────────────────────────────────────────────────────────────┐
│              API KEY ROTATION (Round-Robin)                        │
│           /supabase/functions/_shared/gemini-client.ts             │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│  CHAT KEY POOL          │
│  (CHAT, TITLE, SUMMARY) │
│                         │
│  Request 1 → Key #1 ────┼─→ GOOGLE_KEY_1 (AIzaSy...abc)
│  Request 2 → Key #2 ────┼─→ GOOGLE_KEY_2 (AIzaSy...def)
│  Request 3 → Key #1 ────┼─→ GOOGLE_KEY_1 (cycles back)
│  Request 4 → Key #2 ────┼─→ GOOGLE_KEY_2
│                         │
│  Capacity: 4 RPM total  │
└─────────────────────────┘

┌─────────────────────────┐
│  IMAGE KEY POOL         │
│  (IMAGE GENERATION)     │
│                         │
│  Request 1 → Key #1 ────┼─→ GOOGLE_KEY_3 (AIzaSy...ghi)
│  Request 2 → Key #2 ────┼─→ GOOGLE_KEY_4 (AIzaSy...jkl)
│  Request 3 → Key #1 ────┼─→ GOOGLE_KEY_3 (cycles back)
│  Request 4 → Key #2 ────┼─→ GOOGLE_KEY_4
│                         │
│  Capacity: 30 RPM total │
└─────────────────────────┘

┌─────────────────────────┐
│  ARTIFACT KEY POOL      │
│  (CODE GENERATION)      │
│                         │
│  Request 1 → Key #1 ────┼─→ GOOGLE_KEY_5 (AIzaSy...mno)
│  Request 2 → Key #2 ────┼─→ GOOGLE_KEY_6 (AIzaSy...pqr)
│  Request 3 → Key #1 ────┼─→ GOOGLE_KEY_5 (cycles back)
│  Request 4 → Key #2 ────┼─→ GOOGLE_KEY_6
│                         │
│  Capacity: 4 RPM total  │
└─────────────────────────┘

Key Features:
- ✅ Independent counters per pool (no cross-interference)
- ✅ Closure-scoped state (persists within isolate)
- ✅ Automatic rotation (no configuration needed)
- ✅ Console logging for visibility
```

---

## Intent Detection Logic

```
┌─────────────────────────────────────────────────────────────┐
│                    USER MESSAGE                             │
│              "Create a todo list app"                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              shouldGenerateImage(content)                   │
│  Regex: /^(generate|create|make|draw).*image/i             │
└────────────┬────────────────────────────────────────────────┘
             │
       False │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            shouldGenerateArtifact(content)                  │
│  Regex: /^(create|build|make|code).*app/i                  │
│         /component|dashboard|calculator|game/i              │
└────────────┬────────────────────────────────────────────────┘
             │
       True  │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              getArtifactType(content)                       │
│  Returns: "react" | "html" | "svg" | "code"                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│         Delegate to generate-artifact function              │
│              (Pro model for high quality)                   │
└─────────────────────────────────────────────────────────────┘
```

**Examples:**

| User Message | Detected As | Model Used | Function |
|-------------|-------------|------------|----------|
| "What is React?" | Chat | Flash | chat |
| "Create a todo list app" | Artifact (react) | Pro | generate-artifact |
| "Generate an image of a sunset" | Image | Flash-Image | generate-image |
| "Build a dashboard" | Artifact (react) | Pro | generate-artifact |
| "Explain TypeScript" | Chat | Flash | chat |

---

## Rate Limit Comparison

### Before Rotation (Single Key)
```
Chat:     ████░░░░░░░░░░░░ 2 RPM
Artifact: ████░░░░░░░░░░░░ 2 RPM
Image:    ████████████████████████████░░░░░░ 15 RPM
```

### After Rotation (2 Keys)
```
Chat:     ████████░░░░░░░░░░░░░░░░░░ 4 RPM  (+100%)
Artifact: ████████░░░░░░░░░░░░░░░░░░ 4 RPM  (+100%)
Image:    ████████████████████████████████████████████████████████ 30 RPM  (+100%)
```

**Improvement:** 2x capacity across all features

---

## Console Log Flow

### Regular Chat Request
```
[chat] Request body: {"messages":1,"sessionId":"abc123"}
[chat] Checking for API key...
[gemini-client] 🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
[chat] ✅ API key found, length: 39
[chat] Starting chat stream for session: abc123
[gemini API] → gemini-2.5-flash:streamGenerateContent
[chat] ← Streaming response...
```

### Artifact Request
```
[chat] Request body: {"messages":1,"sessionId":"abc123"}
[chat] Artifact generation request detected (type: react)
[chat] → Delegating to generate-artifact function
[generate-artifact] Artifact generation request from user: Create...
[gemini-client] 🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #1 of 2
[gemini API] → gemini-2.5-pro:generateContent
[generate-artifact] Artifact generated successfully, length: 3524
[chat] ← Streaming artifact back to client
```

### Image Request
```
[chat] Request body: {"messages":1,"sessionId":"abc123"}
[chat] Image generation request detected
[chat] → Delegating to generate-image function
[generate-image] Image generate request from user: Generate...
[gemini-client] 🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2
[gemini API] → gemini-2.5-flash-image:generateContent
[generate-image] ✅ Found image data, mimeType: image/png
[generate-image] Image generate successful, size: 234567 bytes
[supabase-storage] Image uploaded successfully (7 days expiry)
[chat] ← Streaming image artifact back to client
```

---

## System Prompt Architecture

### Regular Chat
- **Source:** `/supabase/functions/_shared/system-prompt-inline.ts`
- **Size:** ~5KB (externalized to reduce bundle size)
- **Includes:** General AI assistant guidelines, artifact syntax rules
- **Optimized for:** Conversation, Q&A, explanations

### Artifact Generation
- **Source:** Inline in `generate-artifact/index.ts` (lines 7-231)
- **Size:** ~15KB (specialized, worth the bundle size)
- **Includes:**
  - ❌ Forbidden imports (`@/components/ui/*`)
  - ✅ Allowed libraries (Radix UI, Recharts, D3, etc.)
  - 📝 Code templates and examples
  - 🎨 Design guidelines
- **Optimized for:** High-quality code generation with strict constraints

---

## Error Handling Flow

```
┌──────────────────────┐
│   API Call Fails     │
└──────────┬───────────┘
           │
           ▼
    ┌─────────────┐
    │ Status 429? │ (Quota exceeded)
    └──┬──────────┘
       │ Yes
       ▼
    Return 429 with:
    - X-RateLimit-Limit header
    - X-RateLimit-Reset header
    - Retry-After header
    - User-friendly error message

    ┌─────────────┐
    │ Status 503? │ (Model overloaded)
    └──┬──────────┘
       │ Yes
       ▼
    Return 503 with:
    - retryable: true flag
    - Transient error message

    ┌─────────────┐
    │ Other error │
    └──┬──────────┘
       │
       ▼
    Return 500 with:
    - Generic error message
    - Debug details in logs
```

---

**Last Updated:** 2025-11-09
**Created By:** Claude Code (Sonnet 4.5)
**Purpose:** Visual reference for model architecture verification
