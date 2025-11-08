# Migration Quick Start Guide

**Goal**: Verify the Lovable → Google AI Studio migration works  
**Time**: 30-45 minutes  
**Prerequisites**: Dev server running (`npm run dev`)

---

## Step 1: Run Automated Tests (5 minutes)

```bash
./scripts/test-migration.sh
```

**Expected Output**:
```
✅ Chat function working (SSE streaming detected)
✅ Title generation working: "..."
✅ Image generation working (base64 data detected)
✅ Summarization working: "..."
```

**If any test fails**: Check `.claude/MIGRATION_ACTION_PLAN.md` Task 1.1 for debugging

---

## Step 2: Browser Test (20 minutes)

### 2.1 Start Chrome DevTools MCP
```bash
chrome-mcp start
```

### 2.2 Open App
Navigate to: http://localhost:8080

### 2.3 Test Checklist
```
□ Send message: "Write a simple HTML page with a button"
  → Verify text streams in gradually
  → Verify artifact appears in right panel
  → Check console (F12) for errors

□ Click "Generate Image" button
  → Enter: "A sunset over mountains"
  → Verify image appears
  → If 429 error: quota exceeded (expected, not a bug)

□ Create new chat session
  → Send a message
  → Verify title auto-generates in sidebar

□ Check Network tab (F12)
  → Verify requests go to: xfwlneedhqealtktaacv.supabase.co
  → Verify NO requests to: lovable.dev
```

---

## Step 3: Take Screenshots (10 minutes)

For portfolio documentation, capture:

1. **Chat streaming** - Message appearing gradually
2. **Artifact rendering** - HTML/React component in right panel
3. **Image generation** - Generated image displayed
4. **Network tab** - Showing requests to Supabase (not Lovable)

Save to: `docs/screenshots/migration/`

---

## Step 4: Verify Environment (5 minutes)

```bash
# Check local .env
cat .env | grep GOOGLE_AI_STUDIO_KEY

# Check Supabase secrets (if deployed)
supabase secrets list

# Verify key format
# Should start with: AIza
# Should be ~39 characters long
```

---

## Success Checklist

- [ ] All 4 edge functions tested (script passed)
- [ ] Chat streaming works in browser
- [ ] Artifacts render correctly
- [ ] Images generate (or 429 if quota low)
- [ ] No console errors
- [ ] Network requests go to Supabase
- [ ] Screenshots taken

---

## If Everything Works

**Congratulations!** 🎉 The migration is complete.

**Next Steps**:
1. ✅ Mark migration as verified
2. 📝 Write case study (see Task 2.3 in action plan)
3. 🎨 Add polish (logging, rate limiting - optional)

---

## If Something Fails

### Test Script Shows Errors
→ Check edge function logs: `supabase functions logs chat`  
→ Verify API key: `supabase secrets list`  
→ See Task 1.1 in action plan for detailed debugging

### Browser Console Shows Errors
→ Check for CORS errors (edge function issue)  
→ Check for 401 errors (authentication issue)  
→ Check for 429 errors (quota exceeded - expected)  
→ Check for 500 errors (edge function crash)

### No Streaming in Chat
→ Check Network tab for SSE connection  
→ Verify response format (should be `data: {...}`)  
→ Check `useChatMessages.tsx` parsing logic

### Images Don't Generate
→ 429 error is expected if quota is low  
→ Check Gemini API quota: https://aistudio.google.com/app/apikey  
→ Verify `generate-image` function logs

---

## Quick Commands Reference

```bash
# Start dev server
npm run dev

# Start Chrome DevTools MCP
chrome-mcp start

# Run migration tests
./scripts/test-migration.sh

# Check edge function logs
supabase functions logs chat
supabase functions logs generate-image
supabase functions logs generate-title
supabase functions logs summarize-conversation

# Check Supabase secrets
supabase secrets list

# Set API key (if missing)
supabase secrets set GOOGLE_AI_STUDIO_KEY=your_key_here
```

---

## Time Estimates

| Task | Time | Status |
|------|------|--------|
| Run test script | 5 min | ⏳ |
| Browser testing | 20 min | ⏳ |
| Take screenshots | 10 min | ⏳ |
| Verify environment | 5 min | ⏳ |
| **Total** | **40 min** | |

---

## What's Next?

After verification is complete:

1. **Document it** (1-2 hours)
   - Write migration case study
   - Add to portfolio
   - Update resume

2. **Polish it** (2-3 hours, optional)
   - Add structured logging
   - Add rate limiting
   - Create performance dashboard

3. **Ship it** (30 min)
   - Deploy to production
   - Share on LinkedIn/Twitter
   - Add to portfolio site

---

**For detailed instructions**: See `.claude/MIGRATION_ACTION_PLAN.md`  
**For troubleshooting**: See `.claude/MIGRATION_COMPLETE.md`  
**For overview**: See `.claude/MIGRATION_RECOMMENDATIONS_SUMMARY.md`

