# Deployment Verification Workflow

Complete deployment verification checklist.

## Pre-Deployment

1. **Run tests**
   ```bash
   npm run test
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Verify local build**
   ```bash
   node scripts/verify-deployment.cjs
   ```
   Expected output:
   - ✅ Cache-Control headers present
   - ✅ Build hash found
   - ✅ Files with hashes
   - ✅ Service worker found

## Post-Deployment

1. **Verify remote deployment**
   ```bash
   node scripts/verify-deployment.cjs $ARGUMENTS
   ```
   Where `$ARGUMENTS` is your production URL.

2. **Browser verification**
   ```typescript
   const url = "$ARGUMENTS" || "https://your-production-url.com";
   await browser.navigate({ url });
   ```

3. **Check build hash**
   ```typescript
   const buildHash = await browser.evaluate_script({
     function: "() => document.documentElement.dataset.buildHash"
   });
   console.log("Production build hash:", buildHash);
   ```

4. **Verify service worker**
   ```typescript
   const swActive = await browser.evaluate_script({
     function: "() => navigator.serviceWorker.controller !== null"
   });
   if (!swActive) {
     console.error("❌ Service worker not active!");
   }
   ```

5. **Check console errors**
   ```typescript
   const errors = await browser.get_console_messages({ onlyErrors: true });
   if (errors.length > 0) {
     console.error("⚠️ Production errors:", errors);
   }
   ```

6. **Test cache headers**
   ```typescript
   const requests = await browser.list_network_requests();
   const indexRequest = requests.nodes.find(r => r.url === url + "/");

   if (indexRequest) {
     const cacheControl = indexRequest.responseHeaders['cache-control'];
     if (!cacheControl?.includes('no-cache')) {
       console.error("❌ Index.html is being cached!");
     }
   }
   ```

7. **Performance metrics**
   ```typescript
   await browser.performance_start_trace({ reload: true });
   await browser.navigate({ url });
   const metrics = await browser.performance_stop_trace();

   console.log("Performance Metrics:");
   console.log(`  LCP: ${metrics.lcp}ms (target: <2500ms)`);
   console.log(`  FID: ${metrics.fid}ms (target: <100ms)`);
   console.log(`  CLS: ${metrics.cls} (target: <0.1)`);
   ```

8. **Test critical flows**
   ```typescript
   // Test authentication
   await browser.click({ uid: "[login-button-uid]" });
   await browser.wait_for({ text: "Sign in" });

   // Test chat creation
   await browser.navigate({ url });
   await browser.click({ uid: "[new-chat-uid]" });

   // Test artifact rendering
   await browser.fill({
     uid: "[message-input-uid]",
     value: "Hello"
   });
   await browser.click({ uid: "[send-uid]" });
   ```

9. **Check API connectivity**
   ```typescript
   const apiRequests = requests.nodes.filter(r =>
     r.url.includes('supabase.co')
   );
   const failed = apiRequests.filter(r => r.status >= 400);

   if (failed.length > 0) {
     console.error("❌ API failures:", failed);
   }
   ```

10. **Final screenshot**
    ```typescript
    await browser.screenshot({
      fullPage: true,
      filename: "production-verified.png"
    });
    ```

## Rollback Trigger Points

Deploy should be rolled back if:
- ❌ Build hash not found
- ❌ Service worker not active
- ❌ Console errors present
- ❌ Index.html being cached
- ❌ LCP > 4 seconds
- ❌ API calls failing
- ❌ Critical flows broken

## Success Report

```typescript
console.log(`
✅ DEPLOYMENT VERIFIED
  Build: ${buildHash}
  URL: ${url}
  LCP: ${metrics.lcp}ms
  Errors: ${errors.length}
  API: All endpoints responding
  Cache: Headers configured correctly
  SW: Active and updating
`);
```

## Arguments

`$ARGUMENTS` should be the production URL to verify:
- Example: `https://your-app.vercel.app`
- Example: `https://your-domain.com`