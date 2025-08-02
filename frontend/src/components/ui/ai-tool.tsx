import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export interface AIToolParameter {
  name: string
  value: string
  type?: 'string' | 'number' | 'boolean' | 'object'
}

export interface AIToolResult {
  summary: string
  details?: string
  data?: Record<string, unknown>
}

export interface AIToolProps {
  /** Tool name (e.g., "plan_generator", "section_researcher") */
  name: string
  /** Display title for the tool */
  title: string
  /** Current status of the tool execution */
  status: 'pending' | 'running' | 'completed' | 'error'
  /** Parameters being passed to the tool */
  parameters?: AIToolParameter[]
  /** Result when completed */
  result?: AIToolResult
  /** Duration in milliseconds */
  duration?: number
  /** Whether the tool section is collapsible */
  collapsible?: boolean
  /** Whether the tool section is initially expanded */
  defaultExpanded?: boolean
  /** Custom icon for the tool */
  icon?: ReactNode
  /** Additional CSS classes */
  className?: string
}

const STATUS_CONFIGS = {
  pending: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    label: 'Pending'
  },
  running: {
    icon: Loader2,
    color: 'text-[var(--accent-blue)]',
    bgColor: 'bg-[var(--accent-blue)]/10',
    borderColor: 'border-[var(--accent-blue)]/30',
    label: 'Running',
    animate: true
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Completed'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Error'
  }
}

export function AITool({
  name,
  title,
  status,
  parameters = [],
  result,
  duration,
  collapsible = true,
  defaultExpanded = true,
  icon,
  className
}: AIToolProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const config = STATUS_CONFIGS[status]
  const StatusIcon = config.icon

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatParameterValue = (param: AIToolParameter) => {
    if (param.type === 'object') {
      return JSON.stringify(param.value, null, 2)
    }
    return param.value
  }

  const getProgressDescription = () => {
    // Look for the 'currentAction' or similar parameter that contains progress description
    const actionParam = parameters?.find(p => 
      p.name === 'currentAction' || 
      p.name === 'action' || 
      p.name === 'description'
    )
    
    if (actionParam) {
      return actionParam.value
    }
    
    // Fall back to the agent name for simple display
    return name
  }

  const getProgressInfo = () => {
    const progressParam = parameters?.find(p => p.name === 'progress')
    if (progressParam && progressParam.value.includes('/')) {
      const [completed, total] = progressParam.value.split('/').map(n => parseInt(n.trim()))
      if (!isNaN(completed) && !isNaN(total) && total > 1) {
        return { completed, total }
      }
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "border rounded-lg transition-all duration-200",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer select-none",
          !collapsible && "cursor-default"
        )}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Custom icon or status icon */}
          <div className={cn("flex-shrink-0", config.color)}>
            {icon || (
              <StatusIcon 
                className={cn(
                  "w-5 h-5",
                  config.animate && "animate-spin"
                )} 
              />
            )}
          </div>

          {/* Tool info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white truncate">
                {title}
              </h3>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                config.color,
                config.bgColor
              )}>
                {config.label}
              </span>
            </div>
            
            {/* Show current action or progress description */}
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {getProgressDescription()}
            </p>
            
            {/* Show progress bar for multi-step activities */}
            {getProgressInfo() && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>Progress: {getProgressInfo()?.completed}/{getProgressInfo()?.total}</span>
                  <div className="flex-1 bg-[var(--bg-element)] rounded-full h-1.5">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        status === 'completed' ? "bg-green-500" : "bg-[var(--accent-blue)]"
                      )}
                      style={{ 
                        width: `${getProgressInfo() ? (getProgressInfo()!.completed / getProgressInfo()!.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Duration */}
          {duration && status === 'completed' && (
            <div className="text-xs text-[var(--text-secondary)] font-mono">
              {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* Expand/collapse button */}
        {collapsible && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 ml-2"
          >
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
          </motion.div>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border-primary)] px-4 pb-4">
              {/* Parameters */}
              {parameters.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Parameters
                  </h4>
                  <div className="space-y-2">
                    {parameters.map((param, index) => (
                      <div key={index} className="flex gap-3">
                        <span className="text-sm font-mono text-[var(--accent-purple)] min-w-0 flex-shrink-0">
                          {param.name}:
                        </span>
                        <span className="text-sm text-[var(--text-primary)] break-words min-w-0">
                          {param.type === 'object' ? (
                            <pre className="text-xs bg-[var(--bg-element)] p-2 rounded border overflow-x-auto">
                              {formatParameterValue(param)}
                            </pre>
                          ) : (
                            <code className="bg-[var(--bg-element)] px-1 py-0.5 rounded text-xs">
                              {formatParameterValue(param)}
                            </code>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result */}
              {result && status === 'completed' && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Result
                  </h4>
                  <div className="text-sm text-[var(--text-primary)]">
                    {result.summary}
                  </div>
                  {result.details && (
                    <div className="text-xs text-[var(--text-secondary)] mt-2">
                      {result.details}
                    </div>
                  )}
                  {result.data && (
                    <pre className="text-xs bg-[var(--bg-element)] p-2 rounded border mt-2 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Running indicator */}
              {status === 'running' && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-pulse"></div>
                    Processing...
                  </div>
                </div>
              )}

              {/* Error message */}
              {status === 'error' && result && (
                <div className="mt-4">
                  <div className="text-sm text-red-400">
                    {result.summary}
                  </div>
                  {result.details && (
                    <div className="text-xs text-red-300/70 mt-1">
                      {result.details}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Container component for multiple AI Tools
 */
interface AIToolsContainerProps {
  tools: AIToolProps[]
  className?: string
  title?: string
}

export function AIToolsContainer({ tools, className, title }: AIToolsContainerProps) {
  if (tools.length === 0) return null

  // Calculate summary stats
  const stats = {
    total: tools.length,
    completed: tools.filter(t => t.status === 'completed').length,
    running: tools.filter(t => t.status === 'running').length,
    pending: tools.filter(t => t.status === 'pending').length,
    error: tools.filter(t => t.status === 'error').length
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </div>
          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <span>
              {stats.completed}/{stats.total} completed
            </span>
            {stats.running > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-[var(--accent-blue)] rounded-full animate-pulse"></div>
                {stats.running} active
              </span>
            )}
          </div>
        </div>
      )}
      {tools.map((tool, index) => (
        <AITool key={tool.name || index} {...tool} />
      ))}
    </div>
  )
}