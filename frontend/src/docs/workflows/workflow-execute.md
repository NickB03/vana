# Workflow Execute

Execute predefined workflows with custom parameters in Claude Flow.

## Command
```bash
npx claude-flow@alpha workflow execute --id "<workflow-id>" --params "<parameters>"
```

## MCP Tool
```javascript
mcp__claude-flow__workflow_execute {
  workflowId: "string",  // Required: Workflow ID to execute
  params: "object"       // Optional: Execution parameters
}
```

## Parameters

### workflowId (required)
- **Type**: string
- **Description**: The ID of the workflow to execute
- **Example**: "full-stack-app", "cicd-pipeline", "automated-review"

### params (optional)
- **Type**: object
- **Description**: Runtime parameters to pass to the workflow
- **Example**:
  ```javascript
  {
    environment: "staging",
    branch: "feature/new-api",
    skipTests: false,
    verbose: true
  }
  ```

## Examples

### Basic Workflow Execution
```bash
npx claude-flow@alpha workflow execute --id "simple-pipeline"
```

### With Parameters
```bash
npx claude-flow@alpha workflow execute \
  --id "deployment-workflow" \
  --params '{"environment":"production","version":"2.0.0"}'
```

### Full-Stack Development Execution
```javascript
mcp__claude-flow__workflow_execute {
  workflowId: "full-stack-app",
  params: {
    projectName: "my-app",
    database: "postgresql",
    frontend: "react",
    backend: "express",
    testing: true,
    documentation: true
  }
}
```

### CI/CD Pipeline Execution
```javascript
mcp__claude-flow__workflow_execute {
  workflowId: "cicd-pipeline",
  params: {
    branch: "release/v1.5.0",
    environment: "staging",
    runTests: true,
    coverage: 85,
    deploymentStrategy: "blue-green",
    notifyChannels: ["slack", "email"]
  }
}
```

### Conditional Execution
```javascript
mcp__claude-flow__workflow_execute {
  workflowId: "conditional-workflow",
  params: {
    condition: "production",
    actions: {
      production: ["backup", "deploy", "verify"],
      staging: ["deploy", "test"],
      development: ["build", "test"]
    }
  }
}
```

## Parameter Override

Workflows can be executed with parameter overrides:

### Override Workflow Steps
```javascript
params: {
  overrideSteps: [
    { index: 2, action: "skip" },
    { index: 4, action: "custom-test" }
  ]
}
```

### Override Agent Configuration
```javascript
params: {
  agentConfig: {
    maxAgents: 10,
    topology: "hierarchical",
    timeout: 30000
  }
}
```

### Override Environment Variables
```javascript
params: {
  env: {
    NODE_ENV: "test",
    API_KEY: "test-key",
    DEBUG: true
  }
}
```

## Execution Modes

### Synchronous Execution
Wait for workflow completion:
```javascript
mcp__claude-flow__workflow_execute {
  workflowId: "sync-workflow",
  params: {
    async: false,
    timeout: 60000
  }
}
```

### Asynchronous Execution
Start workflow and continue:
```javascript
mcp__claude-flow__workflow_execute {
  workflowId: "async-workflow",
  params: {
    async: true,
    callback: "/webhook/complete"
  }
}
```

### Parallel Workflow Execution
Execute multiple workflows concurrently:
```javascript
// Execute multiple workflows in parallel
const workflows = [
  { workflowId: "backend-setup", params: { service: "api" } },
  { workflowId: "frontend-setup", params: { framework: "react" } },
  { workflowId: "database-setup", params: { type: "postgres" } }
];

workflows.forEach(w => 
  mcp__claude-flow__workflow_execute(w)
);
```

## Monitoring Execution

### Check Status
```javascript
mcp__claude-flow__task_status {
  taskId: "workflow-execution-id"
}
```

### Get Results
```javascript
mcp__claude-flow__task_results {
  taskId: "workflow-execution-id",
  format: "detailed"
}
```

## Error Handling

### Retry on Failure
```javascript
params: {
  retry: {
    attempts: 3,
    delay: 5000,
    backoff: "exponential"
  }
}
```

### Rollback Configuration
```javascript
params: {
  rollback: {
    enabled: true,
    savepoint: "before-deploy",
    notifyOnRollback: true
  }
}
```

## Advanced Features

### Dynamic Parameter Resolution
```javascript
params: {
  dynamic: {
    version: "${git.tag}",
    timestamp: "${Date.now()}",
    branch: "${git.branch}"
  }
}
```

### Conditional Steps
```javascript
params: {
  conditions: {
    skipTests: process.env.SKIP_TESTS === "true",
    deployProd: branch === "main",
    enableMetrics: environment === "production"
  }
}
```

### Resource Allocation
```javascript
params: {
  resources: {
    cpu: "high",
    memory: "8gb",
    parallel: 4,
    priority: "critical"
  }
}
```

## Workflow Chaining

Execute workflows in sequence:

```javascript
// First workflow
mcp__claude-flow__workflow_execute {
  workflowId: "prepare-environment",
  params: { 
    onComplete: "trigger-next" 
  }
}

// Triggered automatically after first
mcp__claude-flow__workflow_execute {
  workflowId: "main-deployment",
  params: { 
    waitFor: "prepare-environment" 
  }
}
```

## Best Practices

1. **Validate parameters**: Ensure required params are provided
2. **Use meaningful IDs**: Choose descriptive workflow identifiers
3. **Handle errors gracefully**: Include retry and rollback logic
4. **Monitor execution**: Track progress and collect metrics
5. **Test with dry-run**: Use dry-run mode before production
6. **Document parameters**: Keep workflow parameter docs updated
7. **Version workflows**: Track workflow versions for rollback

## Dry Run Mode

Test workflow without execution:
```javascript
params: {
  dryRun: true,
  verbose: true,
  showPlan: true
}
```

## Debugging

Enable debug output:
```javascript
params: {
  debug: {
    enabled: true,
    logLevel: "verbose",
    traceSteps: true,
    captureMetrics: true
  }
}
```

## See Also

- [workflow-create](./workflow-create.md) - Create workflows
- [workflow-export](./workflow-export.md) - Export workflow definitions
- [Task Status](../tasks/task-status.md)
- [Task Results](../tasks/task-results.md)