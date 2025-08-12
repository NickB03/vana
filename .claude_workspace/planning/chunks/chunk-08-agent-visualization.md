# Chunk 8: Agent Visualization

## 📸 UI REFERENCES

**Primary Reference**: Gemini's response cards for styling inspiration
- **Card Design**: Clean, rounded cards with subtle shadows
- **Agent Attribution**: 
  - Small circular avatar or emoji icon
  - Agent name in subtle text
  - Timestamp formatting
- **Status Indicators**:
  - Color-coded status dots (pending: gray, active: blue, complete: green)
  - Progress bars for running tasks
  - Smooth transitions between states
- **Stacking Animation**:
  - Cards stack with 8px Y-offset
  - Subtle drop shadows for depth
  - Gentle spring animations
- **Colors**:
  - Card background: #1F2937
  - Border: #374151
  - Success: #10B981
  - Warning: #F59E0B
  - Error: #EF4444

**VISUAL VALIDATION CRITERIA**:
✅ Task cards stack naturally in bottom-right corner
✅ Agent icons clearly identify task ownership
✅ Status changes animate smoothly
✅ Completed tasks fade out gracefully
✅ Inline task lists expand/collapse properly
✅ Progress indicators update in real-time

## PRD Section: 10. Agent Communication & Task Management

### Critical Requirements

1. **Agent Task Deck**: Floating stack of task cards with staggered animation
2. **Real-time Updates**: SSE-driven task status changes with smooth transitions
3. **Visual Hierarchy**: Clear agent attribution with icons and progress
4. **Inline Task Lists**: Collapsible task lists within chat messages
5. **Card Animation**: Stacking, shuffling, and completion animations

### Implementation Guide

#### Core Components
```typescript
// components/agent/AgentTaskDeck.tsx
- Fixed position floating task stack
- Framer Motion animations for stacking
- Auto-hide completed tasks after delay
- Z-index management for layering

// components/agent/InlineTaskList.tsx  
- Collapsible task list with expand/collapse
- Task status indicators (pending/running/complete)
- Progress visualization for running tasks
- Agent attribution with icons

// components/agent/TaskStatusIndicator.tsx
- Status-based visual indicators
- Progress bars for running tasks
- Completion checkmarks and animations
- Error state handling
```

#### Store Integration
```typescript
// stores/agentDeckStore.ts
interface AgentDeckStore {
  tasks: AgentTask[]
  isVisible: boolean
  addTask: (task: AgentTask) => void
  updateTask: (id: string, updates: Partial<AgentTask>) => void
  removeTask: (id: string) => void
  toggleVisibility: () => void
}
```

### Real Validation Tests

1. **SSE Integration**: Backend agent_start → New task card appears
2. **Stacking Animation**: Multiple tasks → Cards stack with 8px offset
3. **Completion Flow**: Task completes → Card animates away after 3s
4. **Inline Display**: Task list in message → Expandable with progress
5. **Agent Attribution**: Each task → Shows correct agent icon and name

### THINK HARD

- How do you handle task order and priority visualization?
- What happens when 10+ tasks are active simultaneously?
- How do you group related tasks from the same agent?
- What animations feel natural for task state transitions?
- How do you handle task failures or timeouts?

### Component Specifications

#### AgentTaskDeck Component
```typescript
interface AgentTaskDeckProps {
  position?: 'top-right' | 'bottom-right' | 'bottom-left'
  maxVisible?: number
  autoHide?: boolean
}

// Features:
- Fixed positioning with configurable location
- Staggered card animation (8px Y offset)
- Auto-removal of completed tasks
- Maximum visible tasks with overflow handling
- Click to expand task details
```

#### InlineTaskList Component
```typescript
interface InlineTaskListProps {
  tasks: AgentTask[]
  collapsible?: boolean
  showProgress?: boolean
  agentAttribution?: boolean
}

// Features:
- Collapsible with smooth height animation
- Task status icons (circle/spinner/checkmark)
- Progress bars for running tasks
- Strike-through for completed tasks
- Agent avatars and names
```

#### TaskStatusIndicator Component
```typescript
interface TaskStatusIndicatorProps {
  status: 'pending' | 'running' | 'complete' | 'error'
  progress?: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

// Features:
- Status-specific colors and icons
- Animated progress indicators
- Pulsing for active states
- Error states with retry options
- Accessibility labels
```

### What NOT to Do

❌ Don't block UI with too many simultaneous task cards
❌ Don't use heavy animations that impact performance
❌ Don't show system-level tasks that aren't user-relevant
❌ Don't make task cards clickable without clear purpose
❌ Don't forget to clean up completed tasks from memory
❌ Don't use confusing or inconsistent status indicators

### Integration Points

- **SSE Connection**: Listen for agent_start/agent_complete events
- **Chat Store**: Embed inline task lists in messages
- **Canvas Store**: Task completion can trigger Canvas updates
- **UI Store**: Global visibility toggle and animation preferences

---

*Implementation Priority: High - Core differentiation feature*