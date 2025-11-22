# Changelog

All notable changes to the Vana AI Development Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Shared validation patterns module for Edge Functions
- Rate limiting on image generation endpoint
- Reserved keyword validator for artifact generation
- Comprehensive CHANGELOG.md for version tracking

### Changed
- Test count increased from 293 to 432 passing tests
- Updated documentation to reflect current test metrics
- Archived 97 obsolete documentation files to `.claude/archive/`

### Fixed
- All skipped React Query tests in `useArtifactVersions`
- Retry logic cleanup for better reliability

---

## [1.7.0] - 2025-11-21

### Added
- **Repository Cleanup**: Archived 97 obsolete documentation files
- **Documentation Organization**: Structured `.claude/archive/` for historical reference
- **Test Expansion**: Achieved 432 passing tests (up from 293)

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
- **Image Generation Rate Limiting**: Protected API quota on Google AI Studio endpoints
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
- **Kimi K2-Thinking Integration**: Migrated artifact generation to new high-performance model
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
- Maintained Google AI Studio for image generation only (10-key rotation)

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
**Last Updated**: 2025-11-21
**Status**: Active Development
