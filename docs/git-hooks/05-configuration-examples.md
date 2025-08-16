# Git Hook Integration System - Configuration Examples

## 🎯 Overview

This guide provides practical configuration examples for different development scenarios. Each configuration is production-tested and includes explanations of when and why to use specific settings.

## 📁 Configuration File Location

All hook configurations should be placed in:
```
/Users/nick/Development/vana/.claude_workspace/config/hooks.json
```

## 🚀 Basic Configurations

### 1. Minimal Hook Setup

**Use Case**: Just starting with hooks, want basic file operation tracking

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'basic/$(date +%s)'"
      }]
    }]
  },
  "validation": {
    "enabled": false
  },
  "coordination": {
    "swarmEnabled": false
  }
}
```

**Features**:
- ✅ Basic file operation tracking
- ❌ No PRD validation
- ❌ No swarm coordination
- ⚡ Minimal performance impact

### 2. Development-Friendly Setup

**Use Case**: Active development with helpful validation but not blocking

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --warn-only"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'dev/$(date +%s)/$file_path'"
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 70,
      "blockOnViolation": false,
      "warnOnViolation": true
    }
  },
  "coordination": {
    "swarmEnabled": false
  },
  "logging": {
    "level": "info",
    "includeWarnings": true
  }
}
```

**Features**:
- ✅ PRD validation with warnings
- ✅ Helpful guidance without blocking
- ❌ No agent coordination
- ⚡ Low performance impact

## 🛡️ Production Configurations

### 3. Full PRD Enforcement

**Use Case**: Production-ready development with strict compliance

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --strict-mode",
        "timeout": 30000,
        "retryCount": 2
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'prod/$(date +%s)/$file_path' --analyze-impact"
      }]
    }],
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-task --description '$prompt' --task-id 'task-$(date +%s)' --compliance-check"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-task --task-id '$task_id' --analyze-performance --compliance-report"
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 90,
      "blockOnViolation": true,
      "strictMode": true,
      "customRules": [
        {
          "pattern": "import.*from ['\"](?!@/components/ui/)[^'\"]*ui[^'\"]*['\"]",
          "message": "Only shadcn/ui components are allowed. Use @/components/ui/* imports.",
          "severity": "error"
        },
        {
          "pattern": "className=['\"][^'\"]*(?<!text-|bg-|border-)[a-z]+-[a-z]+[^'\"]*['\"]",
          "message": "Use Tailwind utility classes. Avoid custom CSS classes.",
          "severity": "warning"
        }
      ]
    },
    "accessibility": {
      "enabled": true,
      "requireTestIds": true,
      "requireAltText": true,
      "checkColorContrast": true
    },
    "performance": {
      "maxFileSize": 30000,
      "maxBundleImpact": 50000,
      "checkRenderPerformance": true
    }
  },
  "coordination": {
    "swarmEnabled": false
  },
  "security": {
    "sanitizeInputs": true,
    "validatePaths": true,
    "maxExecutionTime": 60000
  }
}
```

**Features**:
- ✅ Strict PRD enforcement
- ✅ Custom validation rules
- ✅ Accessibility checking
- ✅ Performance monitoring
- ⚡ Medium performance impact

### 4. Team Collaboration Setup

**Use Case**: Multiple developers working on shared codebase

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --team-mode --user '$USER'"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit", 
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'team/$(date +%s)/$USER/$file_path' --notify-team"
      }]
    }],
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks session-restore --session-id 'team-$(date +%Y%m%d)' --sync-team-state"
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 85,
      "blockOnViolation": true,
      "teamConsensus": true
    },
    "codeReview": {
      "enabled": true,
      "requireApproval": false,
      "autoAssignReviewers": true,
      "conflictDetection": true
    }
  },
  "coordination": {
    "swarmEnabled": true,
    "teamMode": true,
    "conflictResolution": "merge",
    "notificationChannels": ["console", "webhook"]
  },
  "sharing": {
    "shareCompliance": true,
    "sharePerformance": true,
    "shareBestPractices": true
  }
}
```

**Features**:
- ✅ Team coordination
- ✅ Conflict detection
- ✅ Shared compliance tracking
- ✅ Team notifications
- ⚡ Medium performance impact

## 🤖 Advanced Agent Coordination

### 5. Full Swarm Development

**Use Case**: Complex projects requiring multi-agent coordination

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --auto-spawn-agents"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command", 
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'swarm/$(date +%s)/$file_path' --coordinate-agents"
      }]
    }],
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-task --description '$prompt' --task-id 'task-$(date +%s)' --auto-spawn-agents --max-agents 4"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-task --task-id '$task_id' --analyze-performance --coordinate-completion"
      }]
    }],
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks session-restore --session-id 'swarm-$(date +%Y%m%d)' --restore-agents"
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 85,
      "blockOnViolation": true,
      "agentValidation": true
    }
  },
  "coordination": {
    "swarmEnabled": true,
    "maxAgents": 4,
    "agentTypes": ["coder", "reviewer", "tester", "architect"],
    "topology": "hierarchical",
    "autoScaling": true,
    "neuralPatterns": true
  },
  "memory": {
    "persistent": true,
    "crossSession": true,
    "neuralLearning": true,
    "patternRecognition": true
  },
  "performance": {
    "monitoring": "realtime",
    "optimization": "automatic",
    "loadBalancing": true
  }
}
```

**Features**:
- ✅ Full swarm coordination
- ✅ Automatic agent spawning
- ✅ Neural pattern learning
- ✅ Cross-session memory
- ⚡ High performance impact

### 6. Neural Pattern Training

**Use Case**: Optimize development patterns through machine learning

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'neural/$(date +%s)/$file_path' --train-patterns"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-task --task-id '$task_id' --neural-analysis --pattern-optimization"
      }]
    }]
  },
  "neural": {
    "enabled": true,
    "patterns": {
      "convergent": true,
      "divergent": true,
      "lateral": true,
      "systems": true,
      "critical": true,
      "adaptive": true
    },
    "training": {
      "continuous": true,
      "batchSize": 50,
      "learningRate": 0.01,
      "adaptationThreshold": 0.8
    },
    "analysis": {
      "codePatterns": true,
      "performancePatterns": true,
      "errorPatterns": true,
      "userBehaviorPatterns": true
    }
  },
  "optimization": {
    "autoOptimize": true,
    "predictiveAssistance": true,
    "patternSuggestions": true,
    "performancePrediction": true
  }
}
```

**Features**:
- ✅ Continuous neural training
- ✅ Pattern recognition
- ✅ Predictive assistance
- ✅ Auto-optimization
- ⚡ Medium performance impact

## 🎛️ Specialized Configurations

### 7. Performance-Focused Setup

**Use Case**: High-performance development with minimal hook overhead

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'perf/$(date +%s)' --lightweight",
        "async": true,
        "timeout": 10000
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 80,
      "blockOnViolation": false,
      "asyncValidation": true,
      "cacheValidation": true
    }
  },
  "performance": {
    "maxExecutionTime": 5000,
    "cacheResults": true,
    "batchOperations": true,
    "asyncProcessing": true,
    "memoryOptimization": true
  },
  "coordination": {
    "swarmEnabled": false
  }
}
```

**Features**:
- ✅ Minimal execution time
- ✅ Async processing
- ✅ Result caching
- ✅ Memory optimization
- ⚡ Minimal performance impact

### 8. Security-Hardened Setup

**Use Case**: Security-critical development environment

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --security-scan",
        "environment": {
          "SECURITY_MODE": "strict",
          "AUDIT_ENABLED": "true"
        }
      }]
    }],
    "PostToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'secure/$(date +%s)/$file_path' --audit-trail"
      }]
    }]
  },
  "security": {
    "enabled": true,
    "pathValidation": {
      "enabled": true,
      "allowedPaths": ["/Users/nick/Development/vana"],
      "blockedPaths": ["/", "/etc", "/var", "/usr"]
    },
    "contentScanning": {
      "enabled": true,
      "scanForSecrets": true,
      "scanForVulnerabilities": true,
      "blockedPatterns": [
        "password\\s*=",
        "api[_-]?key\\s*=",
        "secret\\s*=",
        "token\\s*="
      ]
    },
    "commandSanitization": {
      "enabled": true,
      "allowedCommands": ["npx claude-flow"],
      "maxArguments": 20,
      "timeoutMs": 30000
    },
    "auditLogging": {
      "enabled": true,
      "logPath": ".claude_workspace/security/audit.log",
      "logLevel": "detailed"
    }
  },
  "validation": {
    "securityCompliance": {
      "enabled": true,
      "checkDependencies": true,
      "scanForVulnerabilities": true,
      "requireSecurePatterns": true
    }
  }
}
```

**Features**:
- ✅ Path traversal protection
- ✅ Secret scanning
- ✅ Vulnerability detection
- ✅ Comprehensive audit logs
- ⚡ Medium performance impact

## 🔧 Development Environment Specific

### 9. Local Development

**Use Case**: Development machine with full features enabled

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --dev-mode"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'local/$(date +%s)/$file_path' --auto-format"
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 75,
      "blockOnViolation": false,
      "showSuggestions": true
    }
  },
  "development": {
    "autoFormat": true,
    "liveReload": true,
    "debugMode": true,
    "verboseLogging": true,
    "showPerformanceMetrics": true
  },
  "coordination": {
    "swarmEnabled": true,
    "maxAgents": 3,
    "developmentAgents": ["coder", "reviewer"]
  }
}
```

### 10. CI/CD Environment

**Use Case**: Continuous integration with strict validation

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --ci-mode --strict",
        "timeout": 60000
      }]
    }],
    "PostToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'ci/$(date +%s)/$file_path' --generate-report"
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 95,
      "blockOnViolation": true,
      "strictMode": true,
      "failFast": true
    },
    "testing": {
      "enabled": true,
      "requireTests": true,
      "coverageThreshold": 80,
      "runTests": true
    },
    "quality": {
      "enabled": true,
      "linting": true,
      "typeChecking": true,
      "securityScanning": true
    }
  },
  "reporting": {
    "enabled": true,
    "generateReports": true,
    "exportMetrics": true,
    "failureAnalysis": true
  },
  "coordination": {
    "swarmEnabled": false
  },
  "cicd": {
    "mode": true,
    "strictValidation": true,
    "failOnError": true,
    "timeoutMinutes": 10
  }
}
```

## 📱 Frontend-Specific Configurations

### 11. React/Next.js Optimized

**Use Case**: Frontend development with React/Next.js specific rules

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name' --frontend-mode"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'frontend/$(date +%s)/$file_path' --bundle-analysis"
      }]
    }]
  },
  "validation": {
    "prdCompliance": {
      "enabled": true,
      "minScore": 85,
      "blockOnViolation": true,
      "reactRules": true,
      "nextjsRules": true
    },
    "frontend": {
      "componentStructure": true,
      "propValidation": true,
      "hookUsage": true,
      "performancePatterns": true,
      "accessibilityRules": true
    },
    "bundleAnalysis": {
      "enabled": true,
      "maxSize": 100000,
      "treeShaking": true,
      "duplicateDetection": true
    }
  },
  "customRules": [
    {
      "pattern": "useState\\(.*\\)",
      "context": "component",
      "message": "Consider using useReducer for complex state",
      "severity": "info"
    },
    {
      "pattern": "useEffect\\(\\(\\) => \\{[\\s\\S]*\\}, \\[\\]\\)",
      "message": "Empty dependency array - ensure this effect should only run once",
      "severity": "warning"
    }
  ]
}
```

## 🛠️ Configuration Management

### Environment-Specific Configs

Create different configs for different environments:

```bash
# Development
.claude_workspace/config/hooks.dev.json

# Staging  
.claude_workspace/config/hooks.staging.json

# Production
.claude_workspace/config/hooks.prod.json
```

### Config Switching Script

```bash
#!/bin/bash
# switch-hook-config.sh

ENVIRONMENT=${1:-dev}
CONFIG_DIR=".claude_workspace/config"
SOURCE_CONFIG="$CONFIG_DIR/hooks.$ENVIRONMENT.json"
TARGET_CONFIG="$CONFIG_DIR/hooks.json"

if [ -f "$SOURCE_CONFIG" ]; then
    cp "$SOURCE_CONFIG" "$TARGET_CONFIG"
    echo "✅ Switched to $ENVIRONMENT hook configuration"
else
    echo "❌ Configuration file not found: $SOURCE_CONFIG"
    exit 1
fi
```

### Config Validation

Validate configurations before applying:

```javascript
// validate-config.js
const fs = require('fs');
const Ajv = require('ajv');

const schema = {
  type: "object",
  properties: {
    hooks: {
      type: "object",
      properties: {
        PreToolUse: { type: "array" },
        PostToolUse: { type: "array" },
        UserPromptSubmit: { type: "array" },
        Stop: { type: "array" },
        SessionStart: { type: "array" }
      }
    },
    validation: { type: "object" },
    coordination: { type: "object" }
  },
  required: ["hooks"]
};

const ajv = new Ajv();
const validate = ajv.compile(schema);

const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (validate(config)) {
  console.log('✅ Configuration is valid');
} else {
  console.log('❌ Configuration errors:', validate.errors);
  process.exit(1);
}
```

---

**Next**: [Developer Experience Guide - Migration from Hookless Workflows](./06-developer-experience.md)