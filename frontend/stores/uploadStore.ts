/**
 * Upload Store - File upload management with automatic .md Canvas routing
 * Handles file selection, upload progress, and Canvas integration
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { UploadStore, UploadedFile } from '@/types'
import { useCanvasStore } from './canvasStore'

// File type mappings
const ALLOWED_TYPES = [
  'text/markdown',
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

// Mock upload API - will be replaced with actual implementation
const uploadApi = {
  async uploadFile(file: File): Promise<{ url: string; content?: string }> {
    // Simulate upload progress
    return new Promise((resolve, reject) => {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md')
      
      if (isText) {
        // For text files, read content
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            url: URL.createObjectURL(file),
            content: reader.result as string
          })
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      } else {
        // For other files, just return URL
        setTimeout(() => {
          resolve({
            url: URL.createObjectURL(file)
          })
        }, 1000 + Math.random() * 2000) // Simulate 1-3 second upload
      }
    })
  }
}

const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useUploadStore = create<UploadStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      files: [],
      isUploading: false,
      maxFiles: MAX_FILES,
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_TYPES,
      autoOpenMarkdown: true,

      // Actions
      addFiles: (newFiles: File[]) => {
        const state = get()
        const currentFileCount = state.files.length
        
        // Validate file count
        if (currentFileCount + newFiles.length > state.maxFiles) {
          throw new Error(`Cannot upload more than ${state.maxFiles} files at once`)
        }

        const validFiles: UploadedFile[] = []
        const errors: string[] = []

        newFiles.forEach(file => {
          // Validate file size
          if (file.size > state.maxFileSize) {
            errors.push(`${file.name} exceeds ${state.maxFileSize / 1024 / 1024}MB limit`)
            return
          }

          // Validate file type
          if (!state.allowedTypes.includes(file.type) && 
              !state.allowedTypes.some(type => file.name.toLowerCase().endsWith(type.split('/')[1]))) {
            errors.push(`${file.name} is not a supported file type`)
            return
          }

          // Create upload file object
          const uploadFile: UploadedFile = {
            id: generateFileId(),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: Date.now(),
            status: 'pending',
            progress: 0
          }

          validFiles.push(uploadFile)
        })

        if (errors.length > 0) {
          throw new Error(errors.join('\n'))
        }

        set(state => {
          state.files.push(...validFiles)
        })

        // Auto-upload valid files
        validFiles.forEach(uploadFile => {
          const originalFile = newFiles.find(f => 
            f.name === uploadFile.name && 
            f.size === uploadFile.size
          )
          if (originalFile) {
            get().uploadFile(originalFile)
          }
        })

        // Handle markdown files - open in Canvas if enabled
        if (state.autoOpenMarkdown) {
          const markdownFile = validFiles.find(file => 
            file.name.endsWith('.md') || file.type === 'text/markdown'
          )
          
          if (markdownFile) {
            const originalFile = newFiles.find(f => f.name === markdownFile.name)
            if (originalFile) {
              // Read markdown content and open Canvas
              const reader = new FileReader()
              reader.onload = () => {
                const content = reader.result as string
                useCanvasStore.getState().open('markdown', content, markdownFile.name)
              }
              reader.readAsText(originalFile)
            }
          }
        }
      },

      removeFile: (fileId: string) => {
        set(state => {
          const fileIndex = state.files.findIndex(f => f.id === fileId)
          if (fileIndex >= 0) {
            const file = state.files[fileIndex]
            
            // Cleanup URL if exists
            if (file.url) {
              URL.revokeObjectURL(file.url)
            }
            
            state.files.splice(fileIndex, 1)
          }
        })
      },

      clearFiles: () => {
        const state = get()
        
        // Cleanup all URLs
        state.files.forEach(file => {
          if (file.url) {
            URL.revokeObjectURL(file.url)
          }
        })

        set(state => {
          state.files = []
          state.isUploading = false
        })
      },

      uploadFile: async (file: File) => {
        const state = get()
        const uploadFile = state.files.find(f => f.name === file.name && f.size === file.size)
        
        if (!uploadFile) {
          throw new Error('File not found in upload queue')
        }

        set(draft => {
          const fileIndex = draft.files.findIndex(f => f.id === uploadFile.id)
          if (fileIndex >= 0) {
            draft.files[fileIndex].status = 'uploading'
            draft.files[fileIndex].progress = 0
          }
          draft.isUploading = true
        })

        try {
          // Simulate progress updates
          const progressInterval = setInterval(() => {
            set(draft => {
              const fileIndex = draft.files.findIndex(f => f.id === uploadFile.id)
              if (fileIndex >= 0 && draft.files[fileIndex].status === 'uploading') {
                const currentProgress = draft.files[fileIndex].progress || 0
                const increment = Math.random() * 20
                draft.files[fileIndex].progress = Math.min(currentProgress + increment, 90)
              }
            })
          }, 200)

          const result = await uploadApi.uploadFile(file)
          
          clearInterval(progressInterval)

          set(draft => {
            const fileIndex = draft.files.findIndex(f => f.id === uploadFile.id)
            if (fileIndex >= 0) {
              draft.files[fileIndex].status = 'completed'
              draft.files[fileIndex].progress = 100
              draft.files[fileIndex].url = result.url
              draft.files[fileIndex].content = result.content
            }

            // Check if all uploads are complete
            const hasUploading = draft.files.some(f => f.status === 'uploading')
            if (!hasUploading) {
              draft.isUploading = false
            }
          })

        } catch (error) {
          set(draft => {
            const fileIndex = draft.files.findIndex(f => f.id === uploadFile.id)
            if (fileIndex >= 0) {
              draft.files[fileIndex].status = 'error'
              draft.files[fileIndex].error = error instanceof Error ? error.message : 'Upload failed'
            }

            // Check if all uploads are complete (including errors)
            const hasUploading = draft.files.some(f => f.status === 'uploading')
            if (!hasUploading) {
              draft.isUploading = false
            }
          })
          
          throw error
        }
      },

      setSettings: (settings) => {
        set(state => {
          Object.assign(state, settings)
        })
      }
    }))
  )
)

// Utility functions for file handling
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export const isImageFile = (file: File | UploadedFile): boolean => {
  const type = 'type' in file ? file.type : ''
  return type.startsWith('image/')
}

export const isTextFile = (file: File | UploadedFile): boolean => {
  const name = file.name.toLowerCase()
  const type = 'type' in file ? file.type : ''
  return type.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt')
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Selectors
export const useUploadFiles = () => useUploadStore(state => state.files)
export const useUploadProgress = () => useUploadStore(state => ({
  isUploading: state.isUploading,
  files: state.files
}))
export const useCompletedUploads = () => useUploadStore(state => 
  state.files.filter(f => f.status === 'completed')
)
export const useFailedUploads = () => useUploadStore(state => 
  state.files.filter(f => f.status === 'error')
)