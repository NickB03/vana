# Workflows Commands

Commands for workflows operations in Claude Flow.

## Available Commands

- [workflow-create](./workflow-create.md) - Create custom workflows
- [workflow-execute](./workflow-execute.md) - Execute predefined workflows
- [workflow-export](./workflow-export.md) - Export workflow definitions

## Quick Start

### 1. Create a Workflow
```bash
npx claude-flow@alpha workflow create \
  --name "my-pipeline" \
  --steps '[{"action":"build"},{"action":"test"},{"action":"deploy"}]'
```

### 2. Execute the Workflow
```bash
npx claude-flow@alpha workflow execute \
  --id "my-pipeline" \
  --params '{"environment":"staging"}'
```

### 3. Export for Version Control
```bash
npx claude-flow@alpha workflow export \
  --id "my-pipeline" \
  --format "json" > my-pipeline.json
```

## Common Workflow Patterns

### CI/CD Pipeline
```javascript
mcp__claude-flow__workflow_create {
  name: "cicd",
  steps: [
    { action: "checkout", branch: "main" },
    { action: "install" },
    { action: "build" },
    { action: "test" },
    { action: "deploy" }
  ],
  triggers: [
    { type: "git-push", branch: "main" }
  ]
}
```

### Full-Stack Development
```javascript
mcp__claude-flow__workflow_create {
  name: "fullstack",
  steps: [
    { action: "spawn-agents", agents: ["backend-dev", "frontend-dev"] },
    { action: "parallel-execute", tasks: ["api", "ui"] },
    { action: "integration-test" }
  ]
}
```

### Automated Code Review
```javascript
mcp__claude-flow__workflow_create {
  name: "review",
  steps: [
    { action: "analyze-pr" },
    { action: "security-scan" },
    { action: "performance-check" },
    { action: "post-feedback" }
  ],
  triggers: [
    { type: "pull-request" }
  ]
}
```

## Workflow Management

### List All Workflows
```bash
npx claude-flow@alpha workflow list
```

### Delete a Workflow
```bash
npx claude-flow@alpha workflow delete --id "workflow-id"
```

### Update a Workflow
```bash
npx claude-flow@alpha workflow update --id "workflow-id" --steps "..."
```

## Best Practices

1. **Version Control**: Export and commit workflow definitions
2. **Testing**: Test workflows with dry-run mode first
3. **Monitoring**: Track execution metrics and logs
4. **Documentation**: Document workflow purpose and parameters
5. **Error Handling**: Include rollback and notification steps

## Integration Points

- **Agent Spawning**: Integrate with swarm agents
- **Task Orchestration**: Coordinate complex tasks
- **GitHub Actions**: Trigger from CI/CD events
- **Memory Persistence**: Share context between steps
- **Neural Training**: Learn from workflow patterns

## Advanced Features

- Conditional execution based on parameters
- Parallel and sequential step execution
- Dynamic parameter resolution
- Workflow chaining and dependencies
- Resource allocation and prioritization

## See Also

- [Task Orchestration](../tasks/README.md)
- [Agent Management](../agents/README.md)
- [Automation Setup](../automation/README.md)
- [GitHub Integration](../github/README.md)