# Secret Renaming Guide - Round-Robin API Key Rotation

**Date:** November 9, 2025
**Status:** IN PROGRESS - Awaiting manual secret rename
**Impact:** Required for API key rotation to function

## The Situation

The round-robin API key rotation system has been fully implemented and is ready to deploy. However, there's one manual step required that cannot be automated through the CLI due to security restrictions:

**Current Status:**
- ✅ 6 Google Gemini API keys are already set in Supabase secrets
- ✅ Edge Functions are written to expect the new naming convention
- ✅ Round-robin rotation logic is implemented
- ❌ Secret names don't match the expected pattern (blocking deployment)

**The Problem:**
- Current secret names: `GOOGLE_KEY_1` through `GOOGLE_KEY_6`
- Expected secret names: `GOOGLE_AI_STUDIO_KEY_CHAT_1`, `GOOGLE_AI_STUDIO_KEY_CHAT_2`, `GOOGLE_AI_STUDIO_KEY_IMAGE_1`, `GOOGLE_AI_STUDIO_KEY_IMAGE_2`, `GOOGLE_AI_STUDIO_KEY_FIX_1`, `GOOGLE_AI_STUDIO_KEY_FIX_2`

**Why Manual?**
Supabase intentionally does not expose secret values through the CLI or API for security reasons. Since we cannot read the values programmatically, we must manually provide them when setting the new names.

---

## Solution: Manual Secret Rename via Dashboard

### **Step 1: Access Supabase Secrets Dashboard**

1. Go to: [Supabase Dashboard - vana-dev project](https://supabase.com/dashboard/project/uznhbocnuykdmjvujaka/settings/functions)
2. Click the **"Settings"** tab in the left sidebar
3. Scroll to **"Edge Functions"** section
4. Click **"Secrets"** to view all secrets

### **Step 2: Note Down the Secret Values**

The dashboard will show all current secrets. For each secret, you'll need to:
1. Click on the secret to reveal/copy its value (there should be a "copy" button)
2. Write down the value or copy it to a temporary text file

**Current secrets you need to copy:**
```
GOOGLE_KEY_1      → [copy value]
GOOGLE_KEY_2      → [copy value]
GOOGLE_KEY_3      → [copy value]
GOOGLE_KEY_4      → [copy value]
GOOGLE_KEY_5      → [copy value]
GOOGLE_KEY_6      → [copy value]
```

### **Step 3: Set New Secrets via CLI**

Once you have the values, use these commands to set them with the new names. Replace `<actual_value>` with the actual API key you copied:

```bash
# Chat pool (2 keys)
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_1=<paste_GOOGLE_KEY_1_value>
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_2=<paste_GOOGLE_KEY_2_value>

# Image pool (2 keys)
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_1=<paste_GOOGLE_KEY_3_value>
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_2=<paste_GOOGLE_KEY_4_value>

# Fix pool (2 keys)
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_1=<paste_GOOGLE_KEY_5_value>
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_2=<paste_GOOGLE_KEY_6_value>
```

### **Step 4: Verify New Secrets Are Set**

```bash
# List all secrets to confirm
npx supabase secrets list
```

You should see the new secret names in the list.

### **Step 5: Delete Old Secrets (Optional but Recommended)**

Once you confirm the new secrets are set and working:

```bash
npx supabase secrets unset GOOGLE_KEY_1
npx supabase secrets unset GOOGLE_KEY_2
npx supabase secrets unset GOOGLE_KEY_3
npx supabase secrets unset GOOGLE_KEY_4
npx supabase secrets unset GOOGLE_KEY_5
npx supabase secrets unset GOOGLE_KEY_6
```

---

## Automated Alternative (If You Have API Token)

If you have Supabase Management API access, you could use this alternative workflow:

```bash
# This would require a Supabase Management API token
# Contact your Supabase admin if you need this approach
```

However, this is not available in the standard setup.

---

## After Secrets Are Renamed

Once the secrets are properly renamed, the functions will automatically:
1. Detect the new secret names
2. Discover the `_1` and `_2` suffixes
3. Implement round-robin rotation across the pools
4. Log rotation messages like: `🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2`

---

## Quick Reference: Key Pool Mapping

| Purpose | Pool | Key 1 | Key 2 |
|---------|------|-------|-------|
| **Chat** | Chat key for messages, titles, summaries | `GOOGLE_AI_STUDIO_KEY_CHAT_1` | `GOOGLE_AI_STUDIO_KEY_CHAT_2` |
| **Images** | Image generation | `GOOGLE_AI_STUDIO_KEY_IMAGE_1` | `GOOGLE_AI_STUDIO_KEY_IMAGE_2` |
| **Fixes** | Artifact error fixing | `GOOGLE_AI_STUDIO_KEY_FIX_1` | `GOOGLE_AI_STUDIO_KEY_FIX_2` |

---

## Troubleshooting

**Q: What if I forgot to copy a secret value?**
A: Go back to the dashboard and copy it again. The dashboard always shows current secrets.

**Q: What if I set the wrong value?**
A: Just set it again with the `npx supabase secrets set` command. It will overwrite the old value.

**Q: Can I do this programmatically?**
A: Not without Supabase Management API credentials. The security design intentionally prevents secret value access through standard APIs.

**Q: What happens if I rename some but not all secrets?**
A: Functions will fail with "not configured" errors for the pools that don't have renamed keys yet. The rotation won't work until all 6 are renamed.

---

## Related Documentation

- **Deployment Guide:** `.claude/HANDOFF_ROUND_ROBIN_TESTING.md`
- **Implementation Details:** `.claude/ROUND_ROBIN_KEY_ROTATION.md`
- **Main Docs:** `CLAUDE.md` (search for "Round-Robin")

---

**Last Updated:** November 9, 2025
