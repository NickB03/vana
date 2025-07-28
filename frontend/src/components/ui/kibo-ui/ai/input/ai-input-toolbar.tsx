import * as React from 'react'
import { cn } from '@/lib/utils'

interface AIInputToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

const AIInputToolbar = React.forwardRef<HTMLDivElement, AIInputToolbarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mt-3 flex items-center justify-between gap-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AIInputToolbar.displayName = 'AIInputToolbar'

export { AIInputToolbar }