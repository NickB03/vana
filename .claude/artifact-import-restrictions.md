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
// RADIX UI - Always available via CDN
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Switch from '@radix-ui/react-switch'
import * as Slider from '@radix-ui/react-slider'
import * as Popover from '@radix-ui/react-popover'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

// LUCIDE ICONS - Always available
import { Check, X, Settings, User, Mail } from 'lucide-react'

// OTHER CDN LIBRARIES
import { LineChart, BarChart } from 'recharts'
import * as d3 from 'd3'
import * as THREE from 'three'
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

### Dialogs
```tsx
// ❌ shadcn/ui (FAILS)
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogTitle>Title</DialogTitle>
  </DialogContent>
</Dialog>

// ✅ Radix UI + Tailwind (WORKS)
import * as Dialog from '@radix-ui/react-dialog'

<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
    Open
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md">
      <Dialog.Title className="text-xl font-semibold mb-4">
        Title
      </Dialog.Title>
      <Dialog.Description className="text-gray-600 dark:text-gray-300">
        Description here
      </Dialog.Description>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
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

// ✅ Radix UI + Tailwind (WORKS)
import * as Tabs from '@radix-ui/react-tabs'

<Tabs.Root defaultValue="tab1">
  <Tabs.List className="flex border-b border-gray-200">
    <Tabs.Trigger
      value="tab1"
      className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
    >
      Tab 1
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1" className="p-4">
    Content
  </Tabs.Content>
</Tabs.Root>
```

### Switch/Toggle
```tsx
// ❌ shadcn/ui (FAILS)
<Switch checked={enabled} onCheckedChange={setEnabled} />

// ✅ Radix UI + Tailwind (WORKS)
import * as Switch from '@radix-ui/react-switch'

<Switch.Root
  checked={enabled}
  onCheckedChange={setEnabled}
  className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
>
  <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md transform transition data-[state=checked]:translate-x-5 translate-x-0.5" />
</Switch.Root>
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

### UI Primitives
- **Radix UI**: All primitives (Dialog, Dropdown, Popover, Tooltip, Tabs, Switch, Slider)
- **Lucide Icons**: Full icon set

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

1. **Using shadcn/ui components** → Use Radix UI + Tailwind
2. **Importing from @/lib/utils** → Inline the cn() function or use string concatenation
3. **Using localStorage/sessionStorage** → Use React state (useState, useReducer)
4. **Missing default export** → Always include `export default function Component()`
5. **Forgetting imports** → Import React hooks: `import { useState } from 'react'`

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
**Fix**: Replace with Radix UI primitive or plain Tailwind button

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
- [ ] All imports are from CDN-available libraries
- [ ] Using Radix UI primitives instead of shadcn/ui
- [ ] Tailwind classes for all styling
- [ ] React hooks imported from 'react'
- [ ] Component has default export
- [ ] No localStorage/sessionStorage usage
- [ ] Responsive design with Tailwind breakpoints
- [ ] Dark mode support with dark: prefix
- [ ] Proper accessibility attributes

---

**Remember**: When in doubt, check if the import path starts with `@/`. If it does, it won't work in artifacts. Use Radix UI + Tailwind instead!
