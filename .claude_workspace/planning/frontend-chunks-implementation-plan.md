# Vana Frontend Chunks Implementation Plan
## Strict Validation Framework with Claude Flow Swarm Orchestration

**Version:** 1.0  
**Date:** 2025-08-12  
**Status:** Implementation Ready  
**Critical:** Each chunk MUST be 100% validated before proceeding

---

## 🚨 CRITICAL VALIDATION RULES

### Validation Gates (MANDATORY)
1. **Functional Tests**: Component renders, behaviors work
2. **Integration Tests**: Connects to other components correctly  
3. **Visual Tests**: Matches UI inspiration (Google Gemini style)
4. **E2E Tests**: Real browser validation, not just curl responses
5. **Performance Tests**: Meets response time requirements

### Failure Protocol
- **5 Attempts Maximum** per chunk
- Each attempt must include: Testing → Troubleshooting → Peer Review → Research
- After 5 failures: ESCALATE to supervisor with documented blockers
- **NO WORKAROUNDS** - Fix root causes only

---

## 📋 Chunk Extraction & Validation Framework

### CHUNK 1: Project Context & Foundations
**PRD Sections:** Lines 1-196 (Executive Summary → Architecture Overview)  
**Lead Agent:** system-architect  
**Support Agents:** reviewer, tester

#### Instruction Template
```typescript
/**
 * CHUNK 1: Project Foundation
 * 
 * THINK HARD: This is the foundation - every decision impacts all future chunks.
 * Your implementation MUST match these exact specifications.
 * 
 * MANDATORY TECHNOLOGIES:
 * - Next.js 14+ with App Router (NOT Pages Router)
 * - shadcn/ui components (NOT Material-UI, NOT Ant Design)
 * - Zustand for state (NOT Redux, NOT Context API alone)
 * - Tailwind CSS (NOT styled-components, NOT CSS modules)
 * 
 * FOLDER STRUCTURE (EXACT):
 * /app - Next.js App Router
 * /components/ui - shadcn/ui components
 * /stores - Zustand stores
 * /lib - Utilities and API clients
 * 
 * DO NOT:
 * - Add any packages not listed in PRD
 * - Change folder names or structure
 * - Create alternative architectures
 * 
 * DELIVERABLES:
 * 1. package.json with EXACT dependencies from PRD
 * 2. Folder structure matching PRD exactly
 * 3. tsconfig.json with strict mode enabled
 * 4. tailwind.config.ts with dark theme primary
 * 5. next.config.js with proper settings
 */
```

#### Validation Criteria
```javascript
// Chunk 1 Validation Tests
describe('Chunk 1: Foundation Validation', () => {
  test('Package.json contains exact dependencies', async () => {
    const pkg = require('./package.json')
    expect(pkg.dependencies['next']).toMatch(/^14\./)
    expect(pkg.dependencies['@radix-ui/react-dialog']).toBeDefined()
    expect(pkg.dependencies['zustand']).toBeDefined()
    expect(pkg.dependencies['redux']).toBeUndefined() // Should NOT exist
  })

  test('Folder structure matches PRD exactly', () => {
    expect(fs.existsSync('./app')).toBe(true)
    expect(fs.existsSync('./components/ui')).toBe(true)
    expect(fs.existsSync('./stores')).toBe(true)
    expect(fs.existsSync('./lib')).toBe(true)
    expect(fs.existsSync('./pages')).toBe(false) // Should NOT exist
  })

  test('Next.js dev server starts successfully', async () => {
    const server = spawn('npm', ['run', 'dev'])
    await waitFor(5000)
    const response = await fetch('http://localhost:3000')
    expect(response.status).toBe(200)
    server.kill()
  })

  test('Tailwind dark theme is configured', () => {
    const config = require('./tailwind.config.ts')
    expect(config.darkMode).toBe('class')
    expect(config.theme.extend.colors).toBeDefined()
  })
})
```

---

### CHUNK 2: Homepage & Chat Flow
**PRD Sections:** Lines 200-268 (Core User Flows + Homepage)  
**Lead Agent:** frontend-api-specialist  
**Support Agents:** coder, tester

#### Instruction Template
```typescript
/**
 * CHUNK 2: Homepage Implementation
 * 
 * THINK HARD: The homepage is the first impression. It MUST match Google Gemini's
 * design pattern with our Vana branding.
 * 
 * UI INSPIRATION:
 * - Look at /docs/UI Inspiration folder for design references
 * - Homepage should have centered chat input like Google Gemini
 * - Suggested prompts below the input
 * - Clean, minimal dark theme
 * 
 * EXACT COMPONENTS TO USE:
 * - shadcn/ui Card for prompt suggestions
 * - shadcn/ui Input for chat input
 * - shadcn/ui Button for submit
 * - Framer Motion for animations (fade-in)
 * 
 * HOMEPAGE STATE (from PRD):
 * interface HomepageState {
 *   greeting: "Hi, I'm Vana"
 *   suggestions: PromptSuggestion[]
 *   tools: ToolOption[]
 *   recentSessions: Session[]
 * }
 * 
 * ROUTING:
 * - Submit prompt → Create session → Navigate to /chat?session={id}
 * - NO DIRECT API CALLS - Just navigation
 * 
 * DO NOT:
 * - Build backend logic
 * - Add authentication checks (comes in Chunk 3)
 * - Create custom UI components (use shadcn/ui only)
 */
```

#### Validation Criteria
```javascript
// Chunk 2 Validation Tests
describe('Chunk 2: Homepage Validation', () => {
  test('Homepage renders with correct elements', async () => {
    const { page } = await launchPlaywright('http://localhost:3000')
    
    // Check greeting
    const greeting = await page.textContent('h1')
    expect(greeting).toBe("Hi, I'm Vana")
    
    // Check chat input exists
    const input = await page.$('input[placeholder*="Ask"]')
    expect(input).toBeTruthy()
    
    // Check suggestions exist
    const suggestions = await page.$$('.suggestion-card')
    expect(suggestions.length).toBeGreaterThan(0)
  })

  test('Navigation to chat works correctly', async () => {
    const { page } = await launchPlaywright('http://localhost:3000')
    
    // Type and submit
    await page.fill('input', 'Test prompt')
    await page.press('input', 'Enter')
    
    // Check navigation
    await page.waitForNavigation()
    const url = page.url()
    expect(url).toContain('/chat?session=')
  })

  test('Visual similarity to Google Gemini', async () => {
    const { page } = await launchPlaywright('http://localhost:3000')
    
    // Take screenshot
    await page.screenshot({ path: '.claude_workspace/screenshots/homepage.png' })
    
    // Check dark theme
    const bgColor = await page.evaluate(() => 
      getComputedStyle(document.body).backgroundColor
    )
    expect(bgColor).toContain('rgb(') // Dark color
    
    // Check centered layout
    const inputBox = await page.$('input')
    const box = await inputBox.boundingBox()
    const viewport = page.viewportSize()
    const centerX = viewport.width / 2
    expect(Math.abs(box.x + box.width/2 - centerX)).toBeLessThan(50)
  })
})
```

---

### CHUNK 3: Authentication System
**PRD Sections:** Lines 271-299 (Authentication)  
**Lead Agent:** backend-dev  
**Support Agents:** security-manager, tester

#### Instruction Template
```typescript
/**
 * CHUNK 3: Authentication Implementation
 * 
 * THINK HARD: Security is critical. No shortcuts, no workarounds.
 * 
 * BACKEND REALITY:
 * - JWT-based auth (NOT Firebase Auth directly)
 * - Google OAuth via /auth/google endpoint
 * - Tokens stored in Zustand (NOT localStorage directly)
 * 
 * EXACT FLOW:
 * 1. Google Sign-In button clicked
 * 2. Get ID token from Google
 * 3. POST to /auth/google with ID token
 * 4. Receive JWT access_token and refresh_token
 * 5. Store in authStore (Zustand)
 * 6. Start refresh timer
 * 
 * COMPONENTS:
 * - shadcn/ui Button for Google Sign-In
 * - shadcn/ui Card for auth form
 * - No custom auth UI
 * 
 * DO NOT:
 * - Use Firebase Auth SDK
 * - Create custom OAuth flow
 * - Store tokens in localStorage directly
 * - Skip token refresh logic
 */
```

#### Validation Criteria
```javascript
// Chunk 3 Validation Tests
describe('Chunk 3: Authentication Validation', () => {
  test('Google Sign-In button exists and works', async () => {
    const { page } = await launchPlaywright('http://localhost:3000/auth')
    
    const googleBtn = await page.$('button:has-text("Sign in with Google")')
    expect(googleBtn).toBeTruthy()
    
    // Mock Google OAuth response
    await page.route('**/auth/google', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          access_token: 'mock-jwt',
          refresh_token: 'mock-refresh'
        })
      })
    })
    
    await googleBtn.click()
    // Should redirect after auth
    await page.waitForNavigation()
    expect(page.url()).toContain('/chat')
  })

  test('Tokens stored in Zustand correctly', async () => {
    const authStore = require('./stores/authStore').useAuthStore.getState()
    
    // Simulate login
    await authStore.setTokens('test-access', 'test-refresh')
    
    const state = authStore.getState()
    expect(state.accessToken).toBe('test-access')
    expect(state.refreshToken).toBe('test-refresh')
    expect(state.isAuthenticated).toBe(true)
  })

  test('Token refresh timer works', async () => {
    jest.useFakeTimers()
    const { startTokenRefresh } = require('./lib/auth/token-refresh')
    
    const refreshSpy = jest.spyOn(global, 'fetch')
    startTokenRefresh()
    
    // Fast-forward 30 minutes
    jest.advanceTimersByTime(30 * 60 * 1000)
    
    expect(refreshSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.any(Object)
    )
  })
})
```

---

### CHUNK 4: SSE Connection Layer
**PRD Sections:** Lines 420-520 (SSE implementation details)  
**Lead Agent:** backend-dev  
**Support Agents:** reviewer, tester

#### Instruction Template
```typescript
/**
 * CHUNK 4: SSE Connection Implementation
 * 
 * THINK HARD: This is the real-time communication backbone. Zero tolerance for errors.
 * 
 * EXACT ENDPOINT: /agent_network_sse/{sessionId}
 * 
 * EVENT TYPES (DO NOT CHANGE):
 * - agent_message: Full message from agent
 * - message_token: Streaming token
 * - research_sources: Research results with confidence
 * - task_updates: Agent task progress
 * - error: Error events
 * 
 * RECONNECTION STRATEGY:
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
 * - Max 5 reconnection attempts
 * - Clear error reporting
 * 
 * ERROR HANDLING:
 * - Network errors → Reconnect
 * - 401/403 → Refresh token first, then reconnect
 * - 500 errors → Show error to user
 * 
 * DO NOT:
 * - Change endpoint path
 * - Modify event names
 * - Skip reconnection logic
 * - Use polling instead of SSE
 */
```

#### Validation Criteria
```javascript
// Chunk 4 Validation Tests  
describe('Chunk 4: SSE Connection Validation', () => {
  test('SSE connects to correct endpoint', async () => {
    const mockServer = createMockSSEServer()
    const connection = new SSEConnection('test-session-id')
    
    await connection.connect()
    
    expect(mockServer.lastConnection).toBe('/agent_network_sse/test-session-id')
    expect(connection.readyState).toBe(EventSource.OPEN)
  })

  test('Handles all event types correctly', async () => {
    const connection = new SSEConnection('test-session-id')
    const handlers = {
      agent_message: jest.fn(),
      message_token: jest.fn(),
      research_sources: jest.fn(),
      task_updates: jest.fn()
    }
    
    connection.on('agent_message', handlers.agent_message)
    connection.on('message_token', handlers.message_token)
    
    // Simulate events
    connection.simulateEvent('agent_message', { content: 'Test' })
    connection.simulateEvent('message_token', { token: 'Hello' })
    
    expect(handlers.agent_message).toHaveBeenCalledWith({ content: 'Test' })
    expect(handlers.message_token).toHaveBeenCalledWith({ token: 'Hello' })
  })

  test('Reconnection with exponential backoff', async () => {
    const connection = new SSEConnection('test-session-id')
    const delays = []
    
    connection.onReconnect = (delay) => delays.push(delay)
    
    // Simulate disconnections
    for (let i = 0; i < 5; i++) {
      await connection.simulateDisconnect()
      await connection.waitForReconnect()
    }
    
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000])
  })

  test('Real browser SSE connection', async () => {
    const { page } = await launchPlaywright('http://localhost:3000/chat?session=test')
    
    // Check SSE connection established
    const sseConnected = await page.evaluate(() => {
      return window.__sseConnection?.readyState === EventSource.OPEN
    })
    
    expect(sseConnected).toBe(true)
  })
})
```

---

### CHUNK 5: Chat Rendering
**PRD Sections:** Lines 600-750 (Chat Interface)  
**Lead Agent:** frontend-api-specialist  
**Support Agents:** coder, tester

#### Instruction Template
```typescript
/**
 * CHUNK 5: Chat Interface Implementation
 * 
 * THINK HARD: This is where users interact. Must be smooth, responsive, and accurate.
 * 
 * MESSAGE RENDERING:
 * - User messages: Right-aligned, blue background
 * - Agent messages: Left-aligned, dark background
 * - Streaming tokens: Append in real-time
 * - Code blocks: Syntax highlighting with "Open in Canvas" button
 * 
 * RESEARCH SOURCES:
 * - Display below agent message
 * - Show confidence scores
 * - Clickable links
 * - Citation numbers [1], [2], etc.
 * 
 * COMPONENTS (EXACT):
 * - components/chat/MessageList.tsx
 * - components/chat/MessageInput.tsx
 * - components/chat/AgentMessage.tsx
 * - components/chat/ResearchSources.tsx
 * 
 * CANVAS INTEGRATION:
 * - Code blocks get "Open in Canvas" button
 * - Button calls: canvasStore.open('code', content)
 * 
 * DO NOT:
 * - Create custom message components
 * - Skip streaming implementation
 * - Forget Canvas integration
 * - Add unnecessary animations
 */
```

---

### CHUNK 6: Progressive Canvas System
**PRD Sections:** Lines 800-950 (Canvas System)  
**Lead Agent:** frontend-api-specialist  
**Support Agents:** coder, system-architect

#### Instruction Template
```typescript
/**
 * CHUNK 6: Canvas Implementation
 * 
 * THINK HARD: Canvas is the differentiator. Must work offline-first, enhance with backend.
 * 
 * PROGRESSIVE ENHANCEMENT:
 * 1. Works immediately in browser (localStorage)
 * 2. Syncs with backend when available
 * 3. Never blocks on backend calls
 * 
 * FOUR MODES:
 * - Markdown: react-markdown with remark-gfm
 * - Code: Monaco Editor with syntax highlighting
 * - Web: iframe with sandbox
 * - Sandbox: Code execution environment
 * 
 * CANVAS STORE:
 * interface CanvasState {
 *   isOpen: boolean
 *   mode: 'markdown' | 'code' | 'web' | 'sandbox'
 *   content: string
 *   versions: CanvasVersion[]
 *   activeVersion: number
 * }
 * 
 * COMPONENTS:
 * - components/canvas/CanvasEditor.tsx
 * - components/canvas/CanvasToolbar.tsx
 * - components/canvas/CanvasVersions.tsx
 * 
 * DO NOT:
 * - Make Canvas dependent on backend
 * - Skip version history
 * - Forget mode switching
 * - Add database dependencies
 */
```

---

## 🚀 Swarm Orchestration Commands

### Phase 1: Foundation (Chunks 1-3)
```bash
# Initialize swarm with validation gates
npx claude-flow@alpha swarm init --topology hierarchical --agents 8

# Deploy Phase 1 agents in parallel
npx claude-flow@alpha agent spawn \
  --type system-architect \
  --task "Chunk 1: Project Foundation" \
  --validation-required true \
  --max-attempts 5

npx claude-flow@alpha agent spawn \
  --type frontend-api-specialist \
  --task "Chunk 2: Homepage Implementation" \
  --validation-required true \
  --max-attempts 5

npx claude-flow@alpha agent spawn \
  --type backend-dev \
  --task "Chunk 3: Authentication" \
  --validation-required true \
  --max-attempts 5

# Validation Gate
npx claude-flow@alpha swarm validate \
  --phase 1 \
  --require-all-pass true \
  --tests "./tests/chunks/phase1.test.js"
```

### Validation Gate Protocol
```javascript
// validation-gate.js
class ValidationGate {
  async validate(chunkId, attempts = 0) {
    if (attempts >= 5) {
      return this.escalateToSupervisor(chunkId)
    }

    const results = {
      functional: await this.runFunctionalTests(chunkId),
      integration: await this.runIntegrationTests(chunkId),
      visual: await this.runVisualTests(chunkId),
      e2e: await this.runE2ETests(chunkId),
      performance: await this.runPerformanceTests(chunkId)
    }

    if (Object.values(results).every(r => r.passed)) {
      return { status: 'PASSED', results }
    }

    // Debug and retry
    await this.debug(results)
    await this.peerReview(chunkId, results)
    await this.research(results.failures)
    
    return this.validate(chunkId, attempts + 1)
  }

  escalateToSupervisor(chunkId) {
    return {
      status: 'BLOCKED',
      chunkId,
      message: 'Escalating to supervisor after 5 failed attempts',
      blockers: this.documentBlockers(chunkId)
    }
  }
}
```

---

## 📊 Progress Tracking

### Dashboard Command
```bash
npx claude-flow@alpha swarm status --detailed

# Output:
# Phase 1: Foundation
# ├── Chunk 1: ✅ PASSED (3 attempts)
# ├── Chunk 2: 🔄 IN PROGRESS (attempt 2/5)
# └── Chunk 3: ⭕ PENDING
#
# Phase 2: Core Systems
# ├── Chunk 4: ⭕ BLOCKED (waiting for Phase 1)
# ...
```

### Blocker Documentation
```markdown
## Chunk 5 - BLOCKED
**Attempts:** 5/5
**Last Error:** SSE connection failing
**Root Cause:** Backend endpoint returns 404
**Attempted Solutions:**
1. Verified endpoint path - matches PRD
2. Checked backend logs - service not deployed
3. Tried mock server - works with mock
4. Researched alternatives - none viable

**Recommendation:** Human intervention needed to deploy backend service
```

---

## 🎯 Success Criteria

### Per-Chunk Requirements
- ✅ All tests pass (functional, integration, visual, E2E, performance)
- ✅ No console errors in browser
- ✅ Lighthouse score > 90
- ✅ Accessibility audit passes
- ✅ Code follows PRD specifications exactly
- ✅ No extra packages added
- ✅ UI matches inspiration images

### Overall Requirements
- All 17 chunks completed
- End-to-end flow works
- Performance targets met
- Security audit passed
- Deployment successful

---

## 🔴 CRITICAL REMINDERS

1. **NO WORKAROUNDS** - Fix root causes only
2. **NO PACKAGE BLOAT** - Use only PRD-specified packages
3. **THINK HARD** - Trigger extended reasoning
4. **VALIDATE PROPERLY** - Real tests, not superficial
5. **ESCALATE WHEN STUCK** - After 5 attempts, document and escalate
6. **FOLLOW UI INSPIRATION** - Match Google Gemini style
7. **TEST IN BROWSER** - Not just curl responses
8. **PROGRESSIVE ENHANCEMENT** - Frontend-first, backend-optional