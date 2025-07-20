import { Task, KanbanColumn, KanbanData } from './types';

// Default columns for the kanban board
export const defaultColumns: KanbanColumn[] = [
  { id: 'todo', name: 'Todo', color: '#ef4444' },
  { id: 'in-progress', name: 'In Progress', color: '#f59e0b' },
  { id: 'done', name: 'Done', color: '#10b981' },
];

// Sample tasks for testing
export const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Setup Next.js project',
    description: 'Initialize the project with TypeScript and Tailwind CSS',
    status: 'done',
    priority: 'high',
    tags: ['setup', 'frontend'],
    createdAt: new Date('2025-01-19T10:00:00Z'),
    updatedAt: new Date('2025-01-19T11:00:00Z'),
    source: 'manual',
    lastModifiedBy: 'developer',
  },
  {
    id: '2',
    title: 'Add Kibo UI kanban component',
    description: 'Install and configure the Kibo UI kanban component',
    status: 'done',
    priority: 'high',
    tags: ['kibo-ui', 'components'],
    createdAt: new Date('2025-01-19T11:00:00Z'),
    updatedAt: new Date('2025-01-19T12:00:00Z'),
    source: 'manual',
    lastModifiedBy: 'developer',
  },
  {
    id: '3',
    title: 'Create TypeScript interfaces',
    description: 'Define the data models for tasks and kanban board',
    status: 'in-progress',
    priority: 'high',
    tags: ['typescript', 'interfaces'],
    createdAt: new Date('2025-01-19T12:00:00Z'),
    updatedAt: new Date('2025-01-19T12:30:00Z'),
    source: 'manual',
    lastModifiedBy: 'developer',
  },
  {
    id: '4',
    title: 'Add localStorage persistence',
    description: 'Save kanban state to browser localStorage',
    status: 'todo',
    priority: 'medium',
    tags: ['persistence', 'storage'],
    createdAt: new Date('2025-01-19T12:30:00Z'),
    updatedAt: new Date('2025-01-19T12:30:00Z'),
    source: 'manual',
    lastModifiedBy: 'developer',
  },
  {
    id: '5',
    title: 'Implement Claude Code integration',
    description: 'Create API endpoints for Claude Code to update tasks',
    status: 'todo',
    priority: 'medium',
    tags: ['claude-code', 'integration', 'api'],
    createdAt: new Date('2025-01-19T12:30:00Z'),
    updatedAt: new Date('2025-01-19T12:30:00Z'),
    source: 'manual',
    lastModifiedBy: 'developer',
  },
];

// Default kanban data
export const defaultKanbanData: KanbanData = {
  tasks: sampleTasks,
  columns: defaultColumns,
  lastUpdated: new Date(),
};