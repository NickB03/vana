import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, Loader2 } from 'lucide-react'

export interface ThinkingStep {
  id: string
  agent: string
  action: string
  status: 'pending' | 'active' | 'complete'
  duration?: string | number
  details?: string
}

interface AIReasoningProps {
  steps: ThinkingStep[]
  className?: string
}

export function AIReasoning({ steps, className }: AIReasoningProps) {
  const getStatusIcon = (status: ThinkingStep['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
      case 'active':
        return <Loader2 className="w-4 h-4 text-[var(--accent-blue)] animate-spin" />
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-[var(--accent-blue)]" />
    }
  }
  
  const getStatusEmoji = (action: string) => {
    if (action.includes('Analyzing')) return '🎯'
    if (action.includes('Routing')) return '🔀'
    if (action.includes('research')) return '🔍'
    if (action.includes('Aggregating')) return '📊'
    if (action.includes('response')) return '✅'
    return '🤖'
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence mode="popLayout">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg",
              "bg-[var(--bg-element)] border border-[var(--border-primary)]",
              step.status === 'active' && "border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/5"
            )}
          >
            {/* Status Icon */}
            <div className="mt-0.5">
              {getStatusIcon(step.status)}
            </div>
            
            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className="text-lg">{getStatusEmoji(step.action)}</span>
                <div className="flex-1">
                  <p className={cn(
                    "text-sm",
                    step.status === 'complete' ? "text-[var(--text-secondary)]" : "text-white"
                  )}>
                    {step.action}
                  </p>
                  
                  {/* Details */}
                  {step.details && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {step.details}
                    </p>
                  )}
                  
                  {/* Agent info */}
                  {step.agent && (
                    <p className="text-xs text-[var(--accent-purple)] mt-1">
                      via {step.agent}
                    </p>
                  )}
                </div>
                
                {/* Duration */}
                {step.duration && step.status === 'complete' && (
                  <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {step.duration}ms
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}