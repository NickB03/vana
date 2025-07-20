'use client';

// Simple backup version that works
export default function KanbanBoardSimple() {
  return (
    <div className="w-full h-full p-6">
      <h1 className="text-3xl font-bold mb-6">Project Kanban</h1>
      <p className="text-muted-foreground mb-6">
        Kanban board is loading successfully!
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Todo</h2>
          <div className="space-y-2">
            <div className="bg-background border rounded p-3">
              <p className="font-medium">Sample Task 1</p>
              <p className="text-sm text-muted-foreground">This is a test task</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-semibold mb-2">In Progress</h2>
          <div className="space-y-2">
            <div className="bg-background border rounded p-3">
              <p className="font-medium">Sample Task 2</p>
              <p className="text-sm text-muted-foreground">This is another test task</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Done</h2>
          <div className="space-y-2">
            <div className="bg-background border rounded p-3">
              <p className="font-medium">Sample Task 3</p>
              <p className="text-sm text-muted-foreground">This task is completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}