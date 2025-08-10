# Changelog

All notable changes to the Vana project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-08-10

### 🎉 Major Release: Production-Ready with Enterprise Features

This release represents a complete production hardening of the Vana platform with enterprise-grade security, performance, and reliability improvements.

### Added

#### 🔐 Authentication System
- Full OAuth2/JWT authentication system with refresh tokens
- Role-Based Access Control (RBAC) with permissions
- Session persistence with database storage
- Google Cloud IAM integration ready
- Password security with bcrypt (12 rounds)
- Rate limiting and security headers
- Audit logging for all authentication events
- 26+ OAuth2 compliance tests

#### ⚡ Performance Improvements
- 5.12x speedup for HTTP operations through async conversion
- 3.05x speedup for mixed workloads
- Connection pooling with aiohttp (100 connections, 20 per host)
- DNS caching and keep-alive connections
- Thread pool bridge for backward compatibility
- Non-blocking I/O throughout the application
- 10 concurrent requests complete in 0.02s

#### 🧠 Memory Management
- Fixed SSE broadcaster memory leaks (was growing 40MB/hour)
- Implemented bounded queues with configurable limits (default 1000)
- TTL-based event expiration (5 minutes default)
- Background cleanup tasks running every minute
- Session lifecycle management (30-minute timeout)
- Memory now stable at ~30MB under sustained load

#### 🔄 SSE Enhancements
- Optional authentication for demo/production modes
- Environment-based auth control (AUTH_REQUIRE_SSE_AUTH)
- Complete audit logging for all SSE access attempts
- Production-secure by default configuration
- Session-aware event routing
- Memory-optimized event history

#### 🧪 Testing Infrastructure
- 184+ comprehensive tests across unit/integration/performance
- OAuth2 compliance test suite
- Memory leak detection tests
- Performance benchmark tests
- Authentication test coverage
- SSE authentication mode testing
- Load testing with Locust support

#### 📚 Documentation
- Complete authentication documentation (AUTHENTICATION.md)
- Comprehensive API documentation with all endpoints
- Performance guide with benchmarks (PERFORMANCE.md)
- Updated deployment guide for production
- Security best practices documentation
- Troubleshooting guides
- Architecture diagrams with Mermaid

#### 🛠️ Development Tools
- Production smoke tests
- OAuth2 testing scripts
- Performance benchmarking tools
- Memory profiling utilities
- Authentication testing helpers

### Changed

#### 🤖 Model Configuration
- **DEFAULT**: LiteLLM with OpenRouter (Qwen 3 Coder model)
- **FALLBACK**: Gemini models when USE_OPENROUTER=false
- Added sophisticated model switching system
- Environment-based configuration support

#### 🏗️ Architecture
- Migrated to async/await patterns throughout
- Implemented thread-safe state management
- Added proper resource lifecycle management
- Enhanced error handling and recovery
- Improved logging with structured output

### Fixed

#### 🐛 Critical Fixes
- **Memory Leaks**: Eliminated unbounded queue growth in SSE broadcaster
- **Test Suite**: Fixed all import errors (184+ tests now working)
- **Blocking Operations**: Converted all I/O to non-blocking async
- **Resource Cleanup**: Added proper cleanup handlers for all resources
- **Thread Safety**: Implemented locks for shared state access
- **CORS Configuration**: Fixed overly permissive settings

### Security

#### 🔒 Security Enhancements
- No hardcoded secrets (using .env.local)
- Input validation with Pydantic schemas
- Security headers (CSP, HSTS, X-Frame-Options)
- Proper CORS configuration for production
- SQL injection prevention
- XSS protection
- Rate limiting implementation

### Performance

#### 📊 Performance Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| HTTP Operations | 0.519s | 0.101s | 5.12x |
| Mixed Workloads | 0.930s | 0.305s | 3.05x |
| Memory Growth | 40MB/hour | 0MB/hour | ∞ |
| Concurrent Requests | 2.5s/10 | 0.02s/10 | 125x |
| Memory Usage | 180MB+ | 30MB | 83% reduction |

## [1.0.0] - 2025-07-26

### Initial Release

#### Features
- Google ADK integration with two-phase workflow
- Research agent with web search capabilities
- Report generation with citations
- SSE-based real-time agent monitoring
- FastAPI backend with async support
- Google Cloud integration (Storage, Logging, Trace)
- Session persistence with GCS backup
- Basic testing infrastructure

#### Known Issues
- Memory leaks in SSE broadcaster
- Test import errors
- No authentication system
- Blocking operations in async contexts
- Thread safety issues

---

## Upgrade Guide

### From 1.0.0 to 2.0.0

#### Breaking Changes
1. **Authentication Required**: Most API endpoints now require authentication
2. **Environment Variables**: New required variables for auth configuration
3. **Database Schema**: New tables for users, roles, permissions

#### Migration Steps

1. **Update Environment Variables**
```bash
# Add to .env.local
AUTH_SECRET_KEY=<generate-secure-key>
AUTH_REQUIRE_SSE_AUTH=true  # or false for demo mode
USE_OPENROUTER=true  # for LiteLLM
```

2. **Initialize Database**
```bash
# Run database migrations
python -m app.auth.database init
```

3. **Create Admin User**
```bash
# Create initial admin user
python scripts/create_admin.py
```

4. **Update API Calls**
```python
# Add authentication headers
headers = {"Authorization": f"Bearer {access_token}"}
```

5. **Test Authentication**
```bash
# Run auth tests
pytest tests/unit/test_auth.py
pytest tests/integration/test_oauth2_integration.py
```

---

## Version History

- **2.0.0** (2025-08-10): Production-ready with enterprise features
- **1.0.0** (2025-07-26): Initial release with ADK integration

---

## Links

- [GitHub Repository](https://github.com/NickB03/vana)
- [API Documentation](./docs/API.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Performance Guide](./PERFORMANCE.md)