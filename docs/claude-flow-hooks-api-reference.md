# Claude Flow Hooks API Reference

## Overview

The Claude Flow Hooks API provides a comprehensive set of CLI commands for agent coordination, memory management, and workflow automation. This document details all hook commands, their parameters, return values, and integration patterns as referenced in the CLAUDE.md coordination protocol.

## Table of Contents

1. [Hook Command Categories](#hook-command-categories)
2. [Core Hook Commands](#core-hook-commands)
3. [Parameter Specification](#parameter-specification)
4. [Return Value Formats](#return-value-formats)
5. [Integration Patterns](#integration-patterns)
6. [Error Handling](#error-handling)
7. [Usage Examples](#usage-examples)
8. [Agent Coordination Workflows](#agent-coordination-workflows)

## Hook Command Categories

### Lifecycle Hooks
- `pre-task` - Initialize agent tasks
- `post-task` - Complete and analyze tasks  
- `session-restore` - Restore session context
- `session-end` - Finalize session state

### Operation Hooks  
- `post-edit` - Process file modifications
- `notify` - Agent communication and alerts

### Memory Management
- `memory-store` - Persist data to memory
- `memory-retrieve` - Load data from memory
- `memory-sync` - Synchronize memory across agents

## Core Hook Commands

### 1. pre-task

**Purpose**: Initialize agent tasks and prepare execution context

**Syntax**:
```bash
npx claude-flow@alpha hooks pre-task [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--description` | string | ✅ | Task description or instructions | - |
| `--agent-id` | string | ❌ | Specific agent identifier | auto-generated |
| `--priority` | string | ❌ | Task priority level | `medium` |
| `--tags` | array | ❌ | Task categorization tags | `[]` |
| `--timeout` | number | ❌ | Task timeout in seconds | `300` |
| `--memory-namespace` | string | ❌ | Memory namespace for task | `default` |

**Return Value**:
```json
{
  "success": true,
  "taskId": "task_abc123",
  "agentId": "agent_xyz456", 
  "sessionId": "session_def789",
  "memoryKeys": ["task/abc123/context", "task/abc123/state"],
  "estimatedDuration": 180,
  "assignedResources": {
    "cpu": "0.5",
    "memory": "512MB",
    "priority": "medium"
  }
}
```

**Usage Example**:
```bash
npx claude-flow@alpha hooks pre-task \
  --description "Implement user authentication system" \
  --priority "high" \
  --tags "security,auth,backend" \
  --timeout 600
```

### 2. session-restore

**Purpose**: Restore agent session context and memory state

**Syntax**:
```bash
npx claude-flow@alpha hooks session-restore [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--session-id` | string | ✅ | Session identifier to restore | - |
| `--agent-id` | string | ❌ | Specific agent to restore | `all` |
| `--memory-only` | boolean | ❌ | Restore only memory, not state | `false` |
| `--force-restore` | boolean | ❌ | Force restore even if conflicts | `false` |
| `--backup-current` | boolean | ❌ | Backup current state before restore | `true` |

**Return Value**:
```json
{
  "success": true,
  "sessionId": "session_def789",
  "restoredAgents": ["agent_xyz456", "agent_abc123"],
  "memoryRestored": {
    "keys": 15,
    "size": "2.4MB",
    "lastModified": "2025-08-18T10:30:00Z"
  },
  "stateRestored": {
    "tasks": 3,
    "workflows": 1,
    "connections": 8
  },
  "conflicts": [],
  "warnings": ["Agent agent_def456 not found in session"]
}
```

**Usage Example**:
```bash
npx claude-flow@alpha hooks session-restore \
  --session-id "swarm-auth-implementation" \
  --agent-id "backend-specialist" \
  --backup-current true
```

### 3. post-edit

**Purpose**: Process file modifications and update agent memory

**Syntax**:
```bash
npx claude-flow@alpha hooks post-edit [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--file` | string | ✅ | Path to modified file | - |
| `--memory-key` | string | ✅ | Memory key for storing context | - |
| `--operation` | string | ❌ | Type of operation performed | `edit` |
| `--agent-id` | string | ❌ | Agent performing the edit | `current` |
| `--analyze-impact` | boolean | ❌ | Analyze change impact | `false` |
| `--notify-agents` | array | ❌ | Agents to notify of changes | `[]` |
| `--create-checkpoint` | boolean | ❌ | Create memory checkpoint | `true` |

**Return Value**:
```json
{
  "success": true,
  "fileProcessed": "/path/to/modified/file.js",
  "memoryStored": {
    "key": "swarm/backend-dev/auth-routes",
    "size": "1.2KB",
    "timestamp": "2025-08-18T10:35:00Z"
  },
  "impactAnalysis": {
    "affectedFiles": ["/tests/auth.test.js", "/docs/api.md"],
    "riskLevel": "low",
    "suggestions": ["Update API documentation", "Run regression tests"]
  },
  "notifiedAgents": ["frontend-dev", "tester"],
  "checkpoint": "checkpoint_edit_123"
}
```

**Usage Example**:
```bash
npx claude-flow@alpha hooks post-edit \
  --file "/app/auth/routes.py" \
  --memory-key "swarm/backend-dev/auth-implementation" \
  --operation "create" \
  --analyze-impact true \
  --notify-agents "frontend-dev,tester"
```

### 4. notify

**Purpose**: Send notifications and messages between agents

**Syntax**:
```bash
npx claude-flow@alpha hooks notify [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--message` | string | ✅ | Message content | - |
| `--type` | string | ❌ | Message type | `info` |
| `--target` | string | ❌ | Target agent or group | `all` |
| `--priority` | string | ❌ | Message priority | `normal` |
| `--require-ack` | boolean | ❌ | Require acknowledgment | `false` |
| `--metadata` | object | ❌ | Additional message metadata | `{}` |
| `--broadcast` | boolean | ❌ | Broadcast to all agents | `false` |

**Return Value**:
```json
{
  "success": true,
  "messageId": "msg_abc123",
  "deliveredTo": ["agent_xyz456", "agent_def789"],
  "failedDelivery": [],
  "acknowledgments": ["agent_xyz456"],
  "timestamp": "2025-08-18T10:40:00Z",
  "messageType": "decision",
  "retryCount": 0
}
```

**Usage Example**:
```bash
npx claude-flow@alpha hooks notify \
  --message "Authentication routes completed, ready for frontend integration" \
  --type "decision" \
  --target "frontend-dev" \
  --priority "high" \
  --require-ack true
```

### 5. post-task

**Purpose**: Complete tasks and analyze performance

**Syntax**:
```bash
npx claude-flow@alpha hooks post-task [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--task-id` | string | ✅ | Task identifier | - |
| `--analyze-performance` | boolean | ❌ | Perform performance analysis | `false` |
| `--status` | string | ❌ | Task completion status | `completed` |
| `--results` | object | ❌ | Task results data | `{}` |
| `--export-metrics` | boolean | ❌ | Export performance metrics | `false` |
| `--archive-context` | boolean | ❌ | Archive task context | `true` |

**Return Value**:
```json
{
  "success": true,
  "taskId": "task_abc123",
  "status": "completed",
  "duration": 285,
  "performanceMetrics": {
    "executionTime": "4m 45s",
    "memoryUsage": "345MB",
    "cpuUtilization": "65%",
    "filesModified": 8,
    "linesOfCode": 247
  },
  "results": {
    "filesCreated": ["/app/auth/routes.py", "/tests/auth.test.py"],
    "testsPass": 12,
    "coverage": "94%"
  },
  "archivedContext": "archive_task_abc123_20250818",
  "nextRecommendations": ["Deploy to staging", "Update documentation"]
}
```

**Usage Example**:
```bash
npx claude-flow@alpha hooks post-task \
  --task-id "task_auth_implementation" \
  --analyze-performance true \
  --status "completed" \
  --export-metrics true
```

### 6. session-end

**Purpose**: Finalize session state and export metrics

**Syntax**:
```bash
npx claude-flow@alpha hooks session-end [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--session-id` | string | ❌ | Session to end | `current` |
| `--export-metrics` | boolean | ❌ | Export session metrics | `false` |
| `--save-state` | boolean | ❌ | Save session state | `true` |
| `--cleanup-temp` | boolean | ❌ | Clean up temporary data | `true` |
| `--generate-report` | boolean | ❌ | Generate session report | `false` |

**Return Value**:
```json
{
  "success": true,
  "sessionId": "session_def789",
  "endTime": "2025-08-18T11:00:00Z",
  "duration": "1h 30m",
  "summary": {
    "tasksCompleted": 5,
    "agentsActive": 3,
    "filesModified": 15,
    "memoryUsed": "12.5MB"
  },
  "metrics": {
    "efficiency": "87%",
    "collaboration": "92%",
    "codeQuality": "89%"
  },
  "savedState": "state_session_def789_final",
  "reportPath": "/reports/session_def789_report.md"
}
```

**Usage Example**:
```bash
npx claude-flow@alpha hooks session-end \
  --export-metrics true \
  --generate-report true \
  --cleanup-temp false
```

## Extended Hook Commands

### Memory Management Hooks

#### memory-store

**Purpose**: Store data in agent memory with TTL and namespacing

**Syntax**:
```bash
npx claude-flow@alpha hooks memory-store [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--key` | string | ✅ | Memory key identifier | - |
| `--value` | string | ✅ | Data to store | - |
| `--namespace` | string | ❌ | Memory namespace | `default` |
| `--ttl` | number | ❌ | Time to live in seconds | `3600` |
| `--compress` | boolean | ❌ | Compress data | `false` |

#### memory-retrieve

**Purpose**: Retrieve data from agent memory

**Syntax**:
```bash
npx claude-flow@alpha hooks memory-retrieve [options]
```

**Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `--key` | string | ✅ | Memory key identifier | - |
| `--namespace` | string | ❌ | Memory namespace | `default` |
| `--default` | string | ❌ | Default value if not found | `null` |

## Integration Patterns

### Agent Coordination Workflow

```bash
# 1. Initialize Task
npx claude-flow@alpha hooks pre-task \
  --description "Full-stack feature implementation" \
  --priority "high"

# 2. Restore Session Context  
npx claude-flow@alpha hooks session-restore \
  --session-id "swarm-feature-dev"

# 3. Process File Changes (repeated for each edit)
npx claude-flow@alpha hooks post-edit \
  --file "/backend/api.py" \
  --memory-key "swarm/backend/api-changes" \
  --analyze-impact true

# 4. Agent Communication
npx claude-flow@alpha hooks notify \
  --message "Backend API ready for frontend integration" \
  --target "frontend-dev" \
  --type "milestone"

# 5. Complete Task
npx claude-flow@alpha hooks post-task \
  --task-id "feature-implementation" \
  --analyze-performance true

# 6. End Session
npx claude-flow@alpha hooks session-end \
  --export-metrics true \
  --generate-report true
```

### Multi-Agent Coordination Pattern

```bash
# Coordinator agent starts
npx claude-flow@alpha hooks pre-task \
  --description "Coordinate multi-agent development" \
  --agent-id "coordinator"

# Backend agent joins
npx claude-flow@alpha hooks session-restore \
  --session-id "swarm-coordination" \
  --agent-id "backend-dev"

# Frontend agent joins  
npx claude-flow@alpha hooks session-restore \
  --session-id "swarm-coordination" \
  --agent-id "frontend-dev"

# Cross-agent notification
npx claude-flow@alpha hooks notify \
  --message "All agents synchronized" \
  --broadcast true \
  --require-ack true
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "HOOK_EXECUTION_FAILED",
    "message": "Failed to restore session state",
    "details": {
      "reason": "Session not found",
      "sessionId": "invalid_session",
      "timestamp": "2025-08-18T10:30:00Z"
    }
  },
  "retry": {
    "possible": true,
    "maxAttempts": 3,
    "backoffMs": 1000
  }
}
```

### Common Error Codes

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `HOOK_EXECUTION_FAILED` | Hook command execution failed | Retry with backoff |
| `INVALID_SESSION` | Session ID not found | Create new session |
| `MEMORY_ACCESS_DENIED` | Memory operation unauthorized | Check permissions |
| `AGENT_NOT_FOUND` | Target agent unavailable | Check agent status |
| `TIMEOUT_EXCEEDED` | Operation timed out | Increase timeout |
| `INVALID_PARAMETERS` | Invalid command parameters | Validate input |

### Retry Strategy

```bash
# Automatic retry with exponential backoff
npx claude-flow@alpha hooks post-edit \
  --file "/app/routes.py" \
  --memory-key "swarm/changes" \
  --retry-attempts 3 \
  --retry-backoff 1000
```

## Performance Considerations

### Hook Execution Overhead

- **Typical Latency**: 15-50ms per hook call
- **Memory Usage**: 15-30MB additional per active session
- **Concurrent Limit**: 10 operations/second recommended
- **Batch Operations**: Use for multiple file changes

### Optimization Strategies

1. **Batch Operations**: Group related hooks together
2. **Memory Namespacing**: Use specific namespaces to reduce lookup time
3. **TTL Management**: Set appropriate TTL values for memory data
4. **Async Processing**: Use `--async` flag for non-blocking operations

### Monitoring Commands

```bash
# Check hook performance
npx claude-flow@alpha hooks performance \
  --session-id "current" \
  --metric "all"

# Monitor memory usage
npx claude-flow@alpha hooks memory-usage \
  --namespace "swarm" \
  --detail "summary"
```

## Security Considerations

### Authentication

All hook commands require proper authentication:

```bash
# Set authentication token
export CLAUDE_FLOW_TOKEN="your_auth_token"

# Or use config file
npx claude-flow@alpha config set-token "your_auth_token"
```

### Path Validation

File paths are automatically validated to prevent directory traversal:

```bash
# Valid paths (within project)
--file "/app/routes.py"
--file "./components/button.tsx"

# Invalid paths (blocked)
--file "../../etc/passwd"
--file "/system/config"
```

### Command Sanitization

All command parameters are sanitized to prevent injection attacks:

```bash
# Safe parameter passing
--message "User authenticated successfully"
--metadata '{"userId": "12345", "role": "admin"}'
```

## Best Practices

### 1. Consistent Memory Keys

Use hierarchical memory key structure:

```bash
# Good
--memory-key "swarm/agent-type/operation/timestamp"
--memory-key "swarm/backend-dev/auth-routes/20250818"

# Avoid
--memory-key "temp123"
--memory-key "data"
```

### 2. Proper Error Handling

Always check hook return values:

```bash
#!/bin/bash
result=$(npx claude-flow@alpha hooks pre-task --description "Task")
if echo "$result" | grep -q '"success": true'; then
  echo "Hook executed successfully"
else
  echo "Hook failed: $result"
  exit 1
fi
```

### 3. Session Management

Use descriptive session IDs:

```bash
# Good
--session-id "swarm-auth-feature-2025-08-18"
--session-id "swarm-frontend-refactor"

# Avoid  
--session-id "session1"
--session-id "temp"
```

### 4. Performance Monitoring

Regular performance checks:

```bash
# Check session performance every hour
*/60 * * * * npx claude-flow@alpha hooks performance --export
```

## Integration with Claude Code Hooks

### Configuration Example

`.claude.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command", 
            "command": "npx claude-flow@alpha hooks pre-edit --file '$file_path' --operation '$tool_name'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow@alpha hooks post-edit --file '$file_path' --memory-key 'swarm/$agent_id/$(date +%s)'"
          }
        ]
      }
    ]
  }
}
```

### Automatic Hook Execution

File operations automatically trigger Claude Flow hooks:

```bash
# When Claude Code executes:
Write("app/routes.py", content)

# Automatically runs:
npx claude-flow@alpha hooks post-edit \
  --file "app/routes.py" \
  --memory-key "swarm/current/1692360000"
```

## Troubleshooting

### Common Issues

1. **Hook Not Executing**
   ```bash
   # Debug hook execution
   npx claude-flow@alpha hooks debug --session-id "current"
   ```

2. **Memory Access Issues**
   ```bash
   # Check memory permissions
   npx claude-flow@alpha hooks memory-permissions --namespace "swarm"
   ```

3. **Session Restore Failures**
   ```bash
   # List available sessions
   npx claude-flow@alpha hooks list-sessions
   
   # Force session creation
   npx claude-flow@alpha hooks create-session --id "new-session"
   ```

### Debug Mode

Enable verbose logging:

```bash
export CLAUDE_FLOW_DEBUG=true
npx claude-flow@alpha hooks post-edit --file "test.py" --memory-key "debug/test"
```

## API Versioning

### Current Version: v2.0.0

Hook API follows semantic versioning:

- **Major**: Breaking changes to command interface
- **Minor**: New commands or parameters added
- **Patch**: Bug fixes and improvements

### Compatibility

```bash
# Check API version
npx claude-flow@alpha --version

# Use specific version
npx claude-flow@2.0.0 hooks pre-task --description "Task"
```

## Related Documentation

- [CLAUDE.md Agent Coordination Protocol](/Users/nick/Development/vana/CLAUDE.md)
- [Hooks Expert Guide](/Users/nick/Development/vana/docs/hooks-expert-guide.md)
- [Claude Flow API Documentation](/Users/nick/Development/vana/docs/claude-flow-docs/API_DOCUMENTATION.md)
- [Git Hooks Integration Guide](/Users/nick/Development/vana/docs/git-hooks-integration-guide.md)

## Support

For issues with the Claude Flow Hooks API:

1. **Documentation**: Check existing guides and examples
2. **Debug Mode**: Enable verbose logging for troubleshooting  
3. **Performance Testing**: Use built-in performance monitoring
4. **Community**: Reference GitHub issues and discussions

---

**Note**: This API reference complements the coordination protocol in CLAUDE.md. Always follow the SPARC development guidelines and concurrent execution rules when implementing hook-based workflows.