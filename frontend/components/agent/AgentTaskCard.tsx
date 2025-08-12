/**
 * AgentTaskCard - Individual task card with status and agent attribution
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Clock, 
  Timer, 
  ChevronRight,
  MoreVertical,
  X
} from 'lucide-react'
import type { AgentTask } from '@/types'
import { TaskCardStatusIndicator } from './TaskStatusIndicator'
import { 
  cn, 
  formatDuration, 
  formatRelativeTime, 
  generateAgentColor,
  estimateCompletion,
  createAnimationVariants
} from '@/lib/utils'
import { useAgentById } from '@/stores/agentDeckStore'

interface AgentTaskCardProps {
  task: AgentTask
  index?: number
  onDismiss?: (taskId: string) => void
  onExpand?: (taskId: string) => void
  isStacked?: boolean
  stackOffset?: number
  className?: string
}

const cardVariants = createAnimationVariants({ duration: 0.4 })

const stackVariants = {
  initial: { 
    y: 0, 
    scale: 1, 
    rotate: 0,
    zIndex: 10
  },
  stacked: (index: number) => ({
    y: index * 8,
    scale: 1 - index * 0.02,
    rotate: index * 0.5,
    zIndex: 10 - index,
    transition: { duration: 0.3, ease: 'easeOut' }
  })
}

export function AgentTaskCard({
  task,
  index = 0,
  onDismiss,
  onExpand,
  isStacked = false,
  stackOffset: _stackOffset = 8,
  className
}: AgentTaskCardProps) {
  const agent = useAgentById(task.agentId)
  const agentColor = generateAgentColor(task.agent)
  
  const estimatedCompletion = estimateCompletion(task)
  const isRunning = task.status === 'running'
  const isCompleted = task.status === 'completed'
  const hasFailed = task.status === 'failed'

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDismiss?.(task.id)
  }

  const handleExpand = () => {
    onExpand?.(task.id)
  }

  return (
    <motion.div
      layout
      variants={isStacked ? stackVariants : cardVariants}
      initial={isStacked ? 'initial' : 'hidden'}
      animate={isStacked ? 'stacked' : 'visible'}
      exit="exit"
      custom={index}
      whileHover={!isStacked ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isStacked ? { scale: 0.98 } : {}}
      onClick={handleExpand}
      className={cn(
        'bg-white rounded-lg shadow-lg border border-gray-200',
        'p-4 cursor-pointer select-none',
        'hover:shadow-xl hover:border-gray-300 transition-all duration-200',
        isCompleted && 'opacity-90',
        hasFailed && 'border-red-200 bg-red-50',
        isStacked && 'absolute top-0 left-0 w-full',
        className
      )}
      style={{
        borderLeftColor: agentColor,
        borderLeftWidth: '4px'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Agent Avatar */}
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: agentColor }}
          >
            {agent?.avatar || <User className="w-3 h-3" />}
          </div>
          
          {/* Agent Name */}
          <span className="text-xs font-medium text-gray-600 truncate">
            {task.agent}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {onDismiss && (isCompleted || hasFailed) && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
          
          <MoreVertical className="w-3 h-3 text-gray-400" />
        </div>
      </div>

      {/* Task Title */}
      <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
        {task.title}
      </h3>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Status Indicator */}
      <div className="mb-3">
        <TaskCardStatusIndicator task={task} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* Start Time */}
          {task.startTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(task.startTime)}</span>
            </div>
          )}

          {/* Duration */}
          {task.duration && (
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              <span>{formatDuration(task.duration)}</span>
            </div>
          )}

          {/* Estimated Completion */}
          {isRunning && estimatedCompletion && (
            <div className="flex items-center gap-1 text-blue-600">
              <Timer className="w-3 h-3" />
              <span>~{formatRelativeTime(estimatedCompletion)}</span>
            </div>
          )}
        </div>

        {/* Expand Indicator */}
        <ChevronRight className="w-3 h-3 opacity-50" />
      </div>

      {/* Priority Indicator */}
      {task.priority && task.priority !== 'medium' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute top-2 right-2 w-2 h-2 rounded-full',
            task.priority === 'critical' && 'bg-red-500',
            task.priority === 'high' && 'bg-orange-500',
            task.priority === 'low' && 'bg-gray-400'
          )}
        />
      )}
    </motion.div>
  )
}

/**
 * Specialized card for expanded view
 */
export function ExpandedAgentTaskCard({ 
  task, 
  onCollapse,
  className 
}: {
  task: AgentTask
  onCollapse?: () => void
  className?: string
}) {
  const agent = useAgentById(task.agentId)
  const agentColor = generateAgentColor(task.agent)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'bg-white rounded-lg shadow-xl border border-gray-200',
        'p-6 max-w-md w-full',
        className
      )}
      style={{
        borderLeftColor: agentColor,
        borderLeftWidth: '4px'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: agentColor }}
          >
            {agent?.avatar || <User className="w-4 h-4" />}
          </div>
          
          <div>
            <h2 className="font-semibold text-gray-900">{task.agent}</h2>
            <p className="text-sm text-gray-600">{agent?.type || 'Agent'}</p>
          </div>
        </div>

        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Task Details */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{task.title}</h3>
          {task.description && (
            <p className="text-gray-600">{task.description}</p>
          )}
        </div>

        {/* Status */}
        <TaskCardStatusIndicator task={task} />

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          {task.startTime && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Started
              </label>
              <p className="text-sm text-gray-900">
                {formatRelativeTime(task.startTime)}
              </p>
            </div>
          )}

          {task.duration && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Duration
              </label>
              <p className="text-sm text-gray-900">
                {formatDuration(task.duration)}
              </p>
            </div>
          )}
        </div>

        {/* Error Details */}
        {task.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800 mb-1">Error</p>
            <p className="text-sm text-red-700">{task.error}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}