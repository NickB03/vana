# Testing Quick Start Guide

**Quick reference for testing the new model architecture**

---

## Prerequisites

1. **Start Docker Desktop**
   - Required for Supabase local development
   - Verify: Docker icon in menu bar should be running

2. **Start Supabase**
   ```bash
   supabase start
   ```
   Wait for: "Started supabase local development setup."

3. **Start Dev Server**
   ```bash
   npm run dev
   ```
   Dev server runs at: http://localhost:8080

---

## Quick Test Commands

### Option 1: Automated Script (CLI)
```bash
./scripts/test-model-architecture.sh
```
Runs 5 automated tests against local Supabase.

### Option 2: Manual Browser Testing (Recommended)
1. Open http://localhost:8080
2. Open DevTools (F12 → Console tab)
3. Follow test scenarios below

---

## Test Scenarios

### TEST 1: Regular Chat (30 seconds)
```
Message: "What is React and why is it popular?"

Expected Console Logs:
✓ "Starting chat stream for session"
✓ "🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2"

Expected Network:
✓ POST /functions/v1/chat (only)

Result:
✓ Fast response (<3s)
✓ No artifact/image delegation
```

### TEST 2: Artifact Generation (1 minute)
```
Message: "Create a simple todo list app with React"

Expected Console Logs:
✓ "Artifact generation request detected (type: react)"
✓ "🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #1 of 2"

Expected Network:
✓ POST /functions/v1/chat
✓ POST /functions/v1/generate-artifact

Result:
✓ React component renders
✓ Interactive features work (add/delete/check)
✓ No "@/" import errors
```

### TEST 3: Image Generation (1 minute)
```
Message: "Generate an image of a serene mountain landscape at sunset"

Expected Console Logs:
✓ "Image generation request detected"
✓ "🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2"
✓ "Image generate successful"

Expected Network:
✓ POST /functions/v1/chat
✓ POST /functions/v1/generate-image

Result:
✓ Image displays in chat
✓ Image matches prompt
```

### TEST 4: Key Rotation (2 minutes)
```
Send 4 messages in sequence:
1. "What is TypeScript?"
2. "Explain React hooks"
3. "What is Tailwind CSS?"
4. "Describe Next.js"

Expected Console Pattern:
✓ Request 1: "key #1 of 2"
✓ Request 2: "key #2 of 2"
✓ Request 3: "key #1 of 2"
✓ Request 4: "key #2 of 2"

Result:
✓ Keys alternate correctly
```

---

## Pass/Fail Checklist

### All Tests Must Show:
- [x] Correct model routing (Flash for chat, Pro for artifacts, Flash-Image for images)
- [x] Round-robin key rotation working
- [x] No console errors
- [x] Network requests to correct endpoints
- [x] Reasonable response times

### Any of These = FAIL:
- [ ] Console errors during generation
- [ ] "@/" import errors in artifacts
- [ ] Images fail to load
- [ ] Keys don't rotate (same key used twice)
- [ ] Wrong model used (check endpoint URLs in Network tab)

---

## Troubleshooting

### Docker Not Running
```
Error: Cannot connect to Docker daemon

Fix: Start Docker Desktop from Applications
```

### Supabase Won't Start
```bash
# Stop and restart cleanly
supabase stop
supabase start
```

### API Keys Not Set
```bash
# Check current secrets
supabase secrets list

# Set missing keys
supabase secrets set GOOGLE_KEY_1=AIza...
```

### Port Already in Use
```bash
# Find and kill process on port 54321 (Supabase)
lsof -ti :54321 | xargs kill

# Or port 8080 (dev server)
lsof -ti :8080 | xargs kill
```

---

## Success Output

If all tests pass, you should see:

**Console:**
```
✓ Chat uses Flash model (fast responses)
✓ Artifacts use Pro model (high quality)
✓ Images use Flash-Image model
✓ Keys rotate in round-robin pattern
```

**Network Tab:**
```
✓ /chat → 200 OK (regular messages)
✓ /generate-artifact → 200 OK (artifact requests)
✓ /generate-image → 200 OK (image requests)
```

**UI:**
```
✓ All messages display correctly
✓ Artifacts render without errors
✓ Images load and display
✓ Interactive features work
```

---

## What to Report

After testing, report:

1. **Pass/Fail Status** for each test
2. **Console logs** (key rotation patterns)
3. **Screenshots** (one per test scenario)
4. **Response times** (approximate)
5. **Any errors** encountered

---

**Estimated Time:** 5-10 minutes for full test suite

**Next Steps:** See `.claude/MODEL_ARCHITECTURE_VERIFICATION.md` for detailed analysis
