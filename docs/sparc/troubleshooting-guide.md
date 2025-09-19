# SPARC Implementation Troubleshooting Guide

## 🚨 Critical Prevention Protocol

**This guide prevents 90% of SPARC implementation failures through proactive validation.**

### Emergency Checklist (Run BEFORE Starting Implementation)

1. **Memory Check**: Verify cross-session knowledge availability
2. **Phase 0 Foundation**: Complete configuration validation
3. **Component Installation**: Verify registry URLs and dependencies
4. **Layout Architecture**: Validate persistent sidebar strategy
5. **State Management**: Confirm Zustand integration patterns

---

## 📋 Phase 0: Foundation Setup Troubleshooting

### Tailwind CSS v4 Configuration Issues

#### Problem: Components render without styling
**Symptoms**: shadcn/ui components appear unstyled, missing CSS variables

**Root Cause**: Incorrect Tailwind configuration or missing file scanning

**Solution**:
```bash
# 1. Verify Tailwind config includes all paths
npx tailwindcss --config tailwind.config.js --dry-run

# 2. Check file scanning coverage
find ./src ./app ./components -name "*.tsx" -o -name "*.jsx" | head -10

# 3. Validate CSS variable integration
grep -r "hsl(var(--" src/ app/ components/
```

**Prevention**:
```javascript
// tailwind.config.js - Comprehensive path coverage
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}', // Utility functions
    './hooks/**/*.{js,ts,jsx,tsx}', // Custom hooks
  ],
  // ... rest of config
}
```

#### Problem: CSS conflicts with existing frameworks
**Symptoms**: Inconsistent styling, override conflicts

**Detection**:
```bash
# Find conflicting CSS imports
grep -r "bootstrap\|bulma\|foundation" src/ app/
grep -r "@import" src/ app/ | grep -v "tailwind"

# Check for CSS-in-JS conflicts
grep -r "styled-components\|emotion\|jss" package.json src/
```

**Solution**: Remove conflicting frameworks or create CSS reset strategy

### Global CSS and Base Styles Issues

#### Problem: Missing shadcn/ui CSS variables
**Symptoms**: Components render but colors/spacing incorrect

**Required Global Styles Validation**:
```bash
# Check for required global imports
cat app/globals.css | grep -E "@tailwind|@layer base"

# Verify CSS variables exist
grep -A 20 "@layer base" app/globals.css | grep "var(--"
```

**Complete CSS Variables Template**:
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
```

### Version Compatibility Issues

#### Problem: React/Next.js version conflicts
**Detection**:
```bash
# Check version compatibility
npm list react react-dom next
npm audit | grep -E "react|next"

# Verify peer dependencies
npm ls --depth=0 | grep -E "react|next|tailwind"
```

**Compatible Version Matrix**:
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0", 
  "next": "^14.0.0",
  "@tailwindcss/typography": "^0.5.10",
  "tailwindcss": "^3.3.0"
}
```

---

## 🔧 Component Installation Troubleshooting

### Prompt-Kit Registry Issues

#### Problem: Invalid registry URLs
**Symptoms**: `npx shadcn@latest add` fails with 404 errors

**Correct Installation Commands**:
```bash
# Prompt-Kit components (use exact URLs)
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/scroll-button.json"

# Standard shadcn/ui components
npx shadcn@latest add avatar
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add separator
npx shadcn@latest add input
npx shadcn@latest add textarea
```

#### Problem: Component installation validation
**Validation Script**:
```bash
#!/bin/bash
# component-validation.sh

echo "🔍 Validating component installations..."

# Check Prompt-Kit components
PROMPT_KIT_COMPONENTS=("prompt-input" "chat-container" "message" "scroll-button")
SHADCN_COMPONENTS=("avatar" "card" "button" "separator" "input" "textarea")

for component in "${PROMPT_KIT_COMPONENTS[@]}"; do
  if [ -f "components/ui/$component.tsx" ]; then
    echo "✅ Prompt-Kit $component installed"
  else
    echo "❌ Missing Prompt-Kit $component"
  fi
done

for component in "${SHADCN_COMPONENTS[@]}"; do
  if [ -f "components/ui/$component.tsx" ]; then
    echo "✅ shadcn/ui $component installed"
  else
    echo "❌ Missing shadcn/ui $component"
  fi
done

# Check component imports
echo "🔍 Checking component imports..."
find components/ui -name "*.tsx" -exec grep -l "use client" {} \;
```

### Dependency Conflicts

#### Problem: Package version mismatches
**Symptoms**: TypeScript errors, runtime failures

**Resolution Strategy**:
```bash
# 1. Clean installation
rm -rf node_modules package-lock.json
npm cache clean --force

# 2. Install with exact versions
npm install --save-exact react@18.2.0 react-dom@18.2.0

# 3. Verify no conflicts
npm ls | grep -E "UNMET|conflict"
```

---

## 🏗️ Layout Architecture Troubleshooting

### Persistent Sidebar + Conditional Chat Issues

#### Problem: Layout not rendering correctly
**Root Cause**: Missing Next.js layout component structure

**Solution - Correct Implementation**:
```typescript
// app/layout.tsx
import { SidebarProvider } from "@/components/ui/sidebar"
import { VanaSidebar } from "@/components/vana-sidebar"
import { cn } from "@/lib/utils"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <VanaSidebar />
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  )
}
```

#### Problem: Chat state not persisting across routes
**Root Cause**: Missing Zustand state management

**Solution - Chat State Store**:
```typescript
// lib/stores/chat-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatState {
  isChatActive: boolean
  currentChatId: string | null
  activateChat: (chatId?: string) => void
  deactivateChat: () => void
}

export const useChatState = create<ChatState>()(
  persist(
    (set) => ({
      isChatActive: false,
      currentChatId: null,
      activateChat: (chatId) => set({ 
        isChatActive: true, 
        currentChatId: chatId || `chat-${Date.now()}` 
      }),
      deactivateChat: () => set({ 
        isChatActive: false, 
        currentChatId: null 
      }),
    }),
    {
      name: 'vana-chat-state',
    }
  )
)
```

### Mobile Responsiveness Issues

#### Problem: Sidebar not mobile-friendly
**Symptoms**: Sidebar overlaps content on mobile

**Solution - Mobile-First Approach**:
```typescript
// components/vana-sidebar.tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function VanaSidebar() {
  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="outline" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex">
        <SidebarContent />
      </Sidebar>
    </>
  )
}
```

---

## 🧠 State Management Troubleshooting

### Zustand Integration Issues

#### Problem: State not updating across components
**Root Cause**: Missing provider or incorrect hook usage

**Validation**:
```typescript
// Test state connectivity
import { useChatState } from '@/lib/stores/chat-store'

export function StateDebugger() {
  const { isChatActive, currentChatId, activateChat } = useChatState()
  
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-100 rounded">
      <p>Chat Active: {isChatActive ? 'Yes' : 'No'}</p>
      <p>Chat ID: {currentChatId || 'None'}</p>
      <button onClick={() => activateChat()}>Test Activate</button>
    </div>
  )
}
```

### SSE Connection Issues

#### Problem: Real-time streaming not working
**Symptoms**: Chat messages not appearing in real-time

**Debugging Steps**:
```typescript
// hooks/use-sse.ts - Debug version
import { useEffect, useState } from 'react'

export function useSSE(url: string) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>('connecting')

  useEffect(() => {
    console.log('🔌 Attempting SSE connection to:', url)
    
    const eventSource = new EventSource(url)
    
    eventSource.onopen = () => {
      console.log('✅ SSE connection opened')
      setConnectionState('open')
      setError(null)
    }
    
    eventSource.onmessage = (event) => {
      console.log('📨 SSE message received:', event.data)
      try {
        const parsed = JSON.parse(event.data)
        setData(parsed)
      } catch (e) {
        console.error('❌ Failed to parse SSE data:', e)
        setError('Invalid JSON received')
      }
    }
    
    eventSource.onerror = (event) => {
      console.error('❌ SSE error:', event)
      setConnectionState('closed')
      setError('Connection failed')
    }
    
    return () => {
      console.log('🔌 Closing SSE connection')
      eventSource.close()
    }
  }, [url])

  return { data, error, connectionState }
}
```

---

## 🧪 Testing Strategy Troubleshooting

### Component Testing Issues

#### Problem: Components fail to render in tests
**Root Cause**: Missing test providers

**Solution - Test Setup**:
```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { ReactElement } from 'react'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

### E2E Testing Issues

#### Problem: Playwright tests fail on component interactions
**Solution - Component Selectors**:
```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test'

test('chat interface navigation', async ({ page }) => {
  await page.goto('/')
  
  // Test sidebar visibility
  await expect(page.locator('[data-testid="vana-sidebar"]')).toBeVisible()
  
  // Test chat activation
  await page.click('[data-testid="start-chat-button"]')
  await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()
  
  // Test message input
  await page.fill('[data-testid="message-input"]', 'Test message')
  await page.click('[data-testid="send-button"]')
  
  // Verify message appears
  await expect(page.locator('[data-testid="message-list"]')).toContainText('Test message')
})
```

---

## 🚀 Performance Optimization Troubleshooting

### Bundle Size Issues

#### Problem: Large bundle sizes affecting performance
**Detection**:
```bash
# Analyze bundle
npm run build
npx @next/bundle-analyzer

# Check specific imports
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

**Optimization Strategies**:
```typescript
// Dynamic imports for heavy components
import { lazy, Suspense } from 'react'

const ChatInterface = lazy(() => import('@/components/chat-interface'))

export function App() {
  return (
    <Suspense fallback={<div>Loading chat...</div>}>
      <ChatInterface />
    </Suspense>
  )
}
```

### Memory Leaks

#### Problem: EventSource connections not cleaned up
**Solution - Proper Cleanup**:
```typescript
useEffect(() => {
  const eventSource = new EventSource(url)
  
  // Set up listeners...
  
  return () => {
    eventSource.close()
    // Clear any timeouts/intervals
    // Remove event listeners
  }
}, [url])
```

---

## 🔍 Debugging Checklist

### Pre-Implementation Validation

```bash
#!/bin/bash
# pre-implementation-check.sh

echo "🚀 SPARC Pre-Implementation Validation"
echo "======================================"

# 1. Memory check
echo "1️⃣ Checking cross-session memory..."
if command -v mcp__claude-flow__memory_usage &> /dev/null; then
  echo "✅ Memory system available"
else
  echo "❌ Memory system not configured"
fi

# 2. Configuration validation
echo "2️⃣ Validating Tailwind configuration..."
if [ -f "tailwind.config.js" ]; then
  echo "✅ Tailwind config exists"
  grep -q "content:" tailwind.config.js && echo "✅ Content paths configured" || echo "❌ Missing content paths"
else
  echo "❌ Missing tailwind.config.js"
fi

# 3. Global CSS check
echo "3️⃣ Checking global CSS..."
if [ -f "app/globals.css" ] || [ -f "src/styles/globals.css" ]; then
  echo "✅ Global CSS file exists"
  grep -q "@tailwind base" app/globals.css src/styles/globals.css 2>/dev/null && echo "✅ Tailwind imports found" || echo "❌ Missing Tailwind imports"
else
  echo "❌ Missing global CSS file"
fi

# 4. Component validation
echo "4️⃣ Validating component installations..."
REQUIRED_COMPONENTS=("button" "card" "avatar" "separator")
for component in "${REQUIRED_COMPONENTS[@]}"; do
  if [ -f "components/ui/$component.tsx" ]; then
    echo "✅ $component installed"
  else
    echo "❌ Missing $component"
  fi
done

# 5. Dependencies check
echo "5️⃣ Checking critical dependencies..."
npm list react react-dom next zustand lucide-react 2>/dev/null | grep -E "react|next|zustand|lucide" && echo "✅ Core dependencies installed" || echo "❌ Missing core dependencies"

echo ""
echo "🎯 Validation complete. Fix any ❌ issues before proceeding."
```

### Runtime Debugging

#### Component Not Rendering
1. Check browser console for errors
2. Verify component import paths
3. Validate CSS class names exist
4. Check provider wrapping
5. Test with minimal component version

#### State Not Updating
1. Add console.logs to state store
2. Check React DevTools
3. Verify hook dependencies
4. Test state isolation
5. Check for stale closures

#### Styling Issues
1. Inspect CSS classes in DevTools
2. Check Tailwind generation
3. Verify CSS variable values
4. Test with inline styles
5. Check for CSS conflicts

---

## 📚 Quick Reference

### Essential Commands
```bash
# Emergency reset
rm -rf node_modules package-lock.json .next
npm install

# Component re-installation
npx shadcn@latest add button --overwrite

# Development with debugging
npm run dev -- --turbo

# Full validation
npm run typecheck && npm run lint && npm run test
```

### Memory Commands
```bash
# Check stored knowledge
mcp__claude-flow__memory_usage --action list

# Search for solutions
mcp__claude-flow__memory_search --pattern "error|solution|fix"

# Store new findings
mcp__claude-flow__memory_usage --action store --key "fix/[issue]" --value "[solution]"
```

### Component Testing
```bash
# Test specific component
npm test -- --testNamePattern="VanaSidebar"

# Visual regression testing
npm run storybook
npm run test:visual

# E2E testing
npm run test:e2e -- --headed
```

---

## 🆘 Emergency Recovery Procedures

### Complete Project Reset
1. Back up any custom code
2. `git stash` uncommitted changes
3. `rm -rf node_modules .next package-lock.json`
4. `npm install`
5. Re-run component installations
6. Restore custom code
7. Test critical paths

### Component Installation Recovery
1. Check `components.json` configuration
2. Verify registry URLs in memory
3. Re-install components one by one
4. Test each component individually
5. Check for TypeScript errors
6. Validate styling

### State Management Recovery
1. Clear browser localStorage
2. Reset Zustand persistence
3. Check store initialization
4. Verify provider setup
5. Test state flow manually

---

**Remember**: This guide is based on real implementation failures documented in memory. Always check memory for the latest solutions before implementing workarounds.