# Full-Stack Artifact System Analysis

> Analyzing Z.ai's artifact implementation and evaluating options to bring similar capabilities to Vana.

**Document Version**: 1.0
**Last Updated**: December 7, 2025
**Author**: Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Z.ai Implementation Analysis](#zai-implementation-analysis)
3. [Current Vana Architecture](#current-vana-architecture)
4. [Gap Analysis](#gap-analysis)
5. [Implementation Options](#implementation-options)
6. [Recommendation](#recommendation)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

Z.ai has implemented a **full-stack artifact system** that goes beyond simple component previews. Their system generates complete, deployable Next.js applications with:

- **Live iframe preview** with functional API routes
- **Server-side capabilities** (database, authentication, external APIs)
- **One-click download** of complete project scaffold
- **One-click publish** to cloud hosting

This document analyzes their approach and evaluates three options for bringing similar capabilities to Vana.

### Key Findings

| Capability | Z.ai | Vana (Current) |
|------------|------|----------------|
| Component preview | Yes | Yes |
| API routes functional | Yes | No |
| Database access | Yes (SQLite) | No |
| NPM packages | Full ecosystem | Limited (esm.sh) |
| shadcn/ui imports | Native `@/` paths | Blocked (sandbox) |
| Project download | Yes | No |
| One-click deploy | Yes | No |
| AI model | GLM-4.6 | GLM-4.6 |

---

## Z.ai Implementation Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Z.ai Platform                                   │
├─────────────────────────────────┬───────────────────────────────────────┤
│                                 │                                        │
│    Chat Interface               │      Artifact Preview                  │
│    ┌─────────────────────┐      │      ┌─────────────────────────────┐  │
│    │ GLM-4.6 Responses   │      │      │ <iframe>                    │  │
│    │ • Code explanations │      │      │   Next.js App               │  │
│    │ • Data flow docs    │      │      │   ├── /api/weather          │  │
│    │ • Feature breakdown │      │      │   ├── /api/search           │  │
│    └─────────────────────┘      │      │   ├── /api/news             │  │
│                                 │      │   └── page.tsx              │  │
│    ┌─────────────────────┐      │      └─────────────────────────────┘  │
│    │ "Full-Stack" Badge  │      │                                        │
│    │ "1 Tools" indicator │      │      [Download] [</>] [Publish]        │
│    └─────────────────────┘      │                                        │
│                                 │                                        │
├─────────────────────────────────┴───────────────────────────────────────┤
│                        Z.ai Infrastructure                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐ │
│  │ Container Pool │  │ z-ai-web-sdk   │  │ Project Template Engine    │ │
│  │ (Next.js envs) │  │ (Runtime APIs) │  │ (Scaffold Generation)      │ │
│  └────────────────┘  └────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack (from package.json analysis)

```json
{
  "framework": "Next.js 15 (App Router)",
  "react": "React 19",
  "styling": "Tailwind CSS 4 + shadcn/ui (48 components)",
  "state": "Zustand + TanStack Query",
  "database": "Prisma ORM (SQLite local, PostgreSQL prod)",
  "auth": "NextAuth.js",
  "forms": "React Hook Form + Zod",
  "animations": "Framer Motion",
  "charts": "Recharts",
  "tables": "TanStack Table",
  "drag-drop": "DND Kit",
  "icons": "Lucide React",
  "sdk": "z-ai-web-dev-sdk v0.0.10"
}
```

### The z-ai-web-dev-sdk

Their proprietary SDK provides runtime access to Z.ai services:

```typescript
// Example from their API routes
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  const zai = await ZAI.create()

  // Web search capability
  const results = await zai.functions.invoke("web_search", {
    query: "current weather in New York",
    num: 10
  })

  return NextResponse.json({ results })
}
```

This SDK:
- Authenticates with Z.ai backend automatically
- Provides web search, news, tech trends, design inspiration APIs
- Works server-side (API routes) without exposing credentials
- Enables "live" data in the preview without mock data

### Project Structure Generated

```
generated-project/
├── .dockerignore
├── .gitignore
├── README.md
├── components.json          # shadcn/ui config
├── next.config.ts           # standalone output for Docker
├── package.json             # 50+ dependencies pre-configured
├── postcss.config.mjs
├── tailwind.config.ts       # Full theme + animations
├── tsconfig.json
├── prisma/
│   └── schema.prisma        # User + Post models
├── db/
│   └── dev.db               # SQLite database
├── public/
│   └── [assets]
└── src/
    ├── app/
    │   ├── layout.tsx       # Fonts, metadata, Toaster
    │   ├── page.tsx         # Main application (AI-generated)
    │   ├── globals.css      # CSS variables + Tailwind
    │   └── api/
    │       ├── route.ts
    │       ├── search/route.ts
    │       ├── weather/route.ts
    │       ├── news/route.ts
    │       ├── tech/route.ts
    │       └── design/route.ts
    ├── components/
    │   └── ui/              # 48 shadcn components
    ├── hooks/
    └── lib/
        └── utils.ts         # cn() helper
```

### Key Implementation Details

#### 1. Standalone Output for Deployment

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",  // Self-contained bundle
  typescript: { ignoreBuildErrors: true },  // AI code may have issues
  eslint: { ignoreDuringBuilds: true },
}
```

#### 2. Build Script Creates Deployable Bundle

```json
{
  "scripts": {
    "build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/",
    "start": "NODE_ENV=production node .next/standalone/server.js"
  }
}
```

#### 3. Pre-installed shadcn/ui Components

All 48+ shadcn/ui components are pre-installed, allowing AI to use:

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// ... etc
```

This works because the scaffold includes proper path aliasing:

```json
// components.json
{
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

---

## Current Vana Architecture

### How Artifacts Work Today

```
┌────────────────────────────────────────────────────────────────────┐
│                        Vana Artifact System                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. AI generates code with artifact XML tag                         │
│     <artifact type="application/vnd.ant.react" title="...">        │
│       export default function App() { ... }                         │
│     </artifact>                                                     │
│                                                                     │
│  2. Client-side rendering (two paths):                              │
│                                                                     │
│     Path A: Babel Standalone (instant)                              │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │ • No npm imports                                         │    │
│     │ • Uses window.React, window.ReactDOM globals             │    │
│     │ • Transpiled in browser                                  │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│     Path B: Server Bundling (2-5s)                                  │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │ • Has npm imports (Radix UI, framer-motion, etc.)        │    │
│     │ • bundle-artifact/ Edge Function                         │    │
│     │ • esm.sh for package resolution                          │    │
│     │ • React unified via import maps                          │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│  3. Rendered in sandboxed iframe                                    │
│     • CSP restrictions                                              │
│     • No backend/API access                                         │
│     • Client-side only                                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Current Limitations

| Limitation | Impact |
|------------|--------|
| No `@/components/ui/*` imports | AI must use Radix UI primitives or Tailwind-only |
| No API routes | Cannot demo data fetching, forms, auth |
| No database | Cannot show CRUD operations |
| No server-side code | SSR, API routes, middleware unavailable |
| No project export | Users can't deploy their artifacts |
| Bundle timeout (60s) | Complex dependency trees may fail |

### What Works Well

- **Fast iteration**: Babel path gives instant previews
- **npm package support**: esm.sh handles most packages
- **React unification**: Import map shims prevent dual-React errors
- **5-layer validation**: Catches common issues before render
- **Auto-fix transforms**: Handles immutability violations

---

## Gap Analysis

### Feature Comparison Matrix

| Feature | Z.ai | Vana | Gap |
|---------|------|------|-----|
| **Preview** |
| Iframe preview | Yes | Yes | None |
| Hot reload | Yes | Yes | None |
| Mobile responsive preview | Yes | Yes | None |
| **Frontend** |
| React components | Yes | Yes | None |
| Tailwind CSS | Yes | Yes | None |
| shadcn/ui native imports | Yes | No | **Critical** |
| Framer Motion | Yes | Yes | None |
| Recharts | Yes | Yes | None |
| **Backend** |
| API routes | Yes | No | **Critical** |
| Database (Prisma) | Yes | No | **Major** |
| Authentication | Yes | No | **Major** |
| Server-side rendering | Yes | No | Moderate |
| **Export/Deploy** |
| Download project | Yes | No | **Critical** |
| One-click deploy | Yes | No | **Major** |
| Docker support | Yes | No | Moderate |
| **Developer Experience** |
| TypeScript | Yes | Yes | None |
| ESLint | Yes | No | Minor |
| Path aliases (@/) | Yes | No | **Critical** |

### Priority Gaps

1. **Critical**: shadcn/ui native imports, API routes, project download
2. **Major**: Database, authentication, one-click deploy
3. **Moderate**: SSR, Docker support
4. **Minor**: ESLint, additional tooling

---

## Implementation Options

### Option A: Server-Side Preview Infrastructure

**Approach**: Run actual Next.js instances for each artifact preview.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Option A Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Request                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ Vana Chat   │───▶│ Container        │───▶│ preview-xyz   │  │
│  │ Interface   │    │ Orchestrator     │    │ .vana.dev     │  │
│  └─────────────┘    │ (Kubernetes)     │    │ (Next.js)     │  │
│                     └──────────────────┘    └───────────────┘  │
│                            │                       │            │
│                            │    Code injection     │            │
│                            └───────────────────────┘            │
│                                                                  │
│  Iframe points to: https://preview-{session-id}.vana.dev        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Overview**:
1. Kubernetes cluster with pre-warmed Next.js containers
2. Code injection via volume mounts or API
3. Unique subdomain per session
4. Auto-scaling based on demand
5. Container recycling after session ends

#### Detailed Implementation Walkthrough

**Step 1: Base Container Image**

Create a Docker image with Next.js and all shadcn/ui components pre-installed:

```dockerfile
# Dockerfile.preview-base
FROM node:20-alpine

WORKDIR /app

# Copy pre-built template with all dependencies
COPY template/ .
RUN npm ci --production=false

# Pre-build to warm cache
RUN npm run build || true

# Expose Next.js dev port
EXPOSE 3000

# Entry point waits for code injection then starts
COPY entrypoint.sh /entrypoint.sh
CMD ["/entrypoint.sh"]
```

```bash
#!/bin/bash
# entrypoint.sh
# Wait for code to be injected via ConfigMap/Volume
while [ ! -f /app/src/app/page.tsx ]; do
  sleep 0.1
done

# Start Next.js dev server
npm run dev
```

**Step 2: Kubernetes Deployment**

```yaml
# k8s/preview-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: preview-pool
spec:
  replicas: 10  # Pre-warmed containers
  selector:
    matchLabels:
      app: preview
  template:
    metadata:
      labels:
        app: preview
    spec:
      containers:
      - name: nextjs
        image: vana/preview-base:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        volumeMounts:
        - name: code-volume
          mountPath: /app/src/app/page.tsx
          subPath: page.tsx
      volumes:
      - name: code-volume
        configMap:
          name: preview-code-{{ .sessionId }}
```

**Step 3: Preview Orchestrator Service**

```typescript
// services/preview-orchestrator.ts
import { KubernetesClient } from '@kubernetes/client-node'

interface PreviewSession {
  sessionId: string
  subdomain: string
  status: 'pending' | 'ready' | 'error'
  url: string
}

class PreviewOrchestrator {
  private k8s: KubernetesClient
  private availableContainers: string[] = []

  async createPreview(sessionId: string, artifactCode: string): Promise<PreviewSession> {
    // 1. Create ConfigMap with user's code
    await this.k8s.createConfigMap({
      metadata: { name: `preview-code-${sessionId}` },
      data: {
        'page.tsx': this.wrapArtifactCode(artifactCode)
      }
    })

    // 2. Assign container from pool or scale up
    const container = await this.assignContainer(sessionId)

    // 3. Create Ingress for subdomain routing
    await this.k8s.createIngress({
      metadata: { name: `preview-${sessionId}` },
      spec: {
        rules: [{
          host: `preview-${sessionId}.vana.dev`,
          http: {
            paths: [{
              path: '/',
              backend: { serviceName: container, servicePort: 3000 }
            }]
          }
        }]
      }
    })

    // 4. Wait for container to be ready
    await this.waitForReady(sessionId)

    return {
      sessionId,
      subdomain: `preview-${sessionId}`,
      status: 'ready',
      url: `https://preview-${sessionId}.vana.dev`
    }
  }

  async destroyPreview(sessionId: string): Promise<void> {
    await Promise.all([
      this.k8s.deleteConfigMap(`preview-code-${sessionId}`),
      this.k8s.deleteIngress(`preview-${sessionId}`),
      this.returnContainerToPool(sessionId)
    ])
  }

  private wrapArtifactCode(code: string): string {
    return `
'use client'
${code}
    `.trim()
  }
}
```

**Step 4: Frontend Integration**

```typescript
// hooks/useServerPreview.ts
import { useState, useEffect } from 'react'

export function useServerPreview(artifactCode: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'creating' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!artifactCode) return

    let sessionId: string | null = null

    async function createPreview() {
      setStatus('creating')
      try {
        const response = await fetch('/api/preview/create', {
          method: 'POST',
          body: JSON.stringify({ code: artifactCode })
        })
        const data = await response.json()
        sessionId = data.sessionId
        setPreviewUrl(data.url)
        setStatus('ready')
      } catch (error) {
        setStatus('error')
      }
    }

    createPreview()

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        fetch('/api/preview/destroy', {
          method: 'POST',
          body: JSON.stringify({ sessionId })
        })
      }
    }
  }, [artifactCode])

  return { previewUrl, status }
}
```

**Step 5: Database Support (Optional)**

```typescript
// For previews needing database, inject SQLite
const SQLITE_INIT = `
import { PrismaClient } from '@prisma/client'

// Each preview gets isolated SQLite instance
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'file:/tmp/preview.db' }
  }
})

export default prisma
`
```

**Pros**:
- Full Next.js functionality (API routes, SSR, etc.)
- Real database connections possible
- Identical to production behavior
- shadcn/ui imports work natively

**Cons**:
- **High infrastructure cost** (~$0.02-0.10 per preview session)
- **Cold start latency** (5-15 seconds for new containers)
- **Complexity** (Kubernetes, networking, security)
- **Scaling challenges** (concurrent users × container resources)

**Cost Estimate**:
```
Assumptions:
- 10,000 daily active users
- Average 3 artifact previews per session
- 5-minute average session duration
- e2-medium instances ($0.034/hour)

Base compute:        ~$1,500-2,000/month
Network egress:      ~$300-500/month (10TB estimate)
Persistent storage:  ~$100-200/month (SQLite snapshots)
Load balancer:       ~$50/month
Monitoring/logging:  ~$100-200/month
Container registry:  ~$50/month

Total monthly cost:  ~$2,100-3,000 (realistic estimate)
```

> **Note**: Actual costs may vary based on usage patterns. Budget 1.5x the estimate for safety margin. Consider reserved instances for 30-50% savings at scale.

**Verdict**: Technically superior but operationally complex and expensive.

---

### Option B: StackBlitz WebContainers

**Approach**: Use StackBlitz's WebContainer API to run Node.js entirely in the browser.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Option B Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser (Client-Side Only)                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  ┌─────────────┐    ┌─────────────────────────────────┐   │  │
│  │  │ Vana Chat   │    │ WebContainer                     │   │  │
│  │  │ Interface   │───▶│ ┌─────────────────────────────┐ │   │  │
│  │  └─────────────┘    │ │ Node.js (WASM)              │ │   │  │
│  │                     │ │ ├── npm install              │ │   │  │
│  │                     │ │ ├── next dev                 │ │   │  │
│  │                     │ │ └── localhost:3000           │ │   │  │
│  │                     │ └─────────────────────────────┘ │   │  │
│  │                     └─────────────────────────────────────┘   │  │
│  │                              │                                 │  │
│  │                              ▼                                 │  │
│  │                     ┌─────────────────┐                       │  │
│  │                     │ Preview Iframe  │                       │  │
│  │                     │ (internal port) │                       │  │
│  │                     └─────────────────┘                       │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Overview**:
1. Integrate `@stackblitz/sdk` or WebContainer API
2. Load project template into WebContainer
3. Inject AI-generated code
4. Run `npm install && npm run dev`
5. Preview renders from WebContainer's internal server

#### Detailed Implementation Walkthrough

**Step 1: Install WebContainer API**

```bash
npm install @webcontainer/api
```

**Step 2: Project Template Definition**

```typescript
// lib/webcontainer/template.ts
import type { FileSystemTree } from '@webcontainer/api'

export const PROJECT_TEMPLATE: FileSystemTree = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: 'vana-preview',
        private: true,
        scripts: {
          dev: 'next dev --port 3000',
          build: 'next build',
          start: 'next start'
        },
        dependencies: {
          'next': '15.0.0',
          'react': '^19.0.0',
          'react-dom': '^19.0.0',
          '@radix-ui/react-dialog': '^1.1.0',
          '@radix-ui/react-dropdown-menu': '^2.1.0',
          // ... all shadcn dependencies
          'tailwindcss': '^4.0.0',
          'lucide-react': '^0.400.0',
          'class-variance-authority': '^0.7.0',
          'clsx': '^2.1.0',
          'tailwind-merge': '^2.0.0'
        }
      }, null, 2)
    }
  },
  'next.config.ts': {
    file: {
      contents: `
import type { NextConfig } from 'next'
const config: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
}
export default config
      `.trim()
    }
  },
  'tailwind.config.ts': {
    file: {
      contents: `/* Full Tailwind config with shadcn theme */`
    }
  },
  'tsconfig.json': {
    file: {
      contents: JSON.stringify({
        compilerOptions: {
          target: 'ES2017',
          lib: ['dom', 'dom.iterable', 'esnext'],
          jsx: 'preserve',
          module: 'esnext',
          moduleResolution: 'bundler',
          paths: {
            '@/*': ['./src/*']
          }
        },
        include: ['src'],
        exclude: ['node_modules']
      }, null, 2)
    }
  },
  src: {
    directory: {
      app: {
        directory: {
          'layout.tsx': {
            file: {
              contents: `
import './globals.css'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
              `.trim()
            }
          },
          'globals.css': {
            file: {
              contents: `@tailwind base;\n@tailwind components;\n@tailwind utilities;`
            }
          },
          'page.tsx': {
            file: {
              contents: '// Will be replaced with artifact code'
            }
          }
        }
      },
      components: {
        directory: {
          ui: {
            directory: {
              // All 48 shadcn components pre-loaded
              'button.tsx': { file: { contents: '/* shadcn button */' } },
              'card.tsx': { file: { contents: '/* shadcn card */' } },
              'dialog.tsx': { file: { contents: '/* shadcn dialog */' } },
              // ... etc
            }
          }
        }
      },
      lib: {
        directory: {
          'utils.ts': {
            file: {
              contents: `
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
              `.trim()
            }
          }
        }
      }
    }
  }
}
```

**Step 3: WebContainer Manager**

```typescript
// lib/webcontainer/manager.ts
import { WebContainer } from '@webcontainer/api'
import { PROJECT_TEMPLATE } from './template'

class WebContainerManager {
  private instance: WebContainer | null = null
  private serverUrl: string | null = null
  private isBooting = false

  async boot(): Promise<void> {
    if (this.instance || this.isBooting) return
    this.isBooting = true

    try {
      // Boot WebContainer (one instance per page)
      this.instance = await WebContainer.boot()

      // Mount the project template
      await this.instance.mount(PROJECT_TEMPLATE)

      // Install dependencies (cached after first run)
      const installProcess = await this.instance.spawn('npm', ['install'])

      // Stream install output for debugging
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log('[npm install]', data)
        }
      }))

      const installExitCode = await installProcess.exit
      if (installExitCode !== 0) {
        throw new Error(`npm install failed with code ${installExitCode}`)
      }

      console.log('WebContainer ready!')
    } finally {
      this.isBooting = false
    }
  }

  async injectCode(artifactCode: string): Promise<void> {
    if (!this.instance) {
      throw new Error('WebContainer not booted')
    }

    // Write the artifact code to page.tsx
    const wrappedCode = `
'use client'

${artifactCode}
    `.trim()

    await this.instance.fs.writeFile('/src/app/page.tsx', wrappedCode)
  }

  async startDevServer(): Promise<string> {
    if (!this.instance) {
      throw new Error('WebContainer not booted')
    }

    // Kill any existing dev server
    await this.stopDevServer()

    // Start Next.js dev server
    const devProcess = await this.instance.spawn('npm', ['run', 'dev'])

    // Stream output
    devProcess.output.pipeTo(new WritableStream({
      write(data) {
        console.log('[next dev]', data)
      }
    }))

    // Wait for server to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Dev server startup timeout'))
      }, 60000) // 60 second timeout

      this.instance!.on('server-ready', (port, url) => {
        clearTimeout(timeout)
        this.serverUrl = url
        resolve(url)
      })
    })
  }

  async stopDevServer(): Promise<void> {
    // WebContainer handles process cleanup automatically
    this.serverUrl = null
  }

  async writeFile(path: string, contents: string): Promise<void> {
    if (!this.instance) {
      throw new Error('WebContainer not booted')
    }
    await this.instance.fs.writeFile(path, contents)
  }

  getServerUrl(): string | null {
    return this.serverUrl
  }

  async teardown(): Promise<void> {
    if (this.instance) {
      this.instance.teardown()
      this.instance = null
      this.serverUrl = null
    }
  }
}

// Singleton instance
export const webContainerManager = new WebContainerManager()
```

**Step 4: React Hook for WebContainer Preview**

```typescript
// hooks/useWebContainerPreview.ts
import { useState, useEffect, useCallback } from 'react'
import { webContainerManager } from '@/lib/webcontainer/manager'

interface WebContainerPreviewState {
  status: 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error'
  previewUrl: string | null
  error: string | null
  logs: string[]
}

export function useWebContainerPreview(artifactCode: string | null) {
  const [state, setState] = useState<WebContainerPreviewState>({
    status: 'idle',
    previewUrl: null,
    error: null,
    logs: []
  })

  const addLog = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-100), message] // Keep last 100 logs
    }))
  }, [])

  useEffect(() => {
    if (!artifactCode) return

    let cancelled = false

    async function startPreview() {
      try {
        // Step 1: Boot WebContainer
        setState(prev => ({ ...prev, status: 'booting', error: null }))
        addLog('Booting WebContainer...')
        await webContainerManager.boot()

        if (cancelled) return

        // Step 2: Install dependencies (may be cached)
        setState(prev => ({ ...prev, status: 'installing' }))
        addLog('Dependencies ready')

        if (cancelled) return

        // Step 3: Inject artifact code
        addLog('Injecting artifact code...')
        await webContainerManager.injectCode(artifactCode)

        if (cancelled) return

        // Step 4: Start dev server
        setState(prev => ({ ...prev, status: 'starting' }))
        addLog('Starting Next.js dev server...')
        const url = await webContainerManager.startDevServer()

        if (cancelled) return

        // Step 5: Ready!
        setState(prev => ({
          ...prev,
          status: 'ready',
          previewUrl: url
        }))
        addLog(`Preview ready at ${url}`)

      } catch (error) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }))
          addLog(`Error: ${error}`)
        }
      }
    }

    startPreview()

    return () => {
      cancelled = true
    }
  }, [artifactCode, addLog])

  // Update code without full restart (hot reload)
  const updateCode = useCallback(async (newCode: string) => {
    try {
      await webContainerManager.injectCode(newCode)
      addLog('Code updated (hot reload)')
    } catch (error) {
      addLog(`Update failed: ${error}`)
    }
  }, [addLog])

  return {
    ...state,
    updateCode
  }
}
```

**Step 5: Preview Component**

```tsx
// components/WebContainerPreview.tsx
'use client'

import { useWebContainerPreview } from '@/hooks/useWebContainerPreview'
import { Loader2, Terminal, AlertCircle } from 'lucide-react'

interface Props {
  artifactCode: string | null
  onFallback: () => void // Called when WebContainers not supported
}

export function WebContainerPreview({ artifactCode, onFallback }: Props) {
  // Check browser support
  const isSupported = typeof SharedArrayBuffer !== 'undefined'
    && window.crossOriginIsolated

  if (!isSupported) {
    onFallback()
    return null
  }

  const { status, previewUrl, error, logs } = useWebContainerPreview(artifactCode)

  return (
    <div className="relative h-full">
      {/* Loading States */}
      {status !== 'ready' && status !== 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">
            {status === 'booting' && 'Booting WebContainer...'}
            {status === 'installing' && 'Installing dependencies...'}
            {status === 'starting' && 'Starting Next.js server...'}
          </p>

          {/* Terminal logs */}
          <div className="mt-4 w-80 max-h-32 overflow-y-auto bg-black/90 rounded-lg p-2 text-xs font-mono text-green-400">
            {logs.slice(-5).map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 z-10">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={onFallback}
            className="mt-4 text-sm underline"
          >
            Use standard preview instead
          </button>
        </div>
      )}

      {/* Preview iframe */}
      {previewUrl && (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title="WebContainer Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      )}
    </div>
  )
}
```

**Step 6: API Route Support**

WebContainers support API routes natively. The AI can generate:

```typescript
// Generated by AI into src/app/api/weather/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // This actually runs in WebContainer!
  return NextResponse.json({
    temperature: '72°F',
    condition: 'Sunny',
    source: 'WebContainer API Route'
  })
}
```

**Pros**:
- **Zero infrastructure cost** (runs in browser)
- **Full Node.js environment** (npm, file system, processes)
- **API routes work** (real Next.js server)
- **Proven technology** (StackBlitz, CodeSandbox use this)
- **Fast after initial load** (cached dependencies)

**Cons**:
- **Initial load time** (10-30 seconds for npm install)
- **Browser memory usage** (~500MB-1GB per container)
- **Limited to modern browsers** (requires SharedArrayBuffer)
- **No persistent database** (resets on page refresh)
- **Cross-origin restrictions** (some APIs may not work)

**Technical Requirements**:

WebContainers require specific security headers. Configure these based on your hosting:

```javascript
// Required headers for WebContainers (SharedArrayBuffer support)
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

**Cloudflare Pages** (`_headers` file):
```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

**Vite** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
})
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

**Browser Compatibility** (SharedArrayBuffer required):

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 91+ | Full support |
| Firefox | 79+ | Full support |
| Safari | 15.2+ | Full support |
| Edge | 91+ | Chromium-based |
| Opera | 77+ | Chromium-based |
| IE | Not supported | Use fallback |
| Mobile Safari | 15.2+ | iOS 15.2+ |
| Chrome Android | 91+ | Full support |

> **Fallback Strategy**: Detect `crossOriginIsolated` and show "Download Project" option for unsupported browsers.

**Cost Estimate**: $0 infrastructure (client-side only)

**Verdict**: Best balance of capability and cost. Recommended for MVP.

---

### Option C: Hybrid Client-Side + Export

**Approach**: Enhance current client-side preview, add project export functionality.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Option C Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current Vana Flow (Enhanced)                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  AI generates artifact                                     │  │
│  │       │                                                    │  │
│  │       ▼                                                    │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Enhanced Preview (Client-Side)                       │  │  │
│  │  │ • Current Babel/esm.sh rendering                     │  │  │
│  │  │ • MSW (Mock Service Worker) for API simulation       │  │  │
│  │  │ • IndexedDB for mock database                        │  │  │
│  │  │ • Preview shows "API calls would go here" indicators │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │       │                                                    │  │
│  │       ▼                                                    │  │
│  │  [Preview] [Download Project] [Deploy to Vercel]          │  │
│  │                    │                  │                    │  │
│  │                    ▼                  ▼                    │  │
│  │           ┌──────────────┐    ┌──────────────────┐        │  │
│  │           │ ZIP Download │    │ Vercel API       │        │  │
│  │           │ (Full Next.js│    │ (One-click       │        │  │
│  │           │  project)    │    │  deployment)     │        │  │
│  │           └──────────────┘    └──────────────────┘        │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Overview**:

1. Enhance current client-side preview with API mocking
2. Create project template with all shadcn/ui components
3. Build ZIP generation for downloadable projects
4. Integrate Vercel deployment API
5. Add UI for download and deploy actions

#### Detailed Implementation Walkthrough

**Step 1: Project Template Storage**

Store the complete Next.js template in Supabase Storage for efficient delivery:

```typescript
// lib/project-template/index.ts
import { supabase } from '@/integrations/supabase/client'

interface ProjectTemplate {
  files: Record<string, string>
  version: string
  shadcnVersion: string
}

// Cache template in memory after first load
let cachedTemplate: ProjectTemplate | null = null

export async function loadProjectTemplate(): Promise<ProjectTemplate> {
  if (cachedTemplate) return cachedTemplate

  // Load from Supabase Storage (or bundled fallback)
  const { data, error } = await supabase
    .storage
    .from('templates')
    .download('nextjs-shadcn-template.json')

  if (error) {
    // Fallback to bundled minimal template
    console.warn('Using bundled template fallback')
    return BUNDLED_TEMPLATE
  }

  const template = JSON.parse(await data.text())
  cachedTemplate = template
  return template
}

// Minimal bundled template for offline/fallback
const BUNDLED_TEMPLATE: ProjectTemplate = {
  version: '1.0.0',
  shadcnVersion: '2.0.0',
  files: {
    'package.json': `{
  "name": "vana-export",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "tailwind-merge": "^2.5.0",
    "tailwindcss": "^4.0.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}`,
    // ... all other template files
  }
}
```

**Step 2: shadcn/ui Component Library**

Pre-generate all 48 shadcn/ui components and store them:

```typescript
// scripts/generate-shadcn-template.ts
// Run this script to update the template when shadcn updates
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const SHADCN_COMPONENTS = [
  'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar',
  'badge', 'breadcrumb', 'button', 'calendar', 'card', 'carousel',
  'chart', 'checkbox', 'collapsible', 'command', 'context-menu',
  'dialog', 'drawer', 'dropdown-menu', 'form', 'hover-card', 'input',
  'input-otp', 'label', 'menubar', 'navigation-menu', 'pagination',
  'popover', 'progress', 'radio-group', 'resizable', 'scroll-area',
  'select', 'separator', 'sheet', 'sidebar', 'skeleton', 'slider',
  'sonner', 'switch', 'table', 'tabs', 'textarea', 'toast', 'toaster',
  'toggle', 'toggle-group', 'tooltip'
]

async function generateTemplate() {
  // Create temp directory
  const tempDir = '/tmp/shadcn-template'
  fs.mkdirSync(tempDir, { recursive: true })

  // Init Next.js project
  execSync(`npx create-next-app@latest ${tempDir} --typescript --tailwind --eslint --app --src-dir --no-git`, {
    stdio: 'inherit'
  })

  // Init shadcn
  execSync(`cd ${tempDir} && npx shadcn@latest init -y`, { stdio: 'inherit' })

  // Add all components
  for (const component of SHADCN_COMPONENTS) {
    console.log(`Adding ${component}...`)
    execSync(`cd ${tempDir} && npx shadcn@latest add ${component} -y`, {
      stdio: 'inherit'
    })
  }

  // Read all files and create template JSON
  const template = {
    version: new Date().toISOString(),
    shadcnVersion: '2.0.0',
    files: readDirectoryRecursive(tempDir)
  }

  // Save template
  fs.writeFileSync(
    'templates/nextjs-shadcn-template.json',
    JSON.stringify(template, null, 2)
  )

  console.log('Template generated!')
}

function readDirectoryRecursive(dir: string, base = ''): Record<string, string> {
  const files: Record<string, string> = {}

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.join(base, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      Object.assign(files, readDirectoryRecursive(fullPath, relativePath))
    } else {
      files[relativePath] = fs.readFileSync(fullPath, 'utf-8')
    }
  }

  return files
}
```

**Step 3: Artifact Code Transformer**

Transform artifact code into proper Next.js page format:

```typescript
// lib/project-export/transformer.ts

interface TransformResult {
  pageCode: string
  apiRoutes: Record<string, string>
  additionalFiles: Record<string, string>
}

export function transformArtifactCode(artifactCode: string): TransformResult {
  const result: TransformResult = {
    pageCode: '',
    apiRoutes: {},
    additionalFiles: {}
  }

  // 1. Wrap in 'use client' directive if needed
  const needsClientDirective = detectClientFeatures(artifactCode)

  // 2. Transform imports from Radix to shadcn paths
  let transformedCode = artifactCode
    // Convert direct Radix imports to shadcn
    .replace(
      /import \* as (\w+) from ['"]@radix-ui\/react-(\w+)['"]/g,
      "import { $2 } from '@/components/ui/$2'"
    )
    // Already using shadcn paths - keep as is
    .replace(
      /from ['"]@\/components\/ui\/(\w+)['"]/g,
      "from '@/components/ui/$1'"
    )

  // 3. Extract inline API route definitions (if any)
  const apiRouteMatches = transformedCode.matchAll(
    /\/\/ @api-route: ([\w\/]+)\n([\s\S]*?)\/\/ @end-api-route/g
  )

  for (const match of apiRouteMatches) {
    const routePath = match[1] // e.g., "/api/weather"
    const routeCode = match[2]
    result.apiRoutes[`src/app${routePath}/route.ts`] = routeCode
    // Remove from main code
    transformedCode = transformedCode.replace(match[0], '')
  }

  // 4. Detect fetch calls and generate mock API routes
  const fetchCalls = detectFetchCalls(transformedCode)
  for (const fetchCall of fetchCalls) {
    if (fetchCall.url.startsWith('/api/') && !result.apiRoutes[fetchCall.url]) {
      result.apiRoutes[`src/app${fetchCall.url}/route.ts`] = generateMockRoute(fetchCall)
    }
  }

  // 5. Assemble final page code
  result.pageCode = `
${needsClientDirective ? "'use client'\n" : ''}
${transformedCode}
  `.trim()

  return result
}

function detectClientFeatures(code: string): boolean {
  const clientFeatures = [
    'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo',
    'onClick', 'onChange', 'onSubmit', 'addEventListener'
  ]
  return clientFeatures.some(feature => code.includes(feature))
}

function detectFetchCalls(code: string): Array<{ url: string; method: string }> {
  const calls: Array<{ url: string; method: string }> = []
  const fetchRegex = /fetch\(['"]([^'"]+)['"]/g

  let match
  while ((match = fetchRegex.exec(code)) !== null) {
    calls.push({ url: match[1], method: 'GET' })
  }

  return calls
}

function generateMockRoute(fetchCall: { url: string; method: string }): string {
  return `
import { NextResponse } from 'next/server'

// TODO: Implement this API route
// This was auto-generated because the artifact makes a request to ${fetchCall.url}

export async function ${fetchCall.method}() {
  return NextResponse.json({
    message: 'Replace this with your actual API logic',
    endpoint: '${fetchCall.url}'
  })
}
  `.trim()
}
```

**Step 4: Project Generator Service**

```typescript
// lib/project-export/generator.ts
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { loadProjectTemplate } from '../project-template'
import { transformArtifactCode } from './transformer'

const MAX_PROJECT_SIZE = 50 * 1024 * 1024 // 50MB

interface GenerateOptions {
  artifactCode: string
  projectName?: string
  includeReadme?: boolean
}

export async function generateAndDownloadProject(options: GenerateOptions): Promise<void> {
  const { artifactCode, projectName = 'vana-project', includeReadme = true } = options

  try {
    toast.loading('Generating project...', { id: 'project-export' })

    // 1. Load base template
    const template = await loadProjectTemplate()

    // 2. Transform artifact code
    const transformed = transformArtifactCode(artifactCode)

    // 3. Merge template with transformed code
    const projectFiles: Record<string, string> = {
      ...template.files,
      'src/app/page.tsx': transformed.pageCode,
      ...transformed.apiRoutes,
      ...transformed.additionalFiles
    }

    // 4. Add README if requested
    if (includeReadme) {
      projectFiles['README.md'] = generateReadme(projectName)
    }

    // 5. Update package.json with project name
    const packageJson = JSON.parse(projectFiles['package.json'])
    packageJson.name = projectName.toLowerCase().replace(/\s+/g, '-')
    projectFiles['package.json'] = JSON.stringify(packageJson, null, 2)

    // 6. Validate total size
    const totalSize = Object.values(projectFiles).reduce(
      (acc, content) => acc + new Blob([content]).size,
      0
    )

    if (totalSize > MAX_PROJECT_SIZE) {
      throw new Error(`Project too large (${(totalSize / 1024 / 1024).toFixed(1)}MB)`)
    }

    // 7. Generate ZIP
    const zip = new JSZip()

    for (const [path, content] of Object.entries(projectFiles)) {
      zip.file(path, content)
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // 8. Download
    saveAs(blob, `${projectName}.zip`)

    toast.success('Project downloaded!', { id: 'project-export' })

  } catch (error) {
    console.error('Project generation failed:', error)
    toast.error(
      error instanceof Error ? error.message : 'Failed to generate project',
      { id: 'project-export' }
    )
    throw error
  }
}

function generateReadme(projectName: string): string {
  return `
# ${projectName}

This project was generated by [Vana](https://vana.dev) - AI-powered code generation.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## Project Structure

\`\`\`
src/
├── app/
│   ├── page.tsx      # Main page (AI-generated)
│   ├── layout.tsx    # Root layout
│   └── api/          # API routes
├── components/
│   └── ui/           # shadcn/ui components
└── lib/
    └── utils.ts      # Utility functions
\`\`\`

## Technologies

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Radix UI** - Accessible primitives

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

Generated with ❤️ by [Vana](https://vana.dev)
  `.trim()
}
```

**Step 5: Export UI Components**

```tsx
// components/artifact/ExportActions.tsx
'use client'

import { useState } from 'react'
import { Download, Rocket, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { generateAndDownloadProject } from '@/lib/project-export/generator'
import { deployToVercel } from '@/lib/project-export/deploy'

interface Props {
  artifactCode: string
  artifactTitle?: string
}

export function ExportActions({ artifactCode, artifactTitle }: Props) {
  const [isExporting, setIsExporting] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsExporting(true)
    try {
      await generateAndDownloadProject({
        artifactCode,
        projectName: artifactTitle || 'vana-artifact'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      const result = await deployToVercel({
        artifactCode,
        projectName: artifactTitle || 'vana-artifact'
      })
      setDeployedUrl(result.url)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Download Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download
      </Button>

      {/* Deploy Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            disabled={isDeploying}
          >
            {isDeploying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Deploy
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDeploy}>
            <img src="/vercel.svg" className="h-4 w-4 mr-2" alt="" />
            Deploy to Vercel
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <img src="/netlify.svg" className="h-4 w-4 mr-2" alt="" />
            Deploy to Netlify (coming soon)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <img src="/cloudflare.svg" className="h-4 w-4 mr-2" alt="" />
            Deploy to Cloudflare Pages (coming soon)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Show deployed URL */}
      {deployedUrl && (
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <a href={deployedUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Site
          </a>
        </Button>
      )}
    </div>
  )
}
```

**Step 6: MSW Integration for Preview API Mocking**

```typescript
// lib/preview/msw-setup.ts
import { setupWorker } from 'msw/browser'
import { http, HttpResponse } from 'msw'

// Handlers for API route simulation in preview
const handlers = [
  // Catch-all for /api/* routes
  http.all('/api/*', ({ request }) => {
    const url = new URL(request.url)

    return HttpResponse.json({
      _preview: true,
      _message: 'This is a simulated API response',
      _hint: 'Download the project to implement real API logic',
      endpoint: url.pathname,
      method: request.method,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'X-Preview-Mode': 'true'
      }
    })
  })
]

export const mswWorker = setupWorker(...handlers)

export async function startMSW() {
  if (typeof window === 'undefined') return

  await mswWorker.start({
    onUnhandledRequest: 'bypass',
    quiet: true
  })

  console.log('[MSW] Mock Service Worker started for preview')
}
```

**Pros**:
- **Minimal infrastructure changes** (mostly client-side)
- **Fast preview** (current system + enhancements)
- **Full project export** (real Next.js, works anywhere)
- **Deploy integration** (Vercel, Netlify APIs)
- **Incremental implementation** (can ship in phases)

**Cons**:
- **Preview != Production** (mock APIs vs real APIs)
- **User education needed** ("download to test API routes")
- **Two mental models** (preview vs deployed)

**Cost Estimate**:
- Development: ~2-3 weeks
- Infrastructure: ~$50/month (Supabase Storage for templates)

**Verdict**: Most pragmatic option. Ships value quickly with clear upgrade path.

---

## Recommendation

### Recommended Approach: Option C First, Then Option B

**Phase 1 (~3 weeks)**: Implement Option C (Hybrid)
- Add "Download Project" button
- Create project template with all shadcn/ui components
- Add MSW for API simulation in preview
- Integrate Vercel deployment API

**Phase 2 (~5 weeks)**: Implement Option B (WebContainers)
- Integrate StackBlitz WebContainer API
- Full Next.js preview in browser
- API routes functional in preview
- Database simulation with IndexedDB

**Total Timeline**: ~8 weeks for full implementation

**Why This Order**:
1. Option C delivers value immediately (download, deploy)
2. Option C validates user demand before heavy investment
3. Option B can be added as "Enhanced Preview" toggle
4. Users who need full preview can use WebContainers
5. Users who want fast iteration keep current system

### Decision Matrix

Weighted scoring to help stakeholders compare options:

| Factor | Weight | Option A (Server) | Option B (WebContainers) | Option C (Hybrid) |
|--------|--------|-------------------|--------------------------|-------------------|
| **Infrastructure Cost** | 25% | 2/10 | 10/10 | 9/10 |
| **Time to Ship** | 20% | 3/10 | 5/10 | 9/10 |
| **Feature Parity with Z.ai** | 20% | 10/10 | 8/10 | 6/10 |
| **Operational Complexity** | 15% | 2/10 | 8/10 | 9/10 |
| **User Experience** | 10% | 9/10 | 7/10 | 6/10 |
| **Maintainability** | 10% | 4/10 | 7/10 | 9/10 |
| **Weighted Score** | 100% | **4.55** | **7.65** | **8.05** |

**Interpretation**:
- **Option C scores highest** due to low cost, fast delivery, and simplicity
- **Option B is close second** with zero infrastructure cost offsetting longer dev time
- **Option A** only makes sense at massive scale with dedicated DevOps team

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WebContainers browser support | Fallback to current preview + download |
| Template maintenance burden | Automate shadcn/ui updates via CLI |
| Vercel API changes | Abstract deployment behind interface |
| User confusion (preview vs real) | Clear UI indicators, documentation |

---

## Implementation Roadmap

### Phase 1: Project Export (Weeks 1-3)

```
Week 1:
├── Create Next.js project template
│   ├── package.json with all dependencies
│   ├── All 48 shadcn/ui components
│   ├── Tailwind config with animations
│   └── TypeScript + path aliases
├── Implement ZIP generation
└── Add "Download Project" button to artifact UI

Week 2:
├── Code transformation layer
│   ├── Extract page component from artifact
│   ├── Generate API routes from fetch calls
│   └── Handle imports transformation
├── MSW integration for preview
└── IndexedDB mock for database previews

Week 3:
├── Vercel deployment integration
│   ├── OAuth flow for Vercel connection
│   ├── One-click deploy button
│   └── Deployment status tracking
├── Testing and polish
└── Documentation
```

### Phase 2: WebContainers (Weeks 4-8)

```
Week 4-5:
├── WebContainer API integration
├── COOP/COEP headers configuration
├── Project loading into WebContainer
└── Basic Next.js boot

Week 6-7:
├── File system synchronization
├── Terminal output display
├── Hot reload support
└── Memory optimization

Week 8:
├── Feature flagging (opt-in)
├── Performance benchmarking
├── Browser compatibility testing
└── Launch to beta users
```

### Rollback Strategy

If WebContainers (Phase 2) fails in production or shows critical issues:

**Immediate Rollback (< 1 hour)**:
1. Disable feature flag `ENABLE_WEBCONTAINERS`
2. All users automatically fall back to Phase 1 (Hybrid) preview
3. "Download Project" remains fully functional
4. No data loss - WebContainers are stateless

**Detection Triggers**:
- Error rate > 5% for WebContainer boot
- Average boot time > 30 seconds
- Memory usage causing browser crashes
- User complaints > threshold

**Rollback Code**:
```typescript
// Feature flag check with automatic fallback
function getPreviewMode(): 'webcontainer' | 'hybrid' {
  const isSupported = typeof SharedArrayBuffer !== 'undefined'
    && window.crossOriginIsolated

  const featureEnabled = import.meta.env.VITE_ENABLE_WEBCONTAINERS === 'true'

  if (!isSupported || !featureEnabled) {
    return 'hybrid' // Automatic fallback
  }

  return 'webcontainer'
}
```

**Communication Plan**:
- In-app toast: "Enhanced preview temporarily unavailable. Using standard preview."
- No user action required
- Status page update if extended outage

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Download adoption | 20% of artifact users | Analytics |
| Deploy success rate | 90%+ | Vercel API logs |
| WebContainer boot time | < 15 seconds | Performance monitoring |
| User satisfaction | 4.5+ stars | In-app feedback |

---

## Appendix

### A. Z.ai SDK Functions

Based on code analysis, their SDK provides:

```typescript
interface ZAI {
  functions: {
    invoke(name: string, params: object): Promise<any>
  }
}

// Known functions:
// - "web_search" - General web search
// - (likely more: image generation, code execution, etc.)
```

### B. shadcn/ui Components in Template

Full list of 48 components to include:

```
accordion, alert, alert-dialog, aspect-ratio, avatar, badge,
breadcrumb, button, calendar, card, carousel, chart, checkbox,
collapsible, command, context-menu, dialog, drawer, dropdown-menu,
form, hover-card, input, input-otp, label, menubar, navigation-menu,
pagination, popover, progress, radio-group, resizable, scroll-area,
select, separator, sheet, sidebar, skeleton, slider, sonner, switch,
table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip
```

### C. Required Dependencies

```json
{
  "dependencies": {
    "@radix-ui/react-*": "latest",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-table": "^8.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "cmdk": "^1.x",
    "date-fns": "^4.x",
    "framer-motion": "^12.x",
    "lucide-react": "^0.x",
    "next": "15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-hook-form": "^7.x",
    "recharts": "^2.x",
    "tailwind-merge": "^3.x",
    "tailwindcss-animate": "^1.x",
    "zod": "^4.x",
    "zustand": "^5.x"
  }
}
```

### D. References

- [StackBlitz WebContainers](https://webcontainers.io/)
- [Vercel Deployments API](https://vercel.com/docs/rest-api/endpoints#deployments)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Z.ai Platform](https://chat.z.ai)
