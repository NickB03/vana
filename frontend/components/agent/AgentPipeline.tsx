'use client'

import { useAgentDeckStore } from '@/stores/agentDeckStore'
import { PipelineTaskStatusIndicator } from './TaskStatusIndicator'

export function AgentPipeline() {
  const { tasks } = useAgentDeckStore()

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Agent Pipeline</h3>
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div key={task.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <PipelineTaskStatusIndicator task={task} />
              {index < tasks.length - 1 && (
                <div className="w-px h-8 bg-border mt-2" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}