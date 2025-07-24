import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Timeline } from './shadcn-timeline'
import type { ThinkingStep } from './AIReasoning'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'
import { cn } from '@/lib/utils'

interface AIMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
  status?: 'sending' | 'sent' | 'error'
  children?: ReactNode
  isThinking?: boolean
  thinkingSteps?: ThinkingStep[]
}

export function AIMessage({ 
  role, 
  content, 
  status: _status = 'sent',
  children,
  isThinking = false,
  thinkingSteps = []
}: AIMessageProps) {
  const isUser = role === 'user'
  const isSystem = role === 'system'
  const [isOpen, setIsOpen] = useState(true)
  
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
        <div className="text-base leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap mb-4">
          {content}
          {children}
        </div>
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
                Show Agent activity
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
              <Timeline items={thinkingSteps} />
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </motion.div>
  )
}