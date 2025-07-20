'use client';

import { useState, useEffect } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
} from '@/components/ui/kibo-ui/kanban';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useKanban } from '@/hooks/useKanban';
import { useFileSync } from '@/hooks/useFileSync';
import { Task, TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus, Pencil, X } from 'lucide-react';
import { TaskDialog } from '@/components/task-dialog';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { MCPStatusIndicator } from '@/components/mcp-status-indicator';

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-400 dark:bg-blue-500/20 dark:text-blue-400',
  medium: 'bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
  high: 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-400',
};

const statusColors = {
  todo: 'border-l-red-500',
  'in-progress': 'border-l-yellow-500',
  done: 'border-l-green-500',
};

export default function KanbanBoardComponent() {
  const { kanbanData, isLoading, updateTasks, exportData, setKanbanData, addTask, updateTask, deleteTask } = useKanban();
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  
  // Prevent hydration errors by only rendering time on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Transform tasks to match Kibo UI's expected format
  const transformedTasks = kanbanData.tasks.map(task => ({
    id: task.id,
    name: task.title,
    column: task.status,
    // Keep original task data for rendering
    originalTask: task
  }));

  // Debug log
  useEffect(() => {
    console.log('KanbanBoard Debug:', {
      columns: kanbanData.columns,
      originalTasks: kanbanData.tasks,
      transformedTasks,
      tasksByColumn: {
        todo: transformedTasks.filter(t => t.column === 'todo'),
        'in-progress': transformedTasks.filter(t => t.column === 'in-progress'),
        done: transformedTasks.filter(t => t.column === 'done'),
      }
    });
  }, [kanbanData, transformedTasks]);

  // File sync hook - start disabled
  const { exportToFile, isWatching } = useFileSync({
    onDataChange: (newData) => {
      try {
        setKanbanData(newData);
      } catch (err) {
        console.error('Error updating data from file sync:', err);
        setError('Failed to sync data from file');
      }
    },
    enabled: false, // Start disabled, enable after initial load
  });

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🏁 handleDragEnd called with:', event);
    console.log('🎯 Letting Kibo UI onDataChange handle all updates');
    // Let Kibo UI handle everything through onDataChange
    // This prevents double handling conflicts
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      exportData();
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncToFile = async () => {
    setIsSyncing(true);
    try {
      const success = await exportToFile(kanbanData);
      if (!success) {
        console.error('Failed to sync to file');
        setError('Failed to sync to file');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setError('Failed to sync to file');
    } finally {
      setIsSyncing(false);
    }
  };

  // Task dialog handlers
  const handleNewTask = (status: TaskStatus) => {
    setDefaultStatus(status);
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleTaskSubmit = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      // Update existing task
      updateTask(editingTask.id, taskData);
    } else {
      // Create new task
      addTask(taskData);
    }
    setTaskDialogOpen(false);
    setEditingTask(null);
  };

  const handleDeleteConfirm = (taskId: string) => {
    deleteTask(taskId);
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  // Format date safely
  const formatDate = (date: any) => {
    try {
      if (date instanceof Date) {
        return date.toLocaleTimeString();
      }
      return new Date(date).toLocaleTimeString();
    } catch {
      return 'Unknown';
    }
  };

  const formatDateShort = (date: any) => {
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  // Simplified kanban with drag and drop
  return (
    <div className="w-full h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Project Kanban</h1>
          <p className="text-muted-foreground mt-1">
            Drag tasks between columns to update their status
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isWatching ? "default" : "secondary"}>
              {isWatching ? "🔄 File Sync Active" : "⏸️ File Sync Paused"}
            </Badge>
            {mounted && (
              <span className="text-xs text-muted-foreground">
                Last updated: {formatDate(kanbanData.lastUpdated)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MCPStatusIndicator />
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSyncToFile}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync to File'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export JSON'}
            </Button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Simplified Kanban Board */}
      <KanbanProvider
        columns={kanbanData.columns}
        data={transformedTasks}
        onDragEnd={handleDragEnd}
        onDataChange={(newData) => {
          try {
            console.log('🔄 onDataChange called with:', newData);
            // Transform back to original task format
            const updatedTasks = newData.map(item => ({
              ...item.originalTask,
              status: item.column as TaskStatus,
              updatedAt: new Date()
            }));
            console.log('📝 Updating tasks:', updatedTasks);
            updateTasks(updatedTasks);
            console.log('✅ Tasks updated successfully');
          } catch (err) {
            console.error('❌ Error in onDataChange:', err);
            setError('Failed to update task data');
          }
        }}
        onDragStart={(event) => {
          console.log('🚀 Drag started:', event.active.id, 'from element:', event.active);
          const activeTask = transformedTasks.find(t => t.id === event.active.id);
          console.log('🎯 Active task current column:', activeTask?.column);
        }}
        onDragOver={(event) => {
          console.log('🔄 Drag over:', event.active.id, 'over:', event.over?.id);
          const overType = kanbanData.columns.find(c => c.id === event.over?.id) ? 'column' : 'task';
          console.log('📍 Over type:', overType);
        }}
        className="grid grid-cols-3 gap-4"
      >
        {(column) => {
          console.log('Rendering column:', column.id, column.name);
          const columnTasks = transformedTasks.filter(t => t.column === column.id);
          console.log(`Transformed tasks for ${column.id}:`, columnTasks);
          
          return (
            <KanbanBoard
              key={column.id}
              id={column.id}
              className="bg-card border rounded-lg p-4 min-h-[400px]"
            >
              <KanbanHeader className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">{column.name}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {columnTasks.length}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-primary/10"
                      onClick={() => handleNewTask(column.id)}
                      title="Add new task"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </KanbanHeader>
              
              <KanbanCards 
                id={column.id}
                className="space-y-2"
              >
                {(item: any) => {
                  console.log('KanbanCards render function called for item:', item.id, item.name);
                  const task = item.originalTask as Task;
                  return (
                    <KanbanCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      column={item.column}
                      className={cn(
                        'bg-background border rounded-lg p-4 cursor-grab hover:shadow-lg transition-shadow',
                        'border-l-4 group',
                        statusColors[task.status]
                      )}
                      onMouseDown={() => console.log('🖱️ Mouse down on task:', task.title)}
                      onTouchStart={() => console.log('👆 Touch start on task:', task.title)}
                      style={{ 
                        cursor: 'grab',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none'
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm leading-tight cursor-grab select-none flex-1">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTask(task);
                              }}
                              title="Edit task"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task);
                              }}
                              title="Delete task"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="secondary" 
                            className={cn('text-xs', priorityColors[task.priority])}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {task.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{task.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {task.source === 'claude' ? '🤖' : '👤'} {task.source}
                          </span>
                          {mounted ? (
                            <span>
                              {formatDateShort(task.updatedAt)}
                          </span>
                          ) : (
                            <span>&nbsp;</span>
                          )}
                        </div>
                      </div>
                    </KanbanCard>
                  );
                }}
              </KanbanCards>
            </KanbanBoard>
          );
        }}
      </KanbanProvider>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        defaultStatus={defaultStatus}
        onSubmit={handleTaskSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        task={taskToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}