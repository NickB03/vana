# CI/CD Workflow Technical Reference

## Quick Reference for Pipeline Configuration and Commands

This document provides quick access to the technical details of our CI/CD pipeline configuration, commands, and troubleshooting procedures.

## 📋 Table of Contents

1. [Workflow Configuration](#workflow-configuration)
2. [Command Reference](#command-reference)
3. [Environment Variables](#environment-variables)
4. [Testing Matrix](#testing-matrix)
5. [Performance Benchmarks](#performance-benchmarks)
6. [Troubleshooting Quick Reference](#troubleshooting-quick-reference)

## ⚙️ Workflow Configuration

### GitHub Actions Workflow (main-ci.yml)

#### Trigger Conditions
```yaml
on:
  push:
    branches: [main, develop]
    paths-ignore: ['**.md', 'docs/**', '.claude_workspace/**', '*.txt']
  pull_request:
    branches: [main]
    paths-ignore: ['**.md', 'docs/**', '.claude_workspace/**', '*.txt']
  workflow_dispatch:
    inputs:
      skip_tests: { default: false, type: boolean }
      performance_mode: { default: true, type: boolean }
```

#### Environment Variables
```yaml
env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'
  UV_VERSION: '0.5.11'
  CACHE_VERSION: 'v2'
  PERFORMANCE_MODE: ${{ github.event.inputs.performance_mode || 'true' }}
```

#### Job Dependencies
```
detect-changes → smoke-tests → [backend-tests, frontend-tests] → integration-tests
                             ↘ security-scan ↗
                                              ↓
                                         ci-status
```

### Job Configuration Details

#### Change Detection
```yaml
detect-changes:
  timeout-minutes: 1
  outputs:
    backend: ${{ steps.changes.outputs.backend }}
    frontend: ${{ steps.changes.outputs.frontend }}
    deps: ${{ steps.changes.outputs.deps }}
    tests: ${{ steps.changes.outputs.tests }}
    workflows: ${{ steps.changes.outputs.workflows }}
```

#### Backend Test Matrix
```yaml
strategy:
  fail-fast: false
  matrix:
    test-group: [lint, unit, integration]
    include:
      - test-group: lint
        commands: |
          uv run ruff check . --output-format=github
          uv run mypy . --no-error-summary
      - test-group: unit
        commands: |
          uv run pytest tests/unit/ --maxfail=5
      - test-group: integration
        commands: |
          uv run pytest tests/integration/ -v --tb=short -x
```

## 🔧 Command Reference

### Local Development Commands

#### Installation & Setup
```bash
# Install dependencies with UV package manager
make install
# Equivalent to: uv sync --dev --extra jupyter && npm --prefix frontend install

# Clear virtualenv conflicts
unexport VIRTUAL_ENV
```

#### Development Servers
```bash
# Start both backend and frontend
make dev

# Start backend only (port 8000)
make dev-backend
# Equivalent to: ALLOW_ORIGINS="*" uv run --env-file .env.local uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload

# Start frontend only (port 5173)
make dev-frontend
# Equivalent to: npm --prefix frontend run dev

# Start ADK playground (port 8501)
make playground
```

#### Testing Commands
```bash
# Run all tests
make test
# Equivalent to: uv run pytest tests/unit && uv run pytest tests/integration

# Run code quality checks
make lint
# Equivalent to: 
#   uv run codespell app/ tests/ *.md *.py --skip="venv/,.venv/,__pycache__/" --ignore-words-list="rouge,DAA,deques"
#   uv run ruff check . --diff
#   uv run ruff format . --check --diff
#   uv run mypy .

# Run type checking only
make typecheck
# Equivalent to: uv run mypy .
```

#### Claude Flow Integration Commands
```bash
# Development with hooks
make dev-with-hooks

# Testing with hooks
make test-with-hooks

# Complete build pipeline with hooks
make build-with-hooks

# Hook testing framework
make test-hooks
make test-hooks-functional
make test-hooks-performance
make test-hooks-integration
make test-hooks-ci
```

### CI/CD Pipeline Commands

#### UV Package Manager Commands
```bash
# Install UV (cached in CI)
curl -LsSf "https://astral.sh/uv/0.5.11/install.sh" | sh
echo "$HOME/.local/bin" >> $GITHUB_PATH

# Optimized dependency installation
uv sync --group dev --group lint

# Development dependencies only
uv sync --dev

# No development dependencies
uv sync --no-dev --quiet
```

#### Test Execution Commands
```bash
# Backend linting
uv run ruff check . --output-format=github
uv run mypy . --no-error-summary

# Unit tests
uv run pytest tests/unit/ --maxfail=5

# Integration tests
uv run pytest tests/integration/ -v --tb=short -x

# Security scanning
uv run bandit -r app/ -f json -o bandit-report.json
uv run safety check --json --output safety-report.json
```

#### Frontend Commands
```bash
# Install dependencies
cd frontend && npm ci --prefer-offline --no-audit

# Linting
cd frontend && npm run lint

# Type checking
cd frontend && npx tsc --noEmit

# Build verification
cd frontend && npm run build
```

## 🌍 Environment Variables

### Development Environment (.env.local)
```bash
# API Keys
BRAVE_API_KEY=<from-gsm-or-dashboard>
OPENROUTER_API_KEY=<if-using-openrouter>

# CORS Configuration
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# Google Cloud
GOOGLE_CLOUD_PROJECT=analystai-454200

# Optional Settings
DEBUG=true
LOG_LEVEL=debug
```

### CI Environment Variables
```bash
# Required for CI
CI=true
GOOGLE_CLOUD_PROJECT=analystai-454200
GOOGLE_APPLICATION_CREDENTIALS=""

# Pipeline Configuration
NODE_VERSION=18
PYTHON_VERSION=3.11
UV_VERSION=0.5.11
CACHE_VERSION=v2
PERFORMANCE_MODE=true
```

## 🧪 Testing Matrix

### Test Categories and Configuration

#### Unit Tests (tests/unit/)
```bash
# Configuration in pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = [
    "--cov=app",
    "--cov-report=term-missing:skip-covered",
    "--cov-report=xml",
    "--cov-fail-under=5",
    "--junit-xml=pytest-report.xml",
    "-v",
    "--tb=short",
    "--strict-markers",
    "--disable-warnings",
    "--durations=10"
]

# Execution
uv run pytest tests/unit/ --maxfail=5
```

#### Integration Tests (tests/integration/)
```bash
# Test categories
tests/integration/
├── api/                    # API endpoint tests
├── auth/                   # Authentication tests
├── sse/                    # Server-Sent Events tests
├── test_api_endpoints.py   # General API testing
├── test_auth_api.py        # Auth API testing
└── test_oauth2_integration.py  # OAuth2 compliance

# Execution with authentication
uv run pytest tests/integration/ -v --tb=short -x
```

#### Frontend Tests
```bash
# ESLint configuration
cd frontend && npm run lint

# TypeScript compilation
cd frontend && npx tsc --noEmit

# Build test
cd frontend && npm run build
```

### Test Authentication Helpers

#### Backend Test Authentication
```python
async def create_test_user_and_authenticate(client):
    """Create test user and return auth headers."""
    user_data = {
        "username": f"testuser_{uuid.uuid4().hex[:8]}",
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Test123!@#"
    }
    
    # Register and login
    register_response = await client.post("/auth/register", json=user_data)
    assert register_response.status_code == 201
    
    login_response = await client.post("/auth/login", json={
        "username": user_data["username"],
        "password": user_data["password"]
    })
    assert login_response.status_code == 200
    
    token_data = login_response.json()
    access_token = token_data["tokens"]["access_token"]
    
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }, user_data
```

## 📊 Performance Benchmarks

### Pipeline Duration Targets

| Stage | Target | Current | Status |
|-------|--------|---------|--------|
| Change Detection | 30s | 25s | ✅ |
| Smoke Tests | 90s | 85s | ✅ |
| Backend Lint | 120s | 110s | ✅ |
| Backend Unit | 180s | 165s | ✅ |
| Backend Integration | 240s | 220s | ✅ |
| Frontend Tests | 300s | 280s | ✅ |
| Integration Tests | 600s | 580s | ✅ |
| Security Scan | 300s | 290s | ✅ |
| **Total Pipeline** | **15 min** | **14 min** | ✅ |

### Resource Usage Targets

| Resource | Target | Current | Status |
|----------|--------|---------|--------|
| Peak Memory | 2.2GB | 2.0GB | ✅ |
| Average Memory | 1.5GB | 1.4GB | ✅ |
| Peak CPU | 95% | 95% | ✅ |
| Cache Hit Rate | 85% | 88% | ✅ |

## 🔍 Troubleshooting Quick Reference

### Common Error Patterns and Solutions

#### UV Installation Issues
```bash
# Error: uv: command not found
curl -LsSf "https://astral.sh/uv/0.5.11/install.sh" | sh
echo "$HOME/.local/bin" >> $GITHUB_PATH

# Error: Group 'lint' not found
# Check pyproject.toml has [dependency-groups] section
uv sync --group dev --group lint
```

#### Authentication Test Failures
```python
# Error: 401 Unauthorized in tests
# Solution: Use proper test authentication
headers, user_data = await create_test_user_and_authenticate(client)
response = await client.get("/protected-endpoint", headers=headers)

# Error: KeyError: 'access_token'
# Solution: Update for new OAuth2 structure
token = response.json()["tokens"]["access_token"]  # Not response.json()["access_token"]
```

#### Google Cloud Service Errors
```python
# Error: DefaultCredentialsError in CI
# Solution: Check for CI environment
import os
if os.getenv('CI') == 'true':
    pytest.skip("Cloud services unavailable in CI")
```

#### SSE Test Issues
```python
# Error: SSE tests hanging
# Solution: Mock SSE responses
with patch('app.utils.sse_broadcaster.SSEBroadcaster.send_update'):
    response = await client.get("/sse/stream", headers=auth_headers)
    assert response.status_code == 200
```

### Cache Debugging Commands
```bash
# Check cache status
uv cache info

# Clear UV cache
uv cache clean

# Check GitHub Actions cache (in workflow)
echo "Cache hit: ${{ steps.cache.outputs.cache-hit }}"
ls -la ~/.cache/uv/
```

### Local CI Reproduction
```bash
# Set CI environment variables
export CI=true
export GOOGLE_CLOUD_PROJECT=analystai-454200
export GOOGLE_APPLICATION_CREDENTIALS=""

# Run exact CI commands
uv sync --group dev --group lint
uv run ruff check . --output-format=github
uv run mypy . --no-error-summary
uv run pytest tests/unit/ --maxfail=5
uv run pytest tests/integration/ -v --tb=short -x
```

### Performance Debugging
```bash
# Identify slow tests
uv run pytest --durations=10 tests/

# Memory profiling
pip install pytest-memray
uv run pytest --memray tests/integration/

# Test specific integration
uv run pytest tests/integration/test_auth_api.py -v --tb=long
```

---

**Reference Version**: v2.0  
**Last Updated**: August 2025  
**Workflow File**: `.github/workflows/main-ci.yml`