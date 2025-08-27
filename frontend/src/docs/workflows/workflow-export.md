# Workflow Export

Export workflow definitions in various formats for version control, sharing, or migration.

## Command
```bash
npx claude-flow@alpha workflow export --id "<workflow-id>" --format "<format>"
```

## MCP Tool
```javascript
mcp__claude-flow__workflow_export {
  workflowId: "string",  // Required: Workflow ID to export
  format: "string"       // Optional: Export format (default: "json")
}
```

## Parameters

### workflowId (required)
- **Type**: string
- **Description**: The ID of the workflow to export
- **Example**: "full-stack-app", "cicd-pipeline", "automated-review"

### format (optional)
- **Type**: string
- **Description**: Output format for the export
- **Default**: "json"
- **Options**: "json", "yaml", "markdown", "typescript", "javascript"

## Export Formats

### JSON Format (Default)
```bash
npx claude-flow@alpha workflow export --id "my-workflow"
```

Output:
```json
{
  "id": "my-workflow",
  "version": "1.0.0",
  "name": "My Workflow",
  "description": "Automated development workflow",
  "steps": [
    { "action": "build", "target": "application" },
    { "action": "test", "coverage": 90 },
    { "action": "deploy", "environment": "production" }
  ],
  "triggers": [
    { "type": "git-push", "branch": "main" }
  ],
  "metadata": {
    "created": "2024-01-15T10:00:00Z",
    "modified": "2024-01-20T15:30:00Z",
    "author": "developer"
  }
}
```

### YAML Format
```bash
npx claude-flow@alpha workflow export --id "my-workflow" --format "yaml"
```

Output:
```yaml
id: my-workflow
version: 1.0.0
name: My Workflow
description: Automated development workflow
steps:
  - action: build
    target: application
  - action: test
    coverage: 90
  - action: deploy
    environment: production
triggers:
  - type: git-push
    branch: main
metadata:
  created: '2024-01-15T10:00:00Z'
  modified: '2024-01-20T15:30:00Z'
  author: developer
```

### Markdown Format
```bash
npx claude-flow@alpha workflow export --id "my-workflow" --format "markdown"
```

Output:
```markdown
# My Workflow

**ID**: my-workflow  
**Version**: 1.0.0  
**Description**: Automated development workflow

## Steps

1. **Build**
   - Target: application

2. **Test**
   - Coverage: 90%

3. **Deploy**
   - Environment: production

## Triggers

- Git Push (branch: main)

## Metadata

- Created: 2024-01-15T10:00:00Z
- Modified: 2024-01-20T15:30:00Z
- Author: developer
```

### TypeScript Format
```bash
npx claude-flow@alpha workflow export --id "my-workflow" --format "typescript"
```

Output:
```typescript
interface WorkflowDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  steps: Step[];
  triggers: Trigger[];
  metadata: Metadata;
}

const myWorkflow: WorkflowDefinition = {
  id: "my-workflow",
  version: "1.0.0",
  name: "My Workflow",
  description: "Automated development workflow",
  steps: [
    { action: "build", target: "application" },
    { action: "test", coverage: 90 },
    { action: "deploy", environment: "production" }
  ],
  triggers: [
    { type: "git-push", branch: "main" }
  ],
  metadata: {
    created: new Date("2024-01-15T10:00:00Z"),
    modified: new Date("2024-01-20T15:30:00Z"),
    author: "developer"
  }
};

export default myWorkflow;
```

## Examples

### Export for Version Control
```javascript
// Export to JSON for git repository
mcp__claude-flow__workflow_export {
  workflowId: "production-pipeline",
  format: "json"
}
// Save to workflows/production-pipeline.json
```

### Export Multiple Workflows
```javascript
// Export all workflows for backup
const workflows = ["app-build", "test-suite", "deployment"];

workflows.forEach(id => {
  mcp__claude-flow__workflow_export {
    workflowId: id,
    format: "json"
  }
});
```

### Export for Documentation
```javascript
// Generate markdown documentation
mcp__claude-flow__workflow_export {
  workflowId: "complete-pipeline",
  format: "markdown"
}
// Add to project README or docs
```

### Export for Migration
```javascript
// Export in portable format
mcp__claude-flow__workflow_export {
  workflowId: "legacy-workflow",
  format: "yaml"
}
// Import into new system
```

## Advanced Export Options

### Include Execution History
```javascript
mcp__claude-flow__workflow_export {
  workflowId: "analytics-pipeline",
  format: "json",
  includeHistory: true
}
```

Output includes:
```json
{
  "executions": [
    {
      "id": "exec-001",
      "timestamp": "2024-01-20T10:00:00Z",
      "status": "success",
      "duration": 450000,
      "results": {...}
    }
  ]
}
```

### Include Dependencies
```javascript
mcp__claude-flow__workflow_export {
  workflowId: "complex-workflow",
  format: "json",
  includeDependencies: true
}
```

Output includes:
```json
{
  "dependencies": {
    "workflows": ["sub-workflow-1", "sub-workflow-2"],
    "agents": ["coder", "tester", "reviewer"],
    "resources": ["database", "cache", "queue"]
  }
}
```

### Include Metrics
```javascript
mcp__claude-flow__workflow_export {
  workflowId: "performance-critical",
  format: "json",
  includeMetrics: true
}
```

Output includes:
```json
{
  "metrics": {
    "avgDuration": 300000,
    "successRate": 0.95,
    "executionCount": 1523,
    "lastExecution": "2024-01-20T15:00:00Z"
  }
}
```

## Bulk Export

Export all workflows:

```bash
npx claude-flow@alpha workflow export --all --format "json" --output "./workflows"
```

This creates:
```
workflows/
├── workflow-1.json
├── workflow-2.json
├── workflow-3.json
└── manifest.json
```

## Import Exported Workflows

### From JSON
```javascript
const workflowDef = require('./workflow.json');
mcp__claude-flow__workflow_create(workflowDef);
```

### From YAML
```javascript
const yaml = require('js-yaml');
const fs = require('fs');

const workflowDef = yaml.load(
  fs.readFileSync('./workflow.yaml', 'utf8')
);
mcp__claude-flow__workflow_create(workflowDef);
```

## Version Management

### Export with Version Tag
```javascript
mcp__claude-flow__workflow_export {
  workflowId: "versioned-workflow",
  format: "json",
  version: "2.0.0",
  tag: "stable"
}
```

### Compare Versions
```bash
# Export two versions
npx claude-flow@alpha workflow export --id "workflow" --version "1.0.0" > v1.json
npx claude-flow@alpha workflow export --id "workflow" --version "2.0.0" > v2.json

# Compare differences
diff v1.json v2.json
```

## Integration Examples

### GitHub Actions Integration
```yaml
# .github/workflows/export-workflows.yml
name: Export Workflows
on:
  push:
    paths:
      - 'workflows/**'
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npx claude-flow@alpha workflow export --all --format json
      - uses: actions/upload-artifact@v2
        with:
          name: workflow-definitions
          path: workflows/
```

### CI/CD Pipeline
```javascript
// Export before deployment
mcp__claude-flow__workflow_export {
  workflowId: "production-pipeline",
  format: "json",
  output: "./backup/workflow-${Date.now()}.json"
}
```

## Best Practices

1. **Version control exports**: Store exports in git
2. **Regular backups**: Export workflows periodically
3. **Document exports**: Use markdown format for documentation
4. **Test imports**: Verify exported workflows can be imported
5. **Include metadata**: Add creation date, author, version
6. **Use consistent naming**: Follow naming conventions
7. **Archive old versions**: Keep historical exports

## Troubleshooting

### Export Validation
```javascript
// Validate export before saving
const exported = mcp__claude-flow__workflow_export {
  workflowId: "critical-workflow",
  format: "json"
};

if (validateWorkflow(exported)) {
  saveToFile(exported);
}
```

### Recovery from Export
```javascript
// Restore from backup
const backup = loadFromFile('./backup/workflow.json');
mcp__claude-flow__workflow_create(backup);
```

## See Also

- [workflow-create](./workflow-create.md) - Create workflows
- [workflow-execute](./workflow-execute.md) - Execute workflows
- [Workflow Templates](./workflow-template.md)
- [Automation Setup](../automation/automation-setup.md)