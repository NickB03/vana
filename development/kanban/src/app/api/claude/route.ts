import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { KanbanData, Task, ClaudeTaskUpdate } from '@/lib/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'kanban-data.json');

// Read kanban data from file
async function readKanbanData(): Promise<KanbanData | null> {
  try {
    const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated),
      tasks: data.tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      })),
    };
  } catch (error) {
    console.error('Failed to read kanban data file:', error);
    return null;
  }
}

// Write kanban data to file
async function writeKanbanData(data: KanbanData): Promise<boolean> {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(DATA_FILE_PATH, jsonData, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write kanban data file:', error);
    return false;
  }
}

// POST - Claude Code task operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const currentData = await readKanbanData();
    
    if (!currentData) {
      return NextResponse.json(
        { success: false, error: 'Failed to read current kanban data' },
        { status: 500 }
      );
    }

    // Handle bulk updates
    if (Array.isArray(body.updates)) {
      let updatedTasks = [...currentData.tasks];
      
      for (const update of body.updates) {
        if (update.taskId) {
          // Update existing task
          const taskIndex = updatedTasks.findIndex(t => t.id === update.taskId);
          if (taskIndex >= 0) {
            updatedTasks[taskIndex] = {
              ...updatedTasks[taskIndex],
              ...(update.title && { title: update.title }),
              ...(update.description && { description: update.description }),
              ...(update.status && { status: update.status }),
              ...(update.priority && { priority: update.priority }),
              ...(update.tags && { tags: update.tags }),
              updatedAt: new Date(),
              source: 'claude',
              lastModifiedBy: update.agentSource || 'claude-code',
            };
          }
        } else if (update.title) {
          // Create new task
          const newTask: Task = {
            id: `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: update.title,
            description: update.description,
            status: update.status || 'todo',
            priority: update.priority || 'medium',
            tags: update.tags || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'claude',
            lastModifiedBy: update.agentSource || 'claude-code',
          };
          updatedTasks.push(newTask);
        }
      }

      const newData: KanbanData = {
        ...currentData,
        tasks: updatedTasks,
        lastUpdated: new Date(),
      };

      const success = await writeKanbanData(newData);
      
      if (success) {
        return NextResponse.json({
          success: true,
          data: newData,
          message: `Updated ${body.updates.length} task(s)`,
          timestamp: new Date(),
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Failed to save kanban data' },
          { status: 500 }
        );
      }
    } else {
      // Single task operation
      const update: ClaudeTaskUpdate = body;
      let updatedTasks = [...currentData.tasks];
      
      if (update.taskId) {
        // Update existing task
        const taskIndex = updatedTasks.findIndex(t => t.id === update.taskId);
        if (taskIndex >= 0) {
          updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            title: update.title,
            description: update.description,
            status: update.status,
            priority: update.priority || updatedTasks[taskIndex].priority,
            tags: update.tags || updatedTasks[taskIndex].tags,
            updatedAt: new Date(),
            source: 'claude',
            lastModifiedBy: update.agentSource,
          };
        } else {
          return NextResponse.json(
            { success: false, error: 'Task not found' },
            { status: 404 }
          );
        }
      } else {
        // Create new task
        const newTask: Task = {
          id: `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: update.title,
          description: update.description,
          status: update.status,
          priority: update.priority || 'medium',
          tags: update.tags || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'claude',
          lastModifiedBy: update.agentSource,
        };
        updatedTasks.push(newTask);
      }

      const newData: KanbanData = {
        ...currentData,
        tasks: updatedTasks,
        lastUpdated: new Date(),
      };

      const success = await writeKanbanData(newData);
      
      if (success) {
        return NextResponse.json({
          success: true,
          data: newData,
          timestamp: new Date(),
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Failed to save kanban data' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Claude API error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// GET - Get current state for Claude Code
export async function GET() {
  try {
    const data = await readKanbanData();
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Failed to read kanban data' },
        { status: 500 }
      );
    }

    // Return simplified format for Claude Code
    return NextResponse.json({
      success: true,
      tasks: data.tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        source: task.source,
        updatedAt: task.updatedAt,
      })),
      columns: data.columns,
      lastUpdated: data.lastUpdated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}