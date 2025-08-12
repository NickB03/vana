'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Send, X, FileText, Image, FileArchive, Mic, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilePreview {
  file: File
  id: string
}

interface QuickStartProps {
  onSubmit: (prompt: string, files?: File[]) => void
}

export function QuickStart({ onSubmit }: QuickStartProps) {
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    onSubmit(prompt, files.length > 0 ? files : undefined)
    
    // Reset form
    setPrompt('')
    setFiles([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    handleFiles(selectedFiles)
  }

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds 10MB limit`)
        return false
      }
      return true
    })
    
    // Limit to 3 files max
    const combined = [...files, ...validFiles].slice(0, 3)
    setFiles(combined)
    
    // Auto-open canvas for .md files
    const mdFile = validFiles.find(f => f.name.endsWith('.md'))
    if (mdFile && prompt.trim() === '') {
      // Auto-submit with markdown file
      setTimeout(() => {
        onSubmit(`Please open ${mdFile.name} in Canvas so I can edit it`, [mdFile])
        setPrompt('')
        setFiles([])
      }, 100)
      return
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (file.name.endsWith('.md') || file.type === 'text/markdown') return <FileText className="w-4 h-4" />
    if (file.type.startsWith('text/')) return <FileText className="w-4 h-4" />
    return <FileArchive className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full max-w-[700px] mx-auto px-8 pb-8">
      <div 
        className={cn(
          'relative bg-[#2a2b2c] rounded-full border border-[#3c4043] transition-all duration-200',
          isDragOver && 'border-[#8ab4f8] shadow-lg shadow-[#8ab4f8]/20'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <form onSubmit={handleSubmit} className="relative">
          {/* File previews */}
          {files.length > 0 && (
            <div className="px-6 pt-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 bg-[#3a3b3c] rounded-lg px-3 py-1.5 text-sm"
                  >
                    {getFileIcon(file)}
                    <span className="truncate max-w-32 text-[#e3e3e3]">{file.name}</span>
                    <span className="text-xs text-[#9aa0a6]">
                      {formatFileSize(file.size)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-red-500/20 hover:text-red-400 text-[#9aa0a6]"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Input area - Gemini style */}
          <div className="relative flex items-center px-6 py-4">
            {/* Text input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Message Vana"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-[#e3e3e3] placeholder-[#9aa0a6] text-base py-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
            </div>
            
            {/* Right side buttons - PRD defined */}
            <div className="flex items-center gap-2 ml-3">
              {/* Attachment button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.txt,.pdf,.docx,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 hover:bg-[#3a3b3c] text-[#9aa0a6] hover:text-[#e3e3e3]"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              {/* Image button - PRD requirement */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-[#3a3b3c] text-[#9aa0a6] hover:text-[#e3e3e3]"
                title="Add image"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              
              {/* Voice button - PRD requirement */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-[#3a3b3c] text-[#9aa0a6] hover:text-[#e3e3e3]"
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </Button>
              
              {/* Send button */}
              <Button
                type="submit"
                disabled={!prompt.trim()}
                size="icon"
                className="h-8 w-8 bg-transparent hover:bg-[#3a3b3c] text-[#9aa0a6] hover:text-[#e3e3e3] disabled:opacity-50 disabled:cursor-not-allowed"
                variant="ghost"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-[#8ab4f8]/10 border-2 border-dashed border-[#8ab4f8] rounded-full flex items-center justify-center z-10">
              <div className="text-center space-y-2">
                <div className="text-[#8ab4f8]">
                  <Paperclip className="w-6 h-6 mx-auto" />
                </div>
                <p className="text-sm font-medium text-[#e3e3e3]">Drop files here</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}