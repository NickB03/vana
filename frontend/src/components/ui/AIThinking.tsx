import { motion } from 'framer-motion'
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineDot,
  TimelineContent,
  TimelineHeading,
  TimelineDescription,
} from './timeline'
import { ContextualLoading, useElapsedTime, type LoadingPhase } from './ContextualLoading'
import type { ThinkingStep } from './AIReasoning'

interface AIThinkingProps {
  steps: ThinkingStep[]
  className?: string
  showContextualLoading?: boolean
  currentPhase?: LoadingPhase
  isThinking?: boolean
}

export function AIThinking({ 
  steps, 
  className, 
  showContextualLoading = false,
  currentPhase,
  isThinking = false
}: AIThinkingProps) {
  const elapsedTime = useElapsedTime(isThinking)
  const getEmoji = (action: string) => {
    if (action.includes('Analyzing')) return '🎯'
    if (action.includes('Routing')) return '🔀'
    if (action.includes('research')) return '🔍'
    if (action.includes('Aggregating')) return '📊'
    if (action.includes('response')) return '✅'
    return '🤖'
  }

  // Determine current phase from active steps if not provided
  const inferredPhase = currentPhase || (() => {
    const activeSteps = steps.filter(s => s.status === 'active')
    if (activeSteps.length === 0) return 'idle'
    
    const activeActions = activeSteps.map(s => s.action.toLowerCase())
    if (activeActions.some(a => a.includes('compos') || a.includes('writ'))) return 'composing'
    if (activeActions.some(a => a.includes('evaluat') || a.includes('check'))) return 'evaluating'
    if (activeActions.some(a => a.includes('search') || a.includes('research'))) return 'researching'
    if (activeActions.some(a => a.includes('plan') || a.includes('analyz'))) return 'planning'
    return 'processing'
  })()
  
  // Get current activity from active steps
  const currentActivity = steps.find(s => s.status === 'active')?.action
  const activeAgent = steps.find(s => s.status === 'active')?.agent

  return (
    <div className={className}>
      {/* Show contextual loading at the top if enabled */}
      {showContextualLoading && isThinking && (
        <div className="mb-6 p-4 bg-[var(--bg-element)]/50 rounded-lg">
          <ContextualLoading
            phase={inferredPhase}
            currentActivity={currentActivity}
            elapsedTime={elapsedTime}
            agentName={activeAgent}
            showEstimate={true}
          />
        </div>
      )}
      
      {/* Traditional timeline view */}
      <Timeline>
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <TimelineItem>
            <TimelineDot status={step.status} />
            {index < steps.length - 1 && (
              <TimelineConnector 
                isActive={step.status === 'active'} 
                isComplete={step.status === 'complete'} 
              />
            )}
            <TimelineContent>
              <TimelineHeading className="flex items-center gap-2">
                <span>{getEmoji(step.action)}</span>
                <span className={step.status === 'complete' ? 'text-[var(--text-secondary)]' : ''}>
                  {step.action}
                </span>
              </TimelineHeading>
              {step.details && (
                <TimelineDescription>{step.details}</TimelineDescription>
              )}
              {step.agent && (
                <TimelineDescription className="text-[var(--accent-purple)]">
                  via {step.agent}
                </TimelineDescription>
              )}
              {step.duration && step.status === 'complete' && (
                <TimelineDescription>
                  Completed in {step.duration}ms
                </TimelineDescription>
              )}
            </TimelineContent>
          </TimelineItem>
        </motion.div>
      ))}
      </Timeline>
    </div>
  )
}