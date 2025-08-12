'use client'

import { useCanvasStore } from '@/stores/canvasStore'
import { MarkdownEditor } from './editors/MarkdownEditor'
import { CodeEditor } from './editors/CodeEditor'
import { WebPreview } from './editors/WebPreview'
import { SandboxEditor } from './editors/SandboxEditor'

export function CanvasEditor() {
  const { activeType, content, setContent } = useCanvasStore()

  const renderEditor = () => {
    switch (activeType) {
      case 'markdown':
        return <MarkdownEditor value={content} onChange={setContent} />
      case 'code':
        return <CodeEditor value={content} onChange={setContent} />
      case 'web':
        return <WebPreview value={content} onChange={setContent} />
      case 'sandbox':
        return <SandboxEditor value={content} onChange={setContent} />
      default:
        return <div>Select a canvas type</div>
    }
  }

  return (
    <div className="h-full w-full">
      {renderEditor()}
    </div>
  )
}