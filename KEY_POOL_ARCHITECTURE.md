# API Key Pool Architecture - Final Configuration

## Overview

The system uses **10 Google AI Studio API keys** distributed across **3 independent pools** to maximize rate limits and prevent overflow.

## Key Pool Distribution

| Pool | Function(s) | Model | Keys | RPM per Key | Total RPM | RPD per Key | Total RPD |
|------|------------|-------|------|-------------|-----------|-------------|-----------|
| **CHAT** | `chat` | gemini-2.5-flash | 1-2 | 2 | **4 RPM** | 50 | **100 RPD** |
| **ARTIFACT** | `generate-artifact`<br>`generate-artifact-fix` | gemini-2.5-pro | 3-6 | 2 | **8 RPM** | 50 | **200 RPD** |
| **IMAGE** | `generate-image` | gemini-2.5-flash-image | 7-10 | 15 | **60 RPM** | 1,500 | **6,000 RPD** |

## Architecture Rationale

### Why Separate Pools?

1. **Chat (Flash) - Keys 1-2**
   - Fast, lightweight model for conversation
   - Lower rate limits (2 RPM per key)
   - 2 keys = 4 RPM total (sufficient for chat)

2. **Artifact (Pro) - Keys 3-6**
   - High-quality code generation requires Pro model
   - Both artifact generation AND fixing use same pool
   - 4 keys = 8 RPM total (prevents overflow)
   - **Critical**: Pro model has only 2 RPM per key (same as Flash)

3. **Image (Flash-Image) - Keys 7-10**
   - Specialized image generation model
   - Higher rate limits (15 RPM per key)
   - 4 keys = 60 RPM total (plenty of capacity)

### Why Combine Artifact + Artifact Fix?

Both functions:
- Use the same model (gemini-2.5-pro)
- Have similar rate limits (2 RPM per key)
- Are related tasks (create vs. fix artifacts)
- Benefit from sharing a larger pool (8 RPM vs. 4 RPM each)

**Result**: Better resource utilization and simpler architecture.

## Configuration Details

### Environment Variables (Supabase Secrets)

```bash
# Chat pool (Flash model)
GOOGLE_KEY_1=AIzaSy...  # Chat key 1
GOOGLE_KEY_2=AIzaSy...  # Chat key 2

# Artifact pool (Pro model)
GOOGLE_KEY_3=AIzaSy...  # Artifact key 1
GOOGLE_KEY_4=AIzaSy...  # Artifact key 2
GOOGLE_KEY_5=AIzaSy...  # Artifact key 3
GOOGLE_KEY_6=AIzaSy...  # Artifact key 4

# Image pool (Flash-Image model)
GOOGLE_KEY_7=AIzaSy...   # Image key 1
GOOGLE_KEY_8=AIzaSy...   # Image key 2
GOOGLE_KEY_9=AIzaSy...   # Image key 3
GOOGLE_KEY_10=AIzaSy...  # Image key 4
```

**CRITICAL**: Each key must be from a **different Google Cloud project** to get independent rate limits.

### Code Configuration

**File**: `supabase/functions/_shared/gemini-client.ts`

```typescript
const keyMapping: Record<string, number[]> = {
  "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],         // Chat (Flash)
  "GOOGLE_AI_STUDIO_KEY_ARTIFACT": [3, 4, 5, 6], // Artifacts (Pro)
  "GOOGLE_AI_STUDIO_KEY_IMAGE": [7, 8, 9, 10], // Images (Flash-Image)
};
```

### Function Usage

```typescript
// chat/index.ts
getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT")

// generate-artifact/index.ts
keyName: "GOOGLE_AI_STUDIO_KEY_ARTIFACT"

// generate-artifact-fix/index.ts
keyName: "GOOGLE_AI_STUDIO_KEY_ARTIFACT"

// generate-image/index.ts
keyName: "GOOGLE_AI_STUDIO_KEY_IMAGE"
```

## Rate Limit Calculations

### Chat (Flash Model)
- 2 keys × 2 RPM = **4 requests per minute**
- 2 keys × 50 RPD = **100 requests per day**

### Artifacts (Pro Model)
- 4 keys × 2 RPM = **8 requests per minute**
- 4 keys × 50 RPD = **200 requests per day**
- Shared between generation and fixing

### Images (Flash-Image Model)
- 4 keys × 15 RPM = **60 requests per minute**
- 4 keys × 1,500 RPD = **6,000 requests per day**

## Rotation Strategy

Each pool uses **random starting point + round-robin** rotation:

1. **Cold Start**: Pick random key from pool
2. **Subsequent Requests**: Rotate through keys sequentially
3. **Next Cold Start**: Pick different random key

This ensures even distribution across all keys, even with frequent Edge Function cold starts.

## Monitoring

### Check Logs for Rotation
```
🔑 Using GOOGLE_KEY_1 (position 1/2 in pool)  # Chat
🔑 Using GOOGLE_KEY_3 (position 1/4 in pool)  # Artifact
🔑 Using GOOGLE_KEY_7 (position 1/4 in pool)  # Image
```

### Expected Distribution
Over 100 requests per pool:
- Chat: ~50% KEY_1, ~50% KEY_2
- Artifact: ~25% each (KEY_3, 4, 5, 6)
- Image: ~25% each (KEY_7, 8, 9, 10)

## Troubleshooting

### Still Getting 429 Errors?

1. **Check which pool is hitting limits**:
   - Chat errors → Need more chat keys
   - Artifact errors → Need more artifact keys
   - Image errors → Need more image keys

2. **Verify keys are from different projects**:
   - Each key must be from a separate Google Cloud project
   - Check Google AI Studio dashboard for usage distribution

3. **Check daily quotas**:
   - Chat: 100 RPD (50 per key × 2)
   - Artifacts: 200 RPD (50 per key × 4)
   - Images: 6,000 RPD (1,500 per key × 4)

### How to Add More Keys

If you need more capacity, add keys to the appropriate pool:

```typescript
// Example: Add 2 more artifact keys (total 6 keys = 12 RPM)
"GOOGLE_AI_STUDIO_KEY_ARTIFACT": [3, 4, 5, 6, 11, 12],
```

Then set the new secrets:
```bash
supabase secrets set GOOGLE_KEY_11=AIzaSy...
supabase secrets set GOOGLE_KEY_12=AIzaSy...
```

---
**Last Updated**: November 10, 2025
**Status**: ✅ Deployed and tested

