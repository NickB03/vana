'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, KanbanData, TaskStatus } from '@/lib/types';
import { defaultKanbanData } from '@/lib/sample-data';

const STORAGE_KEY = 'kanban-data';

export const useKanban = () => {
  const [kanbanData, setKanbanData] = useState<KanbanData>(defaultKanbanData);
  const [isLoading, setIsLoading] = useState(false); // Start with false to bypass loading issue

  // Load data from localStorage on mount
  useEffect(() => {
    console.log('useKanban: Loading data from localStorage');
    
    // Add a small delay to ensure we're in the browser
    const loadData = () => {
      try {
        if (typeof window === 'undefined' || !window.localStorage) {
          console.log('useKanban: localStorage not available');
          setKanbanData(defaultKanbanData);
          setIsLoading(false);
          return;
        }
        
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('useKanban: Stored data exists:', !!stored);
        console.log('useKanban: Storage key used:', STORAGE_KEY);
        console.log('useKanban: Stored data preview:', stored ? stored.substring(0, 100) + '...' : 'null');
        
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const data = {
            ...parsed,
            lastUpdated: new Date(parsed.lastUpdated),
            tasks: parsed.tasks.map((task: any) => ({
              ...task,
              createdAt: new Date(task.createdAt),
              updatedAt: new Date(task.updatedAt),
              dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            })),
          };
          setKanbanData(data);
        } else {
          console.log('useKanban: No stored data, using default');
          setKanbanData(defaultKanbanData);
        }
      } catch (error) {
        console.error('Failed to load kanban data from localStorage:', error);
        // Use default data on error
        setKanbanData(defaultKanbanData);
      } finally {
        console.log('useKanban: Setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    // Execute immediately
    loadData();
  }, []);

  // Save data to localStorage whenever it changes
  const saveToStorage = useCallback((data: KanbanData) => {
    try {
      console.log('💾 saveToStorage called with:', data.tasks.length, 'tasks');
      const jsonData = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, jsonData);
      console.log('✅ Successfully saved to localStorage under key:', STORAGE_KEY);
      
      // Verify it was saved
      const verification = localStorage.getItem(STORAGE_KEY);
      console.log('🔍 Verification - data saved correctly:', !!verification);
    } catch (error) {
      console.error('❌ Failed to save kanban data to localStorage:', error);
    }
  }, []);

  // Update tasks and save to storage
  const updateTasks = useCallback((newTasks: Task[]) => {
    console.log('🔄 updateTasks called with:', newTasks.length, 'tasks');
    console.log('📋 Task statuses:', newTasks.map(t => `${t.id}:${t.status}`));
    
    const newData = {
      ...kanbanData,
      tasks: newTasks,
      lastUpdated: new Date(),
    };
    
    console.log('💾 Saving new kanban data:', newData);
    setKanbanData(newData);
    saveToStorage(newData);
    console.log('✅ Update complete');
  }, [kanbanData, saveToStorage]);

  // Move task to different column
  const moveTask = useCallback((taskId: string, newStatus: TaskStatus) => {
    const updatedTasks = kanbanData.tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: newStatus, updatedAt: new Date() }
        : task
    );
    updateTasks(updatedTasks);
  }, [kanbanData.tasks, updateTasks]);

  // Add new task
  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    updateTasks([...kanbanData.tasks, newTask]);
  }, [kanbanData.tasks, updateTasks]);

  // Update existing task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    const updatedTasks = kanbanData.tasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date() }
        : task
    );
    updateTasks(updatedTasks);
  }, [kanbanData.tasks, updateTasks]);

  // Delete task
  const deleteTask = useCallback((taskId: string) => {
    const updatedTasks = kanbanData.tasks.filter(task => task.id !== taskId);
    updateTasks(updatedTasks);
  }, [kanbanData.tasks, updateTasks]);

  // Export data as JSON
  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(kanbanData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanban-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [kanbanData]);

  // Import data from JSON
  const importData = useCallback((jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      const data = {
        ...parsed,
        lastUpdated: new Date(parsed.lastUpdated),
        tasks: parsed.tasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        })),
      };
      setKanbanData(data);
      saveToStorage(data);
      return true;
    } catch (error) {
      console.error('Failed to import kanban data:', error);
      return false;
    }
  }, [saveToStorage]);

  // Wrapper for setKanbanData that ensures dates are properly converted
  const setKanbanDataSafe = useCallback((data: KanbanData | any) => {
    const safeData = {
      ...data,
      lastUpdated: data.lastUpdated instanceof Date ? data.lastUpdated : new Date(data.lastUpdated),
      tasks: data.tasks.map((task: any) => ({
        ...task,
        createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt),
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt),
        dueDate: task.dueDate ? (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)) : undefined,
      })),
    };
    setKanbanData(safeData);
    saveToStorage(safeData);
  }, [saveToStorage]);

  return {
    kanbanData,
    isLoading,
    setKanbanData: setKanbanDataSafe,
    updateTasks,
    moveTask,
    addTask,
    updateTask,
    deleteTask,
    exportData,
    importData,
  };
};