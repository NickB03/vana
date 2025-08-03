import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Brain } from 'lucide-react'
import { AIReasoning, type ThinkingStep } from './ui/AIReasoning'
import { cn } from '@/lib/utils'

interface ThinkingPanelProps {
  steps: ThinkingStep[]
  defaultExpanded?: boolean
  className?: string
}

export function ThinkingPanel({ 
  steps, 
  defaultExpanded = true,
  className 
}: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  
  // Count active steps
  const activeSteps = steps.filter(s => s.status === 'active').length
  const completedSteps = steps.filter(s => s.status === 'complete').length
  
  return (
    <div className={cn(
      "fixed right-0 top-0 h-full z-[60]",
      className
    )}>
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="h-full w-96 bg-black/40 backdrop-blur-lg border-l border-[var(--border-primary)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[var(--accent-purple)]" />
                <h2 className="text-lg font-semibold gradient-text-animated">
                  AI Thinking Process
                </h2>
              </div>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-[var(--bg-element)] rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            {/* Status bar */}
            {(activeSteps > 0 || completedSteps > 0) && (
              <div className="px-4 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-element)]/50">
                <div className="flex items-center gap-4 text-sm">
                  {activeSteps > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-pulse" />
                      {activeSteps} active
                    </span>
                  )}
                  {completedSteps > 0 && (
                    <span className="text-[var(--text-secondary)]">
                      {completedSteps} completed
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Steps */}
            <div className="p-4 overflow-y-auto h-[calc(100%-8rem)]">
              {steps.length > 0 ? (
                <AIReasoning steps={steps} />
              ) : (
                <div className="text-center text-[var(--text-secondary)] py-8">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Waiting for activity...</p>
                  <p className="text-xs mt-2">
                    Agent thinking steps will appear here
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ x: 100 }}
            animate={{ x: 0 }}
            exit={{ x: 100 }}
            onClick={() => setIsExpanded(true)}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2",
              "bg-black/60 backdrop-blur-lg border border-[var(--border-primary)]",
              "rounded-l-lg p-3 hover:bg-black/80 transition-all",
              "hover:translate-x-0 translate-x-2"
            )}
          >
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">AI Thinking</span>
                {activeSteps > 0 && (
                  <span className="text-xs text-[var(--accent-blue)]">
                    {activeSteps} active
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}