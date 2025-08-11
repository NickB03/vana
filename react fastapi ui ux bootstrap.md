# Core Memory — shadcn/ui + React + Next.js (App Router) + TypeScript + Tailwind

> Single-file primer optimized for an AI agent. Short rules. Clear checklists. Copy-paste snippets. Enough to build and debug confidently.

---

## 0) Mental model (memorize)

- **React** → compose components; client components when you need state/effects/refs/events; otherwise server components.
- **Next.js App Router (`app/`)** → file-based routing, layouts, streaming, data fetching on the server by default.
- **TypeScript** → strict types, stable public props, unions over booleans, narrow generics.
- **Tailwind** → utilities in `className` + HSL tokens via CSS variables.
- **shadcn/ui** → Radix-powered components copied into your repo. You own and edit. Variants with **CVA**, class merging via **`cn()`**.

**Rule of thumb**: render on the server; hydrate only what must be interactive.

---

## 1) Project skeleton

```
app/
  layout.tsx        // root layout (Server)
  page.tsx          // route (Server by default)
  (group)/...       // route groups
  api/route.ts      // route handler (edge/node)
components/
  ui/               // shadcn/ui primitives
  ...feature comps
lib/
  utils.ts          // cn(), helpers
styles/
  globals.css
public/
```

**Conventions**
- Keep primitives in `components/ui`. Keep feature UI near routes.
- `"use client"` only where needed (hooks, refs, events, contexts).
- Absolute imports via `@/*`.

---

## 2) One-time setup

```bash
npx create-next-app@latest my-app --ts
cd my-app
npm i clsx tailwind-merge class-variance-authority lucide-react next-themes
npm i -D tailwindcss postcss autoprefixer tailwindcss-animate
npx tailwindcss init -p
```

**`tailwind.config.ts` (LLM-safe baseline):**
```ts
import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem" },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary:{ DEFAULT: "hsl(var(--secondary))",foreground:"hsl(var(--secondary-foreground))"},
        destructive:{ DEFAULT:"hsl(var(--destructive))",foreground:"hsl(var(--destructive-foreground))"},
        muted:{ DEFAULT:"hsl(var(--muted))",foreground:"hsl(var(--muted-foreground))"},
        accent:{ DEFAULT:"hsl(var(--accent))",foreground:"hsl(var(--accent-foreground))"},
        card:{ DEFAULT:"hsl(var(--card))",foreground:"hsl(var(--card-foreground))"},
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: 0 }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: 0 } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config
```

**`app/globals.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Light */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 47.4% 11.2%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 47.4% 11.2%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 47.4% 11.2%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 215 20.2% 65.1%;
  --radius: 0.5rem;
}

/* Dark */
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

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

**`lib/utils.ts`:**
```ts
import { type ClassValue } from "clsx"
import clsx from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

**Font + Theme in layout:**
```tsx
// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = { title: "App", description: "Next + shadcn/ui" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**`components/theme-provider.tsx`:**
```tsx
"use client"
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

---

## 3) shadcn/ui: install & use

```bash
npx shadcn@latest init
# add components on demand:
npx shadcn@latest add button card input label form dialog dropdown-menu
npx shadcn@latest add textarea select checkbox toggle switch tabs tooltip
npx shadcn@latest add sheet popover accordion alert alert-dialog toast
```

- Components appear under `components/ui/*`. They’re plain React + Tailwind + Radix.
- Extend with **CVA** variants and use `cn()` to merge classes.
- You can edit them freely; you own the source.

**Button (extends default with `elevate`):**
```tsx
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost:"hover:bg-accent hover:text-accent-foreground",
        destructive:"bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link:"text-primary underline-offset-4 hover:underline",
      },
      size: { default:"h-10 px-4 py-2", sm:"h-9 rounded-md px-3", lg:"h-11 rounded-md px-8", icon:"h-10 w-10" },
      elevate: { true: "shadow-md hover:shadow-lg", false: "" },
    },
    defaultVariants: { variant: "default", size: "default", elevate: false },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, elevate, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, elevate }), className)} {...props} />
  }
)
Button.displayName = "Button"
export { buttonVariants }
```

---

## 4) Server vs Client (decision rules)

- Use **Server Components** for: data fetching, heavy compute, markup-only UI.
- Use **Client Components** for: event handlers, `useState/useEffect`, refs, contexts, portals.
- Split: large interactive islands as client; everything else server.

**Common error**: “Event handlers cannot be passed to Server Components.”  
**Fix**: move the interactive part to a child file with `"use client"` at the top.

---

## 5) Data fetching & caching

**Server fetch with ISR (10 min):**
```tsx
// app/page.tsx (Server)
async function getPosts() {
  const res = await fetch("https://example.com/api/posts", { next: { revalidate: 600 } })
  if (!res.ok) throw new Error("Failed to load")
  return res.json() as Promise<{ id: string; title: string }[]>
}
export default async function Page() {
  const posts = await getPosts()
  return <ul className="container py-10">{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

**Route handler:**
```ts
// app/api/echo/route.ts
import { NextResponse } from "next/server"
export async function POST(req: Request) {
  const body = await req.json()
  return NextResponse.json({ ok: true, body })
}
```

**Caching knobs**
- `fetch(url, { cache: "no-store" })` → always fresh.
- `fetch(url, { next: { revalidate: N } })` → ISR every N seconds.
- `export const revalidate = N` → route-level ISR.
- `export const dynamic = "force-dynamic"` → opt out of caching for route.
- `export const runtime = "edge"` → edge runtime (no Node APIs).

---

## 6) Forms with Zod + RHF (client)

```bash
npm i react-hook-form zod @hookform/resolvers
```

```tsx
"use client"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export default function SignupForm() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(v => console.log(v))} className="space-y-6">
        <FormField name="email" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" placeholder="you@domain.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField name="password" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl><Input type="password" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <Button type="submit" className="w-full">Create account</Button>
      </form>
    </Form>
  )
}
```

---

## 7) Theming & dark mode

- Use `next-themes`. `darkMode: ["class"]` in Tailwind.
- Tokens live in `:root` / `.dark` as HSL; Tailwind exposes utilities (`bg-background`, `text-foreground`, etc.).

**Theme toggle:**
```tsx
"use client"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

---

## 8) Radix + shadcn patterns (quick start)

**Dialog**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function ExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Heads up</DialogTitle></DialogHeader>
        Content goes here.
      </DialogContent>
    </Dialog>
  )
}
```

**Dropdown menu**
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost">Menu</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Tabs**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function ExampleTabs() {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">...</TabsContent>
      <TabsContent value="settings">...</TabsContent>
    </Tabs>
  )
}
```

---

## 9) Accessibility, UX, performance (minimums)

- **A11y**: Keep labels with controls, `sr-only` for visual-only icons, maintain color contrast.
- **Images/Links**: Use `next/image` and `next/link`.
- **Streaming**: Wrap slow server children with `<Suspense>`.
- **Client size**: Keep interactive islands small; use `next/dynamic` for heavy client bundles.
- **Motion**: `tailwindcss-animate`, respect `prefers-reduced-motion`.

---

## 10) Error, loading, SEO

- `app/(route)/error.tsx` → error boundary (client).
- `app/(route)/loading.tsx` → suspense fallback while data streams.
- `export const metadata = { ... }` in route or `layout.tsx` for SEO.
- Throw in server to trigger `error.tsx`; show `<Alert>` for recoverable UI errors.

---

## 11) Tailwind usage rules

- Compose utilities with `cn()`:  
  `className={cn("flex items-center gap-2", isActive && "text-primary")}`
- Extract variants with **CVA**; avoid boolean props when variants are exclusive → use unions.
- Keep global CSS small (tokens, resets, rare custom rules). Prefer utilities close to components.

---

## 12) Testing & quality

- **Type checks**: `tsc --noEmit` in CI, `"strict": true`.
- **ESLint**: `eslint-config-next`, `@typescript-eslint`.
- **Prettier**: optional Tailwind class sorter.
- **UI tests**: React Testing Library for client components.
- **E2E**: Playwright for flows (auth, create, delete).
- **A11y lint**: `@axe-core/react` in dev (optional).

---

## 13) Useful recipes

**Client-only wrapper (avoid hydration mismatch):**
```tsx
"use client"
import { useEffect, useState } from "react"
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [m, setM] = useState(false); useEffect(() => setM(true), [])
  return m ? <>{children}</> : null
}
```

**Accessible icon button:**
```tsx
<Button size="icon" variant="ghost" aria-label="Close">
  <X className="h-4 w-4" aria-hidden />
</Button>
```

**Skeletons:**
```tsx
<div className="grid grid-cols-4 gap-2">
  {Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="h-6 animate-pulse rounded bg-muted" />
  ))}
</div>
```

**Edge handler:**
```ts
export const runtime = "edge"
```

**Absolute imports (`tsconfig.json`):**
```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

---

## 14) Do/Don’t checklist

**Do**
- Default to server components and incremental static regeneration.
- Keep shadcn primitives un-opinionated and reusable.
- Use `cn()` + CVA for class/variant management.
- Validate forms with Zod; show field-level errors.
- Contain state locally; prefer server data over global client state.

**Don’t**
- Pass event handlers through server boundaries.
- Overuse `useEffect` for data fetching in App Router.
- Create monolithic client trees; split interactive islands.
- Hardcode colors—tune tokens first.
- Fight Tailwind with large CSS files.

---

## 15) Common pitfalls → fixes

- **Styles missing** → Ensure `globals.css` is imported in `app/layout.tsx`; verify `content` paths in `tailwind.config.ts`.
- **Dark mode not toggling** → Wrap in `ThemeProvider`, `darkMode: ["class"]`, toggle sets `class` on `<html>`.
- **Radix content unstyled** → Components must be inside the provider tree; global Tailwind styles are sufficient.
- **Type bleed across components** → Export prop types; prefer discriminated unions over booleans.
- **Font FOUT/CLS** → Use `next/font` and apply font class to `<body>`.

---

## 16) Minimal end-to-end example

```tsx
// app/page.tsx (Server)
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import SignupForm from "@/components/signup-form"
import { ExampleDialog } from "@/components/example-dialog"

export default async function Home() {
  return (
    <main className="container py-10 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <ThemeToggle />
      </header>

      <Card>
        <CardHeader><CardTitle>Create account</CardTitle></CardHeader>
        <CardContent><SignupForm /></CardContent>
        <CardFooter className="text-sm text-muted-foreground">You can delete this later.</CardFooter>
      </Card>

      <ExampleDialog />
    </main>
  )
}
```

```tsx
// components/example-dialog.tsx (Client)
"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function ExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary">Open dialog</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Dialog</DialogTitle></DialogHeader>
        Hello from a client component.
      </DialogContent>
    </Dialog>
  )
}
```

---

## 17) Commands reference (for the agent)

```bash
# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input form dialog dropdown-menu toast tabs

# deps (baseline)
npm i clsx tailwind-merge class-variance-authority lucide-react next-themes
npm i react-hook-form zod @hookform/resolvers sonner
npm i -D tailwindcss postcss autoprefixer tailwindcss-animate
```

---

## 18) Glossary (short)

- **App Router** — Next.js routing in `app/` with server components by default.
- **Server Component** — Renders on server, no client JS, can fetch data directly.
- **Client Component** — `'use client'`; can use hooks/events; bundled to browser.
- **CVA** — Class Variance Authority; declarative variant → class mapping.
- **Radix UI** — Headless, accessible primitives used by shadcn/ui.
- **ISR** — Incremental Static Regeneration via `revalidate` time.

---

## 19) Quick prompts (for the agent’s own planning)

- “Create a server component page that fetches data with ISR and renders a shadcn Card list.”
- “Make a client form using RHF + Zod with shadcn Form and validate on submit.”
- “Extend the Button with a new `variant='ghost'` style and `size='icon'` for icon buttons.”
- “Add dark mode toggle using next-themes and update tokens only (no hardcoded hex).”

---

## 20) Final rules (sticky)

1. Server-first. Add client only for interactivity.  
2. Own your components. Edit shadcn/ui freely; keep APIs small.  
3. Use tokens → Tailwind utilities → CVA variants. In that order.  
4. Validate inputs; surface errors near fields.  
5. Keep bundle lean; prefer streaming and Suspense.  

*End of core memory.*
```