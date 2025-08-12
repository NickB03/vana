/**
 * Canvas System Types
 * Progressive Canvas with multiple editor modes
 */

export type CanvasType = 'markdown' | 'code' | 'web' | 'sandbox'

export interface CanvasVersion {
  id: string
  timestamp: number
  content: string
  type: CanvasType
  author: 'user' | 'agent' | 'system'
  description?: string
}

export interface CanvasState {
  // Core state
  isOpen: boolean
  activeType: CanvasType
  content: string
  title?: string
  isDirty: boolean
  
  // Version management
  versions: CanvasVersion[]
  currentVersionId?: string
  maxVersions: number
  
  // Auto-save
  autoSaveEnabled: boolean
  autoSaveInterval: number
  lastSaved?: Date
  
  // UI state
  isLoading: boolean
  error?: string
  
  // Split view state (for markdown editor)
  showPreview: boolean
  previewPosition: 'right' | 'bottom'
}

export interface CanvasActions {
  // Canvas lifecycle
  open: (type: CanvasType, content?: string, title?: string) => void
  close: () => void
  
  // Content management
  setContent: (content: string) => void
  setTitle: (title: string) => void
  
  // Type switching
  switchType: (type: CanvasType) => void
  
  // Persistence
  save: () => Promise<void>
  
  // Version management
  createVersion: (description?: string) => void
  loadVersion: (versionId: string) => void
  deleteVersion: (versionId: string) => void
  
  // UI actions
  togglePreview: () => void
  setPreviewPosition: (position: 'right' | 'bottom') => void
  setError: (error?: string) => void
  
  // Auto-save
  enableAutoSave: (enabled: boolean) => void
  
  // Reset
  resetStore?: () => void
}

export type CanvasStore = CanvasState & CanvasActions

export interface CodeLanguage {
  id: string
  name: string
  extensions: string[]
  monacoId: string
}

export interface ContentConversionOptions {
  preserveFormatting?: boolean
  addMetadata?: boolean
  sanitize?: boolean
}

export interface CanvasKeyboardShortcut {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  disabled?: boolean
}

export interface CanvasEditorProps {
  content: string
  onChange: (content: string) => void
  language?: string
  readOnly?: boolean
  className?: string
}

export interface CanvasToolbarProps {
  activeType: CanvasType
  onTypeChange: (type: CanvasType) => void
  title?: string
  onTitleChange?: (title: string) => void
  isDirty: boolean
  onSave: () => void
  onClose: () => void
  versions: CanvasVersion[]
  onLoadVersion: (versionId: string) => void
}

export interface CanvasStatusInfo {
  wordCount: number
  charCount: number
  lineCount: number
  language?: string
  encoding: string
  lastModified?: Date
  fileSize: number
}