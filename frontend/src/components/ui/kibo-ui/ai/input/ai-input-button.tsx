import * as React from 'react'
import { cn } from '@/lib/utils'

interface AIInputButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AIInputButton = React.forwardRef<HTMLButtonElement, AIInputButtonProps>(
  ({ className, children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-400",
          "transition-all hover:bg-gray-700/50 hover:text-gray-300",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
AIInputButton.displayName = 'AIInputButton'

export { AIInputButton }