"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useChatContext } from '@/contexts/chat-context'
import { 
  FileText, 
  Download, 
  Share2, 
  ArrowLeft,
  Copy,
  Check,
  Eye,
  Code,
  Bot,
  Clock,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

// Types
interface MarkdownCanvasProps {
  className?: string
}

interface SessionAgent {
  name: string;
  type: string;
  status: 'waiting' | 'current' | 'completed' | 'error';
  progress: number;
  task?: string;
  agent_id?: string;
  agent_type?: string;
  current_task?: string;
  error?: string;
}

interface SessionStateData {
  sessionId: string;
  agents?: SessionAgent[];
  overallProgress: number;
  currentPhase: string;
  lastUpdate?: Date;
  error?: string;
  finalReport?: string;
}

// Markdown Renderer Component
function MarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto opacity-50" />
          <p>No research results available</p>
        </div>
      </div>
    )
  }

  // Simple markdown-to-HTML converter for basic formatting
  const parseMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-6">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\n\n/gim, '</p><p class="mb-4">')
      .replace(/\n/gim, '<br>')
  }

  const htmlContent = `<div class="prose prose-sm max-w-none dark:prose-invert"><p class="mb-4">${parseMarkdown(content)}</p></div>`

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className="text-sm leading-relaxed"
    />
  )
}

// Research Metadata Component
function ResearchMetadata({ sessionState }: { sessionState: Record<string, unknown> | null }) {
  if (!sessionState) return null

  const typedSessionState = sessionState as unknown as SessionStateData
  const completedAgents = typedSessionState?.agents?.filter(agent => agent.status === 'completed').length || 0
  const totalAgents = typedSessionState?.agents?.length || 0

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-500" />
          Research Metadata
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{totalAgents}</div>
            <div className="text-xs text-gray-600">Total Agents</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{completedAgents}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{Math.round((typedSessionState?.overallProgress || 0) * 100)}%</div>
            <div className="text-xs text-gray-600">Progress</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{typedSessionState?.currentPhase || 'Unknown'}</div>
            <div className="text-xs text-gray-600">Final Phase</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Session: {typedSessionState.sessionId || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <span>Research completed: {typedSessionState.lastUpdate?.toLocaleString() || 'Unknown'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export Controls Component
function ExportControls({ content, sessionState }: { content: string, sessionState: Record<string, unknown> | null }) {
  const [copied, setCopied] = useState(false)
  const exportOptions = {
    format: 'markdown' as const,
    includeMetadata: true
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleExport = () => {
    let exportContent = content
    
    if (exportOptions.includeMetadata && sessionState) {
      const metadata = `# Research Report

**Session ID:** ${(sessionState as unknown as SessionStateData).sessionId || 'Unknown'}
**Completion Date:** ${new Date().toLocaleString()}
**Agents Used:** ${(sessionState as unknown as SessionStateData).agents?.length || 0}
**Final Phase:** ${(sessionState as unknown as SessionStateData).currentPhase || 'Unknown'}

---

${content}`
      exportContent = metadata
    }

    const blob = new Blob([exportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-report-${sessionState ? (sessionState as unknown as SessionStateData).sessionId : Date.now()}.${exportOptions.format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Research Report',
          text: content.substring(0, 100) + '...',
          url: window.location.href
        })
      } catch (error) {
        console.error('Share failed:', error)
      }
    } else {
      // Fallback: copy URL to clipboard
      await navigator.clipboard.writeText(window.location.href)
      alert('URL copied to clipboard')
    }
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-1"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-1"
      >
        <Download className="h-3 w-3" />
        Export
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="gap-1"
      >
        <Share2 className="h-3 w-3" />
        Share
      </Button>
    </div>
  )
}

// Main Markdown Canvas Component
export function MarkdownCanvas({ className }: MarkdownCanvasProps) {
  const router = useRouter()
  const { research } = useChatContext()
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview')
  
  const { sessionState } = research
  const content = sessionState?.finalReport || ''

  useEffect(() => {
    // If no session or content, redirect back to chat
    if (!sessionState || !content) {
      // router.push('/chat')
    }
  }, [sessionState, content, router])

  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Button>
          <div>
            <h1 className="font-semibold">Research Results</h1>
            <p className="text-sm text-gray-600">Multi-agent research report</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            {content.length.toLocaleString()} characters
          </Badge>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'preview' | 'raw')}>
            <TabsList className="h-8">
              <TabsTrigger value="preview" className="text-xs gap-1">
                <Eye className="h-3 w-3" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="raw" className="text-xs gap-1">
                <Code className="h-3 w-3" />
                Raw
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <div className="max-w-4xl mx-auto h-full">
            {/* Research Metadata */}
            <ResearchMetadata sessionState={sessionState as Record<string, unknown> | null} />
            
            {/* Export Controls */}
            <ExportControls content={content} sessionState={sessionState as Record<string, unknown> | null} />
            
            {/* Main Content */}
            <Card className="h-[calc(100%-200px)]">
              <CardContent className="p-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    {viewMode === 'preview' ? (
                      <MarkdownRenderer content={content} />
                    ) : (
                      <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                        {content}
                      </pre>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarkdownCanvas