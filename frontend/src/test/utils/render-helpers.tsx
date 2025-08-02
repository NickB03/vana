/**
 * Test Render Helpers
 * 
 * Utilities for rendering components with all required contexts and providers
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import RootProvider from '@/contexts/RootProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { SSEProvider } from '@/contexts/SSEContext';
import type { UIPreferences } from '@/types/app';
import type { SSEConfiguration } from '@/types/sse';

// Mock localStorage for consistent testing
export const createMockLocalStorage = () => {
  const storage = new Map<string, string>();
  
  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
    get size() {
      return storage.size;
    },
    key: vi.fn((index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    }),
    length: storage.size,
  };
};

// Mock user data
export const createMockUser = (overrides?: any) => ({
  id: 'user_123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isGuest: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastSignInAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const createMockGuestUser = () => ({
  id: 'guest_123',
  email: null,
  displayName: 'Guest User',
  photoURL: null,
  emailVerified: false,
  isGuest: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastSignInAt: '2024-01-01T00:00:00.000Z',
});

// Mock session data
export const createMockSession = (overrides?: any) => ({
  id: 'session_123',
  userId: 'user_123',
  title: 'Test Research Session',
  config: {
    topic: 'Test Research Topic',
    depth: 'moderate' as const,
    includeCitations: true,
    format: 'report' as const,
  },
  status: 'active' as const,
  messages: [],
  timeline: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// Mock UI preferences
export const createMockUIPreferences = (overrides?: Partial<UIPreferences>): UIPreferences => ({
  theme: 'dark',
  density: 'comfortable',
  animations: true,
  sidebarCollapsed: false,
  language: 'en',
  ...overrides,
});

// Mock SSE configuration
export const createMockSSEConfig = (overrides?: Partial<SSEConfiguration>): SSEConfiguration => ({
  url: 'http://localhost:8081/sse',
  autoReconnect: true,
  maxReconnectAttempts: 3,
  reconnectDelay: 1000,
  withCredentials: false,
  ...overrides,
});

// Render with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: any;
  uiPreferences?: Partial<UIPreferences>;
  sseConfig?: Partial<SSEConfiguration>;
  withoutSSE?: boolean;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    user = createMockUser(),
    uiPreferences = {},
    sseConfig = {},
    withoutSSE = false,
    ...renderOptions
  } = options;

  // Setup localStorage with mock data
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });

  // Set up user data in localStorage
  if (user) {
    mockLocalStorage.setItem('vana_user', JSON.stringify(user));
    if (user.isGuest) {
      mockLocalStorage.setItem('vana_guest_mode', 'true');
    }
  }

  // Set up UI preferences in localStorage
  const fullUIPreferences = createMockUIPreferences(uiPreferences);
  mockLocalStorage.setItem('vana_ui_preferences', JSON.stringify(fullUIPreferences));

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (withoutSSE) {
      return (
        <AppProvider>
          <AuthProvider>
            <SessionProvider>
              {children}
            </SessionProvider>
          </AuthProvider>
        </AppProvider>
      );
    }

    return (
      <AppProvider>
        <AuthProvider>
          <SessionProvider>
            <SSEProvider config={sseConfig}>
              {children}
            </SSEProvider>
          </AuthProvider>
        </AppProvider>
      );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Render with authenticated user
export const renderWithAuthenticatedUser = (
  ui: React.ReactElement,
  userOverrides?: any,
  options?: Omit<CustomRenderOptions, 'user'>
) => {
  const user = createMockUser(userOverrides);
  return renderWithProviders(ui, { user, ...options });
};

// Render with guest user
export const renderWithGuestUser = (
  ui: React.ReactElement,
  options?: Omit<CustomRenderOptions, 'user'>
) => {
  const user = createMockGuestUser();
  return renderWithProviders(ui, { user, ...options });
};

// Render with session
export const renderWithSession = (
  ui: React.ReactElement,
  sessionOverrides?: any,
  options?: CustomRenderOptions
) => {
  const session = createMockSession(sessionOverrides);
  const user = createMockUser({ id: session.userId });
  
  // We'll need to mock the session context to provide the session
  // This is a simplified version - in practice, you might need more complex mocking
  return renderWithProviders(ui, { user, ...options });
};

// Render with RootProvider (complete setup)
export const renderWithRootProvider = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    user = createMockUser(),
    uiPreferences = {},
    ...renderOptions
  } = options;

  // Setup localStorage
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });

  if (user) {
    mockLocalStorage.setItem('vana_user', JSON.stringify(user));
    if (user.isGuest) {
      mockLocalStorage.setItem('vana_guest_mode', 'true');
    }
  }

  const fullUIPreferences = createMockUIPreferences(uiPreferences);
  mockLocalStorage.setItem('vana_ui_preferences', JSON.stringify(fullUIPreferences));

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <RootProvider>
      {children}
    </RootProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';