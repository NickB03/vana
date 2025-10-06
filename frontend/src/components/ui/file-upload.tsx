"use client"

import { cn } from "@/lib/utils"
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  createPortal,
} from "react"

type FileUploadContextType = {
  isDragging: boolean
  openFileDialog: () => void
  disabled?: boolean
}

const FileUploadContext = createContext<FileUploadContextType>({
  isDragging: false,
  openFileDialog: () => {},
  disabled: false,
})

function useFileUpload() {
  const context = useContext(FileUploadContext)
  if (!context) {
    throw new Error("useFileUpload must be used within a FileUpload")
  }
  return context
}

type FileUploadProps = {
  onFilesAdded?: (files: File[]) => void
  multiple?: boolean
  accept?: string
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

function FileUpload({
  onFilesAdded,
  multiple = true,
  accept,
  disabled = false,
  children,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        const fileArray = Array.from(files)
        onFilesAdded?.(fileArray)
      }
    },
    [onFilesAdded]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input value to allow selecting the same file again
      e.target.value = ""
    },
    [handleFiles]
  )

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current++
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true)
      }
    },
    []
  )

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDragging(false)
      }
    },
    []
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounter.current = 0

      if (disabled) return

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        handleFiles(files)
      }
    },
    [disabled, handleFiles]
  )

  React.useEffect(() => {
    if (disabled) return

    window.addEventListener("dragenter", handleDragEnter)
    window.addEventListener("dragleave", handleDragLeave)
    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("drop", handleDrop)

    return () => {
      window.removeEventListener("dragenter", handleDragEnter)
      window.removeEventListener("dragleave", handleDragLeave)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("drop", handleDrop)
    }
  }, [disabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  const contextValue = {
    isDragging,
    openFileDialog,
    disabled,
  }

  return (
    <FileUploadContext.Provider value={contextValue}>
      <div className={cn("relative", className)}>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="File upload"
        />
        {children}
        {isDragging &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="border-primary bg-background rounded-lg border-2 border-dashed p-8">
                <p className="text-primary text-lg font-medium">
                  Drop files here
                </p>
              </div>
            </div>,
            document.body
          )}
      </div>
    </FileUploadContext.Provider>
  )
}

type FileUploadTriggerProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

function FileUploadTrigger({
  children,
  className,
  ...props
}: FileUploadTriggerProps) {
  const { openFileDialog, disabled } = useFileUpload()

  return (
    <div
      className={cn("cursor-pointer", disabled && "cursor-not-allowed", className)}
      onClick={() => !disabled && openFileDialog()}
      {...props}
    >
      {children}
    </div>
  )
}

type FileUploadContentProps = {
  children?: React.ReactNode
  className?: string
}

function FileUploadContent({
  children,
  className,
}: FileUploadContentProps) {
  const { isDragging } = useFileUpload()

  if (!isDragging && !children) return null

  return (
    <div className={cn("mt-2", className)}>
      {children}
    </div>
  )
}

export { FileUpload, FileUploadTrigger, FileUploadContent, useFileUpload }
