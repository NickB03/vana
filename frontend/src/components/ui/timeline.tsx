import { cn } from "@/lib/utils"
import { Check, Circle, Loader2 } from "lucide-react"
import React from "react"

const Timeline = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-4", className)}
    {...props}
  />
))
Timeline.displayName = "Timeline"

const TimelineItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex gap-4", className)}
    {...props}
  />
))
TimelineItem.displayName = "TimelineItem"

interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {
  isActive?: boolean
  isComplete?: boolean
}

const TimelineConnector = React.forwardRef<
  HTMLDivElement,
  TimelineConnectorProps
>(({ className, isActive = false, isComplete = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-[15px] top-[32px] h-full w-[2px] -translate-x-1/2",
      isComplete && "bg-[var(--accent-blue)]",
      isActive && "bg-gradient-to-b from-[var(--accent-blue)] to-gray-800",
      !isComplete && !isActive && "bg-gray-800",
      className
    )}
    {...props}
  />
))
TimelineConnector.displayName = "TimelineConnector"

interface TimelineDotProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: 'pending' | 'active' | 'complete'
}

const TimelineDot = React.forwardRef<
  HTMLDivElement,
  TimelineDotProps
>(({ className, status = 'pending', ...props }, ref) => {
  const getIcon = () => {
    switch (status) {
      case 'complete':
        return <Check className="h-3 w-3 text-white" />
      case 'active':
        return <Loader2 className="h-3 w-3 text-white animate-spin" />
      case 'pending':
      default:
        return <Circle className="h-2 w-2 text-gray-600" />
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 transition-all duration-300",
        status === 'complete' && "border-[var(--accent-blue)] bg-[var(--accent-blue)]",
        status === 'active' && "border-[var(--accent-blue)] bg-[var(--accent-blue)]",
        status === 'pending' && "border-gray-700 bg-gray-800",
        className
      )}
      {...props}
    >
      {getIcon()}
    </div>
  )
})
TimelineDot.displayName = "TimelineDot"

const TimelineContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 space-y-1 pb-8", className)}
    {...props}
  />
))
TimelineContent.displayName = "TimelineContent"

const TimelineHeading = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
))
TimelineHeading.displayName = "TimelineHeading"

const TimelineDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-[var(--text-secondary)]", className)}
    {...props}
  />
))
TimelineDescription.displayName = "TimelineDescription"

export {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineDot,
  TimelineContent,
  TimelineHeading,
  TimelineDescription,
}