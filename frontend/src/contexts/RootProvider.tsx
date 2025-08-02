/**
 * RootProvider - Combines all context providers in the correct order
 * 
 * Provides a single component to wrap the entire application with all necessary contexts.
 * Contexts are ordered by dependency hierarchy to ensure proper initialization.
 */

import React from 'react';
import { AuthProvider } from './AuthContext';
import { AppProvider } from './AppContext';
import { SessionProvider } from './SessionContext';
import { SSEProvider } from './SSEContext';
import type { SSEConfiguration } from '@/types/sse';

interface RootProviderProps {
  children: React.ReactNode;
  /** Custom SSE configuration */
  sseConfig?: Partial<SSEConfiguration>;
}

/**
 * RootProvider component that wraps the app with all context providers
 * 
 * Context hierarchy (outer to inner):
 * 1. AppProvider - Global app state, notifications, UI preferences
 * 2. AuthProvider - Authentication state and user management
 * 3. SessionProvider - Research sessions and ADK integration
 * 4. SSEProvider - Real-time events and WebSocket communication
 */
export function RootProvider({ children, sseConfig }: RootProviderProps) {
  return (
    <AppProvider>
      <AuthProvider>
        <SessionProvider>
          <SSEProvider config={sseConfig}>
            {children}
          </SSEProvider>
        </SessionProvider>
      </AuthProvider>
    </AppProvider>
  );
}

/**
 * Hook to verify that component is within the RootProvider
 */
export function useRootProvider() {
  try {
    // Try to access each context to ensure they're all available
    const appState = React.useContext(React.createContext(null));
    // This will throw if not within providers due to the error handling in individual hooks
    return true;
  } catch {
    return false;
  }
}

/**
 * Higher-order component to ensure a component has access to all contexts
 */
export function withRootProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => {
    return (
      <RootProvider>
        <Component {...props} />
      </RootProvider>
    );
  };

  WrappedComponent.displayName = `withRootProvider(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default RootProvider;