/**
 * Context providers and hooks for the Vana application
 * 
 * Centralized export of all context providers and their associated hooks.
 * Organized by functionality and optimized for tree-shaking.
 */

// Auth context
export {
  AuthProvider,
  useAuth,
  useAuthState,
  useAuthActions,
} from './AuthContext';

// Session context
export {
  SessionProvider,
  useSession,
  useSessionState,
  useSessionActions,
} from './SessionContext';

// App context (global state)
export {
  AppProvider,
  useApp,
  useAppState,
  useAppActions,
  useNotifications,
  useUIPreferences,
  useModals,
} from './AppContext';

// SSE context (real-time events)
export {
  SSEProvider,
  useSSE,
  useSSEState,
  useSSEActions,
  useSSESubscription,
  useSSESubscriptions,
} from './SSEContext';

// Type exports
export type { User, AuthState, AuthContextValue } from '@/types/auth';
export type { ResearchSession, SessionState, SessionContextValue } from '@/types/session';
export type { AppState, AppContextValue, NotificationItem, UIPreferences } from '@/types/app';
export type { SSEEvent, SSEState, SSEContextValue } from '@/types/sse';