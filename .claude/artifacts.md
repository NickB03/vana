# Artifact System Documentation

Comprehensive guide to the artifact rendering system and available libraries.

## Artifact Types & Formats

| Type | XML Type Attribute | Description | Sandbox |
|------|-------------------|-------------|---------|
| Code | `application/vnd.ant.code` | Syntax-highlighted code | No |
| HTML | `text/html` | Interactive HTML with JS | Yes |
| React | `application/vnd.ant.react` | React components | Yes |
| SVG | `image/svg+xml` | Vector graphics | No |
| Mermaid | `application/vnd.ant.mermaid` | Diagrams | No |
| Markdown | `text/markdown` | Formatted text | No |

## Creating Artifacts

```xml
<artifact type="application/vnd.ant.react" title="Interactive Button">
import { useState } from 'react';

export default function Component() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Clicked {count} times
    </button>
  );
}
</artifact>
```

## Auto-Injected Libraries

### HTML/JavaScript Artifacts (27 Libraries)

**Visualization & Charts**
- `chart.js` (3.9.1) - Canvas-based charts
- `d3` (7.8.5) - Data visualization
- `plotly` (2.26.0) - Scientific charts

**3D Graphics**
- `three.js` (0.157.0) - 3D rendering

**Animation**
- `gsap` (3.12.2) - Professional animation
- `anime` (3.2.1) - Lightweight animations
- `framer-motion` (10.16.4) - React animations
- `animate.css` (4.1.1) - CSS animations

**Creative Coding**
- `p5` (1.7.0) - Processing-like creative coding
- `particles.js` (2.0.0) - Particle effects
- `lottie-web` (5.12.2) - After Effects animations

**Canvas & Graphics**
- `fabric.js` (5.3.0) - Canvas manipulation
- `konva` (9.2.1) - 2D canvas library
- `pixi.js` (7.3.1) - WebGL renderer

**Maps**
- `leaflet` (1.9.4) - Interactive maps

**Icons**
- `feather-icons` (4.29.1) - Simple icons
- `heroicons` (2.0.18) - Tailwind icons
- `phosphor-icons` (2.0.2) - Flexible icon family

**UI Components (Radix UI)**
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `@radix-ui/react-popover` - Popovers

**UI Utilities**
- `alpinejs` (3.13.1) - Lightweight reactivity
- `sortablejs` (1.15.0) - Drag & drop
- `@formkit/auto-animate` (0.8.0) - Automatic animations

**Utilities**
- `moment` (2.29.4) - Date manipulation
- `axios` (1.5.1) - HTTP client
- `marked` (9.1.0) - Markdown parser
- `highlight.js` (11.9.0) - Syntax highlighting
- `qrcode` (1.5.3) - QR code generator

### React Artifacts (25+ Libraries)

**Pre-loaded in React environment:**
- React, ReactDOM (always available)
- All HTML artifact libraries (above)
- Plus React-specific:
  - `lucide-react` - Icons
  - `recharts` - React charts
  - `react-hook-form` - Forms
  - `zustand` - State management
  - `@radix-ui/*` - All Radix primitives
  - `date-fns` - Date utilities
  - `lodash` - Utility functions
  - `uuid` - ID generation
  - `DOMPurify` - HTML sanitization

**Always Available:**
- Tailwind CSS (configured)
- TypeScript (if needed)

## Library Detection & Auto-Loading

The system automatically detects library usage and loads them:

```javascript
// These trigger auto-loading:
import * as d3 from 'd3';           // Loads D3
const chart = new Chart(...);       // Loads Chart.js
const scene = new THREE.Scene();    // Loads Three.js
L.map('map').setView(...);         // Loads Leaflet
```

## Important Limitations

### Cannot Use in Artifacts
- ❌ `@/components/ui/*` - Local imports unavailable
- ❌ Local file imports - No access to project files
- ❌ Node.js APIs - Browser environment only
- ❌ shadcn/ui components - Use Radix UI instead

### Workaround for shadcn/ui
```jsx
// Instead of shadcn/ui Button:
import * as Dialog from '@radix-ui/react-dialog';

// Build your own with Radix + Tailwind:
<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
    Open
  </Dialog.Trigger>
  <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Dialog content */}
  </Dialog.Content>
</Dialog.Root>
```

## Error Handling

Artifacts validate through `artifactValidator.ts`:

1. **Syntax Validation** - Checks for parse errors
2. **Security Scan** - Prevents XSS/injection
3. **Library Compatibility** - Ensures dependencies exist
4. **Sandbox Constraints** - Validates browser APIs only

Common errors:
- `Cannot find module '@/components/ui/button'` - Use Radix UI
- `THREE is not defined` - Will auto-load on first render
- `fs is not defined` - Node.js APIs unavailable

## Best Practices

1. **Keep artifacts focused** - Single purpose per artifact
2. **Use available libraries** - Don't reinvent the wheel
3. **Test in sandbox** - Verify rendering before delivery
4. **Include all code** - Artifacts must be self-contained
5. **Handle errors gracefully** - Add try-catch blocks

## Examples

### Interactive Chart
```html
<artifact type="text/html" title="Sales Dashboard">
<canvas id="chart"></canvas>
<script>
  const ctx = document.getElementById('chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'Sales',
        data: [12, 19, 8]
      }]
    }
  });
</script>
</artifact>
```

### React Component with Animation
```jsx
<artifact type="application/vnd.ant.react" title="Animated Card">
import { motion } from 'framer-motion';

export default function Component() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold">Hello World</h2>
    </motion.div>
  );
}
</artifact>
```