// Task status types
export type TaskStatus = 'todo' | 'in-progress' | 'done';

// Task priority types
export type TaskPriority = 'low' | 'medium' | 'high';

// Task source (manual vs Claude Code)
export type TaskSource = 'manual' | 'claude';

// Main task interface
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  assignee?: string;
  source: TaskSource;
  lastModifiedBy?: string;
}

// Kanban column interface
export interface KanbanColumn {
  id: TaskStatus;
  name: string;
  color?: string;
  [key: string]: unknown; // Index signature for Kibo UI compatibility
}

// Kanban board data structure
export interface KanbanData {
  tasks: Task[];
  columns: KanbanColumn[];
  lastUpdated: Date;
}

// Claude Code integration types
export interface ClaudeTaskUpdate {
  taskId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  agentSource: string;
  timestamp: Date;
  changeReason?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}