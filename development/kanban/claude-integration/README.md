# Claude Code Integration Guide

This directory contains examples and scripts for integrating Claude Code with the Kanban board.

## Overview

The Kanban board provides two integration methods for Claude Code:

1. **File-based sync** - Claude Code can directly modify `kanban-data.json`
2. **API-based sync** - Claude Code can use HTTP endpoints to update tasks

## Quick Start

### Method 1: File-Based Sync (Simplest)

Claude Code can directly read and write to the `kanban-data.json` file in the project root:

```bash
# Read current state
cat kanban-data.json

# Update a task (modify the JSON directly)
# The UI will automatically reload within 5 seconds
```

### Method 2: API-Based Sync

Claude Code can use the REST API endpoints:

```bash
# Get current state
curl http://localhost:3000/api/claude

# Create a new task
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New task from Claude Code",
    "description": "Task created automatically",
    "status": "todo",
    "priority": "medium",
    "tags": ["automated", "claude"],
    "agentSource": "claude-code-agent"
  }'

# Update existing task
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "1",
    "title": "Updated task title",
    "status": "done",
    "agentSource": "claude-code-agent"
  }'

# Bulk update multiple tasks
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "taskId": "1",
        "status": "done",
        "agentSource": "claude-code-agent"
      },
      {
        "title": "New task",
        "status": "todo",
        "priority": "high",
        "agentSource": "claude-code-agent"
      }
    ]
  }'
```

## Files

- `api-examples.sh` - Bash script with API usage examples
- `file-sync-example.js` - Node.js script for file-based sync
- `task-automation.md` - Common automation patterns
- `test-integration.sh` - Integration testing script

## Task Status Values

- `todo` - Not started
- `in-progress` - Currently being worked on  
- `done` - Completed

## Priority Values

- `low` - Low priority
- `medium` - Medium priority (default)
- `high` - High priority

## Integration Tips

1. **File Sync**: Best for bulk operations and when Claude Code has file system access
2. **API Sync**: Best for real-time updates and when running in containers
3. **Conflict Resolution**: Last-write-wins, consider checking `lastUpdated` timestamp
4. **Error Handling**: Always check API response status and handle failures gracefully
5. **Rate Limiting**: No rate limiting implemented, but be respectful with API calls