import * as React from 'react'
import { cn } from '@/lib/utils'

interface AIInputProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

const AIInput = React.forwardRef<HTMLFormElement, AIInputProps>(
  ({ className, children, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    
    return (
      <form
        ref={ref}
        className={cn(
          "relative w-full rounded-[24px] border-2 bg-background p-4 transition-all duration-200",
          isFocused 
            ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)_/_0.3)]" 
            : "border-border hover:border-border-strong",
          className
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          // Only blur if focus is leaving the form entirely
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false)
          }
        }}
        {...props}
      >
        {children}
      </form>
    )
  }
)
AIInput.displayName = 'AIInput'

export { AIInput }