# Kanban Board with Claude Code Integration

A modern, responsive Kanban board built with Next.js, Kibo UI components, and designed for seamless integration with Claude Code AI agents.

## Features

🎯 **Core Functionality**
- Drag-and-drop task management
- Three-column layout (Todo, In Progress, Done)
- Task creation, editing, and deletion
- Priority levels and tagging system
- Responsive design for all screen sizes

🤖 **Claude Code Integration**
- File-based synchronization (`kanban-data.json`)
- REST API endpoints for programmatic access
- Real-time UI updates (5-second polling)
- Automated task creation and status updates
- Audit trail for manual vs. automated changes

💾 **Data Persistence**
- Browser localStorage for client-side persistence
- JSON export/import functionality
- File-based backup and restore
- Conflict resolution with timestamp checking

🎨 **Modern Tech Stack**
- Next.js 15 with TypeScript
- Kibo UI + shadcn/ui components
- Tailwind CSS for styling
- dnd-kit for drag-and-drop
- Custom hooks for state management

## Quick Start

### Prerequisites

- Node.js 18.18+ (current: 18.17.0 with warnings, but functional)
- npm or yarn package manager

### Installation

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   ```
   http://localhost:3000
   ```

The kanban board will load with sample tasks and begin file monitoring automatically.

## Claude Code Integration

### Method 1: File-Based Sync (Recommended)

Claude Code can directly modify the `kanban-data.json` file:

```bash
# Read current state
cat kanban-data.json

# Modify tasks directly in the JSON file
# UI updates automatically within 5 seconds
```

### Method 2: API Integration

Use REST API endpoints for real-time updates:

```bash
# Get current state
curl http://localhost:3000/api/claude

# Create new task
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New task from Claude Code",
    "status": "todo",
    "priority": "medium",
    "agentSource": "claude-code-agent"
  }'
```

### Testing Integration

Run the integration test suite:

```bash
cd claude-integration
./test-integration.sh
```

## Project Structure

```
kanban/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── claude/        # Claude Code endpoints
│   │   │   └── sync/          # File sync endpoints
│   │   └── page.tsx           # Main kanban page
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui + Kibo UI components
│   │   └── kanban-board.tsx   # Main kanban component
│   ├── hooks/                 # Custom React hooks
│   │   ├── useKanban.ts       # Kanban state management
│   │   └── useFileSync.ts     # File synchronization
│   └── lib/                   # Utility functions
│       ├── types.ts           # TypeScript definitions
│       └── sample-data.ts     # Initial data
├── claude-integration/        # Claude Code examples
│   ├── README.md             # Integration guide
│   ├── api-examples.sh       # API usage examples
│   ├── task-automation.md    # Automation patterns
│   └── test-integration.sh   # Integration tests
├── kanban-data.json          # Data file for Claude Code
└── README.md
```

## Kibo UI Experience

This project serves as hands-on experience with Kibo UI components for future VANA frontend development:

### Key Learnings

1. **Installation**: Use CLI tool `npx kibo-ui@latest add [component]`
2. **Dependencies**: Requires shadcn/ui as foundation
3. **Import Paths**: Use `@/` aliases, not absolute paths
4. **Drag & Drop**: Built-in dnd-kit integration works seamlessly
5. **Customization**: Fully composable with Tailwind CSS

### Components Used

- `KanbanProvider` - Main context provider
- `KanbanBoard` - Column container
- `KanbanHeader` - Column headers
- `KanbanCards` - Card container with sorting
- `KanbanCard` - Individual task cards

## Data Models

### Task Interface

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  source: 'manual' | 'claude';
  lastModifiedBy?: string;
}
```

### API Endpoints

- `GET /api/claude` - Get current kanban state
- `POST /api/claude` - Create or update tasks
- `GET /api/sync` - File sync endpoint
- `POST /api/sync` - Update via file sync

## Automation Examples

### Create Task via API

```bash
./claude-integration/api-examples.sh create \
  "Fix bug in login system" \
  "User cannot login with valid credentials" \
  "todo" \
  "high"
```

### Update Task Status

```bash
./claude-integration/api-examples.sh update "task-123" "done"
```

### Bulk Operations

```bash
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"taskId": "task-1", "status": "done"},
      {"taskId": "task-2", "status": "in-progress"}
    ]
  }'
```

## Troubleshooting

### Common Issues

**Server won't start**
- Check Node.js version (requires 18.18+, but 18.17.0 works with warnings)
- Run `npm install` to ensure dependencies are installed

**API not responding**
- Verify server is running: `curl http://localhost:3000`
- Check console for errors in terminal

**File sync not working**
- Ensure `kanban-data.json` exists and has valid JSON
- Wait up to 5 seconds for UI updates
- Check browser console for JavaScript errors

### Getting Help

1. Check the `claude-integration/` directory for examples
2. Run integration tests: `./claude-integration/test-integration.sh`
3. Review API documentation in `claude-integration/README.md`

---

**Built with ❤️ for Claude Code integration and VANA frontend experience**
