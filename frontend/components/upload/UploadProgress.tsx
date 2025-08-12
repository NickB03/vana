'use client'

interface UploadProgressProps {
  progress: number
  fileName: string
}

export function UploadProgress({ progress, fileName }: UploadProgressProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span>{fileName}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}