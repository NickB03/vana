/**
 * Bundling Guidance
 *
 * Cost-aware guidance for choosing between Sucrase (instant client-side) and
 * server-side bundling (slow but supports npm packages).
 *
 * Critical for UX: Most artifacts should use client-side path.
 */

export const BUNDLING_GUIDANCE = `
## Rendering Path Selection

[HIGH - AFFECTS USER EXPERIENCE]

Artifacts support TWO rendering methods with different performance characteristics.
See core-restrictions.ts for the tiered import strategy (Tier 1: pre-loaded CDN, Tier 2: npm packages).

### ⚡ Client-Side Sucrase (Default - Use for 90% of artifacts)

**Performance:**
- Latency: <100ms (instant)
- No rate limits
- No server resources

**Available Libraries:**
- React (global UMD)
- Tailwind CSS (pre-loaded)
- Lucide React (icons)
- Recharts (charts - including Cell, PieChart, RadarChart, etc.)
- Framer Motion (animations)
- D3, Chart.js, Three.js (r128)
- Math.js, Lodash, Papaparse

**Use for:**
- Simple to medium complexity UIs
- Tailwind-only components
- Basic forms, cards, buttons
- Charts and visualizations (Recharts available)
- Animations (Framer Motion available)
- Icons (Lucide available)

**Trigger:** No npm import statements in code

### 🐢 Server-Side Bundling (Use sparingly)

**Performance:**
- Latency: 2-5 seconds (poor UX)
- Rate limit: 50 requests / 5 hours
- Compute resources: esbuild on server

**Available Libraries:**
- Full npm ecosystem (2M+ packages)
- Radix UI primitives
- Any package from esm.sh

**Use ONLY for:**
- Complex accessible UI primitives (Dialog, Dropdown, Select, Popover)
- Specialized npm packages not available via CDN
- User explicitly requests modern UI library

**Cost:** 2-5 second delay, rate limit consumption, server compute

**Trigger:** npm import statement detected (e.g., \`import * as Dialog from '@radix-ui/react-dialog'\`)

### Decision Matrix

**Need a button/card/form?**
→ Use Tailwind CSS (client-side path - instant)

**Need charts?**
→ Use Recharts (client-side path - instant, already available)

**Need icons?**
→ Use Lucide React (client-side path - instant, already available)

**Need Dialog/Dropdown/Select/Popover?**
→ Consider Radix UI (bundling path - 2-5s delay)
→ Alternative: Build with Tailwind + absolute positioning (client-side path)

**Need animations?**
→ Use Framer Motion (client-side path - instant, already available)
→ Or Tailwind transitions (client-side path)

**Need specialized npm package?**
→ Server bundling (bundling path - 2-5s delay)

### Cost-Aware Recommendations

**Default to Tailwind CSS:**
Modern, fully-featured UI can be built with Tailwind alone. Reserve Radix UI for cases where accessibility primitives are critical and worth the 2-5 second delay.

**Examples:**

✅ Tailwind-Only Button (instant):
\`\`\`jsx
<button
  onClick={handleClick}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg
             hover:bg-blue-700 active:scale-95 transition-all
             focus:ring-2 focus:ring-blue-500 focus:outline-none
             disabled:opacity-50 disabled:cursor-not-allowed"
>
  Click Me
</button>
\`\`\`

✅ Tailwind-Only Card (instant):
\`\`\`jsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6
                border border-gray-200 dark:border-gray-700
                hover:shadow-xl transition-shadow">
  <h2 className="text-xl font-bold mb-4">Card Title</h2>
  <p className="text-gray-600 dark:text-gray-300">Card content</p>
</div>
\`\`\`

🟡 Radix UI Dialog (2-5s delay - use only if needed):
\`\`\`jsx
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-blue-600 text-white rounded-lg">
    Open Dialog
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                               bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full">
      <Dialog.Title className="text-xl font-semibold mb-4">Title</Dialog.Title>
      <Dialog.Description className="text-gray-600 mb-4">Description</Dialog.Description>
      <Dialog.Close className="px-4 py-2 bg-gray-200 rounded-lg">Close</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
\`\`\`

### When Bundling Fails

If server bundling fails (timeout, rate limit, etc.):
1. System will show error with "Ask AI to Fix" option
2. npm imports will cause runtime errors
3. Provide Tailwind-only alternative in error message
`;

export const BUNDLING_COST_REMINDER = `
[PERFORMANCE REMINDER]

- Default to client-side path (Tailwind + available CDN libraries)
- Only use npm imports when truly needed
- Each npm import adds 2-5 second delay
- Tailwind CSS can build professional UIs without bundling
`;
