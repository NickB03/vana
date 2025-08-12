'use client'

interface FilePreviewProps {
  file: File
  onRemove?: () => void
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded">
      <span className="text-sm">{file.name}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-xs hover:bg-destructive p-1 rounded">
          ×
        </button>
      )}
    </div>
  )
}