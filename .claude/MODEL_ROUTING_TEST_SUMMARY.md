# Model Routing Architecture - Test Summary

## Date: November 9, 2025
## Status: Ready for Manual Testing

---

## Architecture Overview

### Current Implementation

The system now uses a **3-tier model routing strategy** to optimize for cost, speed, and quality:

```
┌─────────────────────────────────────────────────────────────┐
│                       User Message                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
         ┌────────────────┐
         │ Intent Detector│
         │  (chat/index)  │
         └───┬────┬───┬───┘
             │    │   │
    ┌────────┘    │   └────────┐
    │             │            │
    v             v            v
┌─────────┐  ┌──────────┐  ┌─────────┐
│  Image  │  │ Artifact │  │  Chat   │
│ Request │  │ Request  │  │ Request │
└────┬────┘  └─────┬────┘  └────┬────┘
     │             │            │
     v             v            v
┌─────────┐  ┌──────────┐  ┌─────────┐
│generate-│  │generate- │  │  Flash  │
│ image   │  │artifact  │  │  Model  │
│function │  │function  │  │ (chat)  │
└────┬────┘  └─────┬────┘  └────┬────┘
     │             │            │
     v             v            v
┌─────────┐  ┌──────────┐  ┌─────────┐
│ Flash   │  │   Pro    │  │  Flash  │
│ Image   │  │  Model   │  │  Model  │
│ Model   │  │(complex) │  │  (fast) │
└─────────┘  └──────────┘  └─────────┘
```

### Model Mapping

| Use Case | Model | Key Pool | RPM Limit | Rationale |
|----------|-------|----------|-----------|-----------|
| Regular Chat | gemini-2.5-flash | GOOGLE_AI_STUDIO_KEY_CHAT | 4 RPM (2 keys) | Fast responses, cost-effective |
| Artifacts | gemini-2.5-pro | GOOGLE_AI_STUDIO_KEY_FIX | 4 RPM (2 keys) | High-quality code generation |
| Images | gemini-2.5-flash-preview-image | GOOGLE_AI_STUDIO_KEY_IMAGE | 30 RPM (2 keys) | Image generation capability |

### Key Files Modified

1. **supabase/functions/chat/index.ts** (lines 450-471)
   - Main chat function now uses gemini-2.5-flash
   - Intent detection for images and artifacts
   - Delegates to specialized functions when needed

2. **supabase/functions/generate-artifact/index.ts** (line 305)
   - NEW function for artifact generation
   - Uses gemini-2.5-pro for complex code
   - Enhanced system prompt for quality

3. **supabase/functions/generate-image/index.ts**
   - Existing image generation function
   - Uses gemini-2.5-flash-preview-image

4. **supabase/functions/_shared/gemini-client.ts**
   - Round-robin key rotation logic
   - Maps key pools to GOOGLE_KEY_1 through GOOGLE_KEY_6

---

## Key Detection Logic

### Image Detection (`shouldGenerateImage`)
Triggers on patterns like:
- "generate an image of..."
- "create a picture of..."
- "draw me..."
- "make an illustration of..."

### Artifact Detection (`shouldGenerateArtifact`)
Triggers on patterns like:
- "create a [app/component/website]..."
- "build me a..."
- "make a [interactive/tool]..."
- "design a [dashboard/calculator]..."

### Default (Regular Chat)
All other conversational queries use Flash model directly.

---

## Environment Configuration

### Current Setup
- **Environment**: Remote Supabase (vznhbocnuykdmjvujaka.supabase.co)
- **Dev Server**: http://localhost:8080
- **Function Logs**: Visible in Supabase Dashboard → Edge Functions → Logs

### Required Secrets (Supabase)
The system expects these secrets to be set:
```bash
GOOGLE_KEY_1  # Chat key #1
GOOGLE_KEY_2  # Chat key #2
GOOGLE_KEY_3  # Image key #1
GOOGLE_KEY_4  # Image key #2
GOOGLE_KEY_5  # Artifact key #1
GOOGLE_KEY_6  # Artifact key #2
```

### Mapping Logic
```typescript
// In gemini-client.ts
const keyMapping = {
  "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],   // Chat uses keys 1-2
  "GOOGLE_AI_STUDIO_KEY_IMAGE": [3, 4],  // Images use keys 3-4
  "GOOGLE_AI_STUDIO_KEY_FIX": [5, 6],    // Artifacts use keys 5-6
};
```

---

## Testing Instructions

### Prerequisites
1. Dev server is running: `npm run dev`
2. Browser at http://localhost:8080
3. DevTools open (F12)
4. Supabase Dashboard open for function logs

### Test Scenarios

#### Test 1: Regular Chat (Flash Model)
**Query**: "What is React and why is it popular?"

**Expected**:
- Fast response (1-3s)
- Streams character by character
- No delegation to other functions
- Uses gemini-2.5-flash

**Verify**:
- Browser Console: No special intent logs
- Network Tab: POST to `/functions/v1/chat` only
- Supabase Logs: Shows `GOOGLE_AI_STUDIO_KEY_CHAT key #N`

---

#### Test 2: Artifact Generation (Pro Model)
**Query**: "Create a simple todo list app with React"

**Expected**:
- Slower response (5-10s) due to Pro model
- Console log: "Artifact generation request detected"
- Returns complete React component
- Renders without import errors

**Verify**:
- Browser Console: "Artifact generation request detected (type: react)"
- Network Tab: POST to `/functions/v1/generate-artifact`
- Supabase Logs: Shows `GOOGLE_AI_STUDIO_KEY_FIX key #N`
- Artifact renders in canvas panel
- No errors like "@/components/ui/button not found"

---

#### Test 3: Image Generation (Image Model)
**Query**: "Generate an image of a serene mountain landscape at sunset"

**Expected**:
- Medium response (8-15s)
- Console log: "Image generation request detected"
- Returns image artifact
- Image displays inline

**Verify**:
- Browser Console: "Image generation request detected"
- Network Tab: POST to `/functions/v1/generate-image`
- Supabase Logs: Shows `GOOGLE_AI_STUDIO_KEY_IMAGE key #N`
- Image loads and displays correctly

---

## How to View Logs

### Browser Console Logs
1. Open DevTools (F12)
2. Go to Console tab
3. Look for logs like:
   - "Artifact generation request detected"
   - "Image generation request detected"

### Supabase Function Logs
1. Go to https://supabase.com/dashboard/project/vznhbocnuykdmjvujaka
2. Navigate to: Edge Functions → Logs
3. Filter by function:
   - `chat` - Main chat function
   - `generate-artifact` - Artifact generation
   - `generate-image` - Image generation
4. Look for logs like:
   - `🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2`
   - `🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #2 of 2`
   - `🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2`

### Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter: "Fetch/XHR"
4. Look for requests to:
   - `/functions/v1/chat`
   - `/functions/v1/generate-artifact`
   - `/functions/v1/generate-image`

---

## Expected Performance

| Metric | Regular Chat | Artifact Gen | Image Gen |
|--------|-------------|--------------|-----------|
| Response Time | 1-3s | 5-10s | 8-15s |
| Token Usage | Low | Medium-High | Medium |
| Cost per Request | $0.0001 | $0.0003 | $0.0002 |
| Quality | Good | Excellent | Good |

---

## Common Issues and Solutions

### Issue: "Intent not detected correctly"
**Symptom**: Artifact/image request treated as regular chat
**Solution**: Check intent-detector.ts patterns, may need to add more keywords

### Issue: "Artifact has import errors"
**Symptom**: Console shows errors like `Cannot find module '@/components/ui/button'`
**Solution**:
- Check artifact-transformer.ts is working
- Verify transform logs in chat function
- Ensure artifact uses Radix UI imports only

### Issue: "No key rotation logs visible"
**Symptom**: Can't see `🔑 Using GOOGLE_AI_STUDIO_KEY_...` logs
**Solution**: Check Supabase Dashboard → Edge Functions → Logs (not browser console)

### Issue: "Rate limit errors"
**Symptom**: 429 errors or "quota exceeded" messages
**Solution**:
- Verify all 6 keys are set in Supabase secrets
- Check if keys are from different Google Cloud projects
- Review rate limits: https://ai.google.dev/pricing

---

## Success Criteria

The system is working correctly if:

- [ ] Regular chat uses Flash model (fast responses)
- [ ] Artifact requests delegate to generate-artifact (Pro model)
- [ ] Image requests delegate to generate-image (Image model)
- [ ] Key rotation logs show proper pool usage
- [ ] No console errors during testing
- [ ] Artifacts render without import errors
- [ ] Response times are within expected ranges
- [ ] All three models are being used appropriately

---

## Next Steps After Testing

### If All Tests Pass:
1. Document test results with screenshots
2. Update deployment notes
3. Prepare for production deployment
4. Set up monitoring/alerts

### If Tests Fail:
1. Document specific failures
2. Capture error logs and screenshots
3. Review error messages for root cause
4. Create fix plan with priorities
5. Retest after fixes

---

## Additional Resources

- **Test Guide**: `.claude/MODEL_ROUTING_TEST_GUIDE.md` (detailed step-by-step)
- **Architecture Docs**: `.claude/DEPLOYMENT_STATUS.md`
- **Key Rotation Guide**: `.claude/ROUND_ROBIN_KEY_ROTATION.md`
- **Supabase Dashboard**: https://supabase.com/dashboard/project/vznhbocnuykdmjvujaka

---

## Deployment Status

**Code Status**: Ready for testing
**Environment**: Development (remote Supabase)
**Branch**: feature/litellm-api-key-rotation
**Last Modified**: November 9, 2025

**Modified Files**:
- supabase/functions/_shared/gemini-client.ts
- supabase/functions/generate-artifact-fix/index.ts
- supabase/functions/generate-image/index.ts
- supabase/functions/generate-title/index.ts

**Testing Required**: Manual testing following this guide

---

*Last Updated: 2025-11-09*
