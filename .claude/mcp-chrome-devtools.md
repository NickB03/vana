# Chrome DevTools MCP Integration Guide

Complete guide to browser automation and testing with Chrome DevTools MCP.

## Quick Verification Workflow

```typescript
// MUST run after any code changes
await browser.navigate({ url: "http://localhost:8080" });
const errors = await browser.getConsoleMessages({ onlyErrors: true });
if (errors.length > 0) {
  console.error("Console errors detected:", errors);
}
await browser.screenshot({ filename: "verification.png" });
```

## Available Functions

### Navigation & Control
- `navigate_page` - Navigate to URL, go back/forward, reload
- `new_page` - Create new browser tab
- `select_page` - Switch between tabs
- `close_page` - Close specific tab
- `list_pages` - List all open tabs

### Inspection & Debugging
- `take_snapshot` - Get accessibility tree snapshot
- `take_screenshot` - Capture page or element
- `get_console_messages` - Retrieve console logs/errors
- `list_network_requests` - Monitor network activity
- `get_network_request` - Inspect specific request

### Interaction
- `click` - Click elements
- `fill` - Type into inputs
- `fill_form` - Fill multiple fields
- `hover` - Hover over elements
- `press_key` - Keyboard shortcuts
- `drag` - Drag and drop

### Performance
- `performance_start_trace` - Begin recording
- `performance_stop_trace` - Stop and analyze
- `performance_analyze_insight` - Deep dive metrics

## Critical Verification Patterns

### After Frontend Changes
```typescript
// 1. Navigate to application
await browser.navigate({ url: "http://localhost:8080" });

// 2. Check for render errors
const snapshot = await browser.take_snapshot();
const console = await browser.get_console_messages({ onlyErrors: true });

// 3. Verify key elements exist
await browser.wait_for({ text: "Start New Chat" });

// 4. Test interaction
await browser.click({ uid: "new-chat-button-uid" });

// 5. Screenshot for visual check
await browser.screenshot({ filename: "frontend-check.png" });
```

### After Authentication Changes
```typescript
// 1. Test login flow
await browser.navigate({ url: "http://localhost:8080/auth" });
await browser.fill_form({
  elements: [
    { uid: "email-input", value: "test@example.com" },
    { uid: "password-input", value: "testpass123" }
  ]
});
await browser.click({ uid: "login-button" });

// 2. Verify redirect
await browser.wait_for({ text: "Dashboard" });

// 3. Check session storage
const session = await browser.evaluate_script({
  function: "() => localStorage.getItem('supabase.auth.token')"
});
```

### After API Changes
```typescript
// 1. Monitor network
await browser.navigate({ url: "http://localhost:8080" });

// 2. Trigger API call
await browser.click({ uid: "send-message-button" });

// 3. Check requests
const requests = await browser.list_network_requests({
  resourceTypes: ["xhr", "fetch"]
});

// 4. Verify success
const apiCalls = requests.nodes.filter(r =>
  r.url.includes('supabase') && r.status === 200
);
```

### Performance Testing
```typescript
// 1. Start clean
await browser.navigate({ url: "about:blank" });
await browser.performance_start_trace({ reload: false });

// 2. Navigate to app
await browser.navigate({ url: "http://localhost:8080" });

// 3. Perform typical actions
await browser.click({ uid: "new-chat" });
await browser.fill({ uid: "message-input", value: "Test" });
await browser.click({ uid: "send" });

// 4. Stop and analyze
const trace = await browser.performance_stop_trace();

// 5. Check metrics
console.log(`LCP: ${trace.lcp}ms (target: <2500ms)`);
console.log(`FID: ${trace.fid}ms (target: <100ms)`);
console.log(`CLS: ${trace.cls} (target: <0.1)`);
```

## Common Issues & Solutions

### "Browser already running"
✅ This is NORMAL - means MCP is active
```typescript
// Just proceed with your commands
await browser.navigate({ url: "..." });
```

### Element Not Found
```typescript
// Use snapshot to find correct uid
const snapshot = await browser.take_snapshot();
// Look for element in snapshot output
// Use the uid from snapshot
await browser.click({ uid: "actual-uid-from-snapshot" });
```

### Timeout Issues
```typescript
// Increase timeout for slow operations
await browser.navigate_page({
  url: "http://localhost:8080",
  timeout: 10000  // 10 seconds
});
```

## Testing Artifacts

```typescript
// 1. Send message with artifact request
await browser.fill({
  uid: "message-input",
  value: "Create a React button component"
});
await browser.click({ uid: "send-button" });

// 2. Wait for artifact panel
await browser.wait_for({ text: "artifact" });

// 3. Verify rendering
const snapshot = await browser.take_snapshot();
// Check for artifact-canvas in snapshot

// 4. Check for React errors
const errors = await browser.get_console_messages({
  onlyErrors: true
});
const reactErrors = errors.nodes.filter(e =>
  e.text.includes('React')
);

// 5. Screenshot artifact
await browser.screenshot({
  uid: "artifact-canvas-uid",
  filename: "artifact.png"
});
```

## Responsive Testing

```typescript
// Test mobile viewport
await browser.resize_page({ width: 375, height: 667 });
await browser.screenshot({ filename: "mobile.png" });

// Test tablet
await browser.resize_page({ width: 768, height: 1024 });
await browser.screenshot({ filename: "tablet.png" });

// Test desktop
await browser.resize_page({ width: 1920, height: 1080 });
await browser.screenshot({ filename: "desktop.png" });
```

## Network Conditions

```typescript
// Test offline mode
await browser.emulate({
  networkConditions: "Offline"
});
// Verify offline handling

// Test slow connection
await browser.emulate({
  networkConditions: "Slow 3G"
});
// Check loading states

// Reset
await browser.emulate({
  networkConditions: "No emulation"
});
```

## Required Verification Checklist

Run this checklist after EVERY change:

- [ ] Start dev server: `npm run dev`
- [ ] Navigate to app: `await browser.navigate(...)`
- [ ] Check console errors: `await browser.get_console_messages(...)`
- [ ] Verify UI renders: `await browser.screenshot(...)`
- [ ] Test critical flow: login → chat → artifact
- [ ] Check network requests: all return 200/201
- [ ] Verify responsive design: mobile/tablet/desktop
- [ ] Test error scenarios: network failure, auth timeout

## Best Practices

1. **Always verify after changes** - Don't trust build success alone
2. **Use snapshots for debugging** - Find correct element uids
3. **Screenshot key states** - Visual verification catches CSS issues
4. **Monitor console actively** - React errors don't always crash
5. **Test edge cases** - Slow networks, auth failures, etc.
6. **Chain dependent actions** - Use sequential execution
7. **Parallelize independent checks** - Multiple tool calls at once

## Example: Complete Feature Verification

```typescript
// Comprehensive verification after adding new feature
async function verifyFeature() {
  // 1. Basic load test
  await browser.navigate({ url: "http://localhost:8080" });

  // 2. Console check
  const errors = await browser.get_console_messages({
    onlyErrors: true
  });
  if (errors.length > 0) {
    console.error("Errors found:", errors);
    return false;
  }

  // 3. Performance check
  await browser.performance_start_trace({ reload: true });
  await browser.wait_for({ text: "AI Assistant" });
  const metrics = await browser.performance_stop_trace();

  // 4. User flow test
  await browser.click({ uid: "login-link" });
  await browser.fill_form({
    elements: [
      { uid: "email", value: "test@test.com" },
      { uid: "password", value: "password123" }
    ]
  });
  await browser.click({ uid: "submit" });

  // 5. Feature-specific test
  await browser.click({ uid: "new-feature-button" });
  await browser.wait_for({ text: "Feature loaded" });

  // 6. Final screenshot
  await browser.screenshot({
    fullPage: true,
    filename: "feature-complete.png"
  });

  return true;
}
```