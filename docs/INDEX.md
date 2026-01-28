# Documentation Map

**Last Updated**: 2026-01-28
**Purpose**: Quick reference for finding documentation across the project

---

## Root Level Documentation

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Project overview, setup instructions | All users |
| `CLAUDE.md` | AI assistant instructions (canonical reference) | Claude Code |
| `ROADMAP.md` | Product roadmap with priorities | Product/Dev team |
| `CHANGELOG.md` | Version history and changes | All users |
| `CONTRIBUTING.md` | Contribution guidelines | Contributors |
| `SECURITY.md` | Security policy and reporting | Security researchers |
| `AGENTS.md` | Agent configuration for AI assistants | AI assistants |
| `GEMINI.md` | Gemini-specific guidance | Gemini AI |
| `LICENSE` | MIT License | Legal reference |

---

## `/docs` - Developer Documentation

### Core Documentation
| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System architecture and design |
| `ARTIFACT_SYSTEM.md` | Vanilla Sandpack artifact rendering + database persistence |
| `DATABASE_SCHEMA.md` | Database schema and RPC functions |
| `CONFIGURATION.md` | Environment and configuration |
| `INTEGRATIONS.md` | External service integrations |
| `TOOL_CALLING_SYSTEM.md` | Tool execution architecture |
| `CI_CD.md` | CI/CD and deployment |
| `DEVELOPMENT_PATTERNS.md` | Development patterns and recipes |
| `TESTING_STRATEGY.md` | Testing strategy and E2E tests |
| `TROUBLESHOOTING.md` | Comprehensive troubleshooting guide |
| `ARCHITECTURE_DIAGRAMS.md` | Visual system design diagrams |
| `API_REFERENCE.md` | API endpoints and usage |
| `USER_GUIDE.md` | End-user guide |
| `TEST_COVERAGE_QUICK_REFERENCE.md` | Testing reference |

### Specialized Guides
| File | Purpose |
|------|---------|
| `GEMINI_3_FLASH_GUIDE.md` | **Comprehensive Gemini 3 Flash developer guide** |
| `TOOL_SYSTEM_DEEP_DIVE.md` | Tool calling architecture with diagrams |
| `UNIFIED_TOOL_ARCHITECTURE.md` | Unified tool system reference |
| `CIRCUIT_BREAKER.md` | Circuit breaker implementation |

### Feature Documentation
| File | Purpose |
|------|---------|
| `ARTIFACT_PROMPTS.md` | Artifact prompt library (45 types) |
| `CAROUSEL_PROMPTS.md` | Carousel card prompt specifications |
| `STATUS_TICKER_*.md` | Status ticker feature documentation |
| `STANDALONE_REACT_HTML*.md` | Standalone HTML artifact rendering |

### Subdirectories

#### `docs/design-system/`
Design system documentation for UI components:
- `OVERVIEW.md` - Design system overview
- `ANIMATIONS.md` - Animation patterns
- `COMPONENTS.md` - Component library
- `INTERACTIONS.md` - Interaction patterns
- `SPACING.md` - Spacing system
- `TYPOGRAPHY.md` - Typography system

#### `docs/archive/`
Historical documentation preserved for reference. Subdirectories are created as needed:
- `fixes/` - Completed bug fix documentation
- `reviews/` - Code and implementation reviews
- `analysis/` - One-time diagnostic analyses
- `deployment/` - Deployment-specific monitoring plans
- `plans/` - Completed implementation plans
- `test-reports/` - Historical test execution reports

**Note**: The archive directory is currently empty. Documents will be moved here as features are completed and their temporary documentation becomes historical reference.

#### `docs/examples/`
Example code and reference screenshots:
- `artifact-versioning/` - Versioning component examples
- `claude-reasoning/` - Reasoning UI reference screenshots

---

## `/.claude` - Claude Code Plugin Configuration

### Plugin Components
| Directory/File | Purpose |
|----------------|---------|
| `agents/` | Claude Code agent definitions (4 agents) |
| `commands/` | Claude Code slash commands (17 commands) |
| `hooks/` | Automation scripts (screenshot fix, sync) |
| `settings.local.json` | Local plugin configuration |
| `marketplace/` | Sample marketplace configurations |
| `assets/` | Reference implementations and examples |
| `roadmap/` | Implementation plans (DEEP_RESEARCH_IMPLEMENTATION_PLAN.md) |

**Note**: General documentation has been moved to `/docs` directory. `.claude/` now contains only Claude Code plugin configuration.

---

## `/scripts`

| File | Purpose |
|------|---------|
| `DEPLOYMENT-WORKFLOW.md` | Deployment guide (CI/CD via PR process) |
| `setup-branch-protection.sh` | Branch protection setup |
| `test-system-prompt.mjs` | System prompt testing |
| `test-rate-limiting.mjs` | Rate limiting testing |
| `validate-critical-files.cjs` | Critical file validation |
| `update-version.cjs` | Version management |
| `verify-deployment.cjs` | Deployment verification |
| `sync-agents-md.cjs` | AGENTS.md synchronization |

---

## Notes

### Documentation Separation Strategy
- **`/docs`**: User and developer-facing documentation
- **`/.claude`**: AI assistant reference (more compact, implementation-focused)
- **Root**: High-level project documentation

### Vanilla Sandpack Refactor (Jan 2026)
The artifact system was simplified with vanilla Sandpack rendering:
- **Status**: Complete and in production
- **Key Changes**: Database persistence, ~15K lines deleted, no server bundling
- **Architecture**: `docs/ARTIFACT_SYSTEM.md` (updated for vanilla Sandpack)

### Gemini 3 Flash Migration (Jan 2026)
The project completed migration from GLM to Gemini 3 Flash via OpenRouter:
- **Primary Docs**: `docs/GEMINI_3_FLASH_GUIDE.md` (comprehensive developer guide)
- **Migration Status**: 100% complete (GLM references fully removed in PR #574)
- **Tracking**: GitHub Issue #522

### Skills System v2 (Jan 2026)
Dynamic context injection for Claude Code commands:
- **Status**: Complete and in production (PR #571)
- **Key Feature**: On-demand skill loading reduces context overhead
- **Integration**: Works with Claude Code hooks and slash commands

### LLM Modernization (Jan 2026)
Comprehensive update to LLM integration:
- **Status**: Complete (PR #563)
- **Key Features**: Structured outputs, circuit breaker, intent confirmation events
- **UX Improvements**: Smooth streaming scroll, typewriter effect, Safari fixes

### Archive Policy
Historical documents (completed fixes, plans, reviews) are moved to `docs/archive/` rather than deleted:
- Preserves context for future debugging
- Maintains audit trail
- Provides pattern reference

### Maintenance Reminders
1. Review `.screenshots/` periodically - archive older screenshots
2. Keep `.claude/reports/` clean - archive reports after they serve their purpose
3. Move completed documentation to `docs/archive/` after features are merged and stable (create subdirectories as needed: `plans/`, `fixes/`, `reviews/`, etc.)
