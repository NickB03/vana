'use client'

import { useAgentDeckStore } from '@/stores/agentDeckStore'
import { InlineTaskStatusIndicator } from './TaskStatusIndicator'

export function InlineTaskList() {
  const { tasks } = useAgentDeckStore()

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-2 p-2 bg-muted rounded">
          <InlineTaskStatusIndicator task={task} />
          <span className="text-sm">{task.title}</span>
        </div>
      ))}
    </div>
  )
}