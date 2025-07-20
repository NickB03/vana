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
  const { kanbanData, isLoading, updateTasks, exportData, setKanbanData } = useKanban();
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration errors by only rendering time on client
  useEffect(() => {
    setMounted(true);
  }, []);

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
    try {
      const { active, over } = event;
      
      if (!over || active.id === over.id) return;

      // Find the task being moved
      const task = kanbanData.tasks.find(t => t.id === active.id);
      if (!task) return;

      // Determine the new status based on the drop target
      let newStatus: TaskStatus = task.status;
      
      // Check if dropped on a column
      const targetColumn = kanbanData.columns.find(col => col.id === over.id);
      if (targetColumn) {
        newStatus = targetColumn.id as TaskStatus;
      } else {
        // Dropped on another task - get that task's column
        const targetTask = kanbanData.tasks.find(t => t.id === over.id);
        if (targetTask) {
          newStatus = targetTask.status;
        }
      }

      // Update the task with new status
      const updatedTasks = kanbanData.tasks.map(t =>
        t.id === active.id
          ? { ...t, status: newStatus, updatedAt: new Date() }
          : t
      );

      updateTasks(updatedTasks);
    } catch (err) {
      console.error('Error handling drag end:', err);
      setError('Failed to move task');
    }
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

      {/* Simplified Kanban Board */}
      <KanbanProvider
        columns={kanbanData.columns}
        data={kanbanData.tasks}
        onDragEnd={handleDragEnd}
        onDataChange={updateTasks}
        className="grid grid-cols-3 gap-4"
      >
        {(column) => (
          <KanbanBoard
            key={column.id}
            id={column.id}
            className="bg-card border rounded-lg p-4 min-h-[400px]"
          >
            <KanbanHeader className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{column.name}</h2>
                <Badge variant="secondary">
                  {kanbanData.tasks.filter(task => task.status === column.id).length}
                </Badge>
              </div>
            </KanbanHeader>
            
            <KanbanCards 
              id={column.id}
              className="space-y-2"
            >
              {(task: Task) => (
                <KanbanCard
                  key={task.id}
                  id={task.id}
                  name={task.title}
                  column={task.status}
                  className={cn(
                    'bg-background border rounded-lg p-4 cursor-move hover:shadow-lg transition-shadow',
                    'border-l-4',
                    statusColors[task.status]
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm leading-tight">
                        {task.title}
                      </h4>
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
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  );
}