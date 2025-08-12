/**
 * Core type definitions for the Agent Task Deck system
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface AgentTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  progress?: number // 0-100 percentage
  agent: string
  agentId: string
  startTime?: number
  endTime?: number
  duration?: number // in milliseconds
  error?: string
  metadata?: Record<string, any>
  dependencies?: string[] // IDs of dependent tasks
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

export interface AgentInfo {
  id: string
  name: string
  type: string
  capabilities?: string[]
  status: 'idle' | 'busy' | 'offline' | 'error'
  avatar?: string
  color?: string // Theme color for the agent
}

export interface TaskPipeline {
  id: string
  name: string
  tasks: AgentTask[]
  agents: AgentInfo[]
  status: TaskStatus
  startTime?: number
  endTime?: number
  progress?: number
}

export interface SSEEvent {
  type: 'task_created' | 'task_updated' | 'task_completed' | 'task_failed' | 'agent_status' | 'pipeline_update'
  data: {
    taskId?: string
    agentId?: string
    pipelineId?: string
    status?: TaskStatus
    progress?: number
    message?: string
    timestamp: number
    [key: string]: any
  }
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  agentName?: string
  tasks?: AgentTask[]
  metadata?: Record<string, any>
}

// Animation and UI types
export type DeckPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export interface AnimationConfig {
  duration?: number
  delay?: number
  ease?: string
  stagger?: number
}

export interface DeckSettings {
  position: DeckPosition
  maxVisible: number
  autoHide: boolean
  autoDismiss: boolean
  dismissDelay: number // milliseconds
  stackOffset: number // pixels
}

// Store types
export interface AgentDeckState {
  tasks: AgentTask[]
  agents: AgentInfo[]
  pipelines: TaskPipeline[]
  activeTasks: AgentTask[]
  completedTasks: AgentTask[]
  isVisible: boolean
  settings: DeckSettings
  lastUpdate: number
}

export interface AgentDeckActions {
  addTask: (task: AgentTask) => void
  updateTask: (taskId: string, updates: Partial<AgentTask>) => void
  removeTask: (taskId: string) => void
  addAgent: (agent: AgentInfo) => void
  updateAgent: (agentId: string, updates: Partial<AgentInfo>) => void
  setVisible: (visible: boolean) => void
  updateSettings: (settings: Partial<DeckSettings>) => void
  dismissCompletedTasks: () => void
  clearAllTasks: () => void
  handleSSEEvent: (event: SSEEvent) => void
}

export type AgentDeckStore = AgentDeckState & AgentDeckActions

// Additional core types for the Vana application

// Authentication types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  preferences?: {
    theme: 'dark' | 'light' | 'system'
    language: string
    notifications: boolean
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  error: string | null
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  logout: () => void
  refreshTokens: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  clearError: () => void
}

export type AuthStore = AuthState & AuthActions

// Enhanced Message type with research sources
export interface ResearchSource {
  shortId: string
  title: string
  url: string
  domain: string
  snippet?: string
  supportedClaims: Array<{
    textSegment: string
    confidence: number
  }>
}

export interface EnhancedMessage extends Omit<Message, 'metadata'> {
  sources?: ResearchSource[]
  metadata?: {
    model?: string
    tokens?: number
    executionTime?: number
  }
  status?: 'pending' | 'streaming' | 'complete' | 'error'
}

// Session management
export interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: EnhancedMessage[]
  canvasState?: {
    isOpen: boolean
    activeType: CanvasType
    content: string
    title?: string
  }
  origin: 'homepage' | 'tool'
  metadata?: {
    totalTokens?: number
    model?: string
  }
}

// Chat store types
export interface ChatState {
  currentSession: Session | null
  messages: EnhancedMessage[]
  isStreaming: boolean
  streamingMessage: string
  isLoading: boolean
  error: string | null
  researchSources: ResearchSource[]
}

export interface ChatActions {
  sendMessage: (content: string, files?: File[]) => Promise<void>
  addMessage: (message: Omit<EnhancedMessage, 'id' | 'timestamp'>) => void
  updateStreamingMessage: (content: string) => void
  setStreaming: (streaming: boolean) => void
  addResearchSources: (sources: ResearchSource[]) => void
  clearChat: () => void
  setError: (error: string | null) => void
}

export type ChatStore = ChatState & ChatActions

// Canvas types (imported from canvas.ts)
export type CanvasType = 'markdown' | 'code' | 'web' | 'sandbox'

// File upload types
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content?: string
  url?: string
  uploadedAt: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress?: number
  error?: string
}

export interface UploadState {
  files: UploadedFile[]
  isUploading: boolean
  maxFiles: number
  maxFileSize: number
  allowedTypes: string[]
  autoOpenMarkdown: boolean
}

export interface UploadActions {
  addFiles: (files: File[]) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  uploadFile: (file: File) => Promise<void>
  setSettings: (settings: Partial<Omit<UploadState, 'files' | 'isUploading'>>) => void
}

export type UploadStore = UploadState & UploadActions

// UI state types
export interface Notification {
  id: string
  title: string
  message?: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'default' | 'destructive'
  }>
}

export interface UIState {
  theme: 'dark' | 'light' | 'system'
  sidebarOpen: boolean
  canvasWidth: number
  notifications: Notification[]
  modals: {
    settings: boolean
    about: boolean
    shortcuts: boolean
  }
  shortcuts: Record<string, string>
}

export interface UIActions {
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCanvasWidth: (width: number) => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  openModal: (modal: keyof UIState['modals']) => void
  closeModal: (modal: keyof UIState['modals']) => void
  closeAllModals: () => void
}

export type UIStore = UIState & UIActions

// Homepage types
export interface PromptSuggestion {
  id: string
  title: string
  description?: string
  prompt: string
  icon?: string
  category?: string
  tags?: string[]
}

export interface ToolOption {
  id: string
  name: string
  description: string
  icon: string
  canvasType: CanvasType
  shortcut?: string
  category?: string
  featured?: boolean
}

// API types
export interface ApiError extends Error {
  status: number
  code?: string
  details?: any
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
  timestamp: string
}