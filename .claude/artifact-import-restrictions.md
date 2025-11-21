# Artifact Import Restrictions - Quick Reference

**Last Updated**: 2025-11-06
**Status**: CRITICAL - Must follow for all artifacts

## 🚨 The Golden Rule

**Artifacts run in isolated sandboxes (iframes) with NO access to local project files.**

Only CDN-loaded libraries are available. Local imports will cause artifacts to fail.

---

## ❌ FORBIDDEN (Will Break Artifacts)

```tsx
// LOCAL IMPORTS - NEVER WORKS
import { Button } from "@/components/ui/button"      // ❌ FAILS
import { Card } from "@/components/ui/card"          // ❌ FAILS
import { cn } from "@/lib/utils"                     // ❌ FAILS
import { useToast } from "@/hooks/use-toast"         // ❌ FAILS
import anything from "@/..."                          // ❌ FAILS
```

**Why it fails**: The `@/` path alias only works in the parent application, not in the isolated sandbox where artifacts execute.

---

## ✅ ALLOWED (Works in Artifacts)

```tsx
// ⚠️ NOTE: Radix UI imports are NOT supported due to Babel standalone limitations
// Use Tailwind CSS for all UI components instead

// LUCIDE ICONS - Always available as globals
const { Check, X, Settings, User, Mail } = LucideReact;

// RECHARTS - Always available as globals
const { LineChart, BarChart, Line, Bar, XAxis, YAxis, Tooltip } = Recharts;

// D3.JS - Always available as global
const d3 = window.d3;

// THREE.JS - Always available as global
const THREE = window.THREE;

// FRAMER MOTION - Always available as global
const { motion, AnimatePresence } = FramerMotion;
```

---

## 🎨 Component Conversion Guide

### Buttons
```tsx
// ❌ shadcn/ui (FAILS)
<Button variant="default" size="lg">Click me</Button>

// ✅ Tailwind (WORKS)
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
  Click me
</button>
```

### Cards
```tsx
// ❌ shadcn/ui (FAILS)
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// ✅ Tailwind (WORKS)
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
    Title
  </h3>
  <p className="text-gray-600 dark:text-gray-300">
    Content
  </p>
</div>
```

### Inputs
```tsx
// ❌ shadcn/ui (FAILS)
<Input type="email" placeholder="Email" />

// ✅ Tailwind (WORKS)
<input
  type="email"
  placeholder="Email"
  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
/>
```

### Dialogs/Modals
```tsx
// ❌ shadcn/ui (FAILS)
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogTitle>Title</DialogTitle>
  </DialogContent>
</Dialog>

// ❌ Radix UI (FAILS - Import maps not supported by Babel standalone)
import * as Dialog from '@radix-ui/react-dialog'

// ✅ Tailwind CSS with React state (WORKS)
export default function DialogExample() {
  const { useState } = React;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Open Dialog
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full mx-4 z-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Dialog Title
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Dialog content goes here
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### Tabs
```tsx
// ❌ shadcn/ui (FAILS)
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content</TabsContent>
</Tabs>

// ❌ Radix UI (FAILS - Import maps not supported)
import * as Tabs from '@radix-ui/react-tabs'

// ✅ Tailwind CSS with React state (WORKS)
export default function TabsExample() {
  const { useState } = React;
  const [activeTab, setActiveTab] = useState('tab1');

  const tabs = [
    { id: 'tab1', label: 'Tab 1', content: 'Content for Tab 1' },
    { id: 'tab2', label: 'Tab 2', content: 'Content for Tab 2' },
    { id: 'tab3', label: 'Tab 3', content: 'Content for Tab 3' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Tab List */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
```

### Switch/Toggle
```tsx
// ❌ shadcn/ui (FAILS)
<Switch checked={enabled} onCheckedChange={setEnabled} />

// ❌ Radix UI (FAILS - Import maps not supported)
import * as Switch from '@radix-ui/react-switch'

// ✅ Tailwind CSS with React state (WORKS)
export default function SwitchExample() {
  const { useState } = React;
  const [enabled, setEnabled] = useState(false);

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
```

---

## 📚 Complete Working Examples

### Form with Validation
```tsx
import { useState } from "react"
import { Mail, User, CheckCircle } from "lucide-react"

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSuccess(true)
    }, 1500)
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Contact Us
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg text-green-800 dark:text-green-200">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">Sent successfully!</span>
          </div>
        )}
      </form>
    </div>
  )
}
```

### Dashboard with Tabs
```tsx
import * as Tabs from '@radix-ui/react-tabs'
import { Users, DollarSign } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"

export default function Dashboard() {
  const data = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Dashboard
      </h1>

      {/* Metrics */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Users
            </span>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
              +12%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">1,234</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="overview" className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          <Tabs.Trigger
            value="overview"
            className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 transition"
          >
            Overview
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="p-6">
          <LineChart width={600} height={300} data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3B82F6" />
          </LineChart>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
```

---

## 🔧 Available CDN Libraries

### UI Components
- **Tailwind CSS**: Always available (use utility classes for all UI components)
- **Lucide Icons**: Full icon set available as globals (e.g., `const { Home, Settings } = LucideReact;`)

### Charts & Data Visualization
- **Recharts**: Line, Bar, Pie, Area charts
- **D3.js**: v7 - Data visualization
- **Plotly**: Scientific charts
- **Chart.js**: Canvas-based charts

### 3D & Animation
- **Three.js**: r128 - 3D graphics
- **GSAP**: Professional animation
- **Framer Motion**: React animations

### Utilities
- **Lodash**: Utility functions
- **date-fns**: Date manipulation
- **uuid**: ID generation
- **DOMPurify**: HTML sanitization
- **axios**: HTTP client

### Styling
- **Tailwind CSS**: Always available (no import needed)

---

## 🎯 Best Practices

### 1. Use Semantic HTML
```tsx
// ✅ Good
<button className="...">Click me</button>
<input type="email" className="..." />

// ❌ Avoid
<div onClick={...} className="...">Click me</div>
```

### 2. Include Proper Accessibility
```tsx
// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />

// ❌ Bad
<input type="email" placeholder="Email" />
```

### 3. Support Dark Mode
```tsx
// ✅ Good
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// ❌ Bad
<div className="bg-white text-black">
```

### 4. Make It Responsive
```tsx
// ✅ Good
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ❌ Bad
<div className="grid grid-cols-3 gap-4">
```

---

## ⚠️ Common Mistakes to Avoid

1. **Using shadcn/ui components** → Use Tailwind CSS utility classes instead
2. **Using Radix UI imports** → NOT SUPPORTED! Use Tailwind CSS with React state
3. **Importing from @/lib/utils** → Inline the cn() function or use string concatenation
4. **Using localStorage/sessionStorage** → Use React state (useState, useReducer)
5. **Missing default export** → Always include `export default function Component()`
6. **Importing React hooks** → Use globals: `const { useState } = React;`

---

## 📖 More Examples

See **`.claude/artifacts.md`** for:
- Complete Radix UI patterns (lines 479-559)
- Full list of available libraries
- Artifact type selection guide
- Quality standards checklist

---

## 🆘 Troubleshooting

### Error: "Could not find module in path: '@/components/ui/button'"
**Fix**: Replace with Tailwind CSS button using utility classes

### Error: "Could not find dependency: '@radix-ui/react-select'"
**Fix**: Radix UI imports are NOT supported. Use Tailwind CSS with React state instead

### Error: "THREE.CapsuleGeometry is not defined"
**Fix**: Use CylinderGeometry or SphereGeometry (CapsuleGeometry added in r142, we use r128)

### Error: "localStorage is not defined"
**Fix**: Use React state: `const [data, setData] = useState([])`

### Artifact shows blank/white screen
**Check**: Console for import errors, ensure all imports are from CDN libraries

---

## ✅ Validation Checklist

Before creating an artifact, verify:

- [ ] No `@/` imports in the code
- [ ] No Radix UI imports (use Tailwind CSS instead)
- [ ] All libraries accessed via globals (React, Recharts, LucideReact, etc.)
- [ ] Tailwind classes for all UI components and styling
- [ ] React hooks from globals: `const { useState } = React;`
- [ ] Component has default export
- [ ] No localStorage/sessionStorage usage
- [ ] Responsive design with Tailwind breakpoints
- [ ] Dark mode support with dark: prefix
- [ ] Proper accessibility attributes

---

**Remember**: When in doubt, check if the import path starts with `@/` or `@radix-ui/`. If it does, it won't work in artifacts. Use Tailwind CSS utility classes and React state instead!
