# Verifying Kimi K2-Thinking Usage

Quick reference guide for confirming artifact generation is using Kimi K2-Thinking via OpenRouter.

---

## 🎯 Quick Verification Checklist

After deploying, verify migration worked:

- [ ] Supabase logs show "🚀 Routing to Kimi K2-Thinking"
- [ ] OpenRouter dashboard shows requests to `moonshotai/kimi-k2-thinking`
- [ ] Cost tracking appears in logs (💰 emoji)
- [ ] No more Gemini "🔑 Using GOOGLE_KEY_3" logs
- [ ] No 503 errors from Gemini

---

## 📊 Method 1: Supabase Function Logs

### Real-Time Monitoring

```bash
# Watch logs live (RECOMMENDED)
supabase functions logs generate-artifact --tail

# Or for specific time range
supabase functions logs generate-artifact --since 1h

# Or for artifact fixes
supabase functions logs generate-artifact-fix --tail
```

### Expected Log Output

**✅ SUCCESS - Using Kimi K2:**
```log
2025-11-12T15:30:45.123Z [abc-123-def-456] Artifact generation request from user 12345: Create a todo...
2025-11-12T15:30:45.124Z [abc-123-def-456] 🚀 Routing to Kimi K2-Thinking (reasoning model for code generation)
2025-11-12T15:30:45.125Z [abc-123-def-456] 🤖 Routing to Kimi K2-Thinking via OpenRouter
2025-11-12T15:30:47.891Z [abc-123-def-456] ✅ Extracted artifact from Kimi, length: 2453 characters
2025-11-12T15:30:47.892Z [abc-123-def-456] 💰 Token usage: {
  input: 1234,
  output: 567,
  total: 1801,
  estimatedCost: "$0.0018"
}
2025-11-12T15:30:47.893Z [abc-123-def-456] Artifact generated successfully, length: 2453 characters
```

**❌ FAILURE - Still Using Gemini:**
```log
2025-11-12T15:30:45.123Z [abc-123-def-456] Artifact generation request from user 12345: Create a todo...
2025-11-12T15:30:45.124Z [abc-123-def-456] 🔑 Using GOOGLE_KEY_3 (position 1/4 in pool)
2025-11-12T15:30:47.500Z [abc-123-def-456] Google AI Studio error: 503 Service overloaded
```

### Quick Grep Commands

```bash
# Count Kimi requests today
supabase functions logs generate-artifact --since 1d | grep "🚀 Routing to Kimi" | wc -l

# Show all cost estimates today
supabase functions logs generate-artifact --since 1d | grep "💰 Token usage"

# Check for Gemini usage (should be empty)
supabase functions logs generate-artifact --since 1d | grep "🔑 Using GOOGLE_KEY"

# Check for 503 errors (should be rare/none)
supabase functions logs generate-artifact --since 1d | grep "503"
```

---

## 🌐 Method 2: OpenRouter Dashboard

### Access Dashboard

1. **Go to:** https://openrouter.ai/activity
2. **Login** with your OpenRouter account
3. **View real-time requests**

### What You'll See

**Activity Page Shows:**
- **Model Used:** `moonshotai/kimi-k2-thinking`
- **Request Time:** Timestamp of each call
- **Tokens Used:** Input + output token counts
- **Cost:** Exact cost per request ($0.15/M input, $2.50/M output)
- **Status:** Success/error codes

**Example Entry:**
```
Model: moonshotai/kimi-k2-thinking
Time: 2025-11-12 15:30:47 UTC
Input: 1,234 tokens ($0.0002)
Output: 567 tokens ($0.0014)
Total: $0.0016
Status: 200 OK
```

### Verification Steps

1. **Generate a test artifact** in your app
2. **Refresh OpenRouter activity page** (within 1 minute)
3. **Confirm new entry appears** for `kimi-k2-thinking`
4. **Match timestamp** with your test

**If you DON'T see entries:**
- ❌ Migration didn't work (still using Gemini)
- ❌ API key not set correctly
- ❌ Functions not deployed

---

## 🌐 Method 3: Browser Developer Tools

### Live Network Inspection

1. **Open your app** in Chrome/Firefox
2. **Open DevTools** (F12 or Cmd+Option+I)
3. **Go to Network tab**
4. **Generate an artifact**
5. **Look for network requests**

### What to Look For

**Request to Supabase Edge Function:**
```
Request URL: https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-artifact
Method: POST
Status: 200 OK
```

**In Supabase Console (if you watch real-time logs):**
```
You'll see: "🚀 Routing to Kimi K2-Thinking via OpenRouter"
```

**Response Headers:**
```
X-Request-ID: abc-123-def-456
Content-Type: application/json
```

**Response Body:**
```json
{
  "success": true,
  "artifactCode": "<artifact type=\"application/vnd.ant.react\" title=\"...\">...</artifact>",
  "prompt": "Create a todo list",
  "requestId": "abc-123-def-456"
}
```

---

## 💰 Method 4: Cost Tracking Analysis

### Daily Cost Query

```bash
# Extract all cost logs from today
supabase functions logs generate-artifact --since 1d | grep "💰 Token usage" > daily_costs.txt

# View the file
cat daily_costs.txt
```

**Example Output:**
```
[uuid-1] 💰 Token usage: { input: 1200, output: 500, total: 1700, estimatedCost: "$0.0017" }
[uuid-2] 💰 Token usage: { input: 980, output: 450, total: 1430, estimatedCost: "$0.0014" }
[uuid-3] 💰 Token usage: { input: 1500, output: 600, total: 2100, estimatedCost: "$0.0023" }
```

### Calculate Daily Total

```bash
# Sum up costs (requires jq)
supabase functions logs generate-artifact --since 1d \
  | grep "💰 Token usage" \
  | grep -o 'estimatedCost: "\$[0-9.]*"' \
  | grep -o '[0-9.]*' \
  | awk '{s+=$1} END {printf "Total: $%.4f\n", s}'
```

**If you see cost logs:**
- ✅ Kimi K2 is being used
- ✅ Migration successful

**If you DON'T see cost logs:**
- ❌ Still using Gemini (no cost tracking)
- ❌ Migration incomplete

---

## 🔍 Method 5: Test Script Verification

### Run Automated Tests

```bash
# Local testing
./scripts/test-kimi-migration.sh

# Production testing
./scripts/test-kimi-migration.sh production
```

**Expected Output:**
```
🧪 Testing Kimi K2-Thinking Migration
======================================

📝 Test 1: Artifact Generation
--------------------------------
✅ PASS: Artifact generated successfully
✅ PASS: Artifact tags present
   Request ID: abc-123-def-456

====================================
🎉 Testing Complete!
```

### Manual cURL Test

```bash
# Test generate-artifact directly
curl -X POST https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-artifact \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a simple counter component",
    "artifactType": "react"
  }'
```

**Then immediately check logs:**
```bash
supabase functions logs generate-artifact --tail
```

**You should see:**
```
[new-uuid] 🚀 Routing to Kimi K2-Thinking (reasoning model for code generation)
[new-uuid] 💰 Token usage: { ... }
```

---

## 🚨 Troubleshooting: Not Seeing Kimi Logs

### Problem: Still seeing Gemini logs

**Possible Causes:**
1. Functions not deployed
2. Old function version cached
3. API key not set

**Solution:**
```bash
# 1. Verify API key exists
supabase secrets list | grep OPENROUTER

# 2. Redeploy functions
supabase functions deploy generate-artifact
supabase functions deploy generate-artifact-fix

# 3. Wait 30 seconds for cold start

# 4. Test again
curl -X POST https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-artifact \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "artifactType": "react"}'

# 5. Check logs immediately
supabase functions logs generate-artifact --tail
```

### Problem: No logs at all

**Possible Causes:**
1. Function not being called
2. Network issues
3. Wrong project selected

**Solution:**
```bash
# Verify project
supabase projects list

# Check function exists
supabase functions list

# Check function status
supabase functions inspect generate-artifact
```

### Problem: OpenRouter dashboard shows nothing

**Possible Causes:**
1. API key mismatch
2. Wrong model name
3. Still using Gemini

**Solution:**
```bash
# Verify exact API key
supabase secrets list | grep OPENROUTER

# Compare with OpenRouter dashboard
# Keys should match: https://openrouter.ai/keys

# Check if key is used in code
grep -r "OPENROUTER_K2T_KEY" supabase/functions/
```

---

## ✅ Confirmation Checklist

Run through this checklist after deployment:

### Deployment Verification

- [ ] **Step 1:** Deploy functions
  ```bash
  supabase functions deploy generate-artifact
  supabase functions deploy generate-artifact-fix
  ```

- [ ] **Step 2:** Generate test artifact in your app

- [ ] **Step 3:** Check Supabase logs
  ```bash
  supabase functions logs generate-artifact --tail
  ```
  - [ ] See "🚀 Routing to Kimi K2-Thinking"
  - [ ] See "💰 Token usage"
  - [ ] DON'T see "🔑 Using GOOGLE_KEY"

- [ ] **Step 4:** Check OpenRouter dashboard
  - [ ] Go to https://openrouter.ai/activity
  - [ ] See `moonshotai/kimi-k2-thinking` requests
  - [ ] Timestamps match your test

- [ ] **Step 5:** Verify chat still works (should use Gemini)
  ```bash
  supabase functions logs chat --tail
  ```
  - [ ] Should see "🔑 Using GOOGLE_KEY_1" (chat keys)
  - [ ] Should NOT see Kimi logs

- [ ] **Step 6:** Verify images still work (should use Gemini)
  ```bash
  supabase functions logs generate-image --tail
  ```
  - [ ] Should see "🔑 Using GOOGLE_KEY_7" (image keys)
  - [ ] Should NOT see Kimi logs

### Cost Verification

- [ ] **Step 7:** Confirm cost tracking
  ```bash
  supabase functions logs generate-artifact --since 1h | grep "💰"
  ```
  - [ ] See cost estimates for each request

- [ ] **Step 8:** Set spending alerts
  - [ ] OpenRouter dashboard → Settings
  - [ ] Set alert at $50/month

---

## 📊 Expected Patterns

### Healthy Kimi K2 Usage

**Logs show:**
```
✅ 10-15 requests/hour
✅ All with "🚀 Routing to Kimi K2-Thinking"
✅ All with "💰 Token usage"
✅ Average cost: $0.002-0.005 per request
✅ No 503 errors
✅ Response times: 3-8 seconds
```

**OpenRouter dashboard shows:**
```
✅ Model: moonshotai/kimi-k2-thinking
✅ Success rate: 98%+
✅ Daily cost: $0.50-$5.00
✅ Monthly projection: $15-150
```

### Unhealthy Patterns (Still Using Gemini)

**Logs show:**
```
❌ "🔑 Using GOOGLE_KEY_3"
❌ "503 Service overloaded"
❌ "Retry 1/3"
❌ No "💰 Token usage"
```

**OpenRouter dashboard shows:**
```
❌ No requests
❌ No activity
❌ $0.00 spent
```

---

## 🎯 Quick Reference Commands

```bash
# Most useful verification commands

# 1. Watch live Kimi requests
supabase functions logs generate-artifact --tail | grep "🚀"

# 2. Count Kimi requests today
supabase functions logs generate-artifact --since 1d | grep "🚀" | wc -l

# 3. Show today's costs
supabase functions logs generate-artifact --since 1d | grep "💰"

# 4. Check for Gemini usage (should be empty)
supabase functions logs generate-artifact --since 1d | grep "🔑"

# 5. Check for errors
supabase functions logs generate-artifact --since 1d | grep -i error

# 6. Test production endpoint
curl -X POST https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-artifact \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "artifactType": "react"}'
```

---

## 📱 Mobile App Testing

If testing from mobile app:

1. **Generate artifact** in app
2. **Note the timestamp**
3. **Check logs** on desktop:
   ```bash
   supabase functions logs generate-artifact --since 5m
   ```
4. **Confirm** you see Kimi logs for that timestamp

---

## Summary: 3-Step Verification

**Quickest way to confirm Kimi is being used:**

```bash
# 1. Generate test artifact (in your app or via curl)
curl -X POST https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-artifact \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a button", "artifactType": "react"}'

# 2. Check logs immediately
supabase functions logs generate-artifact --tail

# 3. Look for these THREE indicators:
# ✅ "🚀 Routing to Kimi K2-Thinking"
# ✅ "🤖 Routing to Kimi K2-Thinking via OpenRouter"
# ✅ "💰 Token usage: { ... estimatedCost: ... }"
```

**If you see all three → Migration successful! 🎉**

**If you see "🔑 Using GOOGLE_KEY" → Migration not deployed yet**

---

Last Updated: November 12, 2025
