import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Timeline } from './shadcn-timeline'
import type { ThinkingStep } from './AIReasoning'
import { AIToolsContainer } from './ai-tool'
import { transformThinkingStepsToAITools, getToolStats } from '../../utils/ai-tool-transformer'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'
import { cn } from '@/lib/utils'
import { ResearchPlanDisplay } from '../ResearchPlanDisplay'
import { QuickResponseButtons } from '../QuickResponseButtons'

interface AIMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
  status?: 'sending' | 'sent' | 'error'
  children?: ReactNode
  isThinking?: boolean
  thinkingSteps?: ThinkingStep[]
  onPlanStart?: () => void
  onPlanEdit?: (editedPlan: string) => void
  onSendMessage?: (message: string) => void
}

export function AIMessage({ 
  role, 
  content, 
  status: _status = 'sent',
  children,
  isThinking = false,
  thinkingSteps = [],
  onPlanStart,
  onPlanEdit,
  onSendMessage
}: AIMessageProps) {
  const isUser = role === 'user'
  const isSystem = role === 'system'
  const [isOpen, setIsOpen] = useState(true)
  
  // Detect if this message contains a research plan
  const isResearchPlan = content.toLowerCase().includes('research plan:') && 
                        content.includes('[RESEARCH]') &&
                        !content.toLowerCase().includes('does this research plan look good')
  
  // Only user messages get bubbles
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end mb-6"
      >
        <div className="max-w-[70%] bg-[#2A2B32] text-white rounded-2xl px-5 py-3 text-base">
          {content}
        </div>
      </motion.div>
    )
  }

  // System messages
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-sm text-[var(--text-secondary)] py-4"
      >
        {content}
      </motion.div>
    )
  }

  // Assistant messages (no bubble, Gemini style)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      {/* Response content */}
      {!isThinking || content ? (
        <>
          {/* Show research plan with special UI if detected */}
          {isResearchPlan && onPlanStart && onPlanEdit ? (
            <ResearchPlanDisplay
              plan={content}
              onStart={onPlanStart}
              onEdit={onPlanEdit}
              className="mb-4"
            />
          ) : (
            <div className="text-base leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap mb-4">
              {content}
              {children}
              
              {/* Quick response buttons for agent questions */}
              {onSendMessage && (
                <QuickResponseButtons
                  messageContent={content}
                  onSendMessage={onSendMessage}
                />
              )}
            </div>
          )}
        </>
      ) : null}


      {/* Show agents button - only show if we have thinking steps */}
      {thinkingSteps && thinkingSteps.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 transition-colors">
              <div className="p-1">
                <Sparkles className={cn("w-5 h-5", isThinking && "gradient-pulse")} />
              </div>
              <span className="text-base font-medium">
                Show Agent Activity ({getToolStats(transformThinkingStepsToAITools(thinkingSteps)).completed}/{getToolStats(transformThinkingStepsToAITools(thinkingSteps)).total})
              </span>
              <motion.svg
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4"
            >
              <AIToolsContainer 
                tools={transformThinkingStepsToAITools(thinkingSteps)}
                title="Agent Execution"
              />
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </motion.div>
  )
}