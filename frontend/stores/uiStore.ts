/**
 * UI Store - Global UI state management
 * Handles theme, sidebar, notifications, modals, and keyboard shortcuts
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { UIStore, Notification } from '@/types'

const generateNotificationId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS = {
  'cmd+k': 'Toggle Canvas',
  'cmd+/': 'Show shortcuts',
  'cmd+shift+d': 'Toggle dark mode',
  'cmd+shift+s': 'Toggle sidebar',
  'escape': 'Close modals',
  'cmd+enter': 'Send message'
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        theme: 'dark', // Default to dark theme as per PRD
        sidebarOpen: true,
        canvasWidth: 40, // Percentage of screen width
        notifications: [],
        modals: {
          settings: false,
          about: false,
          shortcuts: false
        },
        shortcuts: DEFAULT_SHORTCUTS,

        // Theme actions
        setTheme: (theme) => {
          set(state => {
            state.theme = theme
          })

          // Apply theme to document
          const root = document.documentElement
          
          if (theme === 'dark') {
            root.classList.add('dark')
          } else if (theme === 'light') {
            root.classList.remove('dark')
          } else {
            // System preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (prefersDark) {
              root.classList.add('dark')
            } else {
              root.classList.remove('dark')
            }
          }
        },

        // Sidebar actions
        toggleSidebar: () => {
          set(state => {
            state.sidebarOpen = !state.sidebarOpen
          })
        },

        setSidebarOpen: (open) => {
          set(state => {
            state.sidebarOpen = open
          })
        },

        // Canvas actions
        setCanvasWidth: (width) => {
          set(state => {
            state.canvasWidth = Math.max(30, Math.min(70, width)) // Constrain between 30-70%
          })
        },

        // Notification actions
        addNotification: (notificationData) => {
          const notification: Notification = {
            ...notificationData,
            id: generateNotificationId(),
            timestamp: Date.now()
          }

          set(state => {
            state.notifications.unshift(notification) // Add to beginning
            
            // Limit to 10 notifications
            if (state.notifications.length > 10) {
              state.notifications = state.notifications.slice(0, 10)
            }
          })

          // Auto-dismiss notification after duration
          const duration = notification.duration || getDefaultDuration(notification.type)
          if (duration > 0) {
            setTimeout(() => {
              get().removeNotification(notification.id)
            }, duration)
          }
        },

        removeNotification: (id) => {
          set(state => {
            state.notifications = state.notifications.filter(n => n.id !== id)
          })
        },

        clearNotifications: () => {
          set(state => {
            state.notifications = []
          })
        },

        // Modal actions
        openModal: (modal) => {
          set(state => {
            state.modals[modal] = true
          })
        },

        closeModal: (modal) => {
          set(state => {
            state.modals[modal] = false
          })
        },

        closeAllModals: () => {
          set(state => {
            Object.keys(state.modals).forEach(key => {
              state.modals[key as keyof typeof state.modals] = false
            })
          })
        }
      })),
      {
        name: 'vana-ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          canvasWidth: state.canvasWidth,
          shortcuts: state.shortcuts
          // Don't persist: notifications, modals (transient state)
        })
      }
    )
  )
)

// Helper function for notification durations
function getDefaultDuration(type: Notification['type']): number {
  switch (type) {
    case 'success':
      return 4000 // 4 seconds
    case 'info':
      return 5000 // 5 seconds
    case 'warning':
      return 7000 // 7 seconds
    case 'error':
      return 0 // Don't auto-dismiss errors
    default:
      return 5000
  }
}

// Theme initialization and system preference listener
if (typeof window !== 'undefined') {
  // Initialize theme on app load
  const initializeTheme = () => {
    const state = useUIStore.getState()
    state.setTheme(state.theme)
  }

  // Listen for system theme changes when theme is set to 'system'
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = () => {
    const state = useUIStore.getState()
    if (state.theme === 'system') {
      state.setTheme('system') // Trigger re-evaluation
    }
  }

  mediaQuery.addEventListener('change', handleSystemThemeChange)
  
  // Initialize theme when store is ready
  setTimeout(initializeTheme, 0)
}

// Keyboard shortcut handling
if (typeof window !== 'undefined') {
  const handleKeyDown = (event: KeyboardEvent) => {
    const state = useUIStore.getState()
    let shortcutKey = ''

    // Build shortcut key string
    if (event.ctrlKey || event.metaKey) shortcutKey += 'cmd+'
    if (event.shiftKey) shortcutKey += 'shift+'
    if (event.altKey) shortcutKey += 'alt+'
    
    // Add the actual key
    if (event.key === 'Escape') {
      shortcutKey += 'escape'
    } else if (event.key === 'Enter') {
      shortcutKey += 'enter'
    } else {
      shortcutKey += event.key.toLowerCase()
    }

    // Handle shortcuts
    switch (shortcutKey) {
      case 'cmd+shift+d':
        event.preventDefault()
        state.setTheme(state.theme === 'dark' ? 'light' : 'dark')
        state.addNotification({
          title: 'Theme Changed',
          message: `Switched to ${state.theme === 'dark' ? 'light' : 'dark'} mode`,
          type: 'info',
          duration: 2000
        })
        break

      case 'cmd+shift+s':
        event.preventDefault()
        state.toggleSidebar()
        break

      case 'cmd+/':
        event.preventDefault()
        state.openModal('shortcuts')
        break

      case 'escape':
        state.closeAllModals()
        break

      case 'cmd+k':
        event.preventDefault()
        // Canvas toggle will be handled by the Canvas component
        break
    }
  }

  document.addEventListener('keydown', handleKeyDown)
}

// Utility functions for notifications
export const showSuccessNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    title,
    message,
    type: 'success'
  })
}

export const showErrorNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    title,
    message,
    type: 'error'
  })
}

export const showInfoNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    title,
    message,
    type: 'info'
  })
}

export const showWarningNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    title,
    message,
    type: 'warning'
  })
}

// Selectors for component use
export const useTheme = () => useUIStore(state => state.theme)
export const useSidebar = () => useUIStore(state => ({
  isOpen: state.sidebarOpen,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen
}))
export const useNotifications = () => useUIStore(state => state.notifications)
export const useModals = () => useUIStore(state => state.modals)
export const useCanvasWidth = () => useUIStore(state => state.canvasWidth)