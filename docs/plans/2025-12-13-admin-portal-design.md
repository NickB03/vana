# Admin Portal Design Document

> **Status**: Reviewed & Approved (with required changes)
> **Last Updated**: 2025-12-13
> **Review Status**: Peer-reviewed by Frontend, Backend, and Architect specialists

## Overview

A comprehensive admin dashboard for the Vana AI chat demo site, modeled after ChatGPT/Claude/Gemini admin interfaces. Provides traffic analytics, AI model performance metrics, test reports integration, and demo configuration controls.

## Design Goals

1. **Actionable Insights** — Surface metrics that help demo the product effectively
2. **Developer Tools** — Integrate Playwright test reports for quality visibility
3. **Demo Control** — Quick toggles to configure the demo experience
4. **System Monitoring** — Health checks for all AI providers and services

## Architecture

### File Structure

```
src/pages/admin/
├── AdminPortal.tsx          # Main layout with sidebar (SidebarProvider)
├── DashboardView.tsx        # KPIs + activity feed
├── ConversationsView.tsx    # Session analytics
├── ArtifactsView.tsx        # Component creation stats
├── AIModelsView.tsx         # Performance/latency/errors (no costs)
├── TestReportsView.tsx      # Playwright results integration
├── SystemHealthView.tsx     # Service status monitoring
└── SettingsView.tsx         # Demo toggles and feature flags

src/components/admin/        # Shared admin components
├── StatCard.tsx             # Reusable KPI card
├── AdminChart.tsx           # Chart wrapper with loading states
└── SettingToggle.tsx        # Standardized toggle row
```

### Sidebar Navigation

```
┌─────────────────────┐
│ 🤖 Vana Admin       │
│    Admin Portal     │
├─────────────────────┤
│ General             │
│ ├─ 📊 Dashboard     │
│ ├─ 💬 Conversations │
│ ├─ 🧩 Artifacts     │
│ └─ 🤖 AI Models     │
├─────────────────────┤
│ Development         │
│ ├─ 🧪 Test Reports  │
│ └─ 🏥 System Health │
├─────────────────────┤
│ Configuration       │
│ └─ ⚙️ Settings      │
├─────────────────────┤
│ ← Back to App       │
└─────────────────────┘
```

### Routing

**CRITICAL**: Routes must be added ABOVE the catch-all `*` in `App.tsx`:

```tsx
// App.tsx - Add BEFORE the catch-all route
<Route path="/admin" element={<AdminErrorBoundary><AdminPortal /></AdminErrorBoundary>} />
<Route path="*" element={<NotFound />} />  // Must remain LAST
```

---

## View Specifications

### 1. Dashboard View

**KPI Cards** (4 columns on desktop, 2 on tablet, 1 on mobile):
| Metric | Data Source | Query |
|--------|-------------|-------|
| Sessions (24h/7d/30d) | `chat_sessions` | `COUNT(*) WHERE created_at >= NOW() - INTERVAL` |
| Messages | `chat_messages` | `COUNT(*) WHERE created_at >= NOW() - INTERVAL` |
| Artifacts Created | `artifact_versions` | `COUNT(*) WHERE created_at >= NOW() - INTERVAL` |
| Active Now | `chat_sessions` | `COUNT(*) WHERE last_activity > NOW() - INTERVAL '5 minutes'` |

**Activity Feed**: Recent 10 conversations/artifacts with timestamp and preview.

**Refresh**: Polling every 30 seconds with "Last updated: Xs ago" indicator.

### 2. Conversations View

| Metric | Query |
|--------|-------|
| Total Sessions | `COUNT(*) FROM chat_sessions` |
| Avg Messages/Session | Computed via RPC function |
| Guest vs Auth | `user_id IS NULL` vs `IS NOT NULL` |
| Recent Sessions | `ORDER BY updated_at DESC LIMIT 50` |

### 3. Artifacts View

| Metric | Query |
|--------|-------|
| Total Created | `COUNT(*) FROM artifact_versions` |
| By Type | `GROUP BY artifact_type` (react, svg, mermaid, html) |
| Recent Artifacts | `ORDER BY created_at DESC LIMIT 50` |

**Deferred (v2)**: Bundle success rate (requires schema change).

### 4. AI Models View

| Metric | Data Source | Notes |
|--------|-------------|-------|
| Requests by Function | `ai_usage_logs.function_name` | chat, artifact, image, title, reasoning |
| Token Usage | `input_tokens`, `output_tokens` | Aggregate totals |
| Latency by Function | `latency_ms` | Average per function |
| Error Rates | `status_code >= 400` | Percentage calculation |

**Excluded**: Cost tracking (per requirements).

### 5. Test Reports View

**Data Source**: `public/test-data.json` (copied from `test-results/results.json` at build time)

**Display**:
- Summary: ✅ Passed / ❌ Failed / ⏭️ Skipped counts
- Test suites with expandable specs
- Failed test details with error messages
- Links to screenshots/videos (if available)
- "Open Full Report" button → `playwright-report/index.html`

**Build Script**:
```json
{
  "scripts": {
    "build:test-data": "cp test-results/results.json public/test-data.json 2>/dev/null || echo '{}' > public/test-data.json",
    "build": "npm run build:test-data && vite build"
  }
}
```

### 6. System Health View

**Services Monitored** (via `/health` Edge Function):
| Service | Check Method | Status |
|---------|--------------|--------|
| Database | `SELECT 1` query | 🟢 Connected / 🔴 Error |
| OpenRouter | HEAD request to `/models` | 🟢 Available / 🔴 Error |
| GLM (Z.ai) | HEAD request to API | 🟢 Available / 🔴 Error |
| Storage | List bucket contents | 🟢 Available / 🔴 Error |

**Display**: Service cards with status indicator, latency, and last check time.

### 7. Settings View

**Demo Experience Toggles** (localStorage):
| Toggle | Storage Key | Default |
|--------|-------------|---------|
| Landing Page | `vana-landing-page-enabled` | `true` |
| Force Tour | `vana-tour-force-mode` | `false` |
| Debug Mode | `vana-debug-mode` | `false` |

**Feature Flags** (from `featureFlags.ts`):
| Flag | Description |
|------|-------------|
| Context-Aware Placeholders | Dynamic input hints |
| Canvas Shadow Depth | Visual depth cues |

**Quick Actions**:
- Clear My Sessions
- Reset Rate Limits
- Export Analytics Data

---

## Required Changes (Pre-Implementation)

### Database Migration (Simplified for Low Traffic)

```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_admin_portal_support.sql

-- Add last_activity for "Active Now" tracking
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- Auto-update last_activity when messages are sent
CREATE OR REPLACE FUNCTION update_session_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET last_activity = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_session_activity ON chat_messages;
CREATE TRIGGER trg_update_session_activity
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_session_last_activity();
```

**Deferred to v2 (when traffic increases):**
- Database indexes on `created_at`, `last_activity`, `artifact_type`
- Batch RPC function `get_dashboard_stats()` for query optimization
- Materialized views for expensive aggregations

### Edge Function Updates

**1. Add GLM health check to `/health` endpoint:**

```typescript
// supabase/functions/health/index.ts - Add new function
async function checkGLM(): Promise<ServiceStatus> {
  try {
    const apiKey = Deno.env.get('GLM_API_KEY');
    if (!apiKey) return 'error';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
      method: 'HEAD',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 405 ? 'available' : 'error';
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error';
  }
}

// Update services object to include GLM
const [database, openrouter, glm, storage] = await Promise.all([
  checkDatabase(),
  checkOpenRouter(),
  checkGLM(),
  checkStorage()
]);
```

**2. Admin auth improvement** (TODO for v2):

Current: Hardcoded email check (`nick@vana.bot`)
Future: Add `is_admin` boolean to user metadata or create `admin_users` table

### Build Configuration

Add to `package.json`:

```json
{
  "scripts": {
    "build:test-data": "cp test-results/results.json public/test-data.json 2>/dev/null || echo '{\"suites\":[]}' > public/test-data.json",
    "build": "npm run build:test-data && vite build"
  }
}
```

---

## Technical Decisions

### Data Fetching Strategy

- **Primary**: TanStack Query with `admin-analytics` Edge Function
- **Pattern**: Batch queries via RPC functions to minimize round trips
- **Caching**: 60-second stale time for dashboard data
- **Real-time**: Polling (not Supabase Realtime due to RLS restrictions)

### State Management

- **Server state**: TanStack Query
- **Local toggles**: localStorage with React state sync
- **URL state**: Hash-based view switching (`/admin#conversations`)

### Error Handling

- Dedicated `<AdminErrorBoundary>` wrapping admin routes
- Toast notifications for API errors
- Graceful degradation (show partial data if some queries fail)

### Accessibility

- Skip links to main content
- ARIA landmarks for navigation
- Keyboard navigation support
- Focus management on view changes

---

## Implementation Phases

### Phase 0: Infrastructure (Required First)
- [ ] Database migration for `last_activity` column + trigger
- [ ] Add GLM check to health endpoint
- [ ] Add build script for test data

### Phase 1: Core Layout (Day 1)
- [ ] AdminPortal.tsx with sidebar navigation
- [ ] Route setup in App.tsx (ABOVE catch-all)
- [ ] AdminErrorBoundary component
- [ ] Basic navigation working

### Phase 2: Views (Days 2-3)
- [ ] DashboardView with KPIs and activity
- [ ] ConversationsView with session list
- [ ] ArtifactsView with type breakdown
- [ ] AIModelsView with performance metrics
- [ ] SystemHealthView with service status
- [ ] SettingsView with toggles

### Phase 3: Test Reports (Day 3)
- [ ] TestReportsView parsing JSON
- [ ] Test suite display with pass/fail
- [ ] Failed test details expansion
- [ ] Link to full HTML report

### Phase 4: Polish (Day 4)
- [ ] Mobile responsive testing
- [ ] Accessibility audit
- [ ] Loading states and skeletons
- [ ] "Last updated" indicator

---

## Deferred to v2

1. **Database indexes** — Add when query performance degrades
2. **Batch RPC function** — `get_dashboard_stats()` for query optimization
3. **Bundle success rate tracking** — Requires `bundle_status` column
4. **Admin audit logging** — Create `admin_audit_log` table
5. **Scalable admin auth** — Replace hardcoded email with role-based
6. **Real-time updates** — Consider WebSocket for live "Active Now"
7. **Export functionality** — CSV/JSON export of analytics data

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2025-12-13 | Frontend Specialist | ✅ Approved | 4 critical, 4 warnings identified |
| 2025-12-13 | Backend Specialist | ✅ Approved | 4 critical, 5 warnings identified |
| 2025-12-13 | Architect Peer Review | ✅ Approved | Consolidated findings, added 4 new gaps |

**Final Verdict**: GO after Phase 0 completion
