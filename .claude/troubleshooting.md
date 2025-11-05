# Troubleshooting Guide

Common issues and solutions for the AI Chat Assistant application.

## Quick Diagnostics

```typescript
// Run this first for any issue:
await browser.navigate({ url: "http://localhost:8080" });
const errors = await browser.get_console_messages({ onlyErrors: true });
const network = await browser.list_network_requests();
const failed = network.nodes.filter(r => r.status >= 400);

console.log("Console errors:", errors);
console.log("Failed requests:", failed);
```

## Common Issues

### 🔴 Application Won't Start

#### Port 8080 Already in Use
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 8081
```

#### Dependencies Not Installed
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install
```

#### Wrong Node Version
```bash
# Check version (needs 18+)
node --version

# Use nvm to switch
nvm use 18
```

### 🔴 Authentication Issues

#### "Authentication required" Loop
```typescript
// 1. Check Supabase connection
const { data, error } = await supabase.auth.getSession();
console.log("Session:", data, "Error:", error);

// 2. Clear corrupted session
localStorage.removeItem('supabase.auth.token');
window.location.reload();

// 3. Verify environment variables
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
```

#### Google OAuth Not Working
```typescript
// Check redirect URL configuration
// In Supabase Dashboard → Authentication → URL Configuration
// Redirect URLs should include:
// - http://localhost:8080/auth (dev)
// - https://your-domain.com/auth (prod)

// Test OAuth flow
await browser.navigate({ url: "http://localhost:8080/auth" });
await browser.click({ uid: "google-login-button" });
// Check for popup blocker messages
```

#### Session Expires Quickly
```javascript
// Check token expiry
const token = JSON.parse(localStorage.getItem('supabase.auth.token'));
const expiresAt = new Date(token.expires_at * 1000);
console.log("Token expires:", expiresAt);

// Extend session in Supabase Dashboard:
// Authentication → Settings → JWT Expiry
```

### 🔴 Chat Interface Issues

#### Messages Not Sending
```typescript
// 1. Check session
const session = await supabase.auth.getSession();
if (!session.data.session) {
  console.error("No active session");
}

// 2. Check RLS policies
await get_advisors({ type: "security" });

// 3. Monitor network
const requests = await browser.list_network_requests();
const chatApi = requests.nodes.filter(r =>
  r.url.includes('chat_messages')
);
console.log("Chat API calls:", chatApi);
```

#### Streaming Not Working
```javascript
// Check EventSource support
if (!window.EventSource) {
  console.error("Browser doesn't support SSE");
}

// Verify streaming endpoint
fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: "test" })
}).then(response => {
  const reader = response.body.getReader();
  // Process stream
});
```

#### Chat History Not Loading
```typescript
// Check Supabase query
await execute_sql({
  query: `
    SELECT * FROM chat_sessions
    WHERE user_id = auth.uid()
    ORDER BY updated_at DESC
  `
});

// Verify React Query cache
// In DevTools → Application → Session Storage
// Look for 'tanstack-query' entries
```

### 🔴 Artifact Rendering Issues

#### "Cannot find module '@/components/ui/button'"
```javascript
// This is EXPECTED - artifacts can't use local imports
// Solution: Use Radix UI primitives instead

// ❌ Wrong
import { Button } from "@/components/ui/button";

// ✅ Correct
import * as Dialog from '@radix-ui/react-dialog';
// Build your own button with Tailwind
<button className="px-4 py-2 bg-primary rounded">Click</button>
```

#### Library Not Loading
```javascript
// Check if library is in safe list
// See .claude/artifacts.md for full list

// Force library load
window.Chart = await import('https://cdn.skypack.dev/chart.js');

// Verify in console
console.log(typeof Chart);  // Should be 'function'
```

#### React Errors in Artifact
```typescript
// Check console for specific error
await browser.get_console_messages();

// Common issues:
// 1. Hooks outside component
// 2. Missing key prop in lists
// 3. Undefined variables
// 4. Import syntax errors
```

### 🔴 Database Issues

#### "Permission denied for table"
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Add missing policy
CREATE POLICY "user_access" ON your_table
  FOR ALL USING (auth.uid() = user_id);

-- Run security check
await get_advisors({ type: "security" });
```

#### Foreign Key Violations
```sql
-- Check constraint
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f' AND conrelid = 'your_table'::regclass;

-- Verify referenced record exists
SELECT * FROM parent_table WHERE id = 'referenced_id';
```

#### Migration Failed
```typescript
// Check migration status
const migrations = await list_migrations();
const failed = migrations.filter(m => m.status === 'failed');

// View error details
await get_logs({ service: "postgres" });

// Rollback if needed
await apply_migration({
  name: "rollback_migration",
  query: "DROP TABLE IF EXISTS problematic_table CASCADE;"
});
```

### 🔴 Build & Deployment Issues

#### Build Fails
```bash
# Clean build
rm -rf dist
rm -rf node_modules/.vite
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check for missing dependencies
npm ls
```

#### Deployment Verification Fails
```bash
# Run verification
node scripts/verify-deployment.cjs

# Common failures:
# ❌ No build hash - Check vite.config.ts
# ❌ No service worker - Check VitePWA config
# ❌ Wrong cache headers - Check server config
```

#### Users See Old Version
```javascript
// 1. Check build hash
fetch('/').then(r => r.text()).then(html => {
  const match = html.match(/data-build-hash="([^"]+)"/);
  console.log("Build hash:", match[1]);
});

// 2. Clear service worker
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister());
});

// 3. Hard refresh
// Ctrl+Shift+R (Windows/Linux)
// Cmd+Shift+R (Mac)
```

### 🔴 Performance Issues

#### Slow Initial Load
```typescript
// Analyze bundle
npx vite-bundle-visualizer

// Check network timing
await browser.performance_start_trace({ reload: true });
await browser.navigate({ url: "http://localhost:8080" });
const metrics = await browser.performance_stop_trace();
console.log("LCP:", metrics.lcp, "ms");
```

#### Chat Lag with Many Messages
```javascript
// Check message count
const messageCount = document.querySelectorAll('[data-message]').length;
console.log("Messages rendered:", messageCount);

// Verify virtualization is working
// Should only render ~20-30 messages in DOM even with 100+ total
```

#### Memory Leaks
```javascript
// Monitor memory in DevTools
// Performance → Memory → Take heap snapshot
// Look for detached DOM nodes or growing arrays

// Common causes:
// 1. Event listeners not cleaned up
// 2. Intervals/timeouts not cleared
// 3. Large objects in closure scope
```

## Debug Commands

### Check Everything
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run diagnostics
npm run test
node scripts/verify-deployment.cjs

# Terminal 3: Monitor logs
tail -f ~/.npm/_logs/*.log
```

### Browser Console Helpers
```javascript
// Get app state
console.log(window.__APP_STATE__);

// Check React version
console.log(React.version);

// List all event listeners
getEventListeners(document);

// Check service worker
navigator.serviceWorker.ready.then(reg => {
  console.log("SW scope:", reg.scope);
  console.log("SW state:", reg.active.state);
});

// Force update check
window.location.reload(true);
```

### Supabase Helpers
```typescript
// Test connection
await execute_sql({ query: "SELECT NOW()" });

// Check user
await execute_sql({ query: "SELECT auth.uid()" });

// List all tables
await list_tables();

// Check RLS on all tables
await get_advisors({ type: "security" });
```

## Getting Help

If issue persists:

1. **Collect diagnostics**
   ```bash
   npm run build 2>&1 | tee build.log
   node scripts/verify-deployment.cjs | tee verify.log
   ```

2. **Take screenshots**
   ```typescript
   await browser.screenshot({ fullPage: true, filename: "issue.png" });
   await browser.get_console_messages() > console.log
   ```

3. **Check recent changes**
   ```bash
   git log --oneline -10
   git diff HEAD~1
   ```

4. **Search error message**
   - Check Supabase docs
   - Search shadcn/ui issues
   - Check Vite GitHub issues

5. **Create minimal reproduction**
   - Isolate the problem
   - Create simple test case
   - Share code snippet