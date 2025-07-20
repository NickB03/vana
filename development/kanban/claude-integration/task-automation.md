# Task Automation Patterns for Claude Code

This document outlines common patterns for automating kanban board updates with Claude Code.

## Pattern 1: Progress Tracking

Track completion of development tasks and automatically update their status.

### Example: Feature Development Workflow

```bash
# 1. Claude Code starts working on a feature
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "feature-123",
    "status": "in-progress",
    "description": "Started implementation of user authentication",
    "agentSource": "development-agent"
  }'

# 2. Feature is completed
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "feature-123",
    "status": "done",
    "description": "Completed user authentication with tests",
    "tags": ["authentication", "security", "completed"],
    "agentSource": "development-agent"
  }'
```

## Pattern 2: Issue Detection and Tracking

Automatically create tasks when Claude Code detects issues.

### Example: Code Analysis

```bash
# Claude Code detects a security vulnerability
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Security: Fix SQL injection vulnerability",
    "description": "Found potential SQL injection in user.py line 45",
    "status": "todo",
    "priority": "high",
    "tags": ["security", "vulnerability", "urgent"],
    "agentSource": "security-scanner-agent"
  }'
```

## Pattern 3: Bulk Status Updates

Update multiple related tasks at once.

### Example: Sprint Completion

```bash
# Mark all sprint tasks as done
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "taskId": "sprint-1-task-1",
        "status": "done",
        "agentSource": "sprint-manager"
      },
      {
        "taskId": "sprint-1-task-2", 
        "status": "done",
        "agentSource": "sprint-manager"
      },
      {
        "taskId": "sprint-1-task-3",
        "status": "done",
        "agentSource": "sprint-manager"
      }
    ]
  }'
```

## Pattern 4: File-Based Automation

Use direct file modification for batch operations.

### Example: Daily Standup Preparation

```javascript
// daily-standup-prep.js
const fs = require('fs');

// Read current kanban state
const kanbanData = JSON.parse(fs.readFileSync('kanban-data.json', 'utf8'));

// Find tasks completed yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const completedYesterday = kanbanData.tasks.filter(task => {
  const updated = new Date(task.updatedAt);
  return task.status === 'done' && 
         updated.toDateString() === yesterday.toDateString();
});

// Create standup summary task
const standupTask = {
  id: `standup-${Date.now()}`,
  title: `Daily Standup - ${new Date().toDateString()}`,
  description: `Completed yesterday: ${completedYesterday.map(t => t.title).join(', ')}`,
  status: 'todo',
  priority: 'medium',
  tags: ['standup', 'summary'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: 'claude',
  lastModifiedBy: 'standup-automation'
};

// Add standup task
kanbanData.tasks.push(standupTask);
kanbanData.lastUpdated = new Date().toISOString();

// Write back to file
fs.writeFileSync('kanban-data.json', JSON.stringify(kanbanData, null, 2));
console.log('Standup task created');
```

## Pattern 5: Integration with External Tools

Connect kanban updates with external development tools.

### Example: Git Integration

```bash
#!/bin/bash
# git-hook-kanban.sh - Git post-commit hook

# Get commit message and extract task ID
COMMIT_MSG=$(git log -1 --pretty=%B)
TASK_ID=$(echo "$COMMIT_MSG" | grep -o '#[0-9]\+' | sed 's/#//')

if [ ! -z "$TASK_ID" ]; then
  # Update task with commit info
  curl -X POST http://localhost:3000/api/claude \
    -H "Content-Type: application/json" \
    -d "{
      \"taskId\": \"$TASK_ID\",
      \"description\": \"Latest commit: $COMMIT_MSG\",
      \"agentSource\": \"git-integration\"
    }"
  
  echo "Updated kanban task #$TASK_ID"
fi
```

## Pattern 6: Time-Based Automation

Schedule automatic task updates.

### Example: Overdue Task Detection

```bash
#!/bin/bash
# check-overdue-tasks.sh - Run via cron

# Get current tasks
TASKS=$(curl -s http://localhost:3000/api/claude | jq -r '.tasks[]')

# Process each task (simplified example)
echo "$TASKS" | jq -r 'select(.status != "done") | select(.dueDate != null) | select(.dueDate < now) | .id' | while read TASK_ID; do
  # Mark overdue tasks as high priority
  curl -X POST http://localhost:3000/api/claude \
    -H "Content-Type: application/json" \
    -d "{
      \"taskId\": \"$TASK_ID\",
      \"priority\": \"high\",
      \"tags\": [\"overdue\"],
      \"agentSource\": \"overdue-checker\"
    }"
done
```

## Best Practices

1. **Agent Identification**: Always include `agentSource` to track which Claude Code agent made changes
2. **Descriptive Updates**: Include meaningful descriptions of what changed and why
3. **Appropriate Tagging**: Use tags to categorize automated updates
4. **Error Handling**: Check API responses and handle failures gracefully
5. **Rate Limiting**: Don't overwhelm the API with too many requests
6. **Conflict Resolution**: Check `lastUpdated` timestamps for conflict detection
7. **Logging**: Log all automated changes for audit trails

## Integration Workflow

1. **Setup**: Ensure kanban server is running (`npm run dev`)
2. **Discovery**: Use `GET /api/claude` to understand current state
3. **Update**: Use `POST /api/claude` for task modifications
4. **Verification**: Check response status and data
5. **Monitoring**: Watch for UI updates (automatic within 5 seconds)

## Troubleshooting

- **Server not responding**: Check if `npm run dev` is running
- **API errors**: Verify JSON format and required fields
- **File sync not working**: Ensure valid JSON format in `kanban-data.json`
- **UI not updating**: Wait up to 5 seconds for file sync, check browser console for errors