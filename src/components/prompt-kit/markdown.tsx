"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from "@/lib/utils"
import { memo } from 'react'

interface MarkdownProps {
  children: string
  className?: string
}

const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for code blocks
          code(props) {
            const { node, inline, className, children, ...rest } = props as any
            return inline ? (
              <code className="rounded bg-muted/40 px-1 py-0.5 text-sm font-mono border border-muted/60" {...rest}>
                {children}
              </code>
            ) : (
              <pre className="my-2 overflow-x-auto rounded bg-muted p-3">
                <code className="text-sm font-mono" {...rest}>
                  {children}
                </code>
              </pre>
            )
          },
          // Ensure links open in new tab
          a(props) {
            const { node, children, href, ...rest } = props as any
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...rest}>
                {children}
              </a>
            )
          },
          // Better paragraph spacing
          p(props) {
            const { node, children, ...rest } = props as any
            return <p className="mb-4 last:mb-0" {...rest}>{children}</p>
          },
          // Better list styling
          ul(props) {
            const { node, children, ...rest } = props as any
            return <ul className="my-2 ml-4 list-disc space-y-1" {...rest}>{children}</ul>
          },
          ol(props) {
            const { node, children, ...rest } = props as any
            return <ol className="my-2 ml-4 list-decimal space-y-1" {...rest}>{children}</ol>
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
})

export { Markdown }
