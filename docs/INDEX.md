# Documentation Map

**Last Updated**: 2026-01-28
**Purpose**: Quick reference for finding documentation across the project

---

## Root Level Documentation

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Project overview, setup instructions | All users |
| `CHANGELOG.md` | Version history and changes | All users |
| `CONTRIBUTING.md` | Contribution guidelines | Contributors |
| `SECURITY.md` | Security policy and reporting | Security researchers |
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
| `CIRCUIT_BREAKER.md` | Circuit breaker implementation |

### Feature Documentation
| File | Purpose |
|------|---------|
| `STANDALONE_REACT_HTML.md` | Standalone HTML artifact rendering |

### Subdirectories

#### `docs/design-system/`
Design system documentation for UI components:
- `OVERVIEW.md` - Design system overview
- `ANIMATIONS.md` - Animation patterns
- `COMPONENTS.md` - Component library
- `INTERACTIONS.md` - Interaction patterns
- `SPACING.md` - Spacing system
- `TYPOGRAPHY.md` - Typography system

---

## `/scripts`

| File | Purpose |
|------|---------|
| `DEPLOYMENT-WORKFLOW.md` | Deployment guide (CI/CD via PR process) |
| `verify-deployment.cjs` | Deployment verification |
| `sync-agents-md.cjs` | AGENTS.md synchronization |

