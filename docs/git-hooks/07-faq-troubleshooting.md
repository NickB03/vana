# Git Hook Integration System - FAQ and Troubleshooting Guide

## ❓ Frequently Asked Questions

### General Questions

#### Q: What exactly are hooks in the Vana project?
**A**: Hooks in the Vana project are automated integrations between Claude Code file operations and Claude Flow swarm coordination. When you perform file operations (read, write, edit), hooks automatically:
- Validate content against PRD requirements
- Coordinate with swarm agents
- Update persistent memory
- Track performance metrics
- Provide real-time guidance

#### Q: Do hooks slow down my development?
**A**: Initially, hooks add 15-50ms to file operations. However, they typically increase overall development velocity by 50-100% by:
- Preventing bugs that would take hours to fix later
- Eliminating multiple review cycles
- Providing immediate guidance instead of delayed feedback
- Automating coordination tasks

#### Q: Can I disable hooks temporarily?
**A**: Yes, several methods are available:

```bash
# Method 1: Environment variable
export CLAUDE_HOOKS_DISABLED=true

# Method 2: Hook control script
node .claude_workspace/commands/hook-control.js disable

# Method 3: Emergency override file
echo '{"hooks": {"enabled": false}}' > .claude_workspace/config/emergency-override.json
```

#### Q: Are hooks compatible with all file types?
**A**: Hooks work with all file types, but validation is optimized for:
- **TypeScript/JavaScript**: `.ts`, `.tsx`, `.js`, `.jsx`
- **CSS/Styling**: `.css`, `.scss`, `.sass`
- **Config files**: `.json`, `.yaml`, `.toml`
- **Documentation**: `.md`, `.mdx`

#### Q: How do hooks handle large files?
**A**: Hooks have built-in optimizations for large files:
- Files > 50KB get async validation
- Files > 100KB get sampled validation
- Files > 500KB get basic validation only
- Validation can be cached for unchanged content

#### Q: What happens if Claude Flow is not available?
**A**: Hooks degrade gracefully:
1. Attempt connection with 5-second timeout
2. On failure, log warning and continue operation
3. Local validation still works
4. Coordination features are disabled
5. Operations complete successfully

### Configuration Questions

#### Q: Where should I put my hook configuration?
**A**: Place configuration files in:
```
/Users/nick/Development/vana/.claude_workspace/config/hooks.json
```

For multiple environments:
```
.claude_workspace/config/hooks.dev.json
.claude_workspace/config/hooks.staging.json
.claude_workspace/config/hooks.prod.json
```

#### Q: How do I validate my configuration?
**A**: Use the built-in validation tool:

```bash
node tests/hooks/validation/config-validator.js .claude_workspace/config/hooks.json
```

#### Q: Can I use different configs for different projects?
**A**: Yes, hooks automatically detect project-specific configs:

```bash
# Project-specific config (highest priority)
.claude_workspace/config/hooks.json

# User-specific config (medium priority)
~/.claude/hooks.json

# Global config (lowest priority)
/usr/local/lib/claude-flow/hooks.json
```

#### Q: How do I share configurations with my team?
**A**: Create team configuration templates:

```bash
# Export current config as team template
node .claude_workspace/commands/export-config.js --team-template

# Import team template on new machine
node .claude_workspace/commands/import-config.js --from team-hooks.json
```

### Performance Questions

#### Q: My hooks are running slowly. How can I optimize?
**A**: Try these optimization strategies:

1. **Enable caching**:
```json
{
  "performance": {
    "cacheResults": true,
    "cacheValidation": true,
    "cacheDuration": 300000
  }
}
```

2. **Use async processing**:
```json
{
  "hooks": {
    "PostToolUse": [{
      "hooks": [{"async": true}]
    }]
  }
}
```

3. **Reduce validation scope**:
```json
{
  "validation": {
    "prdCompliance": {
      "samplingRate": 0.5,
      "fastMode": true
    }
  }
}
```

#### Q: How do I monitor hook performance?
**A**: Use the built-in performance monitor:

```bash
# Real-time monitoring
node tests/hooks/monitoring/real-time-performance-monitor.js

# Generate performance report
node tests/hooks/automation/hook-test-runner.js performance
```

#### Q: What are acceptable performance thresholds?
**A**: Recommended thresholds:

| Operation | Target Time | Warning Time | Error Time |
|-----------|-------------|--------------|------------|
| Read Hook | < 20ms | 50ms | 100ms |
| Write Hook | < 100ms | 200ms | 500ms |
| Edit Hook | < 80ms | 150ms | 300ms |
| Validation | < 200ms | 500ms | 1000ms |

### Validation and PRD Questions

#### Q: What is PRD validation?
**A**: PRD (Product Requirements Document) validation ensures your code follows project-specific requirements:
- **UI Framework**: Must use shadcn/ui components
- **Accessibility**: Required data-testid attributes
- **Performance**: File size and complexity limits
- **Structure**: Component organization patterns

#### Q: How do I customize PRD rules?
**A**: Add custom rules to your configuration:

```json
{
  "validation": {
    "prdCompliance": {
      "customRules": [
        {
          "pattern": "console\\.log",
          "message": "Remove console.log statements",
          "severity": "warning",
          "autoFix": "// console.log"
        },
        {
          "pattern": "import .* from ['\"]react['\"]",
          "requiredImport": "import React from 'react'",
          "message": "Use default React import pattern"
        }
      ]
    }
  }
}
```

#### Q: Why is my compliant code being flagged as a violation?
**A**: Common causes:

1. **Outdated PRD rules**: Update to latest ruleset
2. **Pattern mismatch**: Check exact pattern in rule
3. **Context sensitivity**: Some rules only apply in specific contexts
4. **Version differences**: Ensure Claude Flow is up to date

Debug with:
```bash
node tests/hooks/validation/real-prd-validator.js --debug --file your-file.tsx
```

#### Q: How do I request PRD rule changes?
**A**: PRD rules can be updated through:

1. **Local customization** (immediate):
```json
{
  "validation": {
    "prdCompliance": {
      "ruleOverrides": {
        "ui-framework": "disabled",
        "custom-accessibility": {
          "pattern": "your-pattern",
          "message": "your-message"
        }
      }
    }
  }
}
```

2. **Team discussion** (recommended for shared rules)
3. **Project-level updates** (for permanent changes)

### Agent Coordination Questions

#### Q: What are swarm agents and how do they work?
**A**: Swarm agents are specialized AI assistants that coordinate with your development:

- **Coder**: Code implementation and optimization
- **Reviewer**: Code quality and compliance checking  
- **Tester**: Test generation and validation
- **Architect**: System design and structure guidance

They communicate through shared memory and coordinate tasks automatically.

#### Q: How many agents should I use?
**A**: Recommended agent counts:

- **Solo development**: 2-3 agents (coder, reviewer)
- **Team development**: 3-4 agents (coder, reviewer, tester, architect)
- **Complex projects**: 4-5 agents (full specialization)
- **Performance-critical**: 1-2 agents (minimal overhead)

#### Q: Can I disable agent coordination?
**A**: Yes, set coordination to false:

```json
{
  "coordination": {
    "swarmEnabled": false
  }
}
```

This maintains local validation while disabling swarm features.

#### Q: How do I debug agent coordination issues?
**A**: Use coordination debugging tools:

```bash
# Check agent status
npx claude-flow swarm status --detailed

# View agent communication logs
npx claude-flow memory retrieve --namespace coordination --pattern "agent-*"

# Test agent connectivity
npx claude-flow agent test --agent-type coder
```

### Memory and Neural Pattern Questions

#### Q: What data do hooks store in memory?
**A**: Hooks store:
- **File operation history**: What files were modified when
- **Performance metrics**: Execution times and resource usage
- **Compliance scores**: PRD validation results over time
- **Neural patterns**: Learned development patterns
- **Agent coordination**: Task assignments and completions

All data is local and encrypted.

#### Q: How do I clear hook memory?
**A**: Several clearing options:

```bash
# Clear all hook memory
npx claude-flow memory clear --namespace hooks

# Clear specific memory types
npx claude-flow memory clear --pattern "performance-*"
npx claude-flow memory clear --pattern "validation-*"

# Clear old entries (older than 7 days)
npx claude-flow memory cleanup --older-than 7d
```

#### Q: What are neural patterns?
**A**: Neural patterns are learned behaviors that improve over time:
- **Code patterns**: Common structures you use
- **Performance patterns**: Operations that are fast/slow
- **Error patterns**: Mistakes you commonly make
- **Usage patterns**: When and how you work

They enable predictive assistance and optimization.

#### Q: How do I disable neural learning?
**A**: Disable in configuration:

```json
{
  "neural": {
    "enabled": false,
    "patterns": {
      "learning": false,
      "prediction": false
    }
  }
}
```

## 🔧 Troubleshooting Guide

### Installation Issues

#### Issue: "npx claude-flow command not found"

**Symptoms**:
```bash
npx claude-flow hooks pre-task
# npx: command not found: claude-flow
```

**Solution**:
```bash
# Verify Node.js and npm
node --version  # Should be 18.0.0+
npm --version   # Should be 8.0.0+

# Install Claude Flow globally
npm install -g @ruvnet/claude-flow@latest

# Verify installation
npx claude-flow --version

# If still failing, try:
npm cache clean --force
npm install -g @ruvnet/claude-flow@latest --force
```

#### Issue: "Permission denied" errors

**Symptoms**:
```bash
Error: EACCES: permission denied, open '.claude_workspace/config/hooks.json'
```

**Solution**:
```bash
# Fix directory permissions
chmod -R 755 .claude_workspace/

# Fix file permissions
chmod 644 .claude_workspace/config/hooks.json

# If using macOS, may need to grant terminal full disk access
# System Preferences > Security & Privacy > Privacy > Full Disk Access
```

#### Issue: Environment variables not loading

**Symptoms**:
```bash
Warning: GOOGLE_CLOUD_PROJECT not found
Error: Environment configuration incomplete
```

**Solution**:
```bash
# Verify .env.local files exist
ls -la .env.local app/.env.local

# Check file contents
cat .env.local

# Test environment loading
uv run --env-file .env.local python -c "import os; print(os.environ.get('GOOGLE_CLOUD_PROJECT'))"

# If missing, create .env.local:
cat > .env.local << 'EOF'
GOOGLE_CLOUD_PROJECT=analystai-454200
BRAVE_API_KEY=your_key_here
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
EOF
```

### Runtime Issues

#### Issue: Hooks timing out

**Symptoms**:
```bash
⚠️  Hook execution timeout (30000ms)
Error: Command execution failed: timeout
```

**Solution**:
```bash
# Increase timeout in configuration
{
  "hooks": {
    "PreToolUse": [{
      "hooks": [{
        "timeout": 60000  // Increase to 60 seconds
      }]
    }]
  }
}

# Or reduce validation scope
{
  "validation": {
    "prdCompliance": {
      "fastMode": true,
      "samplingRate": 0.3
    }
  }
}
```

#### Issue: High memory usage

**Symptoms**:
```bash
Warning: Hook system memory usage: 150MB (threshold: 100MB)
System performance degraded
```

**Solution**:
```bash
# Enable memory optimization
{
  "performance": {
    "memoryOptimization": true,
    "clearCacheInterval": 300000,  // 5 minutes
    "maxCacheSize": 50000000       // 50MB
  }
}

# Clear memory manually
npx claude-flow memory compress --namespace hooks
npx claude-flow memory cleanup --older-than 1h
```

#### Issue: PRD validation false positives

**Symptoms**:
```bash
🚫 OPERATION BLOCKED: components/ValidComponent.tsx
❌ Violation: Custom UI framework detected
   Pattern matched: "@/components/ui/button"
```

**Solution**:
```bash
# Debug validation
node tests/hooks/validation/real-prd-validator.js --debug --file components/ValidComponent.tsx

# Check for pattern conflicts
{
  "validation": {
    "prdCompliance": {
      "debug": true,
      "logMatches": true
    }
  }
}

# Add exception pattern
{
  "validation": {
    "prdCompliance": {
      "exceptions": [
        "@/components/ui/*"
      ]
    }
  }
}
```

### Performance Issues

#### Issue: Slow file operations

**Symptoms**:
```bash
File write took 3.2s (expected < 0.1s)
Hook validation: 2.8s
```

**Solution**:
```bash
# Profile hook performance
node tests/hooks/monitoring/performance-integrated-hooks.js --profile

# Enable performance mode
{
  "performance": {
    "mode": "fast",
    "skipHeavyValidation": true,
    "asyncProcessing": true,
    "cacheAggressive": true
  }
}

# Reduce validation scope
{
  "validation": {
    "prdCompliance": {
      "quickMode": true,
      "skipLargeFiles": true,
      "maxFileSize": 20000
    }
  }
}
```

#### Issue: High CPU usage

**Symptoms**:
```bash
Hook system CPU usage: 45% (threshold: 20%)
System fan spinning, computer slow
```

**Solution**:
```bash
# Reduce hook frequency
{
  "hooks": {
    "throttling": {
      "enabled": true,
      "minInterval": 1000,  // Minimum 1s between hooks
      "maxConcurrent": 2    // Max 2 concurrent hooks
    }
  }
}

# Disable heavy features
{
  "neural": {
    "enabled": false
  },
  "coordination": {
    "swarmEnabled": false
  }
}
```

### Integration Issues

#### Issue: Hooks not triggering

**Symptoms**:
```bash
# File operations complete but no hook output
# No validation messages
# No coordination activity
```

**Solution**:
```bash
# Check hook registration
node .claude_workspace/commands/hook-control.js status

# Test hook manually
npx claude-flow hooks pre-edit --file test.txt --operation write

# Verify configuration syntax
node tests/hooks/validation/config-validator.js .claude_workspace/config/hooks.json

# Enable debug logging
{
  "logging": {
    "level": "debug",
    "hookExecution": true,
    "commandOutput": true
  }
}
```

#### Issue: Swarm agents not responding

**Symptoms**:
```bash
🤖 Spawning agents...
⚠️  Agent spawn timeout
Error: No agents available for coordination
```

**Solution**:
```bash
# Check Claude Flow service
npx claude-flow swarm status

# Restart swarm if needed
npx claude-flow swarm destroy --all
npx claude-flow swarm init --topology hierarchical

# Test agent connectivity
npx claude-flow agent spawn --type coder --test

# Reduce agent requirements
{
  "coordination": {
    "maxAgents": 2,
    "spawnTimeout": 60000,
    "fallbackToLocal": true
  }
}
```

### Error Recovery

#### Issue: Corrupted hook configuration

**Symptoms**:
```bash
Error: Invalid JSON in hooks.json
SyntaxError: Unexpected token in JSON
```

**Solution**:
```bash
# Validate JSON syntax
cat .claude_workspace/config/hooks.json | jq .

# If corrupted, restore from backup
cp .claude_workspace/config/hooks.json.bak .claude_workspace/config/hooks.json

# Or create new minimal config
cat > .claude_workspace/config/hooks.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path'"
      }]
    }]
  },
  "validation": {
    "enabled": false
  }
}
EOF
```

#### Issue: Memory corruption

**Symptoms**:
```bash
Error: Memory store corrupted
Warning: Unable to load hook history
Error: Neural patterns database invalid
```

**Solution**:
```bash
# Backup current memory
cp -r .claude_workspace/memory .claude_workspace/memory.bak

# Clear corrupted memory
npx claude-flow memory clear --all --force

# Restore from backup if available
if [ -d .claude_workspace/memory.backup ]; then
  cp -r .claude_workspace/memory.backup/* .claude_workspace/memory/
fi

# Rebuild neural patterns
npx claude-flow neural retrain --from-history
```

### Emergency Recovery

#### Complete Hook System Reset

If all else fails, perform a complete reset:

```bash
#!/bin/bash
echo "🚨 Emergency Hook System Reset"

# 1. Disable hooks
export CLAUDE_HOOKS_DISABLED=true

# 2. Backup current configuration
cp -r .claude_workspace .claude_workspace.backup

# 3. Clear all hook data
rm -rf .claude_workspace/memory/*
rm -rf .claude_workspace/reports/*
rm -rf .claude_workspace/config/hooks.json

# 4. Reinstall Claude Flow
npm uninstall -g @ruvnet/claude-flow
npm install -g @ruvnet/claude-flow@latest

# 5. Create minimal configuration
mkdir -p .claude_workspace/config
cat > .claude_workspace/config/hooks.json << 'EOF'
{
  "hooks": {},
  "validation": {"enabled": false},
  "coordination": {"swarmEnabled": false}
}
EOF

# 6. Test basic functionality
npx claude-flow --version
npx claude-flow hooks pre-task --description "Reset test"

# 7. Re-enable hooks
unset CLAUDE_HOOKS_DISABLED

echo "✅ Emergency reset complete"
echo "👥 Contact team if issues persist"
```

## 📞 Getting Help

### Self-Service Resources

1. **Run diagnostics**:
```bash
bash tests/hooks/automation/run-hook-tests.sh --verbose
```

2. **Check system status**:
```bash
node tests/hooks/validation/real-error-handler.js --diagnose
```

3. **Review logs**:
```bash
tail -f .claude_workspace/reports/hook-tests/logs/latest.log
```

### Community Support

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check latest docs for updates
- **Team Chat**: Internal team support channels

### Professional Support

For enterprise deployments:
- **Architecture Review**: System design consultation
- **Performance Optimization**: Custom optimization plans
- **Training Services**: Team onboarding and best practices
- **24/7 Support**: Critical issue resolution

---

**Next**: [Performance and Testing Documentation - Hook System Testing and Benchmarks](./08-performance-testing.md)