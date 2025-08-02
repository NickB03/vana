/**
 * AuthContext tests
 * 
 * Basic tests to ensure AuthContext is working correctly with proper state management
 * and context splitting for performance optimization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, useAuthState, useAuthActions } from '../AuthContext';
import React from 'react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component to access auth context
function TestAuthComponent() {
  const { user, isLoading, signIn, signOut, enterGuestMode } = useAuth();
  
  return (
    <div>
      <div data-testid="user-status">
        {isLoading ? 'Loading...' : user ? `Logged in as ${user.email || 'Guest'}` : 'Not logged in'}
      </div>
      <div data-testid="user-type">
        {user?.isGuest ? 'Guest' : 'Authenticated'}
      </div>
      <button 
        data-testid="sign-in-btn" 
        onClick={() => signIn({ email: 'test@example.com', password: 'password' })}
      >
        Sign In
      </button>
      <button data-testid="sign-out-btn" onClick={signOut}>
        Sign Out
      </button>
      <button data-testid="guest-mode-btn" onClick={enterGuestMode}>
        Enter Guest Mode
      </button>
    </div>
  );
}

// Test component to check context splitting
function TestAuthSplitContext() {
  const state = useAuthState();
  const actions = useAuthActions();
  
  return (
    <div>
      <div data-testid="split-user">
        {state.user ? state.user.email || 'Guest User' : 'No user'}
      </div>
      <button 
        data-testid="split-sign-in" 
        onClick={() => actions.signIn({ email: 'split@example.com', password: 'password' })}
      >
        Split Sign In
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should provide initial auth state', async () => {
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Initially shows loading state
    expect(screen.getByTestId('user-status')).toHaveTextContent('Loading...');

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
      expect(screen.getByTestId('user-type')).toHaveTextContent('Authenticated');
    });
  });

  it('should handle guest mode', async () => {
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('guest-mode-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Guest');
      expect(screen.getByTestId('user-type')).toHaveTextContent('Guest');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('vana_guest_mode', 'true');
  });

  it('should handle sign in', async () => {
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for initial auth state to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    fireEvent.click(screen.getByTestId('sign-in-btn'));

    // Should show loading state briefly
    expect(screen.getByTestId('user-status')).toHaveTextContent('Loading...');

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
      expect(screen.getByTestId('user-type')).toHaveTextContent('Authenticated');
    }, { timeout: 2000 });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'vana_user',
      expect.stringContaining('test@example.com')
    );
  });

  it('should handle sign out', async () => {
    // First sign in
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for initial state
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    fireEvent.click(screen.getByTestId('sign-in-btn'));
    
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
    }, { timeout: 2000 });

    // Then sign out
    fireEvent.click(screen.getByTestId('sign-out-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('vana_user');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('vana_guest_mode');
  });

  it('should support context splitting for performance', async () => {
    render(
      <AuthProvider>
        <TestAuthSplitContext />
      </AuthProvider>
    );

    // Wait for initial state
    await waitFor(() => {
      expect(screen.getByTestId('split-user')).toHaveTextContent('No user');
    });

    fireEvent.click(screen.getByTestId('split-sign-in'));

    await waitFor(() => {
      expect(screen.getByTestId('split-user')).toHaveTextContent('split@example.com');
    }, { timeout: 2000 });
  });

  it('should restore user from localStorage on initialization', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'saved@example.com',
      displayName: 'Saved User',
      photoURL: null,
      emailVerified: true,
      isGuest: false,
      createdAt: '2023-01-01T00:00:00.000Z',
      lastSignInAt: '2023-01-01T00:00:00.000Z',
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vana_user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should eventually show the restored user
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as saved@example.com');
    });
  });

  it('should restore guest mode from localStorage', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vana_guest_mode') return 'true';
      return null;
    });

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Guest');
      expect(screen.getByTestId('user-type')).toHaveTextContent('Guest');
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestAuthComponent />);
    }).toThrow('useAuthState must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });
});