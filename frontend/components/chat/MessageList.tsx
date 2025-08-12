'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Bot, 
  ExternalLink, 
  Copy, 
  Check,
  Globe,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import type { EnhancedMessage, ResearchSource } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface MessageListProps {
  messages: EnhancedMessage[]
  isStreaming: boolean
  streamingMessage: string
}

export function MessageList({ messages, isStreaming, streamingMessage }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isStreaming, streamingMessage])

  return (
    <ScrollArea ref={scrollAreaRef} className="h-full">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              index={index} 
            />
          ))}
        </AnimatePresence>

        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <StreamingMessageBubble content={streamingMessage} />
        )}

        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

function MessageBubble({ message, index }: { message: EnhancedMessage; index: number }) {
  const isUser = message.role === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={cn(
        "flex gap-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      )}
      
      <div className={cn(
        "flex flex-col gap-2 max-w-[80%]",
        isUser && "items-end"
      )}>
        {/* Message metadata */}
        {!isUser && message.agentName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{message.agentName}</span>
            {message.metadata?.model && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <Badge variant="outline" className="text-xs">
                  {message.metadata.model}
                </Badge>
              </>
            )}
          </div>
        )}
        
        {/* Message content */}
        <Card className={cn(
          "relative group",
          isUser ? "bg-primary text-primary-foreground" : "bg-card"
        )}>
          <CardContent className="p-4">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MessageContent content={message.content} />
            )}
          </CardContent>
          
          {/* Message actions */}
          <MessageActions message={message} />
        </Card>
        
        {/* Research sources */}
        {message.sources && message.sources.length > 0 && (
          <ResearchSources sources={message.sources} />
        )}
        
        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <User className="w-4 h-4 text-accent-foreground" />
          </div>
        </div>
      )}
    </motion.div>
  )
}

function StreamingMessageBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-4 justify-start"
    >
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Bot className="w-4 h-4 text-primary-foreground" />
          </motion.div>
        </div>
      </div>
      
      <Card className="max-w-[80%] bg-card">
        <CardContent className="p-4">
          <MessageContent content={content} />
          <motion.div
            className="inline-block w-2 h-5 bg-primary ml-1"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MessageContent({ content }: { content: string }) {
  const { open: openCanvas } = useCanvasStore()
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm prose-invert max-w-none"
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          const codeContent = String(children).replace(/\n$/, '')
          
          if (inline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            )
          }
          
          return (
            <div className="relative group">
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openCanvas('code', codeContent, `${language} code`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <CopyButton content={codeContent} />
              </div>
              
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: 'hsl(var(--muted))'
                }}
                {...props}
              >
                {codeContent}
              </SyntaxHighlighter>
            </div>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function MessageActions({ message }: { message: EnhancedMessage }) {
  return (
    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <CopyButton content={message.content} />
    </div>
  )
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}

function ResearchSources({ sources }: { sources: ResearchSource[] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Research Sources ({sources.length})
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 space-y-2 overflow-hidden"
            >
              {sources.map((source, index) => (
                <div key={source.shortId} className="flex items-start gap-2 p-2 bg-background/50 rounded">
                  <div className="flex-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {source.title}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {source.domain}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(source.supportedClaims[0]?.confidence * 100 || 0)}%
                  </Badge>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}