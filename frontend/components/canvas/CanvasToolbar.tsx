/**
 * CanvasToolbar - Mode switching tabs, version history, save/close controls
 * Header toolbar for the Canvas system
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Code, 
  Globe, 
  PlaySquare, 
  Save, 
  X, 
  Clock, 
  Edit3,
  Eye,
  EyeOff,
  MoreVertical
} from 'lucide-react'
import { useCanvasStore } from '@/stores/canvasStore'
import { CanvasVersions } from './CanvasVersions'
import type { CanvasType } from '@/types/canvas'

const CANVAS_TYPES = [
  {
    type: 'markdown' as CanvasType,
    label: 'Markdown',
    icon: FileText,
    description: 'Rich text editing with live preview',
    shortcut: '⌘1'
  },
  {
    type: 'code' as CanvasType,
    label: 'Code',
    icon: Code,
    description: 'Syntax highlighting and code editing',
    shortcut: '⌘2'
  },
  {
    type: 'web' as CanvasType,
    label: 'Preview',
    icon: Globe,
    description: 'HTML preview and web content',
    shortcut: '⌘3'
  },
  {
    type: 'sandbox' as CanvasType,
    label: 'Sandbox',
    icon: PlaySquare,
    description: 'Interactive code sandbox',
    shortcut: '⌘4'
  }
]

export const CanvasToolbar: React.FC = () => {
  const {
    activeType,
    title,
    isDirty,
    isLoading,
    versions,
    showPreview,
    switchType,
    save,
    close,
    loadVersion,
    togglePreview,
    setTitle
  } = useCanvasStore()

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(title || '')

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      setTitle(titleInput.trim())
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setTitleInput(title || '')
      setIsEditingTitle(false)
    }
  }

  return (
    <div 
      data-testid="canvas-toolbar"
      className="flex items-center justify-between p-3 bg-muted/30"
    >
      {/* Left Section: Title and Tabs */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="
                px-2 py-1 text-sm font-medium
                bg-background border border-border rounded
                min-w-0 max-w-48
                focus:outline-none focus:ring-2 focus:ring-primary/20
              "
              placeholder="Canvas title..."
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(title || '')
                setIsEditingTitle(true)
              }}
              className="
                flex items-center gap-1 px-2 py-1 text-sm font-medium
                hover:bg-accent rounded transition-colors
                min-w-0 max-w-48
              "
            >
              <span className="truncate">
                {title || 'Canvas'}
              </span>
              <Edit3 className="w-3 h-3 opacity-50 flex-shrink-0" />
            </button>
          )}
          
          {isDirty && (
            <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
          )}
        </div>

        {/* Mode Tabs */}
        <div 
          role="tablist" 
          aria-orientation="horizontal"
          className="flex items-center bg-muted rounded-lg p-1"
        >
          {CANVAS_TYPES.map((canvasType) => {
            const Icon = canvasType.icon
            const isActive = activeType === canvasType.type
            
            return (
              <button
                key={canvasType.type}
                role="tab"
                aria-selected={isActive}
                aria-controls={`canvas-${canvasType.type}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => switchType(canvasType.type)}
                className={`
                  relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium
                  rounded-md transition-all duration-200
                  ${isActive 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }
                `}
                title={`${canvasType.description} (${canvasType.shortcut})`}
              >
                <Icon className="w-4 h-4" />
                <span>{canvasType.label}</span>
                
                {isActive && (
                  <motion.div
                    layoutId="canvas-tab-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-md -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Section: Controls */}
      <div className="flex items-center gap-2">
        {/* Preview Toggle (Markdown only) */}
        {activeType === 'markdown' && (
          <button
            onClick={togglePreview}
            className="
              flex items-center gap-1 px-2 py-1 text-xs
              text-muted-foreground hover:text-foreground
              hover:bg-accent rounded transition-colors
            "
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>Preview</span>
          </button>
        )}

        {/* Version History */}
        {versions.length > 0 && (
          <CanvasVersions 
            versions={versions}
            onLoadVersion={loadVersion}
          />
        )}

        {/* Save Button */}
        {isDirty && (
          <button
            data-testid="canvas-save-button"
            onClick={save}
            disabled={isLoading}
            className="
              flex items-center gap-1 px-3 py-1.5 text-sm font-medium
              bg-primary text-primary-foreground
              hover:bg-primary/90
              rounded-md transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Save changes (⌘S)"
          >
            <Save className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
            <span>{isLoading ? 'Saving...' : 'Save'}</span>
          </button>
        )}

        {/* More Options Menu */}
        <div className="relative">
          <button
            className="
              p-2 text-muted-foreground hover:text-foreground
              hover:bg-accent rounded-md transition-colors
            "
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Close Button */}
        <button
          data-testid="canvas-close-button"
          onClick={close}
          className="
            p-2 text-muted-foreground hover:text-foreground
            hover:bg-accent rounded-md transition-colors
          "
          title="Close canvas (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default CanvasToolbar