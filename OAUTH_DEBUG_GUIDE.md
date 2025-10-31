# Google OAuth Debugging Guide

This guide will help you troubleshoot and fix Google OAuth authentication issues.

## 🔴 CRITICAL FIRST STEP: Update Redirect URIs

**You MUST update the redirect URIs in Google Cloud Console for OAuth to work.**

### 1. Update Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Navigate to: **APIs & Services → Credentials**
3. Click on your **OAuth 2.0 Client ID** (the one you're using for this app)
4. Under **Authorized redirect URIs**, add or update:
   ```
   http://localhost:8080/auth
   ```

   **Important:** Make sure it's `/auth` NOT `/` (no trailing slash)

5. If you have a production URL, also add:
   ```
   https://your-production-domain.com/auth
   ```

6. Click **Save**

### 2. Verify Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to: **Authentication → Providers**
3. Click on **Google**
4. Verify:
   - ✅ Provider is **Enabled**
   - ✅ Client ID and Client Secret are filled in
   - ✅ No errors shown

### 3. Check Supabase Redirect URLs (Optional)

Supabase usually accepts any redirect URL from your domain, but verify:

1. Go to: **Authentication → URL Configuration**
2. Check **Redirect URLs** section
3. Should include: `http://localhost:8080/**` (wildcard)

---

## 🧪 Testing with Debug Mode

The Auth page now has comprehensive logging to help diagnose issues.

### Testing Steps:

1. **Open Browser Console** (F12 or Right-click → Inspect → Console tab)

2. **Clear browser cache and cookies:**
   - Chrome: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
   - Select "Cookies and other site data"
   - Click "Clear data"

3. **Navigate to:** `http://localhost:8080/auth`

4. **Click "Sign in with Google"**

5. **Watch the console for debug messages:**

   Expected flow (successful):
   ```
   → "OAuth callback detected, processing..."
   → "Initial session check: Session exists"
   → "Auth state changed: SIGNED_IN Session exists"
   → "User signed in via OAuth, redirecting to /"
   ```

6. **After Google authentication completes:**
   - You should briefly see "Completing sign in..." spinner
   - Then automatically redirect to the main app (`/`)
   - You should be logged in successfully

---

## 🔍 What to Look For

### Console Messages Explained:

| Message | Meaning |
|---------|---------|
| `"OAuth callback detected, processing..."` | ✅ OAuth callback was received (URL has tokens) |
| `"Initial session check: Session exists"` | ✅ Session established successfully |
| `"Auth state changed: SIGNED_IN Session exists"` | ✅ OAuth sign-in completed |
| `"User signed in via OAuth, redirecting to /"` | ✅ Redirecting to main app |
| `"Initial session check: No session"` | ⚠️ No session yet (normal if before OAuth completes) |
| No messages at all | ❌ Auth page not detecting OAuth callback |

### Common Issues & Solutions:

#### Issue 1: No Console Messages After Google Auth
**Symptom:** Redirects to `/auth` but no debug messages appear

**Cause:** Redirect URI mismatch - Google redirected to wrong URL

**Fix:**
1. Double-check Google Cloud Console redirect URI is exactly: `http://localhost:8080/auth`
2. No trailing slash, no extra parameters
3. Save changes in Google Cloud Console
4. Wait 1-2 minutes for changes to propagate
5. Try again in a new private browsing window

#### Issue 2: "No session" Messages Only
**Symptom:** Console shows "No session" but OAuth callback was detected

**Cause:** Supabase not processing OAuth tokens properly

**Fix:**
1. Check Supabase project status (not paused)
2. Verify Google provider is enabled in Supabase
3. Check browser console for Supabase errors
4. Try re-entering Client ID/Secret in Supabase (copy-paste fresh from Google)

#### Issue 3: Stuck on "Completing sign in..."
**Symptom:** Spinner shows but never redirects

**Cause:** Auth state change event not firing

**Fix:**
1. Check browser console for errors
2. Verify no ad blockers or privacy extensions blocking Supabase
3. Try in incognito mode without extensions
4. Check Network tab for failed requests to Supabase

#### Issue 4: Loops Back to Auth Page
**Symptom:** Briefly redirects to `/` but immediately back to `/auth`

**Cause:** Session not persisting or Index page auth check failing

**Fix:**
1. Check browser allows cookies from `supabase.co`
2. Verify no browser extensions clearing storage
3. Check localStorage is enabled in browser
4. Try: `localStorage.clear()` in console, then re-authenticate

---

## 📋 Debugging Checklist

Before asking for help, verify:

- [ ] Google Cloud Console redirect URI updated to `/auth`
- [ ] Changes saved in Google Cloud Console
- [ ] Waited 1-2 minutes after saving
- [ ] Browser cache and cookies cleared
- [ ] Testing in private/incognito window
- [ ] Browser console open during test
- [ ] Supabase project is active (not paused)
- [ ] Google provider enabled in Supabase dashboard

---

## 🐛 Still Not Working?

If OAuth still fails after following all steps:

1. **Copy all console messages** from the browser console
2. **Take screenshot** of:
   - Google Cloud Console OAuth client redirect URIs section
   - Supabase Authentication → Providers → Google settings
3. **Note exact behavior:**
   - What URL does Google redirect to?
   - What console messages appear?
   - Where does the flow get stuck?

With this information, we can diagnose the exact issue.

---

## ✅ Success Indicators

You'll know OAuth is working when:

1. ✅ Console shows "OAuth callback detected, processing..."
2. ✅ See "Completing sign in..." spinner briefly
3. ✅ Automatically redirected to main app (`/`)
4. ✅ User name/avatar appears in top right
5. ✅ Can create and view chat sessions

---

## 🔄 Quick Reset (If Completely Stuck)

If nothing works and you want to start fresh:

1. In Supabase Dashboard:
   - Go to Authentication → Providers → Google
   - Click "Disable"
   - Wait 30 seconds
   - Re-enable and re-enter Client ID/Secret

2. In Browser:
   - Clear all site data: `localStorage.clear(); sessionStorage.clear();`
   - Clear cookies for your domain
   - Clear cookies for `supabase.co`
   - Close all browser tabs of your app

3. In Google Cloud Console:
   - Remove all redirect URIs
   - Add back ONLY: `http://localhost:8080/auth`
   - Save

4. Wait 2 minutes, then test in new private browsing window

---

**Last Updated:** This guide matches commit `3261841` with debug logging enabled.
