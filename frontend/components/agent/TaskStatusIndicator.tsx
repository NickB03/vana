/**
 * TaskStatusIndicator - Shows task status with icons and progress
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  StopCircle,
  Loader2,
  AlertCircle 
} from 'lucide-react'
import type { TaskStatus, AgentTask } from '@/types'
import { cn, getStatusColor, getStatusRing } from '@/lib/utils'

interface TaskStatusIndicatorProps {
  status: TaskStatus
  progress?: number
  error?: string
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  showLabel?: boolean
  className?: string
  animated?: boolean
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    pulseColor: 'bg-gray-400'
  },
  running: {
    icon: PlayCircle,
    label: 'Running',
    pulseColor: 'bg-blue-500'
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    pulseColor: 'bg-green-500'
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    pulseColor: 'bg-red-500'
  },
  cancelled: {
    icon: StopCircle,
    label: 'Cancelled',
    pulseColor: 'bg-gray-500'
  }
}

const sizeConfig = {
  sm: {
    icon: 'w-4 h-4',
    text: 'text-xs',
    progress: 'h-1',
    container: 'gap-1'
  },
  md: {
    icon: 'w-5 h-5',
    text: 'text-sm',
    progress: 'h-2',
    container: 'gap-2'
  },
  lg: {
    icon: 'w-6 h-6',
    text: 'text-base',
    progress: 'h-3',
    container: 'gap-3'
  }
}

export function TaskStatusIndicator({
  status,
  progress,
  error,
  size = 'md',
  showProgress = true,
  showLabel = false,
  className,
  animated = true
}: TaskStatusIndicatorProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  const iconVariants = {
    pending: { rotate: 0, scale: 1 },
    running: { 
      rotate: animated ? 360 : 0, 
      scale: animated ? [1, 1.1, 1] : 1,
      transition: { 
        rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
        scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
      }
    },
    completed: { 
      scale: animated ? [1, 1.2, 1] : 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    },
    failed: { 
      rotate: animated ? [-10, 10, -10, 0] : 0,
      transition: { duration: 0.5, ease: 'easeInOut' }
    },
    cancelled: { scale: 1 }
  }

  const progressVariants = {
    hidden: { width: '0%' },
    visible: { 
      width: `${progress || 0}%`,
      transition: { duration: 0.8, ease: 'easeOut' }
    }
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    }
  }

  return (
    <div className={cn('flex items-center', sizes.container, className)}>
      {/* Status Icon */}
      <div className="relative">
        <motion.div
          variants={iconVariants}
          initial="pending"
          animate={status}
          className={cn(
            'flex items-center justify-center rounded-full',
            'transition-colors duration-200',
            getStatusColor(status),
            sizes.icon,
            animated && status === 'running' && 'relative'
          )}
        >
          <Icon className={cn(sizes.icon, 'shrink-0')} />
          
          {/* Pulse animation for running status */}
          {animated && status === 'running' && (
            <motion.div
              variants={pulseVariants}
              animate="pulse"
              className={cn(
                'absolute inset-0 rounded-full',
                config.pulseColor,
                'opacity-30'
              )}
            />
          )}
        </motion.div>
      </div>

      {/* Status Label */}
      {showLabel && (
        <span className={cn(
          'font-medium capitalize',
          getStatusColor(status).split(' ')[0], // Extract text color
          sizes.text
        )}>
          {config.label}
        </span>
      )}

      {/* Progress Bar */}
      {showProgress && status === 'running' && progress !== undefined && (
        <div className={cn(
          'flex-1 bg-gray-200 rounded-full overflow-hidden min-w-[60px]',
          sizes.progress
        )}>
          <motion.div
            variants={progressVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              'h-full bg-gradient-to-r from-blue-500 to-blue-600',
              'transition-all duration-300'
            )}
            style={{ width: `${progress}%` }}
          />
          
          {/* Progress percentage */}
          {size !== 'sm' && (
            <div className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'text-xs font-medium text-gray-600'
            )}>
              {Math.round(progress)}%
            </div>
          )}
        </div>
      )}

      {/* Error indicator */}
      {error && status === 'failed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 text-red-600"
        >
          <AlertCircle className="w-4 h-4" />
          {size !== 'sm' && (
            <span className="text-xs font-medium truncate max-w-[100px]">
              {error}
            </span>
          )}
        </motion.div>
      )}
    </div>
  )
}

/**
 * Specialized component for task cards
 */
export function TaskCardStatusIndicator({ 
  task, 
  className 
}: { 
  task: AgentTask
  className?: string 
}) {
  return (
    <TaskStatusIndicator
      status={task.status}
      progress={task.progress}
      error={task.error}
      size="sm"
      showProgress={true}
      showLabel={false}
      animated={true}
      className={className}
    />
  )
}

/**
 * Specialized component for inline task lists
 */
export function InlineTaskStatusIndicator({ 
  task, 
  className 
}: { 
  task: AgentTask
  className?: string 
}) {
  return (
    <TaskStatusIndicator
      status={task.status}
      progress={task.progress}
      error={task.error}
      size="sm"
      showProgress={task.status === 'running'}
      showLabel={true}
      animated={false}
      className={className}
    />
  )
}

/**
 * Specialized component for pipeline view
 */
export function PipelineTaskStatusIndicator({ 
  task, 
  className 
}: { 
  task: AgentTask
  className?: string 
}) {
  return (
    <TaskStatusIndicator
      status={task.status}
      progress={task.progress}
      error={task.error}
      size="md"
      showProgress={true}
      showLabel={true}
      animated={true}
      className={className}
    />
  )
}