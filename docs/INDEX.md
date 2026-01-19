# Documentation Map

**Last Updated**: 2026-01-18
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

### API References
| File | Purpose | Status |
|------|---------|--------|
| `GEMINI_3_FLASH_GUIDE.md` | Current Gemini 3 Flash API reference | Active |
| `GLM-4.6-API-REFERENCE.md` | GLM-4.6 API details | Archived (migrated to Gemini) |
| `GLM-4.7-MIGRATION-GUIDE.md` | GLM-4.7 migration guide | Archived (migrated to Gemini) |

### Historical/Reference
| File | Purpose | Status |
|------|---------|--------|
| `BUG-FIX-TOOL-CALL-FAILURE.md` | Dec 28 bug fix documentation | Fixed |
| `RFC-001-TOOL-RESULT-FORMAT-REFACTOR.md` | Tool result format refactor | Implemented |

### Subdirectories

#### `docs/design-system/`
Design system documentation for UI components:
- `OVERVIEW.md` - Design system overview
- `ANIMATIONS.md` - Animation patterns
- `COMPONENTS.md` - Component library
- `INTERACTIONS.md` - Interaction patterns
- `SPACING.md` - Spacing system
- `TYPOGRAPHY.md` - Typography system

#### `docs/plans/roadmap/`
Detailed technical specifications for planned features:
- `ARTIFACT_EXPORT_SYSTEM.md` - Export system (Production Ready)
- `ARTIFACT_VERSIONING.md` - Version control (Backend Only)
- `SENTRY_INTEGRATION.md` - Sentry setup plan
- `SENTRY-SOURCE-MAPS.md` - Source maps configuration
- `claude_reasoning_research.md` - Reasoning research notes

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
| `validate-critical-files.cjs` | Critical file validation |
| `sync-agents-md.cjs` | AGENTS.md synchronization |

---

## Notes

### Documentation Separation Strategy
- **`/docs`**: User and developer-facing documentation
- **`/.claude`**: AI assistant reference (more compact, implementation-focused)
- **Root**: High-level project documentation

### Vanilla Sandpack Refactor (Jan 2026)
The artifact system was simplified with vanilla Sandpack rendering:
- **Tracking Branch**: `refactor/vanilla-sandpack-artifacts`
- **Key Changes**: Database persistence, ~15K lines deleted, no server bundling
- **Plan**: `docs/vanilla-sandpack-refactor-plan.md` (implementation tracker)
- **Architecture**: `docs/ARTIFACT_SYSTEM.md` (updated for vanilla Sandpack)

### Gemini 3 Flash Migration (Jan 2026)
The project completed migration from GLM to Gemini 3 Flash via OpenRouter:
- **Primary Docs**: `docs/GEMINI_3_FLASH_GUIDE.md` (comprehensive developer guide)
- **Migration Status**: 100% complete
- **Tracking**: GitHub Issue #522

### Historical Documents
These documents are kept for reference but describe completed work:
- `docs/BUG-FIX-TOOL-CALL-FAILURE.md` - Fixed bug documentation
- `docs/RFC-001-TOOL-RESULT-FORMAT-REFACTOR.md` - Implemented RFC
- `docs/archive/GLM-*.md` - Archived GLM documentation (superseded by Gemini)

### Future Considerations
1. Consider creating `docs/archive/` for historical bug fixes and RFCs
2. Review `.screenshots/` periodically (75 files, ~74MB) - archive older screenshots
3. Keep `.claude/reports/` clean - archive reports after they serve their purpose
