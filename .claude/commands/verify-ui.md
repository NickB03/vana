# UI Verification Workflow

Comprehensive UI verification after making changes.

## Steps

1. **Start the development server**
   ```bash
   npm run dev
   ```
   Wait 3 seconds for server startup.

2. **Navigate to the application**
   ```typescript
   await browser.navigate({ url: "http://localhost:8080" });
   ```

3. **Check for console errors**
   ```typescript
   const errors = await browser.get_console_messages({ onlyErrors: true });
   if (errors.length > 0) {
     console.error("⚠️ Console errors found:", errors);
   }
   ```

4. **Verify page structure**
   ```typescript
   const snapshot = await browser.take_snapshot();
   // Check for critical elements in snapshot
   ```

5. **Test responsive design**
   ```typescript
   // Mobile
   await browser.resize_page({ width: 375, height: 667 });
   await browser.screenshot({ filename: "mobile-view.png" });

   // Tablet
   await browser.resize_page({ width: 768, height: 1024 });
   await browser.screenshot({ filename: "tablet-view.png" });

   // Desktop
   await browser.resize_page({ width: 1920, height: 1080 });
   await browser.screenshot({ filename: "desktop-view.png" });
   ```

6. **Test critical user flows**
   ```typescript
   // Start new chat
   await browser.click({ uid: "[new-chat-button-uid]" });

   // Send message
   await browser.fill({ uid: "[message-input-uid]", value: "Test message" });
   await browser.click({ uid: "[send-button-uid]" });

   // Wait for response
   await browser.wait_for({ text: "response" });
   ```

7. **Check network requests**
   ```typescript
   const requests = await browser.list_network_requests();
   const failed = requests.nodes.filter(r => r.status >= 400);
   if (failed.length > 0) {
     console.error("❌ Failed requests:", failed);
   }
   ```

8. **Verify animations work**
   ```typescript
   // Navigate between pages to test route animations
   await browser.navigate({ url: "http://localhost:8080/auth" });
   await browser.navigate({ url: "http://localhost:8080" });
   ```

9. **Final screenshot**
   ```typescript
   await browser.screenshot({
     fullPage: true,
     filename: "ui-verification-complete.png"
   });
   ```

## Success Criteria

✅ No console errors
✅ All critical elements visible
✅ Responsive design works
✅ User flows complete successfully
✅ No failed network requests
✅ Animations render smoothly

## Arguments

When called with arguments, customize the verification:
- `$ARGUMENTS` can specify specific pages or features to test