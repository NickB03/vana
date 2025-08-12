'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Paperclip, 
  X, 
  FileText, 
  Image, 
  File,
  Loader2,
  StopCircle
} from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { useUploadStore } from '@/stores/uploadStore'
import { cn } from '@/lib/utils'

export function MessageInput() {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { sendMessage, isStreaming, setStreaming } = useChatStore()
  const { files, addFiles, removeFile, clearFiles } = useUploadStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || isStreaming) return
    
    const messageContent = message.trim()
    const attachedFiles = files.filter(f => f.status === 'completed')
    
    // Clear input
    setMessage('')
    clearFiles()
    
    // Send message
    try {
      await sendMessage(
        messageContent, 
        attachedFiles.length > 0 
          ? attachedFiles.map(f => new File([''], f.name, { type: f.type })) 
          : undefined
      )
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      try {
        addFiles(selectedFiles)
      } catch (error) {
        console.error('File upload error:', error)
        // You could show a toast error here
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line
        return
      } else if (e.metaKey || e.ctrlKey) {
        // Send message
        e.preventDefault()
        handleSubmit(e)
      }
    }
  }

  const handleStop = () => {
    setStreaming(false)
  }

  const getFileIcon = (type: string, name: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (name.endsWith('.md') || type === 'text/markdown') return <FileText className="w-4 h-4" />
    if (type.startsWith('text/')) return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  return (
    <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* File previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
              >
                {getFileIcon(file.type, file.name)}
                <span className="text-sm truncate max-w-32">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                
                {/* Status indicator */}
                {file.status === 'uploading' && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {file.status === 'error' && (
                  <Badge variant="destructive" className="text-xs">Error</Badge>
                )}
                {file.status === 'completed' && (
                  <Badge variant="secondary" className="text-xs">Ready</Badge>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Message input */}
        <Card className="relative">
          <form onSubmit={handleSubmit} className="flex gap-3 p-4">
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.txt,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || files.length >= 5}
              className="self-end"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {/* Text input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  adjustTextareaHeight()
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  files.length > 0 
                    ? "Ask about your files or send a message..." 
                    : "Type a message..."
                }
                className={cn(
                  "min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
                  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
                )}
                disabled={isStreaming}
                rows={1}
              />
            </div>

            {/* Send/Stop button */}
            {isStreaming ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleStop}
                className="self-end text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <StopCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim()}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
        </Card>

        {/* Keyboard shortcuts hint */}
        <p className="text-xs text-muted-foreground text-center">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘↵</kbd> to send • <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⇧↵</kbd> for new line
        </p>
      </div>
    </div>
  )
}