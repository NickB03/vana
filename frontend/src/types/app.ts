/**
 * Application-wide state types and interfaces
 * Central state management for UI preferences, notifications, and global settings
 */

export interface NotificationItem {
  /** Unique notification ID */
  id: string;
  /** Notification type */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Notification title */
  title: string;
  /** Notification message */
  message?: string;
  /** Auto-dismiss timeout (ms) */
  timeout?: number;
  /** Whether notification can be dismissed */
  dismissible: boolean;
  /** Notification timestamp */
  timestamp: string;
  /** Custom action */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UIPreferences {
  /** Color theme */
  theme: 'light' | 'dark' | 'system';
  /** UI density */
  density: 'compact' | 'default' | 'spacious';
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean;
  /** Show timeline by default */
  showTimeline: boolean;
  /** Show thinking process */
  showThinking: boolean;
  /** Reduce animations */
  reduceMotion: boolean;
  /** Font size preference */
  fontSize: 'small' | 'default' | 'large';
  /** Code syntax highlighting theme */
  codeTheme: 'vs-dark' | 'github-light' | 'monokai' | 'solarized';
}

export interface PerformanceMetrics {
  /** Page load time */
  pageLoadTime?: number;
  /** JavaScript bundle size */
  bundleSize?: number;
  /** Memory usage */
  memoryUsage?: number;
  /** Network latency */
  networkLatency?: number;
  /** Render performance score */
  renderScore?: number;
  /** Last updated */
  lastUpdated: string;
}

export interface ApplicationInfo {
  /** Application version */
  version: string;
  /** Build timestamp */
  buildTime: string;
  /** Environment */
  environment: 'development' | 'staging' | 'production';
  /** Feature flags */
  features: Record<string, boolean>;
  /** API endpoints */
  endpoints: {
    api: string;
    websocket: string;
    health: string;
  };
}

export interface AppState {
  /** Application info */
  app: ApplicationInfo;
  /** UI preferences */
  ui: UIPreferences;
  /** Active notifications */
  notifications: NotificationItem[];
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Loading states for various operations */
  loading: {
    app: boolean;
    preferences: boolean;
    notifications: boolean;
  };
  /** Error states */
  errors: {
    app?: string;
    preferences?: string;
    critical?: string;
  };
  /** Modal and dialog states */
  modals: {
    settingsOpen: boolean;
    confirmDialog?: {
      title: string;
      message: string;
      onConfirm: () => void;
      onCancel?: () => void;
    };
  };
}

export interface AppContextValue extends AppState {
  /** Add notification */
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  /** Remove notification */
  removeNotification: (id: string) => void;
  /** Clear all notifications */
  clearNotifications: () => void;
  /** Update UI preferences */
  updatePreferences: (preferences: Partial<UIPreferences>) => void;
  /** Reset preferences to defaults */
  resetPreferences: () => void;
  /** Open settings modal */
  openSettings: () => void;
  /** Close settings modal */
  closeSettings: () => void;
  /** Show confirm dialog */
  showConfirmDialog: (config: AppState['modals']['confirmDialog']) => void;
  /** Close confirm dialog */
  closeConfirmDialog: () => void;
  /** Update performance metrics */
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  /** Clear error */
  clearError: (errorType: keyof AppState['errors']) => void;
}

export type AppAction =
  | { type: 'APP_INIT'; payload: { app: ApplicationInfo } }
  | { type: 'APP_LOADING_SET'; payload: { key: keyof AppState['loading']; loading: boolean } }
  | { type: 'APP_ERROR_SET'; payload: { key: keyof AppState['errors']; error: string } }
  | { type: 'APP_ERROR_CLEAR'; payload: { key: keyof AppState['errors'] } }
  | { type: 'NOTIFICATION_ADD'; payload: { notification: NotificationItem } }
  | { type: 'NOTIFICATION_REMOVE'; payload: { id: string } }
  | { type: 'NOTIFICATION_CLEAR' }
  | { type: 'PREFERENCES_UPDATE'; payload: { preferences: Partial<UIPreferences> } }
  | { type: 'PREFERENCES_RESET' }
  | { type: 'MODAL_SETTINGS_TOGGLE'; payload: { open: boolean } }
  | { type: 'MODAL_CONFIRM_SHOW'; payload: { config: AppState['modals']['confirmDialog'] } }
  | { type: 'MODAL_CONFIRM_CLOSE' }
  | { type: 'PERFORMANCE_UPDATE'; payload: { metrics: Partial<PerformanceMetrics> } };

/**
 * Default configurations
 */
export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'dark',
  density: 'default',
  sidebarCollapsed: false,
  showTimeline: true,
  showThinking: true,
  reduceMotion: false,
  fontSize: 'default',
  codeTheme: 'vs-dark',
};

export const DEFAULT_APPLICATION_INFO: ApplicationInfo = {
  version: '1.0.0',
  buildTime: new Date().toISOString(),
  environment: import.meta.env.MODE as ApplicationInfo['environment'],
  features: {
    guestMode: true,
    offlineMode: false,
    experimentalFeatures: import.meta.env.DEV,
    analytics: import.meta.env.PROD,
  },
  endpoints: {
    api: import.meta.env.DEV ? 'http://localhost:8081/api' : '/api',
    websocket: import.meta.env.DEV ? 'ws://localhost:8081/ws' : '/ws',
    health: import.meta.env.DEV ? 'http://localhost:8081/health' : '/health',
  },
};

/**
 * Notification helpers
 */
export function createNotification(
  type: NotificationItem['type'],
  title: string,
  message?: string,
  options?: Partial<Pick<NotificationItem, 'timeout' | 'dismissible' | 'action'>>
): Omit<NotificationItem, 'id' | 'timestamp'> {
  return {
    type,
    title,
    message,
    timeout: options?.timeout ?? (type === 'error' ? 0 : 5000),
    dismissible: options?.dismissible ?? true,
    action: options?.action,
  };
}

/**
 * Storage keys for persistence
 */
export const STORAGE_KEYS = {
  UI_PREFERENCES: 'vana_ui_preferences',
  THEME: 'vana_theme',
  SIDEBAR_COLLAPSED: 'vana_sidebar_collapsed',
} as const;