# Sprint 1 PR #2 - Theme & Design System Implementation Plan

## 🎨 Gemini-Style Theme Requirements

### Color Palette (From PRD Section 15.1)
```css
/* EXACT colors required */
background: #131314        /* Gemini dark background */
foreground: #E3E3E3       /* Light text */
card: #1E1F20            /* Card background */
card-foreground: #E3E3E3 /* Card text */
primary: #3B82F6         /* Blue primary */
accent: #8B5CF6          /* Purple accent */
muted: #2A2B2C           /* Muted background */
muted-foreground: #9CA3AF /* Muted text */
```

### Typography Requirements
- **Font:** Inter (Google Sans alternative)
- **Mono Font:** JetBrains Mono
- **Grid:** 4px base unit
- **Border Radius:** CSS variable based

### shadcn/ui Components Needed
1. Button
2. Card
3. Dialog
4. Tabs
5. Badge
6. Avatar
7. ScrollArea
8. Separator
9. Tooltip
10. Progress

## 📋 Implementation Tasks

### 1. Install Inter Font
```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})
```

### 2. Update globals.css with CSS Variables
```css
@layer base {
  :root {
    --background: 0 0% 7%;     /* #131314 */
    --foreground: 0 0% 89%;     /* #E3E3E3 */
    --card: 0 0% 12%;          /* #1E1F20 */
    --card-foreground: 0 0% 89%;
    --primary: 217 91% 60%;     /* #3B82F6 */
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 16%;     /* #2A2B2C */
    --secondary-foreground: 0 0% 89%;
    --muted: 0 0% 16%;         /* #2A2B2C */
    --muted-foreground: 210 10% 62%; /* #9CA3AF */
    --accent: 262 80% 50%;      /* #8B5CF6 */
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 20%;
    --input: 0 0% 20%;
    --ring: 217 91% 60%;
    --radius: 0.5rem;
  }
}
```

### 3. Install shadcn/ui Components
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add tabs
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add tooltip
npx shadcn@latest add progress
```

### 4. Update Tailwind Config
```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        // ... rest of color system
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui'],
        mono: ['JetBrains Mono', 'monospace']
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        'gradient-accent': 'linear-gradient(to right, #3B82F6, #8B5CF6)',
      }
    }
  }
}
```

### 5. Create Theme Demo Page
```tsx
// app/theme-demo/page.tsx
export default function ThemeDemo() {
  return (
    <div className="p-8 space-y-8 bg-background text-foreground">
      <h1>Gemini Theme Demo</h1>
      {/* Show all components with theme */}
    </div>
  )
}
```

## ✅ Acceptance Criteria for PR #2

1. [ ] Background is exactly `#131314` (Gemini dark)
2. [ ] Inter font loaded and applied
3. [ ] All 10 shadcn components installed and themed
4. [ ] CSS variables properly configured
5. [ ] Gradient backgrounds working
6. [ ] Card components match Gemini style
7. [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
8. [ ] Theme demo page shows all components

## 🎯 Visual Reference

The theme should match:
- **Google Gemini** chat interface dark theme
- **Claude.ai** dark mode aesthetic
- Clean, minimal, high contrast
- Subtle purple/blue accents
- Smooth animations (shimmer, fade-in)

## 📊 Component Priority

### Must Have (PR #2)
- Button (primary, secondary, ghost)
- Card (chat messages, agent cards)
- Badge (status indicators)
- Separator (visual breaks)

### Nice to Have (Can defer to PR #3)
- Dialog (modals)
- Tabs (Canvas modes)
- ScrollArea (chat history)
- Tooltip (help text)

## 🚀 Next Steps

1. Create new branch: `feat/sprint-1-design-system`
2. Install Inter font
3. Configure CSS variables
4. Install shadcn components
5. Create theme demo page
6. Visual validation against Gemini
7. Submit PR with CodeRabbit review

---

**Note:** This is Sprint 1 PR #2. Focus ONLY on theme and design system. No functional components yet.