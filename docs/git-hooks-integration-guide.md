# Git Hooks Integration Guide - Vana Project

## Overview

The Vana project includes a comprehensive Git hook integration system that enhances Git operations with PRD validation, security checks, performance monitoring, and automated workflows. This system integrates seamlessly with the existing Claude Code hook framework and provides safety mechanisms for all Git operations.

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Hook Types](#hook-types)
5. [Usage Examples](#usage-examples)
6. [Emergency Procedures](#emergency-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Development Guidelines](#development-guidelines)

## Features

### Core Capabilities
- **PRD Compliance Validation**: Ensures all committed code meets project requirements
- **Security Pattern Detection**: Identifies potential security vulnerabilities before commit
- **Performance Impact Analysis**: Analyzes performance implications of changes
- **Automated Backup System**: Creates backups before destructive operations
- **Emergency Bypass Mechanisms**: Provides escape hatches for critical situations
- **Comprehensive Testing Integration**: Runs tests and lints before pushes
- **Conventional Commit Enforcement**: Ensures consistent commit message format

### Git Hook Integration Points
- **pre-commit**: PRD validation, security checks, file organization
- **pre-push**: Comprehensive testing, security scans, branch protection
- **post-commit**: Documentation updates, backup creation, performance analysis
- **post-merge**: Dependency updates, configuration sync, cleanup
- **pre-rebase**: Safety checks, backup creation, conflict detection
- **commit-msg**: Message format validation, conventional commit enforcement

## Installation

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Git repository** (initialized)
3. **Vana project dependencies** (installed via `make install` or `uv install`)

### Quick Installation

```bash
# Navigate to your Vana project directory
cd /path/to/vana

# Install Git hooks
node tests/hooks/integration/git-hook-manager.js install

# Verify installation
node tests/hooks/integration/git-hook-manager.js status
```

### Manual Installation

```bash
# 1. Ensure hook files have proper permissions
chmod +x tests/hooks/integration/git-hook-manager.js
chmod +x tests/hooks/validation/git-commit-validator.js

# 2. Install hooks individually
node tests/hooks/integration/git-hook-manager.js install

# 3. Test hook functionality
echo "test content" > test-file.txt
git add test-file.txt
git commit -m "test: verify hook installation"
```

## Configuration

### Hook Configuration File

The system creates a configuration file at `.claude_workspace/git-hooks-config.json`:

```json
{
  "enabled": true,
  "hooks": {
    "pre-commit": { "status": "installed" },
    "pre-push": { "status": "installed" },
    "post-commit": { "status": "installed" },
    "post-merge": { "status": "installed" },
    "pre-rebase": { "status": "installed" },
    "commit-msg": { "status": "installed" }
  },
  "bypass": {
    "enabled": true,
    "password": null,
    "temporaryBypass": null
  },
  "validation": {
    "enablePRDValidation": true,
    "enableSecurityCheck": true,
    "enablePerformanceCheck": true,
    "strictMode": false
  },
  "backup": {
    "createBackupOnBlock": true,
    "enableEmergencyRestore": true,
    "backupRetention": 30
  },
  "performance": {
    "maxHookTime": 30000,
    "enableParallelValidation": true,
    "cacheValidationResults": true
  }
}
```

### Environment Variables

Create `.env.local` files for local development configuration:

```bash
# .env.local (root directory)
BRAVE_API_KEY=your_brave_api_key
OPENROUTER_API_KEY=your_openrouter_key
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174
GOOGLE_CLOUD_PROJECT=analystai-454200

# Hook-specific settings
GIT_HOOKS_ENABLED=true
GIT_HOOKS_STRICT_MODE=false
GIT_HOOKS_LOG_LEVEL=info
```

## Hook Types

### Pre-commit Hook

**Purpose**: Validate staged files against PRD requirements before commit

**Validations**:
- **Technology Stack**: Ensures shadcn/ui usage, no forbidden frameworks
- **File Organization**: Checks naming conventions, directory structure
- **Performance**: Analyzes hook usage, bundle size impact
- **Security**: Detects hardcoded secrets, dangerous patterns
- **Accessibility**: Validates ARIA labels, semantic HTML

**Example Output**:
```bash
🔍 Running pre-commit validation...
📁 Validating 3 staged files...
✅ src/components/Button.tsx - PRD compliant
❌ src/components/Form.tsx - PRD violations found:
   - Forbidden UI framework detected: @mui/material
   - Missing data-testid attributes
💡 Recommendations:
   - Replace with shadcn/ui: import { Button } from '@/components/ui/button'
   - Add data-testid: <button data-testid="submit-btn">Submit</button>
```

### Pre-push Hook

**Purpose**: Comprehensive checks before pushing to remote repository

**Checks**:
- **Test Suite**: Runs `make test` to ensure all tests pass
- **Lint Checks**: Runs `make lint` for code quality
- **Security Scan**: Deep security pattern analysis
- **Branch Protection**: Prevents direct pushes to protected branches
- **Commit Message Validation**: Validates all commit messages being pushed

**Example Output**:
```bash
🚀 Running pre-push validation...
📡 Pushing to remote: origin (https://github.com/user/vana.git)
📝 Analyzing 5 commits...
🧪 Running test suite... ✅ Passed
🔍 Running lint checks... ✅ Passed
🔒 Running security checks... ✅ No issues found
🚫 Checking branch protection... ✅ Feature branch allowed
📝 Validating commit messages... ✅ All conventional format
✅ Pre-push validation passed
```

### Post-commit Hook

**Purpose**: Automated tasks after successful commit

**Tasks**:
- **Documentation Updates**: Auto-generates docs for new features
- **Version Updates**: Bumps version for certain commit types
- **Backup Creation**: Creates commit snapshots
- **Performance Analysis**: Analyzes impact of changes

**Example Output**:
```bash
📋 Running post-commit tasks...
📝 Processing commit: abc123 - feat: add user authentication
📚 Documentation update not required
🔢 Version update not required
💾 Creating commit backup... ✅ Backup created: backup-abc123
⚡ Running performance analysis... ✅ No impact detected
✅ Post-commit tasks completed (4 tasks)
```

### Post-merge Hook

**Purpose**: Cleanup and updates after merge operations

**Tasks**:
- **Dependency Updates**: Runs `npm install` if package.json changed
- **Database Migrations**: Checks for migration requirements
- **Configuration Updates**: Syncs local configuration
- **Cleanup**: Removes merge artifacts

**Example Output**:
```bash
🔀 Running post-merge tasks...
🔗 Merge completed: feature/auth → main
📦 Package changes detected, updating dependencies...
🗄️  No migration changes detected
⚙️  Configuration changes detected, updating...
🧹 Cleaning up merge artifacts...
✅ Post-merge tasks completed (4 tasks)
```

### Pre-rebase Hook

**Purpose**: Safety checks before rebase operations

**Checks**:
- **Uncommitted Changes**: Prevents rebase with uncommitted work
- **Branch State**: Validates branch is in safe state for rebase
- **Conflict Detection**: Predicts potential conflicts
- **Emergency Backup**: Creates restore point before rebase

**Example Output**:
```bash
🔄 Running pre-rebase safety checks...
📝 Checking for uncommitted changes... ✅ Clean working directory
🌿 Validating branch state... ✅ Branch is safe for rebase
⚡ Checking for potential conflicts... ⚠️  2 potential conflicts detected
💾 Creating emergency backup... ✅ Backup created: rebase-backup-xyz789
✅ Pre-rebase safety checks passed
```

### Commit Message Hook

**Purpose**: Enforce conventional commit message format

**Validation Rules**:
- **Format**: `type(scope): description`
- **Types**: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
- **Length**: 10-72 characters for first line
- **Imperative Mood**: Use action verbs (add, fix, update)

**Example Output**:
```bash
📝 Validating commit message...
✅ Commit message is valid
Type: feat
Scope: auth
Subject: add Google OAuth integration
```

## Usage Examples

### Basic Git Workflow

```bash
# 1. Make changes to files
echo "export const Button = () => <button>Click</button>;" > src/components/Button.tsx

# 2. Stage files (triggers pre-commit validation)
git add src/components/Button.tsx

# 3. Commit with conventional message (triggers commit-msg validation)
git commit -m "feat(ui): add reusable Button component"

# 4. Push to remote (triggers pre-push validation)
git push origin feature/button-component
```

### Advanced Validation Features

```bash
# Check validation status
node tests/hooks/integration/git-hook-manager.js status

# Manually validate a commit message
node tests/hooks/validation/git-commit-validator.js validate-message "feat: add new feature"

# Validate staged files without committing
node tests/hooks/validation/git-commit-validator.js validate-staged

# Get performance metrics
node tests/hooks/validation/git-commit-validator.js metrics
```

### Working with Bypass Mechanisms

```bash
# Set temporary bypass (60 minutes)
node tests/hooks/integration/git-hook-manager.js bypass "Emergency hotfix deployment" 60

# Check bypass status
node tests/hooks/integration/git-hook-manager.js status

# Clear bypass
node tests/hooks/integration/git-hook-manager.js clear-bypass

# Disable hooks globally
node tests/hooks/integration/git-hook-manager.js disable

# Re-enable hooks
node tests/hooks/integration/git-hook-manager.js enable
```

## Emergency Procedures

### Emergency Bypass

For critical situations where hooks are blocking urgent deployments:

```bash
# Method 1: Temporary bypass (recommended)
node tests/hooks/integration/git-hook-manager.js bypass "Production hotfix - ticket #123" 30

# Method 2: Disable hooks globally
node tests/hooks/integration/git-hook-manager.js disable

# Method 3: Skip hooks for single commit
git commit --no-verify -m "emergency: critical hotfix"

# Method 4: Skip hooks for single push
git push --no-verify origin main
```

### Emergency Restore

If a hook validation blocked an important commit and you need to restore:

```bash
# List available backups
node tests/hooks/integration/git-hook-manager.js list-backups src/components/CriticalComponent.tsx

# Restore from specific backup
node tests/hooks/integration/git-hook-manager.js restore src/components/CriticalComponent.tsx backup-id-12345

# Emergency restore from latest backup
node tests/hooks/integration/git-hook-manager.js emergency-restore src/components/CriticalComponent.tsx
```

### Hook Troubleshooting

```bash
# Check hook installation status
ls -la .git/hooks/

# Verify hook permissions
chmod +x .git/hooks/*

# Test individual hooks
.git/hooks/pre-commit
.git/hooks/commit-msg .git/COMMIT_EDITMSG

# View hook logs
cat .claude_workspace/hook-execution.log

# Regenerate hooks
node tests/hooks/integration/git-hook-manager.js uninstall
node tests/hooks/integration/git-hook-manager.js install
```

## Troubleshooting

### Common Issues

#### 1. Hook Permission Denied

```bash
# Error: permission denied: .git/hooks/pre-commit
chmod +x .git/hooks/*
```

#### 2. Node.js Module Not Found

```bash
# Error: Cannot find module 'git-hook-manager'
cd /path/to/vana
npm install
# or
uv install
```

#### 3. PRD Validation Failures

```bash
# Check PRD requirements
cat docs/vana-frontend-prd-final.md

# Validate specific file
node tests/hooks/validation/real-prd-validator.js validate src/components/Component.tsx
```

#### 4. Security Check False Positives

```bash
# Review security patterns
node tests/hooks/validation/git-commit-validator.js validate-staged

# Temporarily bypass security checks
node tests/hooks/integration/git-hook-manager.js bypass "False positive in security scan" 15
```

#### 5. Performance Issues

```bash
# Check hook performance
node tests/hooks/validation/git-commit-validator.js metrics

# Clear validation cache
node tests/hooks/validation/git-commit-validator.js clear-cache

# Enable performance mode
# Edit .claude_workspace/git-hooks-config.json:
# "performance": { "enableParallelValidation": true, "cacheValidationResults": true }
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set debug environment
export DEBUG=1
export GIT_HOOKS_LOG_LEVEL=debug

# Run operations with verbose output
git commit -m "test: debug commit"
```

### Log Files

Review log files for detailed information:

```bash
# Hook execution logs
cat .claude_workspace/hook-execution.log

# Validation logs
cat .claude_workspace/validation.log

# Performance metrics
cat .claude_workspace/performance-metrics.json
```

## Development Guidelines

### Adding Custom Validations

1. **Extend PRD Validator**:
```javascript
// In tests/hooks/validation/real-prd-validator.js
async validateCustomRule(filePath, content, validation) {
  // Add custom validation logic
  if (customCondition) {
    validation.warnings.push('Custom validation warning');
  }
}
```

2. **Add Security Patterns**:
```javascript
// In tests/hooks/validation/git-commit-validator.js
this.securityPatterns.push({
  pattern: /custom-security-pattern/g,
  severity: 'high',
  message: 'Custom security issue detected',
  suggestion: 'Use secure alternative'
});
```

### Modifying Hook Behavior

1. **Update Hook Configuration**:
```json
// .claude_workspace/git-hooks-config.json
{
  "validation": {
    "enableCustomValidation": true,
    "customRules": ["rule1", "rule2"]
  }
}
```

2. **Override Hook Methods**:
```javascript
// Extend GitHookManager class
class CustomGitHookManager extends GitHookManager {
  async executePreCommitHook(args) {
    // Custom pre-commit logic
    const result = await super.executePreCommitHook(args);
    // Add custom processing
    return result;
  }
}
```

### Testing Hook Changes

```bash
# Run integration tests
node tests/hooks/integration/test-git-hooks-integration.spec.js

# Test specific hook
node tests/hooks/integration/git-hook-manager.js execute-hook pre-commit

# Test with sample files
echo "test content" > test-file.tsx
git add test-file.tsx
git commit -m "test: verify custom changes"
```

### Performance Optimization

1. **Enable Caching**:
```json
{
  "performance": {
    "cacheValidationResults": true,
    "enableParallelValidation": true
  }
}
```

2. **Optimize Validation Patterns**:
- Use specific file type filters
- Implement early returns for non-applicable files
- Cache expensive operations

3. **Monitor Performance**:
```bash
# Check validation metrics
node tests/hooks/validation/git-commit-validator.js metrics

# Profile hook execution
time git commit -m "test: performance profiling"
```

## Integration with CI/CD

### GitHub Actions

Add validation steps to your workflow:

```yaml
# .github/workflows/validation.yml
name: Git Hook Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: uv install
      - name: Run hook validations
        run: |
          node tests/hooks/validation/git-commit-validator.js validate
          node tests/hooks/integration/test-git-hooks-integration.spec.js
```

### Pre-commit Configuration

For teams using pre-commit framework:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: vana-pre-commit
        name: Vana Pre-commit Validation
        entry: node tests/hooks/integration/git-hook-manager.js execute-hook pre-commit
        language: system
        pass_filenames: false
```

## Support and Contributing

### Getting Help

1. **Check Documentation**: Review this guide and related docs
2. **View Logs**: Check `.claude_workspace/` directory for log files
3. **Run Diagnostics**: Use built-in status and metrics commands
4. **Create Issue**: Report bugs on GitHub with debug information

### Contributing

1. **Follow Coding Standards**: Use existing patterns and conventions
2. **Add Tests**: Include tests for new features
3. **Update Documentation**: Keep this guide current
4. **Test Thoroughly**: Verify changes don't break existing functionality

### Debugging Commands

```bash
# Complete system status
node tests/hooks/integration/git-hook-manager.js status

# Performance metrics
node tests/hooks/validation/git-commit-validator.js metrics

# Run integration tests
node tests/hooks/integration/test-git-hooks-integration.spec.js

# Validate configuration
cat .claude_workspace/git-hooks-config.json | jq .
```

## Conclusion

The Git hooks integration system provides comprehensive validation and automation for the Vana project's Git workflow. By enforcing PRD compliance, security standards, and performance guidelines, it helps maintain code quality while providing safety mechanisms for emergency situations.

For additional support or questions, refer to the project documentation or create an issue in the repository.

---

**Last Updated**: 2025-08-15  
**Version**: 1.0.0  
**Maintainer**: Vana Development Team