'use client'

import { useState, useEffect, useRef } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Eye, 
  EyeOff, 
  Type, 
  Split, 
  Maximize2,
  Code,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

// Simple markdown to HTML converter for preview
function parseMarkdown(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold and Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Lists
    .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Clean up nested lists
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/<\/ol>\s*<ol>/g, '')
}

type ViewMode = 'edit' | 'preview' | 'split'

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const { showPreview } = useCanvasStore()
  const [viewMode, setViewMode] = useState<ViewMode>(showPreview ? 'split' : 'edit')
  const [selectedText, setSelectedText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const parsedContent = parseMarkdown(value || '')

  useEffect(() => {
    setViewMode(showPreview ? 'split' : 'edit')
  }, [showPreview])

  // Toolbar action handlers
  const insertText = (before: string, after = '', placeholder = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const text = selectedText || placeholder
    
    const newValue = (
      value.substring(0, start) +
      before + text + after +
      value.substring(end)
    )
    
    onChange(newValue)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + text.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle tab indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      insertText('  ')
    }
    
    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          insertText('**', '**', 'bold text')
          break
        case 'i':
          e.preventDefault()
          insertText('*', '*', 'italic text')
          break
        case 'k':
          e.preventDefault()
          insertText('[', '](url)', 'link text')
          break
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          {/* View Mode Toggles */}
          <div className="flex items-center bg-muted rounded-md p-1 mr-2">
            <Button
              variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('edit')}
              className="h-7 px-2"
            >
              <Type className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="h-7 px-2"
            >
              <Split className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="h-7 px-2"
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-4" />
          
          {/* Format Buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('# ', '', 'Heading')}
            className="h-7 px-2"
            title="Heading 1"
          >
            <Heading1 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('## ', '', 'Heading')}
            className="h-7 px-2"
            title="Heading 2"
          >
            <Heading2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('### ', '', 'Heading')}
            className="h-7 px-2"
            title="Heading 3"
          >
            <Heading3 className="w-3 h-3" />
          </Button>
          
          <Separator orientation="vertical" className="h-4" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('**', '**', 'bold text')}
            className="h-7 px-2"
            title="Bold (Cmd+B)"
          >
            <Bold className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('*', '*', 'italic text')}
            className="h-7 px-2"
            title="Italic (Cmd+I)"
          >
            <Italic className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('`', '`', 'code')}
            className="h-7 px-2"
            title="Code"
          >
            <Code className="w-3 h-3" />
          </Button>
          
          <Separator orientation="vertical" className="h-4" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('[', '](url)', 'link text')}
            className="h-7 px-2"
            title="Link (Cmd+K)"
          >
            <Link className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('* ', '', 'list item')}
            className="h-7 px-2"
            title="Bullet List"
          >
            <List className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('1. ', '', 'list item')}
            className="h-7 px-2"
            title="Numbered List"
          >
            <ListOrdered className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('> ', '', 'quote')}
            className="h-7 px-2"
            title="Blockquote"
          >
            <Quote className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {value?.length || 0} characters
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Editor Panel */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col",
            viewMode === 'split' ? "w-1/2 border-r" : "w-full"
          )}>
            <textarea
              ref={textareaRef}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="# Start writing your markdown...\n\nUse the toolbar above or keyboard shortcuts:
- **Cmd+B** for bold
- **Cmd+I** for italic  
- **Cmd+K** for links
- **Tab** for indentation"
              className="w-full h-full resize-none border-0 bg-transparent p-4 text-sm font-mono focus:outline-none leading-relaxed"
              spellCheck="false"
            />
          </div>
        )}
        
        {/* Preview Panel */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={cn(
            "flex flex-col bg-muted/20",
            viewMode === 'split' ? "w-1/2" : "w-full"
          )}>
            <div className="p-2 border-b bg-muted/50">
              <span className="text-xs font-medium text-muted-foreground">Preview</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: parsedContent || '<p class="text-muted-foreground italic">Start typing to see preview...</p>' }}
                style={{
                  lineHeight: '1.6',
                  fontSize: '14px'
                }}
              />
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}