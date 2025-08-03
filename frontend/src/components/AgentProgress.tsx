import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThinkingStep } from './ui/AIReasoning'

interface AgentProgressProps {
  steps: ThinkingStep[]
  className?: string
  detailLevel?: 'minimal' | 'summary' | 'detailed'
  onDetailLevelChange?: (level: 'minimal' | 'summary' | 'detailed') => void
}

interface GroupedActivity {
  agent: string
  activities: ThinkingStep[]
  status: 'active' | 'complete' | 'pending'
  progress: number
  confidence?: number
}

export function AgentProgress({ 
  steps, 
  className,
  detailLevel = 'summary',
  onDetailLevelChange
}: AgentProgressProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  
  // Group steps by agent and calculate progress
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, GroupedActivity>()
    
    steps.forEach(step => {
      const agent = step.agent || 'System'
      
      if (!groups.has(agent)) {
        groups.set(agent, {
          agent,
          activities: [],
          status: 'pending',
          progress: 0,
          confidence: Math.random() * 20 + 80 // Mock confidence 80-100%
        })
      }
      
      const group = groups.get(agent)!
      group.activities.push(step)
      
      // Update group status based on activities
      const hasActive = group.activities.some(a => a.status === 'active')
      const hasComplete = group.activities.some(a => a.status === 'complete')
      const allComplete = group.activities.every(a => a.status === 'complete')
      
      if (hasActive) {
        group.status = 'active'
      } else if (allComplete && hasComplete) {
        group.status = 'complete'
      } else {
        group.status = 'pending'
      }
      
      // Calculate progress
      const completed = group.activities.filter(a => a.status === 'complete').length
      group.progress = group.activities.length > 0 ? (completed / group.activities.length) * 100 : 0
    })
    
    return Array.from(groups.values()).sort((a, b) => {
      // Sort by status priority (active > pending > complete)
      const statusOrder = { active: 0, pending: 1, complete: 2 }
      return statusOrder[a.status] - statusOrder[b.status]
    })
  }, [steps])
  
  const toggleAgent = (agent: string) => {
    const newExpanded = new Set(expandedAgents)
    if (newExpanded.has(agent)) {
      newExpanded.delete(agent)
    } else {
      newExpanded.add(agent)
    }
    setExpandedAgents(newExpanded)
  }
  
  const getStatusIcon = (status: 'active' | 'complete' | 'pending') => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4 text-[var(--accent-blue)] animate-pulse" />
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-[var(--vana-success)]" />
      case 'pending':
        return <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
    }
  }
  
  const getStatusColor = (status: 'active' | 'complete' | 'pending') => {
    switch (status) {
      case 'active':
        return 'var(--accent-blue)'
      case 'complete':
        return 'var(--vana-success)'
      case 'pending':
        return 'var(--text-secondary)'
    }
  }
  
  if (detailLevel === 'minimal') {
    const activeCount = groupedActivities.filter(g => g.status === 'active').length
    const completeCount = groupedActivities.filter(g => g.status === 'complete').length
    
    return (
      <div className={cn("flex items-center gap-3 text-sm", className)}>
        {activeCount > 0 && (
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4 text-[var(--accent-blue)] animate-pulse" />
            <span>{activeCount} active</span>
          </div>
        )}
        {completeCount > 0 && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-[var(--vana-success)]" />
            <span>{completeCount} complete</span>
          </div>
        )}
        {activeCount === 0 && completeCount === 0 && (
          <span className="text-[var(--text-secondary)]">Ready</span>
        )}
      </div>
    )
  }
  
  return (
    <div className={cn("space-y-3", className)}>
      {/* Detail level controls */}
      {onDetailLevelChange && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[var(--text-secondary)]">Detail:</span>
          <div className="flex bg-[var(--bg-element)] rounded-lg p-1">
            {(['minimal', 'summary', 'detailed'] as const).map(level => (
              <button
                key={level}
                onClick={() => onDetailLevelChange(level)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  detailLevel === level 
                    ? "bg-[var(--accent-blue)] text-white" 
                    : "text-[var(--text-secondary)] hover:text-white"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Agent activities */}
      <div className="space-y-2">
        {groupedActivities.map(group => (
          <motion.div
            key={group.agent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-element)]/50 rounded-lg overflow-hidden"
          >
            {/* Agent header */}
            <button
              onClick={() => toggleAgent(group.agent)}
              className="w-full p-3 flex items-center gap-3 hover:bg-[var(--bg-element)] transition-colors"
            >
              {getStatusIcon(group.status)}
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{group.agent}</span>
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: `${getStatusColor(group.status)}20`,
                      color: getStatusColor(group.status)
                    }}
                  >
                    {group.status}
                  </span>
                </div>
                
                {detailLevel === 'detailed' && (
                  <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-secondary)]">
                    <span>Progress: {Math.round(group.progress)}%</span>
                    {group.confidence && (
                      <span>Confidence: {Math.round(group.confidence)}%</span>
                    )}
                    <span>{group.activities.length} tasks</span>
                  </div>
                )}
              </div>
              
              <motion.div
                animate={{ rotate: expandedAgents.has(group.agent) ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
              </motion.div>
            </button>
            
            {/* Progress bar */}
            {group.progress > 0 && (
              <div className="px-3 pb-2">
                <div className="h-1 bg-[var(--bg-element)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getStatusColor(group.status) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${group.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
            
            {/* Agent activities detail */}
            <AnimatePresence>
              {expandedAgents.has(group.agent) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 pt-0 space-y-2 border-t border-[var(--border-primary)]">
                    {group.activities.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          activity.status === 'active' && "bg-[var(--accent-blue)] animate-pulse",
                          activity.status === 'complete' && "bg-[var(--vana-success)]",
                          activity.status === 'pending' && "bg-[var(--text-secondary)]"
                        )} />
                        
                        <span className={cn(
                          activity.status === 'complete' && "text-[var(--text-secondary)]",
                          activity.status === 'active' && "text-white",
                          activity.status === 'pending' && "text-[var(--text-secondary)]"
                        )}>
                          {activity.action}
                        </span>
                        
                        {activity.duration && activity.status === 'complete' && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {activity.duration}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      
      {groupedActivities.length === 0 && (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No agent activity yet</p>
        </div>
      )}
    </div>
  )
}