/**
 * Zustand store for managing the Agent Task Deck state
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import type { 
  AgentDeckStore, 
  AgentTask, 
  AgentInfo, 
  TaskPipeline, 
  SSEEvent, 
  DeckSettings,
  TaskStatus
} from '@/types'
import { shouldAutoDismiss, sortTasks } from '@/lib/utils'

const defaultSettings: DeckSettings = {
  position: 'top-right',
  maxVisible: 5,
  autoHide: false,
  autoDismiss: true,
  dismissDelay: 5000, // 5 seconds
  stackOffset: 8
}

export const useAgentDeckStore = create<AgentDeckStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // State
      tasks: [],
      agents: [],
      pipelines: [],
      activeTasks: [],
      completedTasks: [],
      isVisible: true,
      settings: defaultSettings,
      lastUpdate: Date.now(),

      // Actions
      addTask: (task: AgentTask) => {
        set((state) => {
          // Check if task already exists
          const existingIndex = state.tasks.findIndex(t => t.id === task.id)
          
          if (existingIndex >= 0) {
            // Update existing task
            state.tasks[existingIndex] = { ...state.tasks[existingIndex], ...task }
          } else {
            // Add new task
            state.tasks.push({
              ...task,
              startTime: task.startTime || Date.now()
            })
          }
          
          // Update derived states
          state.activeTasks = state.tasks.filter(t => 
            t.status === 'pending' || t.status === 'running'
          )
          state.completedTasks = state.tasks.filter(t => 
            t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
          )
          
          state.lastUpdate = Date.now()
          
          // Show deck if new active task
          if (task.status === 'running' && !state.isVisible) {
            state.isVisible = true
          }
        })
      },

      updateTask: (taskId: string, updates: Partial<AgentTask>) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex(t => t.id === taskId)
          
          if (taskIndex >= 0) {
            const currentTask = state.tasks[taskIndex]
            const updatedTask = { ...currentTask, ...updates }
            
            // Set end time for completed/failed tasks
            if (
              (updates.status === 'completed' || updates.status === 'failed') && 
              !updatedTask.endTime
            ) {
              updatedTask.endTime = Date.now()
            }
            
            // Calculate duration
            if (updatedTask.startTime && updatedTask.endTime) {
              updatedTask.duration = updatedTask.endTime - updatedTask.startTime
            }
            
            state.tasks[taskIndex] = updatedTask
            
            // Update derived states
            state.activeTasks = state.tasks.filter(t => 
              t.status === 'pending' || t.status === 'running'
            )
            state.completedTasks = state.tasks.filter(t => 
              t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
            )
            
            state.lastUpdate = Date.now()
          }
        })
      },

      removeTask: (taskId: string) => {
        set((state) => {
          state.tasks = state.tasks.filter(t => t.id !== taskId)
          state.activeTasks = state.activeTasks.filter(t => t.id !== taskId)
          state.completedTasks = state.completedTasks.filter(t => t.id !== taskId)
          state.lastUpdate = Date.now()
        })
      },

      addAgent: (agent: AgentInfo) => {
        set((state) => {
          const existingIndex = state.agents.findIndex(a => a.id === agent.id)
          
          if (existingIndex >= 0) {
            state.agents[existingIndex] = { ...state.agents[existingIndex], ...agent }
          } else {
            state.agents.push(agent)
          }
          
          state.lastUpdate = Date.now()
        })
      },

      updateAgent: (agentId: string, updates: Partial<AgentInfo>) => {
        set((state) => {
          const agentIndex = state.agents.findIndex(a => a.id === agentId)
          
          if (agentIndex >= 0) {
            state.agents[agentIndex] = { ...state.agents[agentIndex], ...updates }
            state.lastUpdate = Date.now()
          }
        })
      },

      setVisible: (visible: boolean) => {
        set((state) => {
          state.isVisible = visible
        })
      },

      updateSettings: (newSettings: Partial<DeckSettings>) => {
        set((state) => {
          state.settings = { ...state.settings, ...newSettings }
        })
      },

      dismissCompletedTasks: () => {
        set((state) => {
          const { dismissDelay } = state.settings
          
          // Remove auto-dismissible completed tasks
          state.tasks = state.tasks.filter(task => 
            !shouldAutoDismiss(task, dismissDelay)
          )
          
          // Update derived states
          state.completedTasks = state.tasks.filter(t => 
            t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
          )
          
          state.lastUpdate = Date.now()
          
          // Hide deck if no active tasks
          if (state.activeTasks.length === 0 && state.settings.autoHide) {
            state.isVisible = false
          }
        })
      },

      clearAllTasks: () => {
        set((state) => {
          state.tasks = []
          state.activeTasks = []
          state.completedTasks = []
          state.lastUpdate = Date.now()
          
          if (state.settings.autoHide) {
            state.isVisible = false
          }
        })
      },

      handleSSEEvent: (event: SSEEvent) => {
        const { type, data } = event
        
        switch (type) {
          case 'task_created':
            if (data.taskId) {
              get().addTask({
                id: data.taskId,
                title: data.message || 'New Task',
                status: 'pending',
                agent: data.agent || 'Unknown Agent',
                agentId: data.agentId || 'unknown',
                startTime: data.timestamp,
                ...data
              } as AgentTask)
            }
            break
            
          case 'task_updated':
            if (data.taskId) {
              get().updateTask(data.taskId, {
                status: data.status,
                progress: data.progress,
                ...data
              })
            }
            break
            
          case 'task_completed':
            if (data.taskId) {
              get().updateTask(data.taskId, {
                status: 'completed',
                progress: 100,
                endTime: data.timestamp,
                ...data
              })
            }
            break
            
          case 'task_failed':
            if (data.taskId) {
              get().updateTask(data.taskId, {
                status: 'failed',
                error: data.message,
                endTime: data.timestamp,
                ...data
              })
            }
            break
            
          case 'agent_status':
            if (data.agentId) {
              get().updateAgent(data.agentId, {
                status: data.status as any,
                ...data
              })
            }
            break
            
          default:
            console.debug('Unhandled SSE event type:', type)
        }
      }
    }))
  )
)

// Selectors for derived state
export const useActiveTasks = () => 
  useAgentDeckStore(state => sortTasks(state.activeTasks))

export const useCompletedTasks = () => 
  useAgentDeckStore(state => sortTasks(state.completedTasks))

export const useVisibleTasks = () => 
  useAgentDeckStore(state => {
    const { activeTasks, completedTasks, settings } = state
    const allTasks = [...activeTasks, ...completedTasks]
    const sorted = sortTasks(allTasks)
    return sorted.slice(0, settings.maxVisible)
  })

export const useRunningTasks = () => 
  useAgentDeckStore(state => 
    state.tasks.filter(task => task.status === 'running')
  )

export const useTasksForAgent = (agentId: string) => 
  useAgentDeckStore(state => 
    state.tasks.filter(task => task.agentId === agentId)
  )

export const useAgentById = (agentId: string) => 
  useAgentDeckStore(state => 
    state.agents.find(agent => agent.id === agentId)
  )

// Auto-dismiss mechanism
let autoDismissInterval: NodeJS.Timeout | null = null

export const startAutoDismiss = () => {
  if (autoDismissInterval) return
  
  autoDismissInterval = setInterval(() => {
    const { dismissCompletedTasks, settings } = useAgentDeckStore.getState()
    
    if (settings.autoDismiss) {
      dismissCompletedTasks()
    }
  }, 1000) // Check every second
}

export const stopAutoDismiss = () => {
  if (autoDismissInterval) {
    clearInterval(autoDismissInterval)
    autoDismissInterval = null
  }
}

// Initialize auto-dismiss on store creation
if (typeof window !== 'undefined') {
  startAutoDismiss()
}