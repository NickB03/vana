# Documentation Map

**Last Updated**: 2026-01-12
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
| `API_REFERENCE.md` | API endpoints and usage |
| `USER_GUIDE.md` | End-user guide |
| `ERROR_CODES.md` | Error code reference |
| `TROUBLESHOOTING.md` | User-facing troubleshooting (comprehensive) |
| `TEST_COVERAGE_QUICK_REFERENCE.md` | Testing reference |

### Architecture & Systems
| File | Purpose |
|------|---------|
| `GEMINI_3_FLASH_GUIDE.md` | **Comprehensive Gemini 3 Flash developer guide** |
| `GEMINI_3_FLASH_IMPLEMENTATION_ANALYSIS.md` | Implementation analysis vs best practices |
| `REASONING_UI_ARCHITECTURE.md` | Reasoning display system design |
| `TOOL_SYSTEM_DEEP_DIVE.md` | Tool calling architecture |
| `UNIFIED_TOOL_ARCHITECTURE.md` | Unified tool system |
| `TRANSPILATION.md` | Sucrase transpiler documentation |

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

## `/.claude` - AI Assistant Reference

### Core Documentation (for AI assistants)
| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System architecture reference |
| `ARTIFACT_SYSTEM.md` | Artifact rendering system |
| `BUILD_AND_DEPLOYMENT.md` | CI/CD and deployment |
| `CHROME_MCP_COMMANDS.md` | Chrome DevTools MCP usage |
| `COMMON_PATTERNS.md` | Development patterns |
| `CONFIGURATION.md` | Configuration reference |
| `DATABASE_SCHEMA.md` | Database schema reference |
| `DIAGRAMS.md` | Architecture diagrams |
| `INTEGRATIONS.md` | External integrations |
| `TOOL_CALLING_SYSTEM.md` | Tool calling reference |
| `TROUBLESHOOTING.md` | AI-focused troubleshooting (compact) |
| `MIGRATION-STATUS.md` | Gemini 3 Flash migration progress |
| `artifact-import-restrictions.md` | Import restrictions for artifacts |

### Subdirectories

#### `.claude/agents/`
Agent definitions for specialized tasks:
- `backend-specialist.md`
- `frontend-developer.md`
- `mobile-developer.md`
- `ui-ux-designer.md`

#### `.claude/commands/`
Claude Code slash commands (17 commands)

#### `.claude/roadmap/`
Implementation guides for AI assistants:
- `README.md` - Roadmap index
- `canvas-ui-redesign.md` - Canvas UI implementation guide
- `mcp-ui-integration.md` - MCP UI implementation guide
- `DEEP_RESEARCH_IMPLEMENTATION_PLAN.md` - Deep research implementation
- `claude_style_reasoning_guide/` - Reasoning UI guide (Implemented)

#### `.claude/plans/`
Completed implementation plans:
- `sucrase-migration-plan.md` - Sucrase migration (Completed)
- `skeleton-ui-implementation.md` - Skeleton UI plan
- `skeleton-primitives-completed.md` - Skeleton primitives (Completed)

#### `.claude/proposals/`
Feature proposals:
- `transpiler-upgrade-proposal.md`

#### `.claude/reviews/`
Code reviews:
- `sucrase-migration-review.md`

#### `.claude/reports/`
Analysis and audit reports (recent):
- `docs-review-*.md` - Documentation review reports (Dec 26)
- `issue-triage-*.md` - Issue triage reports (Dec 26)
- `documentation-audit-2025-12-24.md` - Documentation audit

#### `.claude/archive/`
Archived historical reports:
- `pr-390-reports/` - PR #390 analysis suite (Dec 24)

#### `.claude/docs/`
Additional technical documentation (see `.claude/archive/` for historical GLM docs)

---

## `/scripts`

| File | Purpose |
|------|---------|
| `deploy-simple.sh` | Production deployment script |
| `DEPLOYMENT-WORKFLOW.md` | Deployment guide |
| `setup-branch-protection.sh` | Branch protection setup |
| `benchmark-transpilers.ts` | Transpiler benchmarking |
| `test-system-prompt.mjs` | System prompt testing |
| `test-rate-limiting.mjs` | Rate limiting testing |
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

### Gemini 3 Flash Migration (Jan 2026)
The project completed migration from GLM to Gemini 3 Flash via OpenRouter:
- **Primary Docs**: `docs/GEMINI_3_FLASH_GUIDE.md` (comprehensive developer guide)
- **Implementation Analysis**: `docs/GEMINI_3_FLASH_IMPLEMENTATION_ANALYSIS.md`
- **Migration Status**: `.claude/MIGRATION-STATUS.md` (100% complete)
- **Tracking**: GitHub Issue #522

### Historical Documents
These documents are kept for reference but describe completed work:
- `docs/BUG-FIX-TOOL-CALL-FAILURE.md` - Fixed bug documentation
- `docs/RFC-001-TOOL-RESULT-FORMAT-REFACTOR.md` - Implemented RFC
- `.claude/plans/sucrase-migration-plan.md` - Completed migration
- `docs/archive/GLM-*.md` - Archived GLM documentation (superseded by Gemini)

### Future Considerations
1. Consider creating `docs/archive/` for historical bug fixes and RFCs
2. Review `.screenshots/` periodically (75 files, ~74MB) - archive older screenshots
3. Keep `.claude/reports/` clean - archive reports after they serve their purpose
