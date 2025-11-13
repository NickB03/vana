# Quick Test Cases for Embedding Intent Detection

## 🧪 Critical Edge Cases to Test

These are the cases that the old regex system got wrong. Test these first:

### 1. Logo/Icon Requests → Should be IMAGE (not SVG)
```
✅ "create a logo for my coffee shop"
   Expected: IMAGE generation
   Why: Better quality for portfolio

✅ "design an icon for my mobile app"
   Expected: IMAGE generation
   Why: More detail than SVG

✅ "make a badge for achievements"
   Expected: IMAGE generation
   Why: Complex visuals
```

### 2. Diagram Requests → Context Matters
```
✅ "diagram of a dog"
   Expected: IMAGE generation
   Why: Visual of object, not process flow

✅ "flowchart for login process"
   Expected: MERMAID artifact
   Why: Process logic diagram

✅ "create a sequence diagram showing API calls"
   Expected: MERMAID artifact
   Why: Structured diagram
```

### 3. API Requests → Build vs Show Code
```
✅ "build an API for user management"
   Expected: REACT artifact
   Why: Full application

✅ "show me an Express API endpoint"
   Expected: CODE artifact
   Why: Just code snippet

✅ "create a REST API"
   Expected: REACT artifact
   Why: Full app context
```

### 4. Chart Requests → Interactive vs Static
```
✅ "create a chart showing sales data"
   Expected: REACT artifact
   Why: Interactive visualization

✅ "make a data visualization dashboard"
   Expected: REACT artifact
   Why: Interactive tool
```

### 5. Explicit SVG Requests → Should Work
```
✅ "create a scalable vector logo in SVG format"
   Expected: SVG artifact
   Why: Explicitly requested SVG

✅ "design a geometric icon that scales infinitely"
   Expected: SVG artifact
   Why: Scalable requirement
```

### 6. Regular Cases → Should Still Work
```
✅ "generate a sunset photo"
   Expected: IMAGE generation

✅ "build a todo list app"
   Expected: REACT artifact

✅ "write a Python sorting function"
   Expected: CODE artifact

✅ "write an article about AI"
   Expected: MARKDOWN artifact

✅ "what is React?"
   Expected: CHAT response
```

---

## 🎯 How to Test

### Method 1: Browser Testing

1. Open your app at http://localhost:8080
2. Start a new chat
3. Enter each test prompt above
4. Check the response type:
   - IMAGE: You'll see "I've generated an image"
   - REACT: You'll see artifact with interactive component
   - CODE: You'll see code block artifact
   - MERMAID: You'll see diagram artifact
   - MARKDOWN: You'll see formatted text artifact
   - CHAT: You'll see conversational response

### Method 2: Console Log Verification

Open browser DevTools Console and look for:

```
🎯 Intent detected: IMAGE generation
🔀 Routing to: generate-image (Flash-Image model)
```

Or:

```
🎯 Intent detected: ARTIFACT generation (react)
🔀 Routing to: generate-artifact (Pro model)
```

### Method 3: Supabase Logs

Check Supabase Edge Function logs:

```bash
supabase functions logs chat --tail
```

Look for intent detection logs showing:
- Detected intent type
- Confidence level
- Similarity score

---

## 📊 Test Results Template

| Test Case | Expected | Actual | Pass/Fail | Notes |
|-----------|----------|--------|-----------|-------|
| "create a logo" | IMAGE | | | |
| "diagram of a dog" | IMAGE | | | |
| "build an API" | REACT | | | |
| "show API code" | CODE | | | |
| "flowchart for login" | MERMAID | | | |
| "what is React?" | CHAT | | | |
| "SVG vector logo" | SVG | | | |
| "generate sunset" | IMAGE | | | |

---

## ✅ Success Metrics

**Edge Cases (8 tests):**
- Target: 7/8 correct (87.5%)
- Excellent: 8/8 correct (100%)

**Regular Cases (6 tests):**
- Target: 6/6 correct (100%)

**Overall:**
- Target: 90%+ accuracy
- Excellent: 95%+ accuracy

---

## 🐛 Common Issues

### Issue: All requests going to CHAT

**Diagnosis:**
```sql
-- Check if examples exist
SELECT COUNT(*) FROM intent_examples;
-- Should return 128
```

**Fix:** Re-run setup function

---

### Issue: Low confidence scores

**Diagnosis:** Check Supabase logs for similarity scores

**Fix:**
- If scores < 0.6 consistently, may need more examples
- Check OpenRouter API key is correct

---

### Issue: Slow responses

**Diagnosis:** Check latency in logs

**Expected:**
- Intent detection: <200ms
- Total (with generation): 2-5s

**Fix:** Check network, OpenRouter API status

---

## 📝 Reporting Issues

If tests fail, gather this info:

1. **Test prompt:** Exact text entered
2. **Expected result:** What should happen
3. **Actual result:** What actually happened
4. **Logs:** Copy from browser console
5. **Similarity score:** From reasoning field

Example:
```
Test: "create a logo"
Expected: IMAGE
Actual: SVG
Reasoning: "75.2% match: create a scalable vector logo in SVG"
Issue: Too similar to SVG example, need to boost IMAGE examples
```

---

## 🎉 When All Tests Pass

You're ready for production! The embedding-based intent detection is:
- ✅ 90%+ accurate
- ✅ Handling edge cases correctly
- ✅ Fast enough (~170ms)
- ✅ Cost effective ($0.06/month)

Next: Monitor in production and add more examples as needed.
