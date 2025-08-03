import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Search, FileText, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LoadingPhase = 'planning' | 'researching' | 'evaluating' | 'composing' | 'processing' | 'idle'

interface ContextualLoadingProps {
  phase: LoadingPhase
  currentActivity?: string
  estimatedTime?: number // in seconds
  elapsedTime?: number // in seconds
  agentName?: string
  className?: string
  showEstimate?: boolean
}

const PHASE_CONFIG = {
  planning: {
    icon: Brain,
    title: 'Planning Research',
    activities: [
      'Analyzing your request...',
      'Creating research strategy...',
      'Identifying key topics...',
      'Setting up search parameters...'
    ],
    color: 'var(--accent-purple)',
    estimatedDuration: 15
  },
  researching: {
    icon: Search,
    title: 'Gathering Information',
    activities: [
      'Searching for relevant sources...',
      'Collecting data from multiple sources...',
      'Analyzing search results...',
      'Gathering additional context...',
      'Cross-referencing information...'
    ],
    color: 'var(--accent-blue)',
    estimatedDuration: 45
  },
  evaluating: {
    icon: CheckCircle,
    title: 'Quality Review',
    activities: [
      'Checking information accuracy...',
      'Identifying gaps in research...',
      'Verifying source reliability...',
      'Ensuring completeness...'
    ],
    color: 'var(--accent-orange)',
    estimatedDuration: 20
  },
  composing: {
    icon: FileText,
    title: 'Writing Report',
    activities: [
      'Organizing findings...',
      'Creating structured outline...',
      'Writing comprehensive report...',
      'Adding citations and references...',
      'Final formatting and review...'
    ],
    color: 'var(--vana-success)',
    estimatedDuration: 30
  },
  processing: {
    icon: Sparkles,
    title: 'Processing',
    activities: [
      'Processing your request...',
      'Analyzing input...',
      'Preparing response...'
    ],
    color: 'var(--accent-blue)',
    estimatedDuration: 10
  },
  idle: {
    icon: Brain,
    title: 'Ready',
    activities: ['Waiting for your next request...'],
    color: 'var(--text-secondary)',
    estimatedDuration: 0
  }
}

export function ContextualLoading({ 
  phase, 
  currentActivity,
  estimatedTime,
  elapsedTime = 0,
  agentName,
  className,
  showEstimate = true
}: ContextualLoadingProps) {
  const [activityIndex, setActivityIndex] = useState(0)
  const [displayActivity, setDisplayActivity] = useState('')
  
  const config = PHASE_CONFIG[phase]
  const Icon = config.icon
  
  // Cycle through activities if no specific activity is provided
  useEffect(() => {
    if (currentActivity) {
      setDisplayActivity(currentActivity)
      return
    }
    
    if (phase === 'idle') {
      setDisplayActivity(config.activities[0])
      return
    }
    
    const interval = setInterval(() => {
      setActivityIndex(prev => (prev + 1) % config.activities.length)
    }, 3000) // Change activity every 3 seconds
    
    return () => clearInterval(interval)
  }, [phase, currentActivity, config.activities])
  
  useEffect(() => {
    if (!currentActivity) {
      setDisplayActivity(config.activities[activityIndex])
    }
  }, [activityIndex, config.activities, currentActivity])
  
  // Calculate progress based on elapsed time and estimate
  const progress = estimatedTime && estimatedTime > 0 
    ? Math.min((elapsedTime / estimatedTime) * 100, 95) // Cap at 95% to avoid "100% but still loading"
    : undefined
  
  const actualEstimate = estimatedTime || config.estimatedDuration
  const timeRemaining = actualEstimate > elapsedTime ? actualEstimate - elapsedTime : 0
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${minutes}m ${secs}s`
  }
  
  if (phase === 'idle') {
    return (
      <div className={cn("flex items-center gap-3 text-[var(--text-secondary)]", className)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{displayActivity}</span>
      </div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("space-y-3", className)}
    >
      {/* Header with icon and title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            style={{ color: config.color }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
          
          {/* Subtle pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 opacity-30"
            style={{ borderColor: config.color }}
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0, 0.3]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white">{config.title}</h3>
            {agentName && (
              <span className="text-xs px-2 py-1 bg-[var(--bg-element)] rounded-full text-[var(--text-secondary)]">
                {agentName}
              </span>
            )}
          </div>
          
          {/* Time information */}
          {showEstimate && (
            <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
              {timeRemaining > 0 && (
                <span>Est. remaining: {formatTime(timeRemaining)}</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Current activity */}
      <div className="pl-8">
        <motion.p
          key={displayActivity}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-[var(--text-secondary)]"
        >
          {displayActivity}
        </motion.p>
      </div>
      
      {/* Progress bar */}
      {progress !== undefined && showEstimate && (
        <div className="pl-8">
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-[var(--bg-element)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ 
                background: `linear-gradient(90deg, ${config.color}, ${config.color}80)` 
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
      
      {/* Indeterminate progress for unknown duration */}
      {progress === undefined && phase !== 'idle' && (
        <div className="pl-8">
          <div className="h-1 bg-[var(--bg-element)] rounded-full overflow-hidden">
            <motion.div
              className="h-full w-1/3 rounded-full"
              style={{ 
                background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` 
              }}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut' 
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Hook for tracking elapsed time
export function useElapsedTime(isActive: boolean) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  
  useEffect(() => {
    if (isActive && !startTime) {
      setStartTime(Date.now())
      setElapsedTime(0)
    } else if (!isActive) {
      setStartTime(null)
      setElapsedTime(0)
    }
  }, [isActive, startTime])
  
  useEffect(() => {
    if (!isActive || !startTime) return
    
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isActive, startTime])
  
  return elapsedTime
}