# Claude Code & Claude Flow Hooks Expert Guide

## 🎯 **Critical Hook Fundamentals**

### **Claude Code Hooks vs Claude Flow Hooks**

**Claude Code Hooks** (Built-in):
- User-defined shell commands that execute at specific workflow points
- Run automatically during agent loop with environment credentials
- Provide deterministic control over Claude Code behavior
- **SECURITY CRITICAL**: Execute with full user permissions

**Claude Flow Hooks** (External):
- Advanced swarm coordination and lifecycle management
- Background command execution and process management
- Multi-agent orchestration capabilities
- Enhanced automation and workflow coordination

## 🔧 **Claude Code Hook Events & Implementation**

### **Available Hook Events**

1. **PreToolUse**: Runs before tool calls (can block execution)
   - Use for: Validation, security checks, preparation
   - Critical: Can prevent dangerous operations

2. **PostToolUse**: Runs after tool calls complete
   - Use for: Cleanup, formatting, logging, analysis
   - Example: Auto-format code after edits

3. **UserPromptSubmit**: Runs when user submits a prompt
   - Use for: Preprocessing, validation, context enhancement

4. **Notification**: Runs when Claude Code sends notifications
   - Use for: Custom alerting, logging, external integrations

5. **Stop**: Runs when Claude Code finishes responding
   - Use for: Session cleanup, metrics collection

6. **Subagent Stop**: Runs when subagent tasks complete
   - Use for: Multi-agent coordination, result aggregation

7. **PreCompact**: Runs before compact operation
   - Use for: Data preservation, backup operations

8. **SessionStart**: Runs when starting/resuming a session
   - Use for: Environment setup, initialization

### **Hook Configuration Syntax**

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|MultiEdit|Write",
      "hooks": [{
        "type": "command",
        "command": "npx prettier --write $file_path"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command", 
        "command": "echo 'Executing: $command' >> .claude_workspace/audit.log"
      }]
    }]
  }
}
```

### **Critical Security Requirements**

🚨 **SECURITY WARNING**: Hooks run automatically with full user credentials
- Always review hook implementations before registration
- Use specific matchers to limit hook scope  
- Be cautious about data exfiltration risks
- Test hooks in isolated environments first

## 🔗 **Claude Flow Background Commands**

### **Execution Methods**

1. **Keyboard Shortcut**: `Ctrl+B` (double `Ctrl+B` in tmux)
2. **Programmatic**: `run_in_background: true` parameter
3. **Direct Prompt**: "Run this in the background"

### **Core Background Tools**

```javascript
// Start background process
Bash({
  command: "npm run dev",
  run_in_background: true,
  description: "Start development server"
})

// Monitor output
BashOutput({
  bash_id: "bash_1",
  filter: "error|warning" // Optional regex filter
})

// Kill process
KillBash({
  shell_id: "bash_1"
})
```

### **Process Management**

- **Sequential IDs**: bash_1, bash_2, bash_3, etc.
- **Interactive Commands**: `/bashes` to list active processes
- **Cross-terminal Support**: Works in VS Code, SSH, tmux
- **Incremental Output**: Only returns new output since last check

## 🏗️ **Production Hook Implementation**

### **File Operation Hooks**

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks pre-edit --file '$file_path' --operation '$tool_name'"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit", 
      "hooks": [{
        "type": "command",
        "command": "npx claude-flow hooks post-edit --file '$file_path' --memory-key 'swarm/$(date +%s)/$file_path'"
      }]
    }]
  }
}
```

### **Development Workflow Hooks**

```json
{
  "hooks": {
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
```

## 📊 **Real Hook Integration Strategy**

### **Phase 1: Replace Mock Execution**

**Current Problem**: All hook "execution" is simulated
```javascript
// WRONG: Mock execution
async mockHookExecution(hookType, context) {
  await this.sleep(Math.random() * 300)
  return { success: true, mockData: true }
}

// CORRECT: Real execution
async executeHook(hookType, context) {
  const command = `npx claude-flow hooks ${hookType} ${this.buildArgs(context)}`
  const result = await execAsync(command)
  return JSON.parse(result.stdout)
}
```

### **Phase 2: Production Validation Logic**

**Current Problem**: Fake PRD validation
```javascript
// WRONG: Mock validation
if ('custom-ui-lib' in content) {
  return { validated: false, violations: ["Mock violation"] }
}

// CORRECT: Real validation  
const validation = await this.validateAgainstPRD(filePath, content)
const complianceCheck = await this.checkShadcnUsage(content)
return { validated: validation.passed && complianceCheck.passed }
```

### **Phase 3: Real Error Handling**

**Current Problem**: Simulated errors
```javascript
// WRONG: Fake errors
const success = Math.random() > 0.05 // 95% fake success

// CORRECT: Real error handling
try {
  const result = await this.executeClaudeFlowHook(hookType, context)
  return { success: true, result }
} catch (error) {
  return { success: false, error: error.message, recovery: this.suggestRecovery(error) }
}
```

## 🎯 **Critical Implementation Checklist**

### **Immediate Actions Required**

- [ ] **Replace all `mockHookExecution` with real `npx claude-flow hooks` calls**
- [ ] **Implement actual PRD validation logic using file analysis**
- [ ] **Replace simulated performance metrics with real execution timing**
- [ ] **Add real error handling and recovery mechanisms**
- [ ] **Integrate hooks directly with Claude Code file operations**
- [ ] **Configure hook matchers for specific tool types**
- [ ] **Set up proper security review process**

### **Production Readiness Requirements**

1. **Security Review**: All hooks must be audited for safety
2. **Performance Testing**: Real execution time measurement
3. **Error Recovery**: Graceful handling of hook failures
4. **Logging**: Comprehensive hook execution logging
5. **Configuration**: Project-level hook configuration
6. **Testing**: Real workflow integration testing

## 🚀 **Next Steps for Real Implementation**

1. **Create Claude Code hooks configuration file**
2. **Replace mock functions with real claude-flow command execution**
3. **Implement production PRD validation logic**
4. **Add real error handling and recovery**
5. **Test with actual development workflows**
6. **Configure security-reviewed hook matchers**

The current "85% complete" hooks are actually **15% complete** - they're comprehensive mocks that need complete replacement with real functionality.