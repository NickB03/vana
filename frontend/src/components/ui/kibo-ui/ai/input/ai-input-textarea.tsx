import * as React from 'react'
import { cn } from '@/lib/utils'

interface AIInputTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const AIInputTextarea = React.forwardRef<HTMLTextAreaElement, AIInputTextareaProps>(
  ({ className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    React.useImperativeHandle(ref, () => textareaRef.current!)
    
    // Auto-resize
    React.useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      
      const handleInput = () => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }
      
      handleInput()
      textarea.addEventListener('input', handleInput)
      
      return () => {
        textarea.removeEventListener('input', handleInput)
      }
    }, [])
    
    return (
      <textarea
        ref={textareaRef}
        className={cn(
          "w-full resize-none bg-transparent text-base text-white outline-none placeholder:text-gray-400",
          "min-h-[24px] max-h-[200px] overflow-y-auto scrollbar-thin",
          className
        )}
        rows={1}
        {...props}
      />
    )
  }
)
AIInputTextarea.displayName = 'AIInputTextarea'

export { AIInputTextarea }