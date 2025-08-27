# Workflow Create

Create custom workflows for automated task execution in Claude Flow.

## Command
```bash
npx claude-flow@alpha workflow create --name "<workflow-name>" --steps "<steps>" --triggers "<triggers>"
```

## MCP Tool
```javascript
mcp__claude-flow__workflow_create {
  name: "string",        // Required: Workflow name
  steps: "array",        // Required: Workflow steps
  triggers: "array"      // Optional: Event triggers
}
```

## Parameters

### name (required)
- **Type**: string
- **Description**: Unique identifier for the workflow
- **Example**: "full-stack-development", "code-review-pipeline"

### steps (required)
- **Type**: array
- **Description**: Ordered list of workflow steps to execute
- **Format**: Each step should define an action and optional parameters
- **Example**:
  ```javascript
  [
    { action: "analyze", target: "requirements" },
    { action: "design", target: "architecture" },
    { action: "implement", target: "features" },
    { action: "test", target: "implementation" },
    { action: "deploy", target: "production" }
  ]
  ```

### triggers (optional)
- **Type**: array
- **Description**: Events that automatically start the workflow
- **Example**:
  ```javascript
  [
    { type: "schedule", cron: "0 0 * * *" },
    { type: "webhook", url: "/api/trigger" },
    { type: "file-change", pattern: "src/**/*.js" }
  ]
  ```

## Examples

### Basic Workflow Creation
```bash
npx claude-flow@alpha workflow create \
  --name "simple-pipeline" \
  --steps '[{"action":"build"},{"action":"test"},{"action":"deploy"}]'
```

### Full-Stack Development Workflow
```javascript
mcp__claude-flow__workflow_create {
  name: "full-stack-app",
  steps: [
    { 
      action: "spawn-agents", 
      agents: ["backend-dev", "frontend-dev", "database-architect"] 
    },
    { 
      action: "parallel-execute",
      tasks: [
        "Build REST API",
        "Create React UI",
        "Design database schema"
      ]
    },
    { 
      action: "integration-test",
      coverage: 90
    },
    { 
      action: "deploy",
      environment: "staging"
    }
  ],
  triggers: [
    { type: "git-push", branch: "main" }
  ]
}
```

### CI/CD Pipeline Workflow
```javascript
mcp__claude-flow__workflow_create {
  name: "cicd-pipeline",
  steps: [
    { action: "git-checkout", branch: "develop" },
    { action: "install-dependencies" },
    { action: "lint", fix: true },
    { action: "build", optimize: true },
    { action: "test", parallel: true },
    { action: "security-scan" },
    { action: "deploy", environment: "production" },
    { action: "notify", channel: "slack" }
  ],
  triggers: [
    { type: "pull-request", target: "main" },
    { type: "schedule", cron: "0 2 * * *" }
  ]
}
```

### Code Review Workflow
```javascript
mcp__claude-flow__workflow_create {
  name: "automated-review",
  steps: [
    { 
      action: "analyze-changes",
      include: ["security", "performance", "style"]
    },
    { 
      action: "spawn-reviewers",
      agents: ["code-analyzer", "security-auditor", "perf-analyzer"]
    },
    { 
      action: "generate-report",
      format: "markdown"
    },
    { 
      action: "post-comments",
      platform: "github"
    }
  ],
  triggers: [
    { type: "pull-request", action: "opened" },
    { type: "pull-request", action: "synchronize" }
  ]
}
```

### Data Processing Workflow
```javascript
mcp__claude-flow__workflow_create {
  name: "etl-pipeline",
  steps: [
    { action: "extract", source: "database" },
    { action: "validate", schema: "strict" },
    { action: "transform", rules: "business-logic" },
    { action: "enrich", apis: ["geocoding", "analytics"] },
    { action: "load", destination: "warehouse" },
    { action: "verify", checks: ["completeness", "accuracy"] }
  ],
  triggers: [
    { type: "schedule", cron: "0 */6 * * *" }
  ]
}
```

## Step Types

### Common Actions
- **build**: Compile/build the project
- **test**: Run test suites
- **deploy**: Deploy to environment
- **analyze**: Code/security analysis
- **notify**: Send notifications
- **spawn-agents**: Create specialized agents
- **parallel-execute**: Run tasks concurrently
- **sequential-execute**: Run tasks in order

## Trigger Types

### Available Triggers
- **schedule**: Cron-based scheduling
- **webhook**: HTTP webhook triggers
- **file-change**: File system changes
- **git-push**: Git push events
- **pull-request**: PR events
- **issue**: GitHub issue events
- **manual**: Manual execution only

## Best Practices

1. **Name workflows descriptively**: Use clear, action-oriented names
2. **Order steps logically**: Dependencies should come before dependents
3. **Use parallel execution**: When steps don't depend on each other
4. **Add error handling**: Include rollback or notification steps
5. **Version workflows**: Export and version control workflow definitions
6. **Test workflows**: Start with manual triggers before automation
7. **Monitor execution**: Use logging and metrics collection

## Integration with Agents

Workflows can spawn and coordinate multiple agents:

```javascript
{
  action: "spawn-swarm",
  topology: "mesh",
  agents: [
    { type: "researcher", task: "analyze requirements" },
    { type: "architect", task: "design system" },
    { type: "coder", task: "implement features" },
    { type: "tester", task: "validate implementation" }
  ]
}
```

## Error Handling

Add error handling steps:

```javascript
steps: [
  { action: "try", block: "main-workflow" },
  { action: "catch", handler: "rollback" },
  { action: "finally", cleanup: true }
]
```

## See Also

- [workflow-execute](./workflow-execute.md) - Execute workflows
- [workflow-export](./workflow-export.md) - Export workflow definitions
- [Task Orchestration](../tasks/task-orchestrate.md)
- [Agent Spawning](../agents/agent-spawn.md)