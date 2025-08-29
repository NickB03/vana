# CI/CD Pipeline Setup Guide

## Current Status

The CI/CD pipeline has been configured to run without Google Cloud dependencies to prevent authentication failures. This allows the pipeline to validate code quality, run tests, and perform security scans without requiring GCP service account credentials.

## What's Currently Disabled

1. **Backend server startup** in integration tests
2. **Full end-to-end integration tests** that require a running backend
3. **Automatic deployment** to Google Cloud Run on main branch pushes
4. **Google Cloud Project environment variables** in test contexts

## What's Still Working

✅ **Frontend tests** - Linting, TypeScript checking, and build validation  
✅ **Backend unit tests** - Python code validation and unit testing  
✅ **Security scanning** - Bandit and Safety checks  
✅ **Smoke tests** - Basic import and syntax validation  
✅ **CI-safe integration tests** - Project structure and basic module validation  

## Re-enabling Full Pipeline

To re-enable the complete pipeline with Google Cloud integration:

### 1. Configure GCP Service Account

1. Create a service account in the `analystai-454200` project with necessary permissions
2. Generate a JSON key file  
3. Add the JSON content as a GitHub secret named `GCP_SA_KEY`

### 2. Update Workflow Files

**In `.github/workflows/main-ci.yml`:**
```yaml
# Uncomment lines 384-407 to re-enable backend startup
# Remove the comment block around "Start backend for testing"
# Change integration test step back to full test suite
```

**In `.github/workflows/deploy.yml`:**
```yaml
# Uncomment the push trigger on line 6-7:
on:
  push:
    branches: [main]
```

### 3. Environment Variables

The following environment variables are used:
- `GOOGLE_CLOUD_PROJECT`: Set to `analystai-454200`
- `CI`: Always set to `true` in CI environment
- `RUNNING_IN_CI`: Used by application to skip cloud-dependent features

## Testing the Setup

1. **Local testing**: Run `uv run pytest tests/integration/test_ci_validation.py`
2. **Manual workflow**: Use "workflow_dispatch" to test deployment with `force_deploy: true`
3. **Full restoration**: Once GCP is configured, test with a small change to trigger the pipeline

## Pipeline Performance

Current optimized pipeline features:
- ⚡ Parallel execution of test suites
- 🔄 Smart caching for dependencies  
- 📊 Conditional job execution based on file changes
- 🛡️ Security scanning without blocking
- 📱 Frontend-focused validation

The pipeline will continue to provide value by catching syntax errors, dependency issues, and basic integration problems even without the full backend infrastructure.