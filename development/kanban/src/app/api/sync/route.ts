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
    
    // Convert date strings back to Date objects
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

// GET - Read current kanban state
export async function GET() {
  try {
    const data = await readKanbanData();
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Failed to read kanban data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update kanban state or add new task
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

    // Check if this is a full data replacement or a task update
    if (body.tasks && body.columns) {
      // Full data replacement
      const newData: KanbanData = {
        ...body,
        lastUpdated: new Date(),
        tasks: body.tasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        })),
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
    } else {
      // Single task creation/update (Claude Code format)
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
          id: Date.now().toString(),
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
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}