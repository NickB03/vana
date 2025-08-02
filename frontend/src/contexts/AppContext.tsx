/**
 * AppContext - Global application state management
 * 
 * Manages UI preferences, notifications, performance metrics, and modal states.
 * Uses localStorage for persistence and provides optimized context splitting.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  AppState,
  AppContextValue,
  AppAction,
  NotificationItem,
  UIPreferences,
  PerformanceMetrics,
  DEFAULT_UI_PREFERENCES,
  DEFAULT_APPLICATION_INFO,
  createNotification,
  STORAGE_KEYS,
} from '@/types/app';

// Initial app state
const initialAppState: AppState = {
  app: DEFAULT_APPLICATION_INFO,
  ui: DEFAULT_UI_PREFERENCES,
  notifications: [],
  performance: {
    lastUpdated: new Date().toISOString(),
  },
  loading: {
    app: false,
    preferences: false,
    notifications: false,
  },
  errors: {},
  modals: {
    settingsOpen: false,
  },
};

// App reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'APP_INIT':
      return {
        ...state,
        app: action.payload.app,
      };

    case 'APP_LOADING_SET':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.loading,
        },
      };

    case 'APP_ERROR_SET':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error,
        },
      };

    case 'APP_ERROR_CLEAR':
      const { [action.payload.key]: _, ...remainingErrors } = state.errors;
      return {
        ...state,
        errors: remainingErrors,
      };

    case 'NOTIFICATION_ADD':
      return {
        ...state,
        notifications: [action.payload.notification, ...state.notifications],
      };

    case 'NOTIFICATION_REMOVE':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload.id),
      };

    case 'NOTIFICATION_CLEAR':
      return {
        ...state,
        notifications: [],
      };

    case 'PREFERENCES_UPDATE':
      const updatedPreferences = {
        ...state.ui,
        ...action.payload.preferences,
      };
      
      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.UI_PREFERENCES, JSON.stringify(updatedPreferences));
      } catch (error) {
        console.warn('[AppContext] Failed to save preferences:', error);
      }
      
      return {
        ...state,
        ui: updatedPreferences,
      };

    case 'PREFERENCES_RESET':
      // Clear from localStorage
      try {
        localStorage.removeItem(STORAGE_KEYS.UI_PREFERENCES);
      } catch (error) {
        console.warn('[AppContext] Failed to clear preferences:', error);
      }
      
      return {
        ...state,
        ui: DEFAULT_UI_PREFERENCES,
      };

    case 'MODAL_SETTINGS_TOGGLE':
      return {
        ...state,
        modals: {
          ...state.modals,
          settingsOpen: action.payload.open,
        },
      };

    case 'MODAL_CONFIRM_SHOW':
      return {
        ...state,
        modals: {
          ...state.modals,
          confirmDialog: action.payload.config,
        },
      };

    case 'MODAL_CONFIRM_CLOSE':
      return {
        ...state,
        modals: {
          ...state.modals,
          confirmDialog: undefined,
        },
      };

    case 'PERFORMANCE_UPDATE':
      return {
        ...state,
        performance: {
          ...state.performance,
          ...action.payload.metrics,
          lastUpdated: new Date().toISOString(),
        },
      };

    default:
      return state;
  }
}

// Load preferences from localStorage
function loadPersistedPreferences(): UIPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.UI_PREFERENCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_UI_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.warn('[AppContext] Failed to load preferences:', error);
  }
  
  return DEFAULT_UI_PREFERENCES;
}

// Create contexts (split for performance)
const AppStateContext = createContext<AppState | null>(null);
const AppActionsContext = createContext<Omit<AppContextValue, keyof AppState> | null>(null);

/**
 * AppProvider component
 */
interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialAppState, (initial) => ({
    ...initial,
    ui: loadPersistedPreferences(),
  }));

  // Initialize application
  useEffect(() => {
    dispatch({
      type: 'APP_INIT',
      payload: { app: DEFAULT_APPLICATION_INFO },
    });

    // Apply theme to document
    const applyTheme = (theme: UIPreferences['theme']) => {
      const root = document.documentElement;
      
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    };

    applyTheme(state.ui.theme);

    // Listen for system theme changes
    if (state.ui.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state.ui.theme]);

  // Handle notification auto-dismiss
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    state.notifications.forEach(notification => {
      if (notification.timeout && notification.timeout > 0) {
        const timer = setTimeout(() => {
          dispatch({
            type: 'NOTIFICATION_REMOVE',
            payload: { id: notification.id },
          });
        }, notification.timeout);
        
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [state.notifications]);

  // Performance monitoring
  useEffect(() => {
    const measurePerformance = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const memory = (performance as any).memory;

        const metrics: Partial<PerformanceMetrics> = {
          pageLoadTime: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
          networkLatency: navigation?.responseStart - navigation?.requestStart || 0,
        };

        if (memory) {
          metrics.memoryUsage = memory.usedJSHeapSize;
        }

        dispatch({
          type: 'PERFORMANCE_UPDATE',
          payload: { metrics },
        });
      }
    };

    // Measure on mount
    measurePerformance();

    // Measure periodically
    const interval = setInterval(measurePerformance, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // App actions
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    dispatch({
      type: 'NOTIFICATION_ADD',
      payload: { notification: newNotification },
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({
      type: 'NOTIFICATION_REMOVE',
      payload: { id },
    });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'NOTIFICATION_CLEAR' });
  }, []);

  const updatePreferences = useCallback((preferences: Partial<UIPreferences>) => {
    dispatch({
      type: 'PREFERENCES_UPDATE',
      payload: { preferences },
    });
  }, []);

  const resetPreferences = useCallback(() => {
    dispatch({ type: 'PREFERENCES_RESET' });
  }, []);

  const openSettings = useCallback(() => {
    dispatch({
      type: 'MODAL_SETTINGS_TOGGLE',
      payload: { open: true },
    });
  }, []);

  const closeSettings = useCallback(() => {
    dispatch({
      type: 'MODAL_SETTINGS_TOGGLE',
      payload: { open: false },
    });
  }, []);

  const showConfirmDialog = useCallback((config: AppState['modals']['confirmDialog']) => {
    dispatch({
      type: 'MODAL_CONFIRM_SHOW',
      payload: { config },
    });
  }, []);

  const closeConfirmDialog = useCallback(() => {
    dispatch({ type: 'MODAL_CONFIRM_CLOSE' });
  }, []);

  const updatePerformanceMetrics = useCallback((metrics: Partial<PerformanceMetrics>) => {
    dispatch({
      type: 'PERFORMANCE_UPDATE',
      payload: { metrics },
    });
  }, []);

  const clearError = useCallback((errorType: keyof AppState['errors']) => {
    dispatch({
      type: 'APP_ERROR_CLEAR',
      payload: { key: errorType },
    });
  }, []);

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      addNotification,
      removeNotification,
      clearNotifications,
      updatePreferences,
      resetPreferences,
      openSettings,
      closeSettings,
      showConfirmDialog,
      closeConfirmDialog,
      updatePerformanceMetrics,
      clearError,
    }),
    [
      addNotification,
      removeNotification,
      clearNotifications,
      updatePreferences,
      resetPreferences,
      openSettings,
      closeSettings,
      showConfirmDialog,
      closeConfirmDialog,
      updatePerformanceMetrics,
      clearError,
    ]
  );

  return (
    <AppStateContext.Provider value={state}>
      <AppActionsContext.Provider value={actions}>
        {children}
      </AppActionsContext.Provider>
    </AppStateContext.Provider>
  );
}

/**
 * Hook to access app state
 */
export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

/**
 * Hook to access app actions
 */
export function useAppActions(): Omit<AppContextValue, keyof AppState> {
  const context = useContext(AppActionsContext);
  if (!context) {
    throw new Error('useAppActions must be used within an AppProvider');
  }
  return context;
}

/**
 * Hook to access both app state and actions
 */
export function useApp(): AppContextValue {
  const state = useAppState();
  const actions = useAppActions();
  
  return {
    ...state,
    ...actions,
  };
}

/**
 * Convenience hooks for specific functionality
 */
export function useNotifications() {
  const { notifications } = useAppState();
  const { addNotification, removeNotification, clearNotifications } = useAppActions();
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    // Helper methods
    notifySuccess: (title: string, message?: string) => 
      addNotification(createNotification('success', title, message)),
    notifyError: (title: string, message?: string) => 
      addNotification(createNotification('error', title, message)),
    notifyInfo: (title: string, message?: string) => 
      addNotification(createNotification('info', title, message)),
    notifyWarning: (title: string, message?: string) => 
      addNotification(createNotification('warning', title, message)),
  };
}

export function useUIPreferences() {
  const { ui } = useAppState();
  const { updatePreferences, resetPreferences } = useAppActions();
  
  return {
    preferences: ui,
    updatePreferences,
    resetPreferences,
  };
}

export function useModals() {
  const { modals } = useAppState();
  const { openSettings, closeSettings, showConfirmDialog, closeConfirmDialog } = useAppActions();
  
  return {
    modals,
    openSettings,
    closeSettings,
    showConfirmDialog,
    closeConfirmDialog,
  };
}