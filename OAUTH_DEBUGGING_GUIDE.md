# Google OAuth Debugging Guide

## Current Issue
Users accessing the application via `vana.bot` encounter the error:
```
Unable to exchange external code
error_code: unexpected_failure
```

## Root Cause
The "Unable to exchange external code" error occurs when:
1. **Redirect URI mismatch**: The redirect URI used during OAuth flow doesn't match what's configured in Google Cloud Console
2. **Domain not authorized**: The domain (e.g., `vana.bot`) is not in the authorized redirect URIs list
3. **OAuth credentials mismatch**: Client ID/Secret in Supabase doesn't match Google Cloud Console

## Fix Applied (Code Changes)

### Auth.tsx - Error Detection & Display
Updated `/src/pages/Auth.tsx` to:
- ✅ Detect OAuth error parameters in URL
- ✅ Display user-friendly error messages via toast
- ✅ Provide specific guidance for "Unable to exchange external code" error
- ✅ Clean URL after error display

## Required Configuration Changes

### Step 1: Verify Google Cloud Console Settings

1. **Navigate to Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Select your OAuth project

2. **Check Authorized Redirect URIs**
   - Go to: APIs & Services → Credentials → OAuth 2.0 Client IDs
   - Click your OAuth client
   - Under "Authorized redirect URIs", ensure ALL domains are listed:
     ```
     https://xfwlneedhqealtktaacv.supabase.co/auth/v1/callback
     https://vana.bot/auth
     http://localhost:8080/auth
     ```

3. **Check Authorized JavaScript Origins** (if applicable)
   - Add:
     ```
     https://vana.bot
     http://localhost:8080
     ```

### Step 2: Verify Supabase Configuration

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/xfwlneedhqealtktaacv
   - Go to: Authentication → Providers → Google

2. **Check OAuth Credentials**
   - Ensure Client ID matches Google Cloud Console
   - Ensure Client Secret matches Google Cloud Console

3. **Check Site URL & Redirect URLs**
   - Go to: Authentication → URL Configuration
   - Site URL should be: `https://vana.bot` (or your primary domain)
   - Add redirect URLs:
     ```
     https://vana.bot/auth
     http://localhost:8080/auth
     ```

### Step 3: Verify OAuth Flow

The OAuth flow should be:
1. User clicks "Sign in with Google" on `https://vana.bot/auth`
2. Supabase redirects to Google with redirect_uri: `https://xfwlneedhqealtktaacv.supabase.co/auth/v1/callback`
3. Google authenticates user and redirects back to Supabase callback
4. Supabase exchanges code for tokens and redirects to: `https://vana.bot/auth#access_token=...`
5. Auth page detects session and redirects to `/`

**Error occurs at step 3**: If Google's callback URL doesn't match what's in Google Cloud Console

## Testing Checklist

- [ ] Verify all redirect URIs are in Google Cloud Console
- [ ] Verify OAuth credentials match between Supabase and Google
- [ ] Test OAuth flow on `vana.bot` domain
- [ ] Test OAuth flow on `localhost:8080`
- [ ] Check browser console for detailed error messages
- [ ] Check Supabase logs for OAuth-related errors

## Common Pitfalls

1. **Multiple OAuth Clients**: Ensure you're configuring the correct OAuth client in Google Cloud Console
2. **Trailing Slashes**: Some systems require `/auth` others require `/auth/` - be consistent
3. **HTTP vs HTTPS**: Production must use HTTPS; localhost can use HTTP
4. **Domain Propagation**: After adding domains, wait a few minutes for changes to propagate

## How to Test the Fix

After updating Google Cloud Console redirect URIs:

1. Clear browser cache and cookies for `vana.bot`
2. Navigate to `https://vana.bot/auth`
3. Click "Sign in with Google"
4. Complete Google authentication
5. Should redirect back successfully with session

If error still occurs:
- Check browser console for error details
- The toast notification will now show the specific error
- Verify the redirect URI being used matches what's configured

## Monitoring

After fixes, monitor:
- Supabase Dashboard → Logs → Auth logs
- Browser console for JavaScript errors
- Toast notifications for OAuth errors
