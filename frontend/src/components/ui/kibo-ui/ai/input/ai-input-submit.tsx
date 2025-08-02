import * as React from 'react'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'

interface AIInputSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
}

const AIInputSubmit = React.forwardRef<HTMLButtonElement, AIInputSubmitProps>(
  ({ className, status = 'ready', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="submit"
        disabled={disabled || status === 'submitted' || status === 'streaming'}
        className={cn(
          "inline-flex items-center justify-center rounded-lg p-2 transition-all",
          "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300",
          "disabled:cursor-not-allowed disabled:opacity-50",
          status === 'streaming' && "animate-pulse",
          className
        )}
        {...props}
      >
        {children || <Send className="h-5 w-5" />}
      </button>
    )
  }
)
AIInputSubmit.displayName = 'AIInputSubmit'

export { AIInputSubmit }