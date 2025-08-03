import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Brain, Search, FileText, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThinkingStep } from './ui/AIReasoning'

interface SimplifiedThinkingPanelProps {
  steps: ThinkingStep[]
  defaultExpanded?: boolean
  className?: string
}

type ResearchPhase = 'planning' | 'researching' | 'evaluating' | 'composing' | 'complete'

interface PhaseInfo {
  phase: ResearchPhase
  icon: React.ReactNode
  title: string
  description: string
  progress: number
}

// Map agent names to phases
const AGENT_PHASE_MAP: Record<string, ResearchPhase> = {
  'Research Planner': 'planning',
  'Plan Generator': 'planning',
  'Section Planner': 'planning',
  'Researcher': 'researching',
  'Search Expert': 'researching',
  'Quality Evaluator': 'evaluating',
  'Report Composer': 'composing',
  'Research Pipeline': 'researching',
  'Refinement Loop': 'evaluating',
}

const PHASE_INFO: Record<ResearchPhase, Omit<PhaseInfo, 'phase' | 'progress'>> = {
  planning: {
    icon: <Brain className="w-5 h-5" />,
    title: 'Planning',
    description: 'Creating research strategy...'
  },
  researching: {
    icon: <Search className="w-5 h-5" />,
    title: 'Researching',
    description: 'Gathering information...'
  },
  evaluating: {
    icon: <CheckCircle className="w-5 h-5" />,
    title: 'Evaluating',
    description: 'Ensuring quality...'
  },
  composing: {
    icon: <FileText className="w-5 h-5" />,
    title: 'Composing',
    description: 'Writing final report...'
  },
  complete: {
    icon: <CheckCircle className="w-5 h-5" />,
    title: 'Complete',
    description: 'Research finished!'
  }
}

export function SimplifiedThinkingPanel({ 
  steps, 
  defaultExpanded = true,
  className 
}: SimplifiedThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [currentPhase, setCurrentPhase] = useState<ResearchPhase>('planning')
  const [progress, setProgress] = useState(0)
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  
  useEffect(() => {
    // Determine current phase and progress based on active steps
    const activeSteps = steps.filter(s => s.status === 'active')
    const completedSteps = steps.filter(s => s.status === 'complete')
    const totalSteps = steps.length
    
    // Update active agents list
    const agents = activeSteps.map(s => s.agent).filter(Boolean)
    setActiveAgents(agents)
    
    // Determine phase from active agents
    if (activeSteps.length > 0) {
      const phases = activeSteps
        .map(s => AGENT_PHASE_MAP[s.agent])
        .filter(Boolean)
      
      if (phases.includes('composing')) setCurrentPhase('composing')
      else if (phases.includes('evaluating')) setCurrentPhase('evaluating')
      else if (phases.includes('researching')) setCurrentPhase('researching')
      else if (phases.includes('planning')) setCurrentPhase('planning')
    } else if (completedSteps.length === totalSteps && totalSteps > 0) {
      setCurrentPhase('complete')
    }
    
    // Calculate overall progress
    if (totalSteps > 0) {
      const progressValue = (completedSteps.length / totalSteps) * 100
      setProgress(Math.round(progressValue))
    }
  }, [steps])
  
  const phaseInfo = {
    phase: currentPhase,
    progress,
    ...PHASE_INFO[currentPhase]
  }
  
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
            className="h-full w-80 bg-black/40 backdrop-blur-lg border-l border-[var(--border-primary)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                {phaseInfo.icon}
                <h2 className="text-lg font-semibold gradient-text-animated">
                  Research Progress
                </h2>
              </div>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-[var(--bg-element)] rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            {/* Main Progress View */}
            <div className="p-6">
              {/* Phase Indicator */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-[var(--accent-blue)]">
                    {phaseInfo.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {phaseInfo.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {phaseInfo.description}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-secondary)]">Progress</span>
                  <span className="text-[var(--accent-blue)]">{progress}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-element)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
              
              {/* Phase Timeline */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3 text-[var(--text-secondary)]">
                  Research Phases
                </h4>
                <div className="flex items-center justify-between">
                  {(['planning', 'researching', 'evaluating', 'composing'] as const).map((phase, index) => {
                    const isActive = phase === currentPhase
                    const isComplete = ['planning', 'researching', 'evaluating', 'composing'].indexOf(phase) < 
                                     ['planning', 'researching', 'evaluating', 'composing'].indexOf(currentPhase)
                    
                    return (
                      <div key={phase} className="flex items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                          isComplete && "bg-[var(--accent-blue)] text-white",
                          isActive && "bg-[var(--accent-purple)] text-white animate-pulse",
                          !isComplete && !isActive && "bg-[var(--bg-element)] text-[var(--text-secondary)]"
                        )}>
                          {index + 1}
                        </div>
                        {index < 3 && (
                          <div className={cn(
                            "w-12 h-0.5 mx-1",
                            isComplete ? "bg-[var(--accent-blue)]" : "bg-[var(--bg-element)]"
                          )} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Active Tasks */}
              {activeAgents.length > 0 && currentPhase !== 'complete' && (
                <div className="bg-[var(--bg-element)] rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2 text-[var(--text-secondary)]">
                    Currently Active
                  </h4>
                  <ul className="space-y-1">
                    {activeAgents.slice(0, 3).map((agent, index) => (
                      <li key={index} className="text-sm text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[var(--accent-blue)] rounded-full animate-pulse" />
                        {agent}
                      </li>
                    ))}
                    {activeAgents.length > 3 && (
                      <li className="text-sm text-[var(--text-secondary)]">
                        and {activeAgents.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {/* Completion Message */}
              {currentPhase === 'complete' && (
                <div className="bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-[var(--accent-blue)]">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Research Complete!</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Your report is ready below.
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
                <span className="text-xs font-medium">Research</span>
                <span className="text-xs text-[var(--accent-blue)]">
                  {progress}%
                </span>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}