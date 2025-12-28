# Troubleshooting Guide - Vana

**Last Updated**: 2025-12-26

Comprehensive troubleshooting guide for common issues in Vana AI Development Assistant.

---

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
  - [Authentication Problems](#authentication-problems)
  - [Chat Not Working](#chat-not-working)
  - [Artifact Generation Issues](#artifact-generation-issues)
  - [Image Generation Failures](#image-generation-failures)
  - [Rate Limit Errors](#rate-limit-errors)
  - [Tool Rate Limit Errors](#tool-rate-limit-errors)
  - [Security Validation Errors](#security-validation-errors)
  - [UI/Display Issues](#uidisplay-issues)
- [Error Messages](#error-messages)
- [Performance Issues](#performance-issues)
- [Browser-Specific Issues](#browser-specific-issues)
- [Network & Connectivity](#network--connectivity)
- [Getting Help](#getting-help)

---

## Quick Diagnostics

Before diving into specific issues, try these quick fixes:

### 1. Hard Refresh
Clear your browser cache:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

### 2. Check Browser Console
Open Developer Tools and check for errors:
1. Press `F12` or right-click → "Inspect"
2. Go to "Console" tab
3. Look for red error messages

### 3. Verify Network Connection
Check that you have a stable internet connection and can access:
- `https://vznhbocnuykdmjvujaka.supabase.co`

### 4. Clear Local Storage
Sometimes cached data causes issues:
1. Open DevTools (`F12`)
2. Go to "Application" tab
3. Expand "Local Storage"
4. Right-click and "Clear"
5. Refresh page

---

## Common Issues

### Authentication Problems

#### Issue: "Authentication required" error after logging in

**Symptoms**:
- Redirected to login page repeatedly
- Session expires immediately
- "Invalid session" errors

**Solutions**:

1. **Clear cookies and local storage**:
   ```
   1. Open DevTools (F12)
   2. Application → Storage → Clear site data
   3. Refresh page and login again
   ```

2. **Check browser cookie settings**:
   - Ensure third-party cookies are enabled
   - Check that cookies aren't being blocked for Supabase domains

3. **Try incognito/private mode**:
   - This helps identify if browser extensions are interfering

4. **Verify email confirmation**:
   - Check your email for confirmation link
   - Resend confirmation if needed

#### Issue: Google OAuth not working

**Symptoms**:
- "Sign in with Google" button does nothing
- Redirected but not logged in
- "OAuth error" message

**Solutions**:

1. **Check popup blockers**:
   - Disable popup blockers for this site
   - Try again after allowing popups

2. **Clear Google auth cache**:
   - Go to https://myaccount.google.com/permissions
   - Remove Vana app
   - Try signing in again

3. **Check redirect URI**:
   - Should be: `https://vznhbocnuykdmjvujaka.supabase.co/auth/v1/callback`

---

### Chat Not Working

#### Issue: Messages not sending

**Symptoms**:
- Send button does nothing
- Message appears but no AI response
- "Failed to send message" error

**Solutions**:

1. **Check rate limits**:
   - Guest users: 20 messages per 5 hours
   - Authenticated users: 100 messages per 5 hours
   - Wait for rate limit to reset or sign up/login

2. **Verify session**:
   ```javascript
   // Check in browser console
   localStorage.getItem('supabase.auth.token')
   ```
   - If null, you're logged out - login again

3. **Check message length**:
   - Maximum: 50,000 characters
   - Try shortening your message

4. **Inspect network requests**:
   - Open DevTools → Network tab
   - Look for failed requests to `/chat`
   - Check response error message

#### Issue: Streaming responses stop mid-sentence

**Symptoms**:
- AI response starts but stops partway through
- No error message
- Connection seems to hang

**Solutions**:

1. **Check network stability**:
   - Ensure stable internet connection
   - Try on different network (WiFi vs mobile data)

2. **Disable browser extensions**:
   - Some ad blockers interfere with Server-Sent Events (SSE)
   - Try incognito mode

3. **Check firewall/proxy**:
   - Corporate networks may block SSE streams
   - Try on personal network

4. **Wait and retry**:
   - External API may be experiencing issues
   - Wait 30 seconds and try again

---

### Artifact Generation Issues

#### Validation Error Codes

Artifacts use **structured error codes** for validation failures. See [ERROR_CODES.md](ERROR_CODES.md) for complete reference.

**Common Error Codes**:

| Error Code | Category | Blocking? | Description | Fix |
|------------|----------|-----------|-------------|-----|
| `IMPORT_LOCAL_PATH` | Import | ✅ Yes | Using `@/` imports | Use npm packages like `@radix-ui/react-dialog` |
| `RESERVED_KEYWORD_EVAL` | Syntax | ✅ Yes | Variable named `eval` | Rename to `score`, `value`, or `evaluation` |
| `STORAGE_LOCAL_STORAGE` | API | ✅ Yes | Using `localStorage` | Replace with React `useState` |
| `IMMUTABILITY_ARRAY_ASSIGNMENT` | Mutation | ❌ No | Direct array mutation | Use spread: `const newArr = [...arr]` |

**Non-Blocking Errors**: All `IMMUTABILITY_*` errors only cause React warnings but don't prevent rendering.

#### Issue: Artifacts not rendering

**Symptoms**:
- "Artifact failed to render" error
- Blank artifact canvas
- Console errors about imports

**Solutions**:

1. **Check validation error code**:
   - Review error message for specific error code (e.g., `IMPORT_LOCAL_PATH`)
   - See [ERROR_CODES.md](ERROR_CODES.md) for detailed fix instructions

2. **Check artifact type**:
   - Ensure you requested a supported type: `react`, `html`, `svg`, `code`, `mermaid`, `markdown`

3. **Review error message**:
   - Click "Show Details" on error
   - Common causes:
     - Invalid imports (using `@/components/ui/*`) → `IMPORT_LOCAL_PATH`
     - Reserved keywords (`eval`, `arguments`) → `RESERVED_KEYWORD_*`
     - Browser storage APIs → `STORAGE_*`
     - Syntax errors

4. **Use "Fix Artifact" button**:
   - AI will automatically fix common errors using error codes
   - Regenerate if fix doesn't work

5. **Try regenerating**:
   - Rephrase your request
   - Be more specific about requirements

#### Issue: React artifacts showing import errors

**Symptoms**:
- Error: "Cannot find module '@/components/ui/...'"
- Artifact won't run
- "Invalid import" warnings

**Root Cause**:
Artifacts run in isolated sandbox and cannot access local project imports.

> **Reference**: See `.claude/artifact-import-restrictions.md` for detailed import rules and allowed packages.

**Solution**:

1. **Regenerate with correct imports**:
   - Request: "Create the same component but use Radix UI primitives instead of @/components/ui imports"

2. **Valid imports for artifacts**:
   ```javascript
   // ✅ CORRECT - Use Radix UI
   import * as Dialog from '@radix-ui/react-dialog';
   import * as Button from '@radix-ui/react-button';

   // ❌ WRONG - Don't use local imports
   import { Button } from '@/components/ui/button';
   ```

3. **Use global React**:
   ```javascript
   // ✅ CORRECT
   export default function MyComponent() {
     const { useState, useEffect } = React;
     // ...
   }

   // ❌ WRONG
   import { useState } from 'react';
   ```

#### Issue: Artifacts showing "Cannot use localStorage"

**Root Cause**:
Artifacts run in sandboxed iframe without localStorage access.

**Solution**:
Use React state instead:

```javascript
// ❌ WRONG
localStorage.setItem('data', value);

// ✅ CORRECT
const [data, setData] = useState(initialValue);
```

---

### Image Generation Failures

#### Issue: "Failed to generate image"

**Symptoms**:
- Error message after image request
- Timeout errors
- Rate limit errors

**Solutions**:

1. **Check prompt length**:
   - Maximum: 2,000 characters
   - Keep prompts concise and descriptive

2. **Retry with simpler prompt**:
   - Remove complex details
   - Use straightforward descriptions

3. **Check rate limits**:
   - Same rate limits as chat (20/5h for guests)
   - Images count toward your rate limit

4. **Verify prompt content**:
   - Ensure prompt doesn't contain prohibited content
   - Avoid requesting copyrighted material

#### Issue: Image not displaying

**Symptoms**:
- Image generation succeeds but shows blank
- "Failed to load image" error
- Broken image icon

**Solutions**:

1. **Check image URL**:
   - Should be from Supabase Storage
   - Starts with: `https://vznhbocnuykdmjvujaka.supabase.co/storage/`

2. **Wait for image to load**:
   - Large images may take time to load
   - Check network tab for upload progress

3. **Verify storage access**:
   - Image bucket may have access restrictions
   - Try refreshing page

---

### Rate Limit Errors

#### Issue: "Rate limit exceeded" error

**Symptoms**:
- Error: "You have reached the maximum number of requests"
- 429 HTTP status code
- Cannot send messages

**Understanding Rate Limits**:

| User Type | Limit | Window |
|-----------|-------|--------|
| Guest | 20 requests | 5 hours |
| Authenticated | 100 requests | 5 hours |

**Solutions**:

1. **Wait for rate limit to reset**:
   - Rate limit window is 5 hours from first request
   - Check "X-RateLimit-Reset" header for exact time

2. **Sign up for higher limits**:
   - Create free account for 100 requests/5h
   - 5x more capacity than guest mode

3. **Optimize usage**:
   - Combine multiple questions into one message
   - Use "Edit" instead of regenerating entire artifacts
   - Avoid unnecessary image generations

4. **Check current usage**:
   ```javascript
   // In browser console
   fetch('/admin-analytics')
     .then(r => r.json())
     .then(data => console.log(data));
   ```

---

### Tool Rate Limit Errors

#### Issue: "Tool rate limit exceeded" error

**Symptoms**:
- Error message: "Tool rate limit exceeded"
- Artifact generation fails after a few attempts
- Image generation fails
- Web search fails
- 429 HTTP status code with tool-specific message

**Understanding Tool Rate Limits**:

The system implements per-tool rate limits (Issue #340) as a security measure to prevent abuse:

| Tool | Guest Limit | Authenticated Limit |
|------|-------------|---------------------|
| `generate_artifact` | 5/5h | 50/5h |
| `generate_image` | 2/5h | 25/5h |
| `browser.search` | 20/5h | 100/5h |

**Note**: Tool rate limits are separate from overall chat rate limits. You can hit a tool limit while still having chat capacity available.

**Solutions**:

1. **Wait for rate limit to reset**:
   - Tool rate limit windows are 5 hours from first tool use
   - Each tool has its own independent window

2. **Sign up for higher limits**:
   - Authenticated users get 10x more tool capacity
   - Create a free account to unlock higher limits

3. **Optimize tool usage**:
   - Use "Edit Artifact" instead of regenerating entirely
   - Batch multiple small requests into one comprehensive request
   - Avoid rapid consecutive tool calls

4. **Check which tool hit the limit**:
   - Error message includes the specific tool name
   - Switch to a different tool if possible (e.g., code block instead of artifact)

**Rate Limit Implementation Details**:
- Tracked in `user_tool_rate_limits` database table
- Uses fail-closed circuit breaker for safety
- Rate limiter includes graceful degradation on database errors

---

### Security Validation Errors

#### Issue: "Request blocked by security validation" error

**Symptoms**:
- Error message: "Request blocked by security validation"
- Message won't send
- Prompt appears normal but is rejected
- "Prompt injection detected" warning

**Why This Happens**:

The prompt injection defense system (Issue #340 Phase 0) uses 5-layer protection:

1. **Unicode Normalization**: Detects hidden characters and homograph attacks
2. **SQL Pattern Detection**: Blocks SQL injection-like syntax
3. **HTML/Script Injection**: Filters script tags and event handlers
4. **Prompt Manipulation**: Detects attempts to override system instructions
5. **Sandboxed Validation**: Secondary validation in isolated context

**Common Triggers** (usually false positives):

| Pattern | Why It Triggers | Solution |
|---------|-----------------|----------|
| `DROP TABLE`, `SELECT *` | SQL injection patterns | Wrap code in markdown code blocks |
| `<script>`, `onclick=` | HTML injection patterns | Use code blocks for HTML examples |
| `ignore previous instructions` | Prompt manipulation | Rephrase without meta-instructions |
| Unusual Unicode characters | Homograph attack detection | Use standard ASCII characters |

**Solutions**:

1. **Rephrase your request**:
   - Use different wording that doesn't match injection patterns
   - Avoid using code-like syntax in natural language requests

2. **Use code blocks**:
   - Wrap any code examples in triple backticks
   - This signals to the system that it's intentional code, not an attack
   ```
   ```sql
   SELECT * FROM users
   ```
   ```

3. **Simplify the request**:
   - Break complex requests into smaller, clearer parts
   - Remove unnecessary technical details from the prompt

4. **Avoid meta-instructions**:
   - Don't include phrases like "ignore", "override", "forget previous"
   - These trigger prompt manipulation detection

**Note**: This is a security feature, not a bug. False positives are rare but can occur with highly technical queries. The system errs on the side of caution to protect against real attacks.

---

### UI/Display Issues

#### Issue: Dark mode not working

**Solutions**:

1. **Check theme selector**:
   - Click profile icon → Settings → Theme
   - Try selecting "Dark" explicitly (not "System")

2. **Clear theme preference**:
   ```javascript
   // In browser console
   localStorage.removeItem('vite-ui-theme');
   location.reload();
   ```

3. **Check system settings**:
   - If using "System" theme, verify OS dark mode is enabled

#### Issue: Sidebar not showing

**Solutions**:

1. **Check viewport size**:
   - Sidebar auto-hides on mobile (<768px width)
   - Try expanding browser window

2. **Toggle sidebar**:
   - Look for hamburger menu icon (≡)
   - Click to show/hide sidebar

3. **Clear UI state**:
   ```javascript
   // Reset sidebar state
   localStorage.removeItem('sidebar-state');
   location.reload();
   ```

#### Issue: Resizable panels not working

**Solutions**:

1. **Check browser compatibility**:
   - Requires modern browser (Chrome 90+, Firefox 88+, Safari 14+)

2. **Try dragging divider**:
   - Look for vertical divider between chat and artifact panels
   - Cursor should change to resize icon

3. **Reset panel sizes**:
   ```javascript
   localStorage.removeItem('react-resizable-panels:layout');
   location.reload();
   ```

---

## Error Messages

### "Network request failed"

**Meaning**: Cannot connect to Supabase backend

**Solutions**:
1. Check internet connection
2. Verify Supabase is not down: https://status.supabase.com
3. Check firewall/proxy settings
4. Try different network

### "Invalid session token"

**Meaning**: Your authentication session has expired

**Solutions**:
1. Click "Sign In" and login again
2. Clear cookies and local storage
3. Check system time is correct (SSO relies on accurate time)

### "Maximum retries exceeded"

**Meaning**: API request failed after multiple retry attempts

**Solutions**:
1. Check if external AI service is down
2. Wait a few minutes and try again
3. Try with simpler/shorter prompt
4. Check network stability

### "Artifact validation failed"

**Meaning**: Generated artifact has security or syntax issues

**Solutions**:
1. Click "Fix Artifact" button for automatic repair
2. Review artifact code for:
   - Invalid imports (@/components/ui/*)
   - localStorage usage
   - Syntax errors
3. Regenerate with clearer requirements

### "Tool rate limit exceeded"

**Meaning**: You've hit per-tool rate limits (Issue #340 security)

**Solutions**:
1. Wait for rate limit window to reset (5 hours)
2. Use authenticated account for higher limits
3. Avoid rapid consecutive tool calls

### "Prompt injection detected"

**Meaning**: Input contains potentially malicious patterns (Issue #340 security)

**Solutions**:
1. Remove SQL-like syntax from prompts
2. Avoid special characters that look like injection attempts
3. Rephrase request in plain language

### "Tool execution failed"

**Meaning**: Artifact, image, or search tool failed during execution

**Solutions**:
1. Check if using valid artifact type (react, html, svg, code, mermaid, markdown)
2. For images: ensure prompt is descriptive and under 2000 characters
3. For web search: verify internet connection
4. Check tool rate limits haven't been exceeded

---

## Performance Issues

### Slow page loading

**Solutions**:

1. **Clear browser cache**:
   - Hard refresh (Ctrl+Shift+R)

2. **Check network speed**:
   - Run speed test
   - Close other bandwidth-heavy apps

3. **Disable browser extensions**:
   - Some extensions slow down React apps
   - Try incognito mode

4. **Check device resources**:
   - Close unnecessary tabs
   - Restart browser if using for long time

### Laggy scrolling in chat

**Solutions**:

1. **Limit message history**:
   - App optimizes for 100+ messages, but 1000+ may lag
   - Start new session for long conversations

2. **Disable animations**:
   - OS Settings → Accessibility → Reduce Motion

3. **Try different browser**:
   - Chrome generally performs best
   - Firefox and Safari also well-supported

### Artifact rendering slowly

**Solutions**:

1. **Simplify artifact**:
   - Complex components may take time to render
   - Break into smaller artifacts

2. **Check artifact type**:
   - HTML/React with heavy animations may be slow
   - Try static code view instead

---

## Browser-Specific Issues

### Chrome/Edge

**Issue**: Service worker update prompts repeatedly

**Solution**:
```
1. Open DevTools (F12)
2. Application → Service Workers
3. Click "Unregister"
4. Hard refresh page
```

### Firefox

**Issue**: SSE streaming not working

**Solution**:
1. Check `about:config`
2. Ensure `dom.streams.enabled` is `true`
3. Restart Firefox

### Safari

**Issue**: Artifacts not rendering

**Solution**:
1. Enable "Develop" menu
2. Develop → Experimental Features → Enable all
3. Restart Safari

---

## Network & Connectivity

### Behind corporate firewall

**Common blocks**:
- Server-Sent Events (SSE) for streaming
- WebSocket connections
- Third-party API calls

**Solutions**:
1. Contact IT to whitelist:
   - `*.supabase.co`
   - `*.openrouter.ai`
   - `generativelanguage.googleapis.com`
2. Use personal network/mobile hotspot
3. Try VPN (if allowed)

### Using VPN

**Potential issues**:
- IP-based rate limiting may be shared with other VPN users
- Some VPNs block SSE streams

**Solutions**:
1. Disconnect VPN and try again
2. Switch to different VPN server
3. Use authenticated account (user-based limits instead of IP)

---

## Getting Help

If you've tried everything and still have issues:

### 1. Collect Information

Before reporting, gather:
- Browser name and version
- Operating system
- Error messages (screenshot)
- Steps to reproduce
- Network tab screenshot (if network-related)

### 2. Check Existing Issues

Search GitHub issues: https://github.com/NickB03/llm-chat-site/issues

### 3. Create New Issue

If no existing issue matches:
1. Go to: https://github.com/NickB03/llm-chat-site/issues/new
2. Use clear, descriptive title
3. Include:
   - What you were trying to do
   - What happened instead
   - Steps to reproduce
   - Your environment (browser, OS)
   - Error messages/screenshots

### 4. Provide Console Logs

If requested, provide console logs:
```
1. Open DevTools (F12)
2. Go to Console tab
3. Right-click in console
4. "Save as..." → save log file
5. Attach to GitHub issue
```

---

## Emergency Contacts

- **GitHub Issues**: https://github.com/NickB03/llm-chat-site/issues
- **Status Page**: Check Supabase status at https://status.supabase.com

---

## Useful Debug Commands

Run these in browser console (F12) for debugging:

```javascript
// Check authentication status
localStorage.getItem('supabase.auth.token')

// Check rate limit info
fetch('/admin-analytics').then(r => r.json()).then(console.log)

// Clear all local data
localStorage.clear();
sessionStorage.clear();

// Check current session
supabase.auth.getSession().then(console.log)

// Force service worker update
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(reg => reg.update());
  });
```

---

**Last Updated**: 2025-12-26

Found a bug? Please report it at: https://github.com/NickB03/llm-chat-site/issues
