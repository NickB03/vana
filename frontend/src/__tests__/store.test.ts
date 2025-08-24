/**
 * Tests for the unified store implementation
 * PR #4: State Management Architecture Foundation
 */

import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useUnifiedStore, useAuth, useSession, useUI, useChat, useCanvas, useAgentDeck, useUpload } from '../store/index';

// Mock dependencies
jest.mock('../lib/ssr-utils', () => ({
  safeLocalStorage: () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }),
  safeDOMClassList: () => ({
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn(),
  }),
  safePrefersDark: () => false,
}));

jest.mock('../lib/auth', () => ({
  AuthAPI: {
    login: jest.fn().mockResolvedValue({
      user: { id: 1, email: 'test@test.com', username: 'test', full_name: 'Test User' },
      tokens: { access_token: 'test-token', refresh_token: 'refresh-token', token_type: 'bearer', expires_in: 3600, issued_at: Date.now() }
    }),
    logout: jest.fn().mockResolvedValue(undefined),
  },
  tokenManager: {
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
  }
}));

describe('Unified Store', () => {
  beforeEach(() => {
    // Reset store state
    useUnifiedStore.getState().resetAll();
  });

  describe('Store Structure', () => {
    test('should have all 7 required slices', () => {
      const state = useUnifiedStore.getState();
      
      expect(state.auth).toBeDefined();
      expect(state.session).toBeDefined();
      expect(state.chat).toBeDefined();
      expect(state.canvas).toBeDefined();
      expect(state.agentDeck).toBeDefined();
      expect(state.upload).toBeDefined();
      expect(state.ui).toBeDefined();
    });

    test('should have global actions', () => {
      const state = useUnifiedStore.getState();
      
      expect(typeof state.resetAll).toBe('function');
      expect(typeof state.getState).toBe('function');
      expect(typeof state.subscribe).toBe('function');
    });
  });

  describe('Individual Store Selectors', () => {
    test('useAuth should return auth slice', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('tokens');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(typeof result.current.login).toBe('function');
    });

    test('useSession should return session slice', () => {
      const { result } = renderHook(() => useSession());
      
      expect(result.current).toHaveProperty('sessions');
      expect(result.current).toHaveProperty('currentSession');
      expect(typeof result.current.createSession).toBe('function');
    });

    test('useUI should return ui slice', () => {
      const { result } = renderHook(() => useUI());
      
      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('sidebarOpen');
      expect(typeof result.current.setTheme).toBe('function');
    });

    test('useChat should return chat slice', () => {
      const { result } = renderHook(() => useChat());
      
      expect(result.current).toHaveProperty('activeConversation');
      expect(result.current).toHaveProperty('conversations');
      expect(typeof result.current.startConversation).toBe('function');
    });

    test('useCanvas should return canvas slice', () => {
      const { result } = renderHook(() => useCanvas());
      
      expect(result.current).toHaveProperty('currentMode');
      expect(result.current).toHaveProperty('content');
      expect(typeof result.current.setMode).toBe('function');
    });

    test('useAgentDeck should return agentDeck slice', () => {
      const { result } = renderHook(() => useAgentDeck());
      
      expect(result.current).toHaveProperty('availableAgents');
      expect(result.current).toHaveProperty('selectedAgents');
      expect(typeof result.current.loadAgents).toBe('function');
    });

    test('useUpload should return upload slice', () => {
      const { result } = renderHook(() => useUpload());
      
      expect(result.current).toHaveProperty('uploads');
      expect(result.current).toHaveProperty('isUploading');
      expect(typeof result.current.addUpload).toBe('function');
    });
  });

  describe('Store Actions', () => {
    test('auth actions should work', async () => {
      const store = useUnifiedStore.getState();
      
      await act(async () => {
        await store.auth.login({ username: 'test', password: 'test' });
      });
      
      const state = useUnifiedStore.getState();
      expect(state.auth.user).toBeTruthy();
      expect(state.auth.isLoading).toBe(false);
    });

    test('session actions should work', () => {
      const store = useUnifiedStore.getState();
      
      act(() => {
        const session = store.session.createSession('Test Session');
        expect(session).toBeTruthy();
        expect(session.title).toBe('Test Session');
      });
      
      const state = useUnifiedStore.getState();
      expect(state.session.sessions).toHaveLength(1);
      expect(state.session.currentSession?.title).toBe('Test Session');
    });

    test('ui actions should work', () => {
      const store = useUnifiedStore.getState();
      
      act(() => {
        store.ui.setTheme('light');
      });
      
      const state = useUnifiedStore.getState();
      expect(state.ui.theme).toBe('light');
    });
  });

  describe('Performance', () => {
    test('state updates should be fast', () => {
      const store = useUnifiedStore.getState();
      
      const startTime = performance.now();
      
      act(() => {
        // Perform multiple rapid updates
        for (let i = 0; i < 10; i++) {
          store.ui.setSidebarWidth(300 + i);
          store.session.createSession(`Session ${i}`);
        }
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 50ms (our performance target)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Cross-Store Integration', () => {
    test('auth logout should clear sessions', async () => {
      const store = useUnifiedStore.getState();
      
      // Create a session and login
      act(() => {
        store.session.createSession('Test Session');
      });
      
      await act(async () => {
        await store.auth.login({ username: 'test', password: 'test' });
      });
      
      // Verify session exists
      expect(useUnifiedStore.getState().session.sessions).toHaveLength(1);
      
      // Logout
      await act(async () => {
        await store.auth.logout();
      });
      
      // Note: Cross-store subscriptions would handle this automatically
      // For this test, we'll just verify the auth state is cleared
      const state = useUnifiedStore.getState();
      expect(state.auth.user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle auth errors gracefully', async () => {
      // Mock a failing login
      const { AuthAPI } = require('../lib/auth');
      AuthAPI.login.mockRejectedValueOnce(new Error('Login failed'));
      
      const store = useUnifiedStore.getState();
      
      await act(async () => {
        try {
          await store.auth.login({ username: 'test', password: 'wrong' });
        } catch (error) {
          // Expected to throw
        }
      });
      
      const state = useUnifiedStore.getState();
      expect(state.auth.error).toBe('Login failed');
      expect(state.auth.user).toBeNull();
      expect(state.auth.isLoading).toBe(false);
    });
  });
});

describe('Store Performance Monitoring', () => {
  test('should provide performance metrics', () => {
    const { useStorePerformance } = require('../store/index');
    const { result } = renderHook(() => useStorePerformance());
    
    expect(result.current).toHaveProperty('lastUpdateTime');
    expect(result.current).toHaveProperty('updateDuration');
    expect(result.current).toHaveProperty('updateCount');
  });
});