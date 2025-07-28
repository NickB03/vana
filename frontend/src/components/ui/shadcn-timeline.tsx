import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { ThinkingStep } from './AIReasoning'

interface TimelineProps {
  items: ThinkingStep[]
  className?: string
}

export function Timeline({ items, className }: TimelineProps) {
  const getStatusIcon = (status: ThinkingStep['status'], index: number) => {
    const iconClasses = "relative z-10 h-2.5 w-2.5"
    
    switch (status) {
      case 'complete':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(iconClasses, "rounded-full bg-green-500")}
          />
        )
      case 'active':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(iconClasses, "animate-pulse rounded-full bg-[var(--accent-orange)]")}
          />
        )
      case 'pending':
      default:
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(iconClasses, "rounded-full bg-gray-500 opacity-50")}
          />
        )
    }
  }


  return (
    <div className={cn("relative w-full", className)}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
          className={cn(
            "group relative pb-4 pl-6",
            index === items.length - 1 && "pb-0"
          )}
        >
          {/* Vertical line */}
          {index !== items.length - 1 && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "100%" }}
              transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
              className={cn(
                "absolute left-2 top-3 w-[2px]",
                item.status === 'complete' ? "bg-[var(--accent-blue)]/50" : "bg-gray-700"
              )}
            />
          )}

          {/* Timeline dot */}
          <div className="absolute left-2 top-1.5">
            {getStatusIcon(item.status, index)}
          </div>

          {/* Content */}
          <div className="ml-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.1 }}
              className="flex flex-col gap-1"
            >
              {/* Activity */}
              <div className={cn(
                "text-sm font-medium",
                item.status === 'complete' && "text-[var(--text-secondary)]",
                item.status === 'active' && "text-white",
                item.status === 'pending' && "text-gray-500"
              )}>
                {item.action}
              </div>
              
              {/* Agent name */}
              {item.agent && (
                <div className="text-xs text-[var(--text-secondary)]">
                  {item.agent}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}