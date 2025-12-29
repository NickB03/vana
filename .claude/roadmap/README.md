# Roadmap Documentation

This directory contains planning documents and implementation guides for Vana features at various stages of development.

## Overview

Roadmap files document planned features, architectural decisions, and implementation guides. Each file includes a status header indicating its current state.

## Status Definitions

- **✅ Implemented**: Feature is live in production with full implementation
- **🚧 In Progress**: Feature is actively being developed
- **📋 Planned**: Feature is documented but not yet started
- **⚠️ Deprecated**: Feature was planned but has been superseded or abandoned

## Current Roadmap Files

### ✅ Implemented Features

#### Canvas UI Redesign
**File**: `canvas-ui-redesign.md`

**Status**: ✅ Implemented (2025-12-28)

**Implementation**:
- PR #423 merged (commit: d9be0ad)
- Updated container styling with unified dark header design
- Compact toolbar with icon-based view toggles
- URL bar removed in favor of filename display
- Sharp corners and enhanced shadow styling

**Features**:
- Unified dark header container matching Claude's canvas design
- Icon-based Preview/Code toggle in header toolbar
- Compact header with `px-3 py-2` padding
- Sharp corners with `shadow-md` styling
- Clean toolbar with Copy, Refresh, and Close actions

**Key Components Modified**:
- `src/components/ai-elements/artifact.tsx` - Container styling
- `src/components/ArtifactRenderer.tsx` - URL bar removal
- `src/components/ArtifactContainer.tsx` - View toggle refactor
- `src/components/ArtifactToolbar.tsx` - Header-based view toggle icons

---

#### GLM Reasoning UI Guide
**File**: `claude_style_reasoning_guide/glm-reasoning-ui-guide.md`

**Status**: ✅ Implemented (2025-11-15)

**Implementation**:
- Frontend component: `src/components/ReasoningDisplay.tsx`
- Backend support: `supabase/functions/chat/` with GLM-4.6 reasoning mode
- Documentation: `docs/REASONING_UI_ARCHITECTURE.md`
- Tests: `src/components/__tests__/ReasoningDisplay*.test.tsx`

**Features**:
- Real-time reasoning display with GLM-4.6 native thinking mode
- Semantic status updates via ReasoningProvider
- Collapsible reasoning panels with shimmer effects
- Tool execution status tracking

**Related Documentation**:
- `CLAUDE.md` - See "Dual Status Update System" section
- `docs/REASONING_UI_ARCHITECTURE.md` - Full architecture documentation

---

### 📋 Planned Features

#### MCP UI Integration
**File**: `mcp-ui-integration.md`

**Status**: 📋 Planned

**Priority**: Low

**Summary**: Integrate MCP UI to render interactive widgets inline in chat messages, following the pattern established by reasoning and web search features.

**Implementation Status**: Not started. Requires `@mcp-ui/client` package installation and new SSE event types.

**Blockers**:
- Package not installed: `npm install @mcp-ui/client`
- No database migration for persisting MCP UI data
- No backend Edge Function implementation

**Key Files to Create**:
- `src/types/mcpUI.ts` - Type definitions and validation
- `src/components/MCPUIRenderer.tsx` - Render MCP UI resources
- `supabase/functions/_shared/mcp-ui-types.ts` - Server-side types
- `supabase/functions/chat/handlers/mcp-tools.ts` - MCP tool handler

---

#### Deep Research Feature
**File**: `DEEP_RESEARCH_IMPLEMENTATION_PLAN.md`

**Status**: 📋 Planned

**Priority**: High

**Summary**: Implement a comprehensive deep research experience using Z.ai MCP tools (Web Search Prime, Web Reader, Vision) and GLM-4.6 reasoning for multi-source research synthesis.

**Implementation Status**: Demo pages exist (`src/pages/DeepResearchDemo*.tsx`) but no backend Edge Function or database schema.

**Key Missing Components**:
- Backend Edge Function: `supabase/functions/generate-research/` (does not exist)
- Database schema: `research_data` column in `chat_messages` table
- Z.ai MCP client: `supabase/functions/_shared/zai-mcp-client.ts`
- Quota tracking: `zai_quota_tracking` table and RPC functions

**Cost Benefits**: Switching to Z.ai MCP saves ~$35/month at 500 research queries (4,000 free calls/month with Coding Max plan).

**Version**: v2.0 (updated 2025-12-01 to use Z.ai MCP instead of Tavily as primary backend)

---

#### Multi-Artifact Context
**File**: Not in .claude/roadmap/ (documented in `ROADMAP.md`)

**Status**: 🟡 Code Complete (Not Integrated)

**Priority**: Medium

**Summary**: Enable users to work with multiple artifacts simultaneously with tabbed interface, minimize/maximize controls, and artifact switching.

**Implementation Status**: Backend infrastructure **fully implemented** since November 2024 (commit `476e11a`), but **never integrated into UI**. Zero production usage.

**Already Built** (312 lines, production-ready):
- `src/contexts/MultiArtifactContext.tsx` (231 lines) - LRU eviction, sessionStorage persistence
- `src/contexts/MultiArtifactContextDef.ts` (69 lines) - TypeScript interfaces
- `src/hooks/use-multi-artifact.ts` (15 lines) - Consumer hook
- Features: 5-artifact limit, duplicate detection, corruption handling

**Integration Required** (2-3 hours):
1. Wrap app with `<MultiArtifactProvider>` in App.tsx
2. Add artifact tabs/switcher UI to ArtifactContainer header
3. Add minimize/maximize controls
4. Test multiple artifacts in single session

**Why Not Integrated**: Deprioritized for 11+ months in favor of:
- GLM-4.6 migration (Q4 2024)
- Reasoning UI implementation (Nov 2024)
- Unified tool-calling architecture (Dec 2024)

**Note**: Infrastructure is well-designed and tested. Can be integrated when multi-artifact workflows become a user priority.

---

## Directory Structure

```
.claude/roadmap/
├── README.md                              # This file
├── canvas-ui-redesign.md                  # ✅ Implemented - Canvas UI updates
├── mcp-ui-integration.md                  # 📋 Planned - MCP UI widget support
├── DEEP_RESEARCH_IMPLEMENTATION_PLAN.md   # 📋 Planned - Deep research feature
└── claude_style_reasoning_guide/
    └── glm-reasoning-ui-guide.md          # ✅ Implemented - Reasoning UI
```

## How to Use This Documentation

### For Developers

1. **Starting a new feature**: Check planned roadmap files for existing architecture decisions
2. **Implementing planned features**: Update status header when starting work (📋 → 🚧)
3. **Completing features**: Update status to ✅ and add implementation details
4. **Deprecating plans**: Update status to ⚠️ and document why the plan was abandoned

### For Project Managers

- **Priority levels**: High (next sprint), Medium (next quarter), Low (backlog)
- **Implementation blockers**: Check "Implementation Status" sections for dependencies
- **Cost estimates**: See "Cost Breakdown" sections in research/API-heavy features

### For AI Assistants (Claude, etc.)

When asked about feature plans:
1. Check this README first for feature status
2. Read the relevant roadmap file for detailed architecture
3. Cross-reference with `CLAUDE.md` for current implementation details
4. Link to actual implementation files when features are marked ✅

## Maintenance Guidelines

### Adding New Roadmap Files

1. Create file in `.claude/roadmap/` with descriptive name
2. Add status header at top (use template below)
3. Update this README with new entry
4. Link related documentation

**Status Header Template**:
```markdown
> **STATUS**: 📋 Planned | 🚧 In Progress | ✅ Implemented | ⚠️ Deprecated
> **Last Updated**: YYYY-MM-DD
> **Priority**: High | Medium | Low (for planned features)
> **Implementation Date**: YYYY-MM-DD (for implemented features)
> **Implementation**: [Brief note about current state]
```

### Updating Existing Roadmap Files

- Update status header when state changes
- Add implementation details for completed features
- Link to actual code files and documentation
- Note any deviations from original plan

### Deprecating Roadmap Files

- Change status to ⚠️ Deprecated
- Add deprecation reason in status header
- Keep file for historical reference
- Update this README to move entry to "Deprecated" section

## Related Documentation

- `CLAUDE.md` - Main project documentation (canonical reference)
- `docs/` - Implementation documentation for completed features
- `.claude/docs/` - Additional technical guides and references

## Questions?

For questions about roadmap items:
1. Check the specific roadmap file for detailed planning
2. Review `CLAUDE.md` for current implementation status
3. Search `docs/` for implementation documentation
4. Check git history for implementation commits

---

**Last Updated**: 2025-12-28
**Maintained By**: Development team + AI assistants
