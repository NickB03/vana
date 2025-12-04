import { cn } from "@/lib/utils"
import { ChevronDownIcon, Clock } from "lucide-react"
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { Markdown } from "./markdown"

type ReasoningContextType = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  elapsedTime?: number
  showTimer?: boolean
}

const ReasoningContext = createContext<ReasoningContextType | undefined>(
  undefined
)

function useReasoningContext() {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error(
      "useReasoningContext must be used within a Reasoning provider"
    )
  }
  return context
}

export type ReasoningProps = {
  children: React.ReactNode
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isStreaming?: boolean
  showTimer?: boolean
}
function Reasoning({
  children,
  className,
  open,
  onOpenChange,
  isStreaming,
  showTimer = true,
}: ReasoningProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [wasAutoOpened, setWasAutoOpened] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  // Timer effect
  useEffect(() => {
    if (isStreaming && showTimer) {
      // Start timer
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now()
      }

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setElapsedTime(elapsed)
        }
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    } else {
      // Reset timer when not streaming
      if (!isStreaming) {
        startTimeRef.current = null
        setElapsedTime(0)
      }
    }
  }, [isStreaming, showTimer])

  // REMOVED: Auto-expand/collapse behavior to match Claude's interface
  // Users must manually click to expand/collapse reasoning
  // This prevents jarring auto-animations during streaming

  return (
    <ReasoningContext.Provider
      value={{
        isOpen,
        onOpenChange: handleOpenChange,
        elapsedTime,
        showTimer: showTimer && isStreaming,
      }}
    >
      <div className={className}>{children}</div>
    </ReasoningContext.Provider>
  )
}

export type ReasoningTriggerProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLButtonElement>

function ReasoningTrigger({
  children,
  className,
  ...props
}: ReasoningTriggerProps) {
  const { isOpen, onOpenChange, elapsedTime, showTimer } = useReasoningContext()

  return (
    <button
      className={cn(
        "inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border/40 bg-transparent px-3 py-1.5 text-left transition-all hover:border-border/60 hover:bg-muted/10",
        className
      )}
      onClick={() => onOpenChange(!isOpen)}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Hide reasoning" : "Show reasoning"}
      type="button"
      {...props}
    >
      <span
        className="text-sm text-muted-foreground"
      >
        {children}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        {showTimer && elapsedTime !== undefined && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <Clock className="size-3" aria-hidden="true" />
            {elapsedTime}s
          </span>
        )}
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground/60 transition-transform",
            isOpen ? "rotate-180" : ""
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  )
}

export type ReasoningContentProps = {
  children: React.ReactNode
  className?: string
  markdown?: boolean
  contentClassName?: string
} & React.HTMLAttributes<HTMLDivElement>

function ReasoningContent({
  children,
  className,
  contentClassName,
  markdown = false,
  ...props
}: ReasoningContentProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const { isOpen } = useReasoningContext()

  useEffect(() => {
    if (!contentRef.current || !innerRef.current) return

    const observer = new ResizeObserver(() => {
      if (contentRef.current && innerRef.current && isOpen) {
        contentRef.current.style.maxHeight = `${innerRef.current.scrollHeight}px`
      }
    })

    observer.observe(innerRef.current)

    if (isOpen) {
      contentRef.current.style.maxHeight = `${innerRef.current.scrollHeight}px`
    }

    return () => observer.disconnect()
  }, [isOpen])

  const content = markdown ? (
    <Markdown>{children as string}</Markdown>
  ) : (
    children
  )

  return (
    <div
      ref={contentRef}
      className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
        isOpen ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        maxHeight: isOpen ? contentRef.current?.scrollHeight : "0px",
      }}
      {...props}
    >
      <div
        ref={innerRef}
        className={cn(
          "text-muted-foreground prose prose-sm dark:prose-invert pl-6 border-l-2 border-border/40 ml-0.5",
          contentClassName
        )}
      >
        {content}
      </div>
    </div>
  )
}

export { Reasoning, ReasoningTrigger, ReasoningContent }
