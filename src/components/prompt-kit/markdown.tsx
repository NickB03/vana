"use client"

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from "@/lib/utils"
import { memo, useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MarkdownProps {
  children: string
  className?: string
}

/**
 * Source reference for citations
 * Extracted from the "Sources:" section at the end of AI responses
 */
interface Source {
  title: string
  url: string
}

/**
 * Extract sources from the "Sources:" section at the end of content
 * Expected format:
 * **Sources:**
 * [1] [Title](URL)
 * [2] [Another Title](URL)
 */
function extractSources(content: string): { sources: Source[]; contentWithoutSources: string } {
  // Match the Sources section and extract entries
  const sourcesMatch = content.match(/\*\*Sources:\*\*\s*([\s\S]*?)$/i)

  if (!sourcesMatch) {
    return { sources: [], contentWithoutSources: content }
  }

  const sourcesSection = sourcesMatch[1]
  const sources: Source[] = []

  // Match [n] [Title](URL) pattern
  const sourcePattern = /\[(\d+)\]\s*\[([^\]]+)\]\(([^)]+)\)/g
  let match

  while ((match = sourcePattern.exec(sourcesSection)) !== null) {
    const index = parseInt(match[1], 10) - 1
    sources[index] = {
      title: match[2],
      url: match[3]
    }
  }

  // Remove the Sources section from content
  const contentWithoutSources = content.replace(/\*\*Sources:\*\*\s*[\s\S]*?$/i, '').trim()

  return { sources, contentWithoutSources }
}

/**
 * Parse citation markers [1], [2], [3] and convert to React elements with tooltips
 */
function parseCitations(text: string, sources: Source[]): React.ReactNode {
  if (!sources.length) return text

  const citationRegex = /\[(\d+)\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = citationRegex.exec(text)) !== null) {
    const citationNum = parseInt(match[1], 10)
    const source = sources[citationNum - 1]
    const matchIndex = match.index

    // Add text before this citation
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }

    // Add citation link or plain text
    if (source) {
      parts.push(
        <TooltipProvider key={key++} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-500 hover:text-blue-600 hover:underline cursor-pointer text-sm font-medium mx-0.5"
              >
                [{citationNum}]
              </a>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium text-sm">{source.title}</p>
              <p className="text-xs text-muted-foreground truncate">{source.url}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    } else {
      // Citation number exists but no matching source - keep as plain text
      parts.push(`[${citationNum}]`)
    }

    lastIndex = matchIndex + match[0].length
  }

  // Add remaining text after last citation
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? <>{parts}</> : text
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
  // Extract sources from the content and get clean content without the Sources section
  const { sources, contentWithoutSources } = useMemo(
    () => extractSources(children),
    [children]
  )

  // Create a text renderer that parses citations when sources are available
  const renderTextWithCitations = useMemo(() => {
    if (sources.length === 0) return undefined

    return function TextWithCitations({ children: textChildren }: { children: React.ReactNode }) {
      // Only process string children
      if (typeof textChildren !== 'string') {
        return <>{textChildren}</>
      }
      return <>{parseCitations(textChildren, sources)}</>
    }
  }, [sources])

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
          // Better paragraph spacing with citation support
          p(props: ElementProps) {
            const { node, children, ...rest } = props

            // If we have sources, parse citations in text content
            if (sources.length > 0 && typeof children === 'string') {
              return <p className="mb-4 last:mb-0" {...rest}>{parseCitations(children, sources)}</p>
            }

            // Handle arrays of children (mixed text/elements)
            if (sources.length > 0 && Array.isArray(children)) {
              const parsedChildren = children.map((child, i) => {
                if (typeof child === 'string') {
                  return <span key={i}>{parseCitations(child, sources)}</span>
                }
                return child
              })
              return <p className="mb-4 last:mb-0" {...rest}>{parsedChildren}</p>
            }

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
          // List items with citation support
          li(props: ElementProps) {
            const { node, children, ...rest } = props

            if (sources.length > 0 && typeof children === 'string') {
              return <li {...rest}>{parseCitations(children, sources)}</li>
            }

            if (sources.length > 0 && Array.isArray(children)) {
              const parsedChildren = children.map((child, i) => {
                if (typeof child === 'string') {
                  return <span key={i}>{parseCitations(child, sources)}</span>
                }
                return child
              })
              return <li {...rest}>{parsedChildren}</li>
            }

            return <li {...rest}>{children}</li>
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
        {contentWithoutSources}
      </ReactMarkdown>

      {/* Render Sources section if present */}
      {sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-sm font-semibold text-muted-foreground mb-2">Sources:</p>
          <ul className="space-y-1">
            {sources.map((source, index) => (
              source && (
                <li key={index} className="text-sm">
                  <span className="text-blue-500 font-medium">[{index + 1}]</span>{' '}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {source.title}
                  </a>
                </li>
              )
            ))}
          </ul>
        </div>
      )}
    </div>
  )
})

export { Markdown }
