import * as React from 'react'
import { cn } from '@/lib/utils'

interface AIInputToolsProps extends React.HTMLAttributes<HTMLDivElement> {}

const AIInputTools = React.forwardRef<HTMLDivElement, AIInputToolsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AIInputTools.displayName = 'AIInputTools'

export { AIInputTools }