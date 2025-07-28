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
          "relative w-full rounded-[24px] border-2 bg-[#1a1a1a] p-4 transition-all duration-200",
          isFocused 
            ? "border-[#7c9fff] shadow-[0_0_0_2px_rgba(124,159,255,0.3)]" 
            : "border-[#4a4a4a] hover:border-[#5a5a5a]",
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