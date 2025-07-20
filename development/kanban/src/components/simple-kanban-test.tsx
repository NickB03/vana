'use client';

import { useState } from 'react';
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
} from '@/components/ui/kibo-ui/kanban';
import { Badge } from '@/components/ui/badge';

const testData = [
  { id: '1', name: 'Test Task 1', column: 'todo' },
  { id: '2', name: 'Test Task 2', column: 'in-progress' },
  { id: '3', name: 'Test Task 3', column: 'done' },
];

const testColumns = [
  { id: 'todo', name: 'Todo' },
  { id: 'in-progress', name: 'In Progress' },
  { id: 'done', name: 'Done' },
];

export default function SimpleKanbanTest() {
  console.log('SimpleKanbanTest rendering with data:', { testData, testColumns });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Simple Kanban Test</h1>
      
      <KanbanProvider
        columns={testColumns}
        data={testData}
        className="grid grid-cols-3 gap-4"
      >
        {(column) => {
          console.log('Test: Rendering column:', column.id);
          return (
            <KanbanBoard
              key={column.id}
              id={column.id}
              className="bg-card border rounded-lg p-4 min-h-[200px]"
            >
              <KanbanHeader className="mb-4">
                <h2 className="font-semibold">{column.name}</h2>
              </KanbanHeader>
              
              <KanbanCards id={column.id}>
                {(item) => {
                  console.log('Test: Rendering task:', item);
                  return (
                    <KanbanCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      column={item.column}
                      className="bg-background border p-2 mb-2"
                    >
                      <p>{item.name}</p>
                    </KanbanCard>
                  );
                }}
              </KanbanCards>
            </KanbanBoard>
          );
        }}
      </KanbanProvider>
    </div>
  );
}