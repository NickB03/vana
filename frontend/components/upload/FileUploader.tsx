'use client'

import { useState, useRef } from 'react'
import { useUploadStore } from '@/stores/uploadStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { Button } from '@/components/ui/button'
import { Paperclip } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile } = useUploadStore()
  const { open: openCanvas } = useCanvasStore()

  const handleFileSelect = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.name.endsWith('.md')) {
        const content = await file.text()
        openCanvas('markdown', content)
        toast({
          title: "Markdown file opened",
          description: `${file.name} has been opened in Canvas`
        })
      } else {
        await uploadFile(file)
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  )
}