# CodeSandbox Pop-out - Cost Analysis & Alternatives

## TL;DR

**Question:** Does opening artifacts in CodeSandbox cost money?  
**Answer:** **FREE for public sandboxes** (what we're using). No API key needed, no rate limits for basic usage.

---

## How CodeSandbox API Works

### Public Sandbox Creation (FREE)

```typescript
// What we implemented:
POST https://codesandbox.io/api/v1/sandboxes/define
```

**Cost:** $0 (completely free)  
**Rate Limits:** None for public sandboxes  
**Authentication:** Not required  
**Restrictions:** Sandboxes are public (anyone with link can view)

### What Happens When User Clicks Pop-out

1. **Your app** creates sandbox configuration (client-side)
2. **Your app** POSTs to CodeSandbox API (no server needed)
3. **CodeSandbox** creates a new public sandbox
4. **CodeSandbox** redirects user to sandbox URL
5. **User** interacts with sandbox on CodeSandbox.io

**Who pays:** Nobody - CodeSandbox offers this as a free service

---

## CodeSandbox Pricing Tiers

### Free Tier (What We Use) ✅

**Features:**
- ✅ Unlimited public sandboxes
- ✅ API access (no key required)
- ✅ All npm packages
- ✅ Live preview
- ✅ Shareable links
- ✅ Fork/edit functionality

**Limitations:**
- ⚠️ Sandboxes are public (not private)
- ⚠️ No private repositories
- ⚠️ Limited to browser-based editing

**Cost:** $0/month

---

### Pro Tier ($9/month)

**Additional Features:**
- Private sandboxes
- GitHub integration
- Custom domains
- Increased storage
- Priority support

**Not needed for our use case** - Public sandboxes are fine

---

### Team Tier ($12/user/month)

**Additional Features:**
- Team collaboration
- Shared workspaces
- Advanced permissions

**Not needed for our use case**

---

## Cost Comparison: All Options

### Option 1: Disable Pop-out

**Cost:** $0  
**Pros:** No external dependencies  
**Cons:** Bad UX, removes functionality

---

### Option 2: CodeSandbox (Implemented) ✅

**Cost:** $0 (free tier)  
**Pros:**
- ✅ Professional IDE
- ✅ Shareable links
- ✅ No maintenance
- ✅ No API key needed
- ✅ No rate limits

**Cons:**
- ⚠️ Sandboxes are public
- ⚠️ Requires internet
- ⚠️ Users leave your site

**Best for:** Most use cases (recommended)

---

### Option 3: StackBlitz (Alternative)

**Cost:** $0 (free tier)  
**API:** `https://stackblitz.com/api/v1/projects`

**Pros:**
- ✅ Similar to CodeSandbox
- ✅ WebContainers (runs Node.js in browser)
- ✅ Faster startup
- ✅ Better TypeScript support

**Cons:**
- ⚠️ More complex API
- ⚠️ Requires more configuration

**Best for:** TypeScript-heavy projects

---

### Option 4: Self-hosted Sandpack Bundler

**Cost:** $10-50/month (server hosting)  
**Setup:** Complex (requires backend)

**Pros:**
- ✅ Full control
- ✅ Private sandboxes
- ✅ No external dependencies

**Cons:**
- ❌ High maintenance
- ❌ Server costs
- ❌ Complex setup
- ❌ Need to handle npm registry

**Best for:** Enterprise with strict data privacy

---

### Option 5: Generate Standalone HTML

**Cost:** $0  
**Setup:** Very complex (requires bundler)

**Pros:**
- ✅ Self-contained
- ✅ No external dependencies

**Cons:**
- ❌ Very complex implementation
- ❌ Large bundle size
- ❌ May not work for all packages
- ❌ High maintenance

**Best for:** Offline-first applications

---

## Privacy Considerations

### What Data Goes to CodeSandbox?

When user clicks pop-out:

```json
{
  "files": {
    "package.json": "{ dependencies: {...} }",
    "src/App.js": "/* User's artifact code */"
  }
}
```

**Sent to CodeSandbox:**
- ✅ Artifact code (React component)
- ✅ Package dependencies
- ✅ Project structure

**NOT sent:**
- ❌ User's personal data
- ❌ Chat history
- ❌ Authentication tokens
- ❌ Other artifacts

### Is This a Privacy Issue?

**For most use cases: NO**

**Reasons:**
1. Only artifact code is sent (not user data)
2. Sandboxes are temporary (can be deleted)
3. CodeSandbox is trusted (used by millions)
4. No authentication required

**When it might be an issue:**
- Enterprise with strict data policies
- Artifacts contain sensitive code
- Compliance requirements (HIPAA, SOC 2)

**Solution for sensitive use cases:**
- Disable pop-out for Sandpack artifacts
- Use self-hosted solution
- Add warning before opening in CodeSandbox

---

## Rate Limits & Quotas

### CodeSandbox Free Tier

**API Rate Limits:**
- ✅ No documented rate limits for public sandboxes
- ✅ No API key required
- ✅ No usage tracking

**Sandbox Limits:**
- ✅ Unlimited public sandboxes
- ⚠️ Sandboxes may be deleted after inactivity (30+ days)
- ⚠️ No guaranteed uptime for free tier

**In Practice:**
- Used by thousands of apps
- No reported issues with rate limiting
- CodeSandbox wants you to use it (drives traffic)

---

### StackBlitz Free Tier

**API Rate Limits:**
- ⚠️ 100 requests/hour (documented)
- ⚠️ May require API key for higher limits

**Sandbox Limits:**
- ✅ Unlimited public projects
- ✅ Better performance than CodeSandbox

---

## Implementation Comparison

### Current Implementation (CodeSandbox)

```typescript
// Simple POST request, no API key
const form = document.createElement('form');
form.method = 'POST';
form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
form.target = '_blank';
form.submit();
```

**Complexity:** Low  
**Maintenance:** None  
**Cost:** $0

---

### Alternative: StackBlitz

```typescript
import sdk from '@stackblitz/sdk';

sdk.openProject({
  files: {
    'src/App.js': artifact.content,
    'package.json': JSON.stringify(dependencies),
  },
  template: 'create-react-app',
});
```

**Complexity:** Medium (requires SDK)  
**Maintenance:** Low  
**Cost:** $0

---

### Alternative: Self-hosted

```typescript
// POST to your own server
fetch('https://your-domain.com/api/sandbox', {
  method: 'POST',
  body: JSON.stringify({ code: artifact.content }),
});

// Server bundles code and returns URL
```

**Complexity:** High  
**Maintenance:** High  
**Cost:** $10-50/month

---

## Recommendations

### For Your Use Case (llm-chat-site)

**Recommended: Keep CodeSandbox (Option 2)** ✅

**Reasons:**
1. **Free** - No costs, no API keys
2. **Simple** - Already implemented
3. **Reliable** - Used by millions
4. **Professional** - Better than disabling
5. **No maintenance** - CodeSandbox handles everything

---

### When to Consider Alternatives

**Use StackBlitz if:**
- You need better TypeScript support
- You want faster startup times
- You prefer WebContainers

**Use Self-hosted if:**
- Enterprise with strict data policies
- Need private sandboxes
- Have budget for infrastructure

**Disable pop-out if:**
- Privacy is critical
- Can't use external services
- Want zero dependencies

---

## Adding Privacy Warning (Optional)

If you're concerned about privacy, add a confirmation dialog:

```typescript
const handleOpenInCodeSandbox = () => {
  // Show confirmation dialog
  const confirmed = window.confirm(
    'This will open your code in CodeSandbox (external service). Continue?'
  );
  
  if (!confirmed) return;
  
  // ... existing CodeSandbox logic
};
```

Or use a more polished dialog:

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button onClick={handlePopOut}>
      <ExternalLink className="size-4" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Open in CodeSandbox?</AlertDialogTitle>
      <AlertDialogDescription>
        This will send your artifact code to CodeSandbox (external service) 
        to create a shareable sandbox. Your code will be publicly accessible.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleOpenInCodeSandbox}>
        Continue
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Monitoring Usage (Optional)

Track how often users use pop-out:

```typescript
const handleOpenInCodeSandbox = () => {
  // Analytics (optional)
  if (window.gtag) {
    window.gtag('event', 'artifact_popout', {
      artifact_type: 'sandpack',
      destination: 'codesandbox',
    });
  }
  
  // ... existing logic
};
```

---

## Summary Table

| Solution | Cost | Complexity | Privacy | Maintenance |
|----------|------|------------|---------|-------------|
| **CodeSandbox** ✅ | $0 | Low | Public | None |
| StackBlitz | $0 | Medium | Public | Low |
| Self-hosted | $10-50/mo | High | Private | High |
| Disable | $0 | Low | N/A | None |

---

## Final Recommendation

**Keep the current implementation (CodeSandbox)** ✅

**Why:**
- ✅ Completely free (no hidden costs)
- ✅ No API key required
- ✅ No rate limits for basic usage
- ✅ Professional UX
- ✅ Zero maintenance
- ✅ Trusted by millions of developers

**When to reconsider:**
- If you get enterprise customers with strict data policies
- If CodeSandbox changes their free tier (unlikely)
- If you need private sandboxes

**For now:** The free tier is perfect for your use case.

---

---

## Appendix: StackBlitz Implementation (Alternative)

If you want to switch to StackBlitz instead of CodeSandbox:

### Install StackBlitz SDK

```bash
npm install @stackblitz/sdk
```

### Update Artifact.tsx

```typescript
import sdk from '@stackblitz/sdk';

const handleOpenInStackBlitz = () => {
  const dependencies = extractNpmDependencies(artifact.content);

  sdk.openProject({
    title: artifact.title,
    description: `Generated from ${artifact.title}`,
    template: 'create-react-app',
    files: {
      'src/App.js': artifact.content,
      'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
      'public/index.html': `<!DOCTYPE html>
<html>
<head>
  <title>${artifact.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
      'package.json': JSON.stringify({
        name: artifact.title.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        dependencies: {
          react: '^18.3.0',
          'react-dom': '^18.3.0',
          ...dependencies,
        },
      }, null, 2),
    },
  });

  toast.success("Opening in StackBlitz...");
};
```

### Comparison

| Feature | CodeSandbox | StackBlitz |
|---------|-------------|------------|
| **Cost** | Free | Free |
| **API Key** | Not required | Not required |
| **Rate Limits** | None | 100/hour |
| **Startup Speed** | ~3-5s | ~1-2s (faster) |
| **Node.js Support** | Limited | Full (WebContainers) |
| **TypeScript** | Good | Excellent |
| **Bundle Size** | 0KB (no SDK) | ~50KB (SDK) |
| **Implementation** | Simple POST | Requires SDK |

**Verdict:** CodeSandbox is simpler (no SDK), StackBlitz is faster.

---

**Last Updated:** 2025-01-05
**CodeSandbox Free Tier:** Confirmed active
**Recommendation:** Use CodeSandbox (Option 2) - simpler and no SDK needed

