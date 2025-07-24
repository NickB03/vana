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
import type { ThinkingStep } from './AIReasoning'

interface AIThinkingProps {
  steps: ThinkingStep[]
  className?: string
}

export function AIThinking({ steps, className }: AIThinkingProps) {
  const getEmoji = (action: string) => {
    if (action.includes('Analyzing')) return '🎯'
    if (action.includes('Routing')) return '🔀'
    if (action.includes('research')) return '🔍'
    if (action.includes('Aggregating')) return '📊'
    if (action.includes('response')) return '✅'
    return '🤖'
  }

  return (
    <Timeline className={className}>
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
  )
}