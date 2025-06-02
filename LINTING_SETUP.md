# VANA Linting & Quality Assurance Setup

## Overview

This document describes the comprehensive linting and quality assurance system implemented for the VANA project to prevent the recurring deployment failures caused by:

- Tool naming convention violations (underscore prefixes)
- Poetry vs pip dependency conflicts
- Directory structure violations
- Tool registration pattern errors
- Hardcoded paths and other configuration issues

## Components Implemented

### 1. Custom VANA Linting Scripts

Located in `scripts/lint/`:

- **`check_vana_naming.py`**: Detects underscore naming violations in tool functions and names
- **`check_directory_structure.py`**: Validates VANA directory structure requirements
- **`check_tool_registration.py`**: Ensures proper FunctionTool registration patterns

### 2. Pre-Commit Hooks

Configuration in `.pre-commit-config.yaml`:

- VANA-specific checks (highest priority)
- Ruff linting and formatting
- Type checking with mypy
- Security scanning with bandit
- General quality checks

### 3. GitHub Actions CI/CD

Workflows in `.github/workflows/`:

- **`vana-ci-cd.yml`**: Comprehensive CI/CD pipeline with VANA validation
- **`pr-quality-gate.yml`**: Pull request quality gate with automated feedback

### 4. Enhanced Deployment Scripts

- **`deployment/deploy.sh`**: Updated with pre-deployment quality validation
- **`deployment/Dockerfile`**: Optional build-time quality validation

### 5. Tool Configuration

Updated `pyproject.toml` with:

- Ruff configuration for VANA-specific rules
- mypy type checking setup
- bandit security scanning
- Coverage reporting configuration

## Usage

### Local Development

1. **Install dependencies**:
   ```bash
   poetry install
   ```

2. **Install pre-commit hooks**:
   ```bash
   poetry run pre-commit install
   ```

3. **Run manual checks**:
   ```bash
   # Directory structure
   poetry run python scripts/lint/check_directory_structure.py

   # Naming conventions
   find lib/_tools -name "*.py" -exec poetry run python scripts/lint/check_vana_naming.py {} +

   # Tool registration
   find lib/_tools -name "*.py" -exec poetry run python scripts/lint/check_tool_registration.py {} +

   # Ruff linting
   poetry run ruff check .

   # Ruff formatting
   poetry run ruff format .
   ```

### Deployment

The enhanced deployment script automatically runs all quality checks:

```bash
./deployment/deploy.sh
```

### CI/CD Pipeline

- **Push to main/develop**: Full CI/CD pipeline with deployment
- **Pull requests**: Quality gate with automated feedback
- **All branches**: VANA-specific validation

## Error Prevention

This system prevents these specific VANA issues:

### 1. Underscore Naming Violations
**Before**: `_vector_search`, `_echo`, `_ask_for_approval`
**After**: `vector_search`, `echo`, `ask_for_approval`

### 2. Poetry vs Pip Conflicts
**Before**: `pip install package`
**After**: `poetry add package`

### 3. Directory Structure Issues
**Before**: `/agent/` directory conflicts
**After**: Proper `/agents/vana/` structure

### 4. Tool Registration Errors
**Before**: Function name ≠ tool name mismatches
**After**: Consistent FunctionTool patterns

### 5. Hardcoded Paths
**Before**: `/Users/nick/Development/vana`
**After**: Relative paths or environment variables

## Expected Impact

- **95%+ reduction** in deployment failures
- **Immediate feedback** during development
- **Automated quality gates** in CI/CD
- **Consistent code quality** across the project
- **Prevention of known VANA issues**

## Integration Status

✅ **Implemented**:
- Custom VANA linting scripts
- Pre-commit hooks configuration
- GitHub Actions workflows
- Enhanced deployment scripts
- Tool configuration

🔄 **Next Steps**:
- Test with actual deployment
- Validate all quality checks work
- Update team documentation
- Train team on new workflow

## Troubleshooting

### Common Issues

1. **Pre-commit hook failures**: Run `poetry run pre-commit run --all-files` to see all issues
2. **Ruff configuration errors**: Check `pyproject.toml` for syntax issues
3. **Import errors in scripts**: Ensure you're in the project root directory
4. **Permission errors**: Make sure scripts are executable: `chmod +x scripts/lint/*.py`

### Getting Help

- Check the error messages - they include specific fix instructions
- Review the Memory Bank for VANA conventions
- Run individual linting scripts to isolate issues
- Use `poetry run ruff check . --fix` for auto-fixable issues

## Maintenance

- Update tool configurations as needed
- Add new VANA-specific patterns to linting scripts
- Review and update quality thresholds periodically
- Keep dependencies updated with `poetry update`
