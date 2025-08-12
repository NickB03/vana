/**
 * Canvas Store - Progressive Canvas System State Management
 * Built with Zustand for optimal performance and TypeScript support
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { CanvasStore, CanvasType, CanvasVersion } from '@/types/canvas'
import { convertContent } from '@/lib/utils/content-conversion'

const STORAGE_KEY = 'vana-canvas-state'
const MAX_VERSIONS = 50
const AUTO_SAVE_INTERVAL = 30000 // 30 seconds

// Mock API client - will be replaced with real implementation
const api = {
  async saveCanvas(content: string, type: CanvasType, title?: string) {
    // Progressive enhancement - works without backend
    console.log('Canvas saved (mock):', { content, type, title })
    return { success: true }
  }
}

export const useCanvasStore = create<CanvasStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        isOpen: false,
        activeType: 'markdown',
        content: '',
        title: undefined,
        isDirty: false,
        versions: [],
        currentVersionId: undefined,
        maxVersions: MAX_VERSIONS,
        autoSaveEnabled: true,
        autoSaveInterval: AUTO_SAVE_INTERVAL,
        lastSaved: undefined,
        isLoading: false,
        error: undefined,
        showPreview: true,
        previewPosition: 'right',

        // Canvas lifecycle
        open: (type: CanvasType, content = '', title?: string) => {
          set((state) => {
            state.isOpen = true
            state.activeType = type
            state.content = content
            state.title = title
            state.isDirty = false
            state.error = undefined
            state.currentVersionId = undefined
            state.lastSaved = undefined
          })
        },

        close: () => {
          const state = get()
          if (state.isDirty) {
            const shouldSave = window.confirm('Save changes?')
            if (shouldSave) {
              state.save()
            }
          }
          
          set((state) => {
            state.isOpen = false
            state.content = ''
            state.title = undefined
            state.isDirty = false
            state.error = undefined
            state.currentVersionId = undefined
            state.versions = []
          })
        },

        // Content management
        setContent: (content: string) => {
          set((state) => {
            const previousContent = state.content
            state.content = content
            state.isDirty = content !== previousContent
            
            if (state.isDirty) {
              state.error = undefined
            }
          })
        },

        setTitle: (title: string) => {
          set((state) => {
            state.title = title
            state.isDirty = true
          })
        },

        // Type switching with content conversion
        switchType: (type: CanvasType) => {
          set((state) => {
            if (state.activeType === type) return
            
            const convertedContent = convertContent(
              state.content,
              state.activeType,
              type,
              { preserveFormatting: true }
            )
            
            state.activeType = type
            state.content = convertedContent
            state.isDirty = true
          })
        },

        // Persistence
        save: async () => {
          const state = get()
          
          set((draft) => {
            draft.isLoading = true
            draft.error = undefined
          })

          try {
            await api.saveCanvas(state.content, state.activeType, state.title)
            
            // Create version on save
            const version: CanvasVersion = {
              id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              content: state.content,
              type: state.activeType,
              author: 'user',
              description: `Saved ${state.activeType} content`
            }

            set((draft) => {
              draft.isDirty = false
              draft.isLoading = false
              draft.lastSaved = new Date()
              draft.versions.unshift(version)
              
              // Limit version history
              if (draft.versions.length > draft.maxVersions) {
                draft.versions = draft.versions.slice(0, draft.maxVersions)
              }
            })
          } catch (error) {
            console.error('Failed to save canvas:', error)
            set((draft) => {
              draft.error = error instanceof Error ? error.message : 'Failed to save'
              draft.isLoading = false
            })
          }
        },

        // Version management
        createVersion: (description?: string) => {
          set((state) => {
            const version: CanvasVersion = {
              id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              content: state.content,
              type: state.activeType,
              author: 'user',
              description: description || `${state.activeType} checkpoint`
            }

            state.versions.unshift(version)
            
            // Limit version history
            if (state.versions.length > state.maxVersions) {
              state.versions = state.versions.slice(0, state.maxVersions)
            }
          })
        },

        loadVersion: (versionId: string) => {
          set((state) => {
            const version = state.versions.find(v => v.id === versionId)
            if (version) {
              state.content = version.content
              state.activeType = version.type
              state.currentVersionId = versionId
              state.isDirty = false
            }
          })
        },

        deleteVersion: (versionId: string) => {
          set((state) => {
            state.versions = state.versions.filter(v => v.id !== versionId)
            if (state.currentVersionId === versionId) {
              state.currentVersionId = undefined
            }
          })
        },

        // UI actions
        togglePreview: () => {
          set((state) => {
            state.showPreview = !state.showPreview
          })
        },

        setPreviewPosition: (position: 'right' | 'bottom') => {
          set((state) => {
            state.previewPosition = position
          })
        },

        setError: (error?: string) => {
          set((state) => {
            state.error = error
          })
        },

        // Auto-save
        enableAutoSave: (enabled: boolean) => {
          set((state) => {
            state.autoSaveEnabled = enabled
          })
        },

        // Reset for testing
        resetStore: () => {
          set(() => ({
            isOpen: false,
            activeType: 'markdown',
            content: '',
            title: undefined,
            isDirty: false,
            versions: [],
            currentVersionId: undefined,
            maxVersions: MAX_VERSIONS,
            autoSaveEnabled: true,
            autoSaveInterval: AUTO_SAVE_INTERVAL,
            lastSaved: undefined,
            isLoading: false,
            error: undefined,
            showPreview: true,
            previewPosition: 'right',
          }))
        }
      })),
      {
        name: STORAGE_KEY,
        partialize: (state) => ({
          // Only persist essential state
          autoSaveEnabled: state.autoSaveEnabled,
          showPreview: state.showPreview,
          previewPosition: state.previewPosition,
          // Don't persist: isOpen, content, versions (transient data)
        })
      }
    )
  )
)

// Auto-save subscription
let autoSaveTimeout: NodeJS.Timeout | null = null

useCanvasStore.subscribe(
  (state) => state.isDirty,
  (isDirty, previousIsDirty) => {
    const state = useCanvasStore.getState()
    
    if (isDirty && state.autoSaveEnabled && state.isOpen) {
      // Clear existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }
      
      // Set new timeout
      autoSaveTimeout = setTimeout(() => {
        const currentState = useCanvasStore.getState()
        if (currentState.isDirty && currentState.isOpen) {
          currentState.save()
        }
      }, state.autoSaveInterval)
    }
  }
)

// Cleanup auto-save on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    const state = useCanvasStore.getState()
    if (state.isDirty && state.isOpen) {
      event.preventDefault()
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    }
  })
}