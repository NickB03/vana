# Test Artifact Rendering

Test artifact creation and rendering in the chat interface.

## Steps

1. **Navigate to chat interface**
   ```typescript
   await browser.navigate({ url: "http://localhost:8080" });
   ```

2. **Create a new session**
   ```typescript
   await browser.click({ uid: "[new-chat-button-uid]" });
   ```

3. **Request artifact creation**
   ```typescript
   await browser.fill({
     uid: "[message-input-uid]",
     value: "Create a React component with a button that counts clicks"
   });
   await browser.click({ uid: "[send-button-uid]" });
   ```

4. **Wait for artifact to appear**
   ```typescript
   await browser.wait_for({ text: "artifact" });
   // Wait additional time for rendering
   await new Promise(resolve => setTimeout(resolve, 2000));
   ```

5. **Check for rendering errors**
   ```typescript
   const errors = await browser.get_console_messages({ onlyErrors: true });
   const reactErrors = errors.nodes.filter(e =>
     e.text.includes('React') || e.text.includes('Error')
   );
   if (reactErrors.length > 0) {
     console.error("React errors in artifact:", reactErrors);
   }
   ```

6. **Verify artifact panel opened**
   ```typescript
   const snapshot = await browser.take_snapshot();
   // Look for artifact-canvas in snapshot
   ```

7. **Test artifact interaction**
   ```typescript
   // Try clicking the button in the artifact (if interactive)
   await browser.click({ uid: "[artifact-button-uid]" });
   ```

8. **Screenshot the artifact**
   ```typescript
   await browser.screenshot({
     uid: "[artifact-canvas-uid]",
     filename: "artifact-test.png"
   });
   ```

9. **Test different artifact types**
   ```typescript
   const artifactTypes = [
     "Create an HTML page with a form",
     "Create a Mermaid diagram showing a flow chart",
     "Create an SVG animation",
     "Create a code snippet in Python"
   ];

   for (const request of artifactTypes) {
     await browser.fill({
       uid: "[message-input-uid]",
       value: request
     });
     await browser.click({ uid: "[send-button-uid]" });
     await browser.wait_for({ text: "artifact" });
     await browser.screenshot({
       filename: `artifact-${request.split(' ')[2]}.png`
     });
   }
   ```

## Specific Tests

### Test Library Auto-Loading
```typescript
await browser.fill({
  uid: "[message-input-uid]",
  value: "Create a D3.js bar chart"
});
await browser.click({ uid: "[send-button-uid]" });
await browser.wait_for({ text: "artifact" });

// Check if D3 loaded
const d3Loaded = await browser.evaluate_script({
  function: "() => typeof window.d3 !== 'undefined'"
});
console.log("D3 auto-loaded:", d3Loaded);
```

### Test Error Handling
```typescript
// Send request for artifact with intentional error
await browser.fill({
  uid: "[message-input-uid]",
  value: "Create a React component that imports @/components/ui/button (this should fail)"
});
await browser.click({ uid: "[send-button-uid]" });

// Check for appropriate error message
const errors = await browser.get_console_messages({ onlyErrors: true });
// Should see "Cannot find module" error
```

## Success Criteria

✅ Artifact panel opens
✅ No React errors in console
✅ Artifact renders correctly
✅ Interactive elements work
✅ Libraries auto-load
✅ Error handling works

## Arguments

`$ARGUMENTS` can specify:
- Specific artifact type to test
- Number of artifacts to create
- Libraries to test