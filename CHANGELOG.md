# Changelog

All notable changes to the Vana AI Development Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Refactored
- **Phase 4 Cleanup**: Extracted types with validation from deprecated `reasoning-generator.ts` (886 line reduction, 70%)
  - Created `reasoning-types.ts` with XSS/DoS protection
  - Added readonly modifiers for immutability
  - Type design grade improved from D to B (+108%)
- **Dead Code Removal**: Eliminated 4 unused components (~300 lines total)
  - Removed `NebiusLogo.tsx`, `StreamingText.tsx`, `BenefitIllustrations.tsx`, `BackgroundPaths.tsx`
  - Fixed filename typo: `bg-gredient.tsx` → `bg-gradient.tsx`
- **Token Counter Cleanup**: Removed 3 deprecated backward compatibility functions
  - `countMessageTokens()`, `countTotalTokens()`, `countTextTokens()`
  - Zero production usage confirmed via codebase analysis

### Breaking Changes (Minor)
- **Icon Validation** (Issue #402): Documented that frontend strictly validates reasoning icons without normalization. Invalid icons cause `parseReasoningSteps()` to return `null`. This is intentional - forces GLM API to send valid icons rather than silently accepting bad data. Icon field is optional; if omitted, UI renders without an icon.

### Fixed
- **Import Chain**: Fixed `BenefitsSection` import after cleanup deleted `BenefitIllustrations`

### Documentation
- **Comprehensive Cleanup** (PR #393): Fixed 7 files referencing non-existent `Artifact.tsx`
- **Standardized Test Counts**: Updated 9 locations to reflect actual 1,048 tests
- **Architecture Docs**: Added missing `generate-artifact-fix/` and `bundle-artifact/` documentation
- **Icon Validation Behavior** (Issue #402): Documented that frontend uses strict icon validation without normalization

---

## [1.9.0] - 2025-11-28

### Added
- **GLM-4.6 Reasoning Display**: Real-time reasoning streaming via parallel requests
- **Fast Parallel Architecture**: `/generate-reasoning` (Gemini, 2-4s) runs alongside `/generate-artifact` (GLM, 30-60s)
- **GLM Reasoning Parser**: New `glm-reasoning-parser.ts` converts raw GLM reasoning to structured format
- **GLM Client**: New `glm-client.ts` with streaming support and Z.ai API integration

### Changed
- **Model Migration**: Artifact generation moved from Kimi K2 to GLM-4.6 via Z.ai API
- **Test count**: 683 tests total (671 passing, 2 intermittent worker failures)

### Fixed
- **CORS Fix**: Fixed 500 error in generate-reasoning preflight handler
- **Duplicate Key Fix**: Resolved React warning for duplicate message keys during streaming
- **Hardcoded Model Names**: Replaced all hardcoded model strings with `MODELS.*` constants

---

## [1.8.0] - 2025-11-27

### Added
- **Smart Context Management**: Token-aware context windowing system for optimized AI responses
- **Guest Artifact Bundling**: Fixed guest users unable to use npm-bundled artifacts
- **Response Quality Tracking**: New `response_quality_logs` and `message_feedback` tables
- **State Machine Architecture**: Conversation state tracking in `_shared/state-machine.ts`

### Changed
- **React Instance Unification**: Fixed "useRef null" errors in Radix UI artifacts via import map shims
- **CSP Security**: Updated Content Security Policy for Tailwind CDN and data: URL shims
- **Test Expansion**: 683 tests (up from 432)

### Fixed
- **React Hook Errors**: Resolved dual React instance issues in server-bundled artifacts
- **Import Map Shims**: esm.sh packages now use `?external=react,react-dom`

---

## [1.7.0] - 2025-11-21

### Added
- **Repository Cleanup**: Archived 97 obsolete documentation files
- **Documentation Organization**: Structured `.claude/archive/` for historical reference
- **Test Expansion**: Achieved 1,048 passing tests (up from 293)

### Changed
- Updated test infrastructure to fix all skipped tests
- Improved test reliability with 100% pass rate

### Fixed
- React Query test skips in `useArtifactVersions` hook
- Documentation discoverability issues

---

## [1.6.0] - 2025-11-20

### Added
- **Shared Validation Patterns**: Centralized validation utilities (`validation-patterns.ts`)
- **Image Generation Rate Limiting**: Protected API quota on image generation endpoints
- **Reserved Keyword Validator**: Auto-detection and fixing of strict mode violations

### Changed
- Improved code reusability across Edge Functions
- Enhanced security validation consistency

### Security
- Added rate limiting to prevent API quota abuse
- Improved artifact validation with reserved keyword detection

---

## [1.5.0] - 2025-11-19

### Added
- **Artifact Rate Limiting**: Rate limits on artifact generation endpoints
- **Documentation Cleanup**: Removed outdated artifact import restrictions duplicates

### Changed
- Cleaned up retry logic for better reliability
- Improved error handling and user feedback

### Fixed
- API quota management improvements
- Reduced failed request rates

---

## [1.4.0] - 2025-11-17

### Added
- **Model Migration**: Migrated artifact generation to high-performance model (later replaced by GLM-4.6)
- **Gemini-style Sidebar**: Auto-collapse sidebar with manual toggle control

### Changed
- Improved artifact generation speed and reliability
- Eliminated timeout issues with faster model

### Fixed
- Artifact card Open button navigation issue
- Image generation card artifact mode behavior

---

## [1.3.0] - 2025-11-14

### Added
- **CI/CD Pipeline**: Automated GitHub Actions workflow (lint → test → coverage → build)
- **Coverage Tracking**: Codecov integration with PR comments
- **Branch Protection**: GitHub ruleset requiring PR approval
- **Chain of Thought Reasoning**: Transparent AI reasoning with collapsible steps

### Changed
- Test coverage improved from 68% to 74.21%
- exportArtifact.ts coverage: 23% → 98%

### Security
- 9 XSS attack scenarios validated
- Triple-layer security (server validation + Zod schemas + DOMPurify)

---

## [1.2.0] - 2025-11-13

### Added
- **OpenRouter Migration**: Gemini 2.5 Flash Lite for chat/summaries/titles
- **Security Hardening**: 0 vulnerabilities (eliminated 2 HIGH issues)

### Changed
- Migrated from direct Google AI Studio to OpenRouter for chat
- Consolidated image generation to OpenRouter for simplified key management

### Security
- Fixed all HIGH and MEDIUM severity vulnerabilities
- Improved authentication and session management

---

## [1.1.0] - 2025-11

### Added
- **Artifact Export System**: Multi-format export (clipboard, download, standalone HTML, ZIP)
- **5-Layer Import Validation**: Comprehensive defense against artifact failures
- **Auto-Transformation**: Automatically fixes common coding mistakes
- **ai-elements Integration**: Modern UI primitives for artifact rendering

### Changed
- Improved artifact reliability by ~95%
- Enhanced error messages and user feedback

---

## [1.0.0] - 2024-10

### Added
- **Core Chat Interface**: Real-time AI conversations with streaming
- **7 Artifact Types**: React, HTML, Code, Mermaid, SVG, Markdown, Image
- **Guest Mode**: 20 free messages per 5-hour window
- **Session Management**: Persistent chat sessions with auto-generated titles
- **Version Control**: Git-like versioning for artifacts
- **Theme Support**: Dark/light mode with system preference detection
- **Authentication**: Email/password and Google OAuth

### Security
- Row-Level Security (RLS) on all database tables
- JWT-based authentication
- Rate limiting for guest users

---

## Legend

- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Features marked for removal
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements

---

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): New functionality (backwards-compatible)
- **PATCH** version (0.0.X): Bug fixes (backwards-compatible)

---

**Maintained by**: Vana Development Team
**Last Updated**: 2025-12-24
**Status**: Active Development
