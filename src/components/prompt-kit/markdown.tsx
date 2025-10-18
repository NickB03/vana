"use client"

import { cn } from "@/lib/utils"

interface MarkdownProps {
  children: string
  className?: string
}

function Markdown({ children, className }: MarkdownProps) {
  // Simple markdown-like rendering for code blocks
  const renderContent = () => {
    const parts = children.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const code = part.replace(/```(\w+)?\n?/g, "").replace(/```$/g, "")
        return (
          <pre key={index} className="my-2 overflow-x-auto rounded bg-muted p-3">
            <code className="text-sm">{code}</code>
          </pre>
        )
      }
      
      // Handle inline code
      const inlineParts = part.split(/(`[^`]+`)/g)
      return (
        <span key={index}>
          {inlineParts.map((inlinePart, i) => {
            if (inlinePart.startsWith("`") && inlinePart.endsWith("`")) {
              return (
                <code key={i} className="rounded bg-muted px-1 py-0.5 text-sm">
                  {inlinePart.slice(1, -1)}
                </code>
              )
            }
            return inlinePart
          })}
        </span>
      )
    })
  }

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      {renderContent()}
    </div>
  )
}

export { Markdown }
