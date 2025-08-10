# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### To Do
- Frontend UI implementation
- Additional agent types (Code, Data, Integration)
- Plugin system architecture
- Mobile application support

## [0.2.0] - 2025-08-10

### Added
- Comprehensive test suite with unit, integration, and performance tests
- Memory leak detection and prevention in SSE broadcaster
- Session persistence with Google Cloud Storage
- OAuth2/JWT authentication system
- Firebase authentication integration
- API key authentication support
- Rate limiting and CORS protection
- Health check endpoint with detailed status

### Changed
- Refactored SSE broadcaster to eliminate memory leaks
- Optimized agent response times (3-5x improvement)
- Updated to ADK 1.8.0 compatibility
- Improved error handling across all services

### Fixed
- Memory leaks in SSE event streaming
- Session persistence across server restarts
- Authentication token refresh logic
- Concurrent connection handling

### Security
- Implemented JWT token-based authentication
- Added role-based access control (RBAC)
- Encrypted session storage
- Secure credential management

## [0.1.0] - 2025-07-15

### Added
- Initial Google ADK integration
- Research agent implementation
- Basic SSE streaming functionality
- FastAPI server setup
- LiteLLM/OpenRouter integration
- Brave Search API integration
- Basic session management
- Docker containerization

### Known Issues
- Memory usage grows over time (fixed in 0.2.0)
- Sessions not persisting (fixed in 0.2.0)

## [0.0.1] - 2025-06-01

### Added
- Project initialization
- Basic repository structure
- Initial documentation
- Development environment setup

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.2.0 | 2025-08-10 | Authentication, Testing, Performance |
| 0.1.0 | 2025-07-15 | Core ADK & Research Agent |
| 0.0.1 | 2025-06-01 | Initial Release |

[Unreleased]: https://github.com/NickB03/vana/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/NickB03/vana/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/NickB03/vana/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/NickB03/vana/releases/tag/v0.0.1