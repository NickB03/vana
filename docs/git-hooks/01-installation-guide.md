# Git Hook Integration System - Installation Guide

## 🚀 Quick Start

The Vana project features a comprehensive Git hook integration system that combines Claude Code's file operation hooks with Claude Flow's advanced swarm coordination. This guide will walk you through the complete installation and setup process.

## 📋 Prerequisites

### System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Latest version (comes with Node.js)
- **Docker**: Version 20.10+ (for advanced testing features)
- **Git**: Version 2.20+ with hook support
- **Operating System**: macOS, Linux, or Windows with WSL2

### Required Tools

```bash
# Verify prerequisites
node --version    # Should be 18.0.0+
npm --version     # Should be 8.0.0+
docker --version  # Should be 20.10+
git --version     # Should be 2.20+
```

### Development Environment

The hook system is designed to work with the Vana ADK project structure:

```
/Users/nick/Development/vana/          # Main project directory
├── .git/hooks/                       # Git hooks (managed by system)
├── .claude_workspace/                # Claude workspace directory
├── tests/hooks/                      # Hook testing framework
├── docs/                            # Documentation
└── app/                             # Application code
```

## 🔧 Installation Steps

### 1. Environment Setup

First, ensure you're launching Claude Code from the correct directory:

```bash
# Navigate to the main project directory
cd /Users/nick/Development/vana

# Verify you're in the correct location
pwd
# Should output: /Users/nick/Development/vana
```

> **Critical**: Always launch Claude Code from `/Users/nick/Development/vana/` to prevent virtualenv/CWD issues. Never launch from `/vana_vscode/`.

### 2. Install Dependencies

Install the required Node.js dependencies:

```bash
# Install project dependencies
npm install

# Install Claude Flow (if not already installed)
npm install -g @ruvnet/claude-flow@latest

# Verify Claude Flow installation
npx claude-flow --version
```

### 3. Configure Environment Variables

Create the required environment configuration files:

#### 3.1 Root Directory Configuration

Create `/Users/nick/Development/vana/.env.local`:

```bash
# API Keys for local development
BRAVE_API_KEY=your_brave_search_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# CORS configuration for local dev servers
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# Google Cloud project settings
GOOGLE_CLOUD_PROJECT=analystai-454200
```

#### 3.2 App Directory Configuration

Create `/Users/nick/Development/vana/app/.env.local`:

```bash
# Backend-specific configuration
SESSION_DATABASE_URI=sqlite:///./auth.db
GOOGLE_CLOUD_PROJECT=analystai-454200

# Additional backend settings
LOG_LEVEL=info
ENVIRONMENT=development
```

> **Security Note**: Never commit `.env.local` files to Git. They are automatically ignored via `.gitignore`.

### 4. Initialize Hook System

#### 4.1 Create Hook Configuration

The hook system uses a configuration file to define which hooks are active:

```bash
# Create hooks configuration directory
mkdir -p .claude_workspace/config

# Create hook configuration file
cat > .claude_workspace/config/hooks.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|MultiEdit|Write",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'swarm/$(date +%s)/$file_path'"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name'"
      }]
    }],
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-task --description '$prompt' --task-id 'task-$(date +%s)'"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-task --task-id '$task_id' --analyze-performance"
      }]
    }],
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks session-restore --session-id 'session-$(date +%Y%m%d)'"
      }]
    }]
  }
}
EOF
```

#### 4.2 Initialize Git Hooks

Set up the Git hook integration:

```bash
# Make setup script executable
chmod +x scripts/setup-claude-permissions.sh

# Run the setup script
./scripts/setup-claude-permissions.sh
```

### 5. Test Installation

#### 5.1 Basic Hook Test

Test that the hook system is working:

```bash
# Run the comprehensive hook test
cd tests/hooks/automation
node hook-test-runner.js --verbose --skip-stress

# Expected output should show:
# ✅ Functional tests passed
# ✅ Performance tests passed
# ✅ Integration tests passed
```

#### 5.2 Claude Flow Integration Test

Verify Claude Flow integration:

```bash
# Test Claude Flow connectivity
npx claude-flow hooks pre-task --description "Installation test" --task-id "test-$(date +%s)"

# Should output JSON response indicating successful hook execution
```

#### 5.3 File Operation Hook Test

Test file operation hooks:

```bash
# Create a test file to trigger hooks
echo 'import { Button } from "@/components/ui/button"' > test-component.tsx

# Remove test file
rm test-component.tsx
```

## 🔍 Verification Checklist

Use this checklist to verify your installation:

- [ ] **Environment Setup**
  - [ ] Node.js 18.0.0+ installed
  - [ ] Claude Code launched from `/Users/nick/Development/vana/`
  - [ ] Environment variables configured in `.env.local` files
  - [ ] Git hooks directory exists and is accessible

- [ ] **Dependencies**
  - [ ] npm dependencies installed successfully
  - [ ] Claude Flow installed globally and accessible
  - [ ] Docker running (for advanced testing)

- [ ] **Hook Configuration**
  - [ ] Hook configuration file created
  - [ ] PRD validation system initialized
  - [ ] Error handling system functional

- [ ] **Integration Tests**
  - [ ] Basic hook tests pass
  - [ ] Claude Flow integration works
  - [ ] File operation hooks trigger correctly
  - [ ] Performance benchmarks within acceptable ranges

## 🚨 Troubleshooting Common Issues

### Issue: "Command not found: npx claude-flow"

**Solution**:
```bash
# Reinstall Claude Flow globally
npm uninstall -g @ruvnet/claude-flow
npm install -g @ruvnet/claude-flow@latest

# Verify installation
which npx
npx claude-flow --version
```

### Issue: "Permission denied" errors

**Solution**:
```bash
# Fix permissions for hook scripts
chmod +x scripts/*.sh
chmod +x tests/hooks/automation/*.sh

# Verify Git hooks permissions
ls -la .git/hooks/
```

### Issue: "Hook validation failed"

**Solution**:
```bash
# Check hook configuration syntax
cat .claude_workspace/config/hooks.json | jq .

# Test hook execution manually
npx claude-flow hooks pre-task --description "Manual test"
```

### Issue: Environment variables not loading

**Solution**:
```bash
# Verify .env.local files exist and have correct permissions
ls -la .env.local app/.env.local

# Test environment variable loading
uv run --env-file .env.local python -c "import os; print(os.environ.get('GOOGLE_CLOUD_PROJECT'))"
```

### Issue: PRD validation blocking operations

**Solution**:
```bash
# Check PRD validator status
node tests/hooks/validation/real-prd-validator.js

# Disable hooks temporarily if needed
export CLAUDE_HOOKS_DISABLED=true
```

## 📊 Performance Considerations

### Expected Performance Impact

The hook system adds minimal overhead to development operations:

- **File Operations**: < 50ms additional latency
- **Memory Usage**: < 10MB additional RAM
- **CPU Usage**: < 5% additional CPU during hook execution

### Performance Monitoring

Monitor hook performance using the built-in benchmarking tools:

```bash
# Run performance benchmarks
cd tests/hooks/automation
node hook-test-runner.js performance

# View performance report
open .claude_workspace/reports/hook-tests/performance/performance-benchmark.json
```

## 🔄 Maintenance and Updates

### Regular Maintenance Tasks

1. **Update Claude Flow**:
   ```bash
   npm update -g @ruvnet/claude-flow
   ```

2. **Clean Hook History**:
   ```bash
   rm -rf .claude_workspace/reports/hook-tests/*
   ```

3. **Verify Hook Configuration**:
   ```bash
   node tests/hooks/validation/real-prd-validator.js --check-config
   ```

### Configuration Updates

When updating hook configurations, always validate the syntax:

```bash
# Validate hook configuration
cat .claude_workspace/config/hooks.json | jq empty && echo "Valid JSON" || echo "Invalid JSON"

# Test configuration changes
node tests/hooks/automation/hook-test-runner.js functional
```

## 🔗 Next Steps

After successful installation:

1. **Read the User Guide**: Learn how to use the hook system in your daily development workflow
2. **Configure Custom Hooks**: Set up project-specific hook configurations
3. **Explore Advanced Features**: Dive into swarm coordination and neural pattern training
4. **Set Up CI/CD Integration**: Configure hooks for your deployment pipeline

## 📞 Support

If you encounter issues during installation:

1. Check the [FAQ and Troubleshooting Guide](./07-faq-troubleshooting.md)
2. Review the [Technical Reference](./03-technical-reference.md) for detailed system information
3. Run the diagnostic script: `bash tests/hooks/automation/run-hook-tests.sh --verbose`

---

**Next**: [User Guide - Developer Workflow Documentation](./02-user-guide.md)