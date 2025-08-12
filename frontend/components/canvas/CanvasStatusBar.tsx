'use client'

import { useCanvasStore } from '@/stores/canvasStore'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, CheckCircle } from 'lucide-react'

export function CanvasStatusBar() {
  const { isDirty, lastSaved, activeType, content } = useCanvasStore()
  
  const wordCount = content.split(' ').length
  const charCount = content.length

  return (
    <div className="flex items-center justify-between p-2 border-t bg-muted/50 text-xs">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{activeType}</Badge>
        <span>{wordCount} words, {charCount} chars</span>
      </div>
      
      <div className="flex items-center gap-2">
        {isDirty ? (
          <div className="flex items-center gap-1 text-yellow-600">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span>Unsaved changes</span>
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}