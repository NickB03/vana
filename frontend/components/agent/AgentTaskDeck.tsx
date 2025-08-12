'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAgentDeckStore } from '@/stores/agentDeckStore'
import { AgentTaskCard } from './AgentTaskCard'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AgentTaskDeck() {
  const { isVisible, tasks, setVisible } = useAgentDeckStore()

  if (!isVisible || tasks.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="fixed right-4 bottom-4 z-50 max-w-sm"
      >
        <div className="bg-background border rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Agent Tasks</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVisible(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {tasks.slice(0, 3).map((task) => (
              <AgentTaskCard
                key={task.id}
                task={task}
                className="text-xs"
              />
            ))}
            
            {tasks.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{tasks.length - 3} more tasks
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}