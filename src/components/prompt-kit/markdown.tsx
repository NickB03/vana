"use client"

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from "@/lib/utils"
import { memo } from 'react'

interface MarkdownProps {
  children: string
  className?: string
}

// Type definitions for react-markdown component props
interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface AnchorProps {
  node?: unknown;
  children?: React.ReactNode;
  href?: string;
  [key: string]: unknown;
}

interface ElementProps {
  node?: unknown;
  children?: React.ReactNode;
  [key: string]: unknown;
}

const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for code blocks
          code(props: CodeProps) {
            const { node, inline, className, children, ...rest } = props
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
          a(props: AnchorProps) {
            const { node, children, href, ...rest } = props
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...rest}>
                {children}
              </a>
            )
          },
          // Better paragraph spacing
          p(props: ElementProps) {
            const { node, children, ...rest } = props
            return <p className="mb-4 last:mb-0" {...rest}>{children}</p>
          },
          // Better list styling
          ul(props: ElementProps) {
            const { node, children, ...rest } = props
            return <ul className="my-2 ml-4 list-disc space-y-1" {...rest}>{children}</ul>
          },
          ol(props: ElementProps) {
            const { node, children, ...rest } = props
            return <ol className="my-2 ml-4 list-decimal space-y-1" {...rest}>{children}</ol>
          },
          // Optimized image rendering
          img(props: ElementProps & { src?: string; alt?: string }) {
            const { node, src, alt, ...rest } = props
            return (
              <img
                src={src}
                alt={alt || ""}
                loading="lazy"
                decoding="async"
                className="rounded-lg max-w-full h-auto my-4"
                {...rest}
              />
            )
          },
        } as Components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
})

export { Markdown }
