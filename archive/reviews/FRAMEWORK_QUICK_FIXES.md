# Framework Best Practices - Quick Fix Guide

**Phase 3C: Implementation Cheat Sheet**

This document provides copy-paste fixes for the most critical framework violations.

---

## P0-1: Fix Mock useChatStore (2 hours)

**Current Issue:** `/frontend/src/hooks/useChatStore.ts` is a mock with no-op functions

**Quick Fix:**

```bash
# Step 1: Delete mock file
rm /Users/nick/Projects/vana/frontend/src/hooks/useChatStore.ts

# Step 2: Update imports in affected files
find frontend/src -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i '' 's|from "@/hooks/useChatStore"|from "@/hooks/chat/store"|g'

# Step 3: Verify store exists
cat frontend/src/hooks/chat/store.ts | head -50
```

**Expected Output:** Real Zustand store with actual state management

**Verification:**
```bash
# Should show no references to old mock
grep -r "useChatStore.ts" frontend/src
```

---

## P0-2: Add Next.js Image Optimization (4 hours)

**Step 1: Find all image tags**

```bash
# List all files with <img> tags
grep -r "<img" frontend/src --include="*.tsx" -l
```

**Step 2: Replace with next/image**

**Before:**
```tsx
<img src="/logo.png" alt="Logo" width="200" height="50" />
```

**After:**
```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // If above-the-fold
/>
```

**Step 3: Configure next.config.js**

Add to `/frontend/next.config.js`:

```javascript
const nextConfig = {
  // ... existing config
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
}
```

**Verification:**
```bash
npm run build
# Check bundle size reduction
du -sh .next/static
```

---

## P0-3: Add Next.js Font Optimization (1 hour)

**Step 1: Update layout.tsx**

Replace in `/frontend/src/app/layout.tsx`:

```tsx
// Add import at top
import { Inter } from 'next/font/google';

// Add before RootLayout function
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

// Update html tag
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Update tailwind.config.js**

```javascript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
}
```

**Verification:**
```bash
npm run dev
# Inspect page source - should see preload link
curl http://localhost:3000 | grep "font-inter"
```

---

## P0-4: Add Metadata API (3 hours)

**Template for all pages:**

```tsx
// At top of file (before page component)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Title | Vana',
  description: 'Page description (150-160 characters)',
  openGraph: {
    title: 'Page Title',
    description: 'Page description',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Page Title',
    description: 'Page description',
  },
};

// Then your page component
export default function Page() {
  // ...
}
```

**Files to Update:**
- `/frontend/src/app/auth/login/page.tsx`
- `/frontend/src/app/test-prompt/page.tsx`
- `/frontend/src/app/test-error-boundary/page.tsx`

**Verification:**
```bash
npm run build
# Check metadata in build output
grep -r "metadata" .next/server/app
```

---

## P1-1: Enable React Hooks Linting (6 hours)

**Step 1: Update eslint.config.mjs**

```javascript
// Replace in eslint.config.mjs
{
  rules: {
    "react-hooks/rules-of-hooks": "error",  // Changed from "off"
    "react-hooks/exhaustive-deps": "warn",  // Changed from "off"
  }
}
```

**Step 2: Run linter and fix violations**

```bash
npm run lint
# Fix each warning by:
# 1. Adding missing dependencies
# 2. Using useCallback for stable references
# 3. Adding eslint-disable-next-line with justification (last resort)
```

**Common Fixes:**

**Before:**
```tsx
useEffect(() => {
  doSomething(value);
}, []); // ❌ Missing 'value' dependency
```

**After:**
```tsx
useEffect(() => {
  doSomething(value);
}, [value]); // ✅ Correct dependencies
```

**Verification:**
```bash
npm run lint
# Should have 0 errors, minimal warnings
```

---

## P1-2: Migrate to Async SQLAlchemy (16 hours)

**Step 1: Update database configuration**

Replace in `/app/auth/database.py`:

```python
# Before
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///sessions.db')
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**After:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    'sqlite+aiosqlite:///sessions.db',
    echo=False,
    future=True,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db
```

**Step 2: Update route handlers**

**Before:**
```python
@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    return session
```

**After:**
```python
from sqlalchemy import select

@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession).filter(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    return session
```

**Step 3: Update tests**

```python
# Add to test files
import pytest

@pytest.mark.asyncio
async def test_get_session():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/sessions/123")
        assert response.status_code == 200
```

**Verification:**
```bash
# Run tests
uv run pytest tests/ -v

# Check performance improvement
# Before: 50-100 concurrent users
# After: 200+ concurrent users
```

---

## P1-3: Strengthen Mypy Configuration (8 hours)

**Step 1: Update pyproject.toml**

Replace `[tool.mypy]` section:

```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
warn_redundant_casts = true
warn_unused_ignores = true

# Enable gradually
check_untyped_defs = true
disallow_untyped_defs = false  # Start false, enable per-module

# Exclude legacy code
[[tool.mypy.overrides]]
module = ["tests.*"]
disallow_untyped_defs = false
```

**Step 2: Run mypy and fix errors**

```bash
mypy app/

# Add type hints to untyped functions
# Before:
def process_message(message):
    return message.content

# After:
def process_message(message: Message) -> str:
    return message.content
```

**Step 3: Enable stricter checks per module**

```toml
# Once app/routes/ is clean
[[tool.mypy.overrides]]
module = ["app.routes.*"]
disallow_untyped_defs = true
```

**Verification:**
```bash
mypy app/ --strict
# Target: 0 errors, minimal warnings
```

---

## P1-4: Replace Class ErrorBoundary (2 hours)

**Step 1: Install react-error-boundary**

```bash
cd frontend
npm install react-error-boundary
```

**Step 2: Replace ErrorBoundary component**

Replace `/frontend/src/components/ui/error-boundary.tsx`:

```tsx
'use client'

import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
  showHomeButton?: boolean;
  componentName?: string;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      <Button onClick={resetErrorBoundary} className="mt-4">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </Alert>
  );
}

export function ErrorBoundary({
  children,
  onError,
  componentName,
}: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error(`[${componentName}] Error:`, error, errorInfo);
        onError?.(error, errorInfo);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

**Verification:**
```bash
npm run build
# Should have no errors
```

---

## P1-5: Refactor ChatView to useReducer (4 hours)

**Current Issue:** 12 useState hooks causing re-render storms

**Solution:** Consolidate into useReducer

**Add to `/frontend/src/hooks/useChatReducer.ts`:**

```tsx
import { useReducer } from 'react';

type ChatState = {
  inputValue: string;
  isSubmitting: boolean;
  editingMessage: { id: string; content: string } | null;
  validationError: string | null;
};

type ChatAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'START_EDIT'; payload: { id: string; content: string } }
  | { type: 'CANCEL_EDIT' };

const initialState: ChatState = {
  inputValue: '',
  isSubmitting: false,
  editingMessage: null,
  validationError: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputValue: action.payload };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, validationError: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, inputValue: '' };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, validationError: action.payload };
    case 'START_EDIT':
      return { ...state, editingMessage: action.payload };
    case 'CANCEL_EDIT':
      return { ...state, editingMessage: null };
    default:
      return state;
  }
}

export function useChatReducer() {
  return useReducer(chatReducer, initialState);
}
```

**Update `/frontend/src/app/page.tsx`:**

```tsx
// Replace 12 useState hooks with:
import { useChatReducer } from '@/hooks/useChatReducer';

function ChatView() {
  const [state, dispatch] = useChatReducer();

  const handleSubmit = () => {
    dispatch({ type: 'SUBMIT_START' });
    // ... submit logic
    dispatch({ type: 'SUBMIT_SUCCESS' });
  };
}
```

**Verification:**
```bash
# Use React DevTools to verify reduced re-renders
npm run dev
# Navigate to chat, observe performance improvements
```

---

## Quick Verification Checklist

After implementing fixes, run this checklist:

```bash
# Frontend checks
cd frontend
npm run lint          # Should pass with minimal warnings
npm run typecheck     # Should pass
npm run build         # Should succeed
npm test              # Should pass

# Backend checks
cd ..
make lint             # Should pass
make typecheck        # Should pass
make test             # Should pass

# Performance checks
npm run performance:audit  # FCP should be < 1.5s
lighthouse http://localhost:3000 --only-categories=performance

# Bundle size
du -sh frontend/.next/static  # Should be < 200MB
```

---

## Expected Results

After implementing all P0 fixes:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Compliance Score** | 82/100 | 88/100 | +6 points |
| **Bundle Size** | 283MB | 200MB | -29% |
| **FCP** | 2.1s | 1.5s | -28% |
| **State Management** | Mock | Real Zustand | ✅ |
| **SEO Score** | 70/100 | 90/100 | +20 points |

After implementing all P1 fixes:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Compliance Score** | 88/100 | 95/100 | +7 points |
| **Concurrency** | 50-100 users | 200+ users | +100% |
| **TTFB** | 200-500ms | 80ms | -60% |
| **Type Coverage** | 74% | 90% | +16% |
| **Code Quality** | Medium | High | ✅ |

---

## Troubleshooting

### Issue: next/image build fails

**Error:** `Error: Image import requires width/height`

**Fix:**
```tsx
// Always specify width and height
<Image src="/logo.png" width={200} height={50} alt="Logo" />
```

---

### Issue: mypy fails with missing type stubs

**Error:** `error: Skipping analyzing "X": module is installed, but missing library stubs`

**Fix:**
```bash
# Install type stubs
uv add types-pyyaml types-requests
```

---

### Issue: ESLint exhaustive-deps warnings flood

**Error:** Too many warnings to fix at once

**Fix:**
```javascript
// Temporarily use "warn" instead of "error"
"react-hooks/exhaustive-deps": "warn",

// Fix gradually, then upgrade to "error"
```

---

### Issue: Async database migration breaks tests

**Error:** `RuntimeError: Event loop is closed`

**Fix:**
```python
# Update pytest config in pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"

# Mark async tests
@pytest.mark.asyncio
async def test_something():
    # ...
```

---

## Additional Resources

- **Next.js Image Optimization:** https://nextjs.org/docs/app/building-your-application/optimizing/images
- **Next.js Font Optimization:** https://nextjs.org/docs/app/building-your-application/optimizing/fonts
- **React Error Boundary:** https://github.com/bvaughn/react-error-boundary
- **SQLAlchemy Async:** https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- **Mypy Configuration:** https://mypy.readthedocs.io/en/stable/config_file.html

---

**End of Quick Fix Guide**

For detailed explanations, see `/docs/reviews/FRAMEWORK_BEST_PRACTICES_AUDIT.md`
