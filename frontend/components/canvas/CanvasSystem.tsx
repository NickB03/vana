/**
 * CanvasSystem - Main Canvas Container with ResizablePanel
 * Progressive Canvas system for multi-mode editing
 */

'use client'

import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore } from '@/stores/canvasStore'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasEditor } from './CanvasEditor'
import { CanvasStatusBar } from './CanvasStatusBar'
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

export interface CanvasSystemProps {
  className?: string
  onResize?: (width: number, height: number) => void
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}

export const CanvasSystem: React.FC<CanvasSystemProps> = ({
  className = '',
  onResize,
  minWidth = 400,
  maxWidth = 1200,
  defaultWidth = 800
}) => {
  const {
    isOpen,
    activeType,
    content,
    title,
    isDirty,
    versions,
    error,
    save,
    close,
    createVersion,
    switchType,
    setError
  } = useCanvasStore()

  // Keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      metaKey: true,
      action: () => save(),
      description: 'Save canvas'
    },
    {
      key: 's',
      metaKey: true,
      shiftKey: true,
      action: () => createVersion('Manual save point'),
      description: 'Create version'
    },
    {
      key: 'Escape',
      action: () => close(),
      description: 'Close canvas'
    },
    {
      key: '1',
      metaKey: true,
      action: () => switchType('markdown'),
      description: 'Switch to Markdown'
    },
    {
      key: '2',
      metaKey: true,
      action: () => switchType('code'),
      description: 'Switch to Code'
    },
    {
      key: '3',
      metaKey: true,
      action: () => switchType('web'),
      description: 'Switch to Web Preview'
    },
    {
      key: '4',
      metaKey: true,
      action: () => switchType('sandbox'),
      description: 'Switch to Sandbox'
    }
  ]

  useKeyboardShortcuts(shortcuts, isOpen)

  // Handle resize events
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (entries.length > 0 && onResize) {
      const { width, height } = entries[0].contentRect
      onResize(width, height)
    }
  }, [onResize])

  // Set up resize observer
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return

    const resizeObserver = new ResizeObserver(handleResize)
    const canvasElement = document.getElementById('canvas-panel')
    
    if (canvasElement) {
      resizeObserver.observe(canvasElement)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [isOpen, handleResize])

  // Clear errors after a timeout
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError(undefined)
      }, 5000)
      
      return () => clearTimeout(timeout)
    }
  }, [error, setError])

  if (!isOpen) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        id="canvas-panel"
        data-testid="canvas-panel"
        role="region"
        aria-label="Canvas Editor"
        className={`
          fixed right-0 top-0 bottom-0 z-50
          bg-background border-l border-border
          flex flex-col
          shadow-2xl
          ${className}
        `}
        style={{
          width: `min(${defaultWidth}px, calc(100vw - 200px))`,
          minWidth: `${minWidth}px`,
          maxWidth: `min(${maxWidth}px, calc(100vw - 200px))`
        }}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30
        }}
      >
        {/* Resize Handle */}
        <div
          className="
            absolute left-0 top-0 bottom-0 w-1
            cursor-col-resize
            hover:bg-primary/20
            transition-colors
            group
          "
          onMouseDown={(e) => {
            e.preventDefault()
            const startX = e.clientX
            const panel = e.currentTarget.parentElement
            if (!panel) return

            const startWidth = panel.offsetWidth

            const handleMouseMove = (e: MouseEvent) => {
              const diff = startX - e.clientX
              const newWidth = Math.max(
                minWidth,
                Math.min(maxWidth, startWidth + diff)
              )
              panel.style.width = `${newWidth}px`
              onResize?.(newWidth, panel.offsetHeight)
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
              document.body.style.cursor = ''
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = 'col-resize'
          }}
        >
          <div className="
            absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            w-1 h-8 bg-border rounded-full
            group-hover:bg-primary/40
            transition-colors
          " />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-border">
          <CanvasToolbar />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative">
          <CanvasEditor />
          
          {/* Error Toast */}
          {error && (
            <motion.div
              data-testid="error-toast"
              className="
                absolute top-4 left-4 right-4
                bg-destructive text-destructive-foreground
                p-3 rounded-md shadow-lg
                flex items-center gap-2
                z-50
              "
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">{error}</span>
              <button
                onClick={() => setError(undefined)}
                className="ml-auto p-1 hover:bg-destructive/20 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
          
          {/* Live Region for Screen Readers */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {isDirty ? 'Canvas has unsaved changes' : 'Canvas saved'}
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex-shrink-0 border-t border-border">
          <CanvasStatusBar />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CanvasSystem