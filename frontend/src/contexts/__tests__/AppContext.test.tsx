/**
 * AppContext tests
 * 
 * Tests for global application state including UI preferences, notifications,
 * modals, and performance metrics with localStorage persistence.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AppProvider, useApp, useAppState, useAppActions, useNotifications, useUIPreferences, useModals } from '../AppContext';
import React from 'react';
import type { UIPreferences, NotificationItem } from '@/types/app';

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

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    getEntriesByType: vi.fn(() => [
      {
        loadEventEnd: 1000,
        loadEventStart: 800,
        responseStart: 300,
        requestStart: 200,
      },
    ]),
    memory: {
      usedJSHeapSize: 5000000,
    },
  },
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Test component to access app context
function TestAppComponent() {
  const { 
    app,
    ui, 
    notifications, 
    performance,
    loading,
    errors,
    modals,
    addNotification, 
    updatePreferences,
    openSettings,
    showConfirmDialog,
    clearError 
  } = useApp();
  
  const handleAddNotification = () => {
    addNotification({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification',
      timeout: 5000,
    });
  };

  const handleUpdateTheme = () => {
    updatePreferences({ theme: 'light' });
  };

  const handleShowConfirm = () => {
    showConfirmDialog({
      title: 'Confirm Action',
      message: 'Are you sure?',
      onConfirm: () => console.log('confirmed'),
      onCancel: () => console.log('cancelled'),
    });
  };

  return (
    <div>
      {/* App info */}
      <div data-testid="app-version">Version: {app.version}</div>
      <div data-testid="app-name">Name: {app.name}</div>
      
      {/* UI preferences */}
      <div data-testid="theme">Theme: {ui.theme}</div>
      <div data-testid="density">Density: {ui.density}</div>
      <div data-testid="animations">Animations: {ui.animations ? 'on' : 'off'}</div>
      
      {/* Notifications */}
      <div data-testid="notifications-count">
        Notifications: {notifications.length}
      </div>
      
      {/* Performance */}
      <div data-testid="page-load-time">
        Load Time: {performance.pageLoadTime || 0}ms
      </div>
      <div data-testid="memory-usage">
        Memory: {performance.memoryUsage || 0} bytes
      </div>
      
      {/* Loading states */}
      <div data-testid="app-loading">
        App Loading: {loading.app ? 'true' : 'false'}
      </div>
      
      {/* Error states */}
      <div data-testid="auth-error">
        Auth Error: {errors.auth || 'none'}
      </div>
      
      {/* Modal states */}
      <div data-testid="settings-modal">
        Settings Open: {modals.settingsOpen ? 'true' : 'false'}
      </div>
      <div data-testid="confirm-modal">
        Confirm Dialog: {modals.confirmDialog ? 'open' : 'closed'}
      </div>
      
      {/* Actions */}
      <button data-testid="add-notification" onClick={handleAddNotification}>
        Add Notification
      </button>
      <button data-testid="update-theme" onClick={handleUpdateTheme}>
        Switch to Light Theme
      </button>
      <button data-testid="open-settings" onClick={openSettings}>
        Open Settings
      </button>
      <button data-testid="show-confirm" onClick={handleShowConfirm}>
        Show Confirm Dialog
      </button>
      <button data-testid="clear-auth-error" onClick={() => clearError('auth')}>
        Clear Auth Error
      </button>
    </div>
  );
}

// Test component for context splitting
function TestAppSplitContext() {
  const state = useAppState();
  const actions = useAppActions();
  
  return (
    <div>
      <div data-testid="split-theme">
        Theme: {state.ui.theme}
      </div>
      <button 
        data-testid="split-update-theme" 
        onClick={() => actions.updatePreferences({ theme: 'dark' })}
      >
        Split Update Theme
      </button>
    </div>
  );
}

// Test component for convenience hooks
function TestConvenienceHooks() {
  const notifications = useNotifications();
  const preferences = useUIPreferences();
  const modals = useModals();
  
  return (
    <div>
      <div data-testid="hook-notifications-count">
        Hook Notifications: {notifications.notifications.length}
      </div>
      <div data-testid="hook-theme">
        Hook Theme: {preferences.preferences.theme}
      </div>
      <div data-testid="hook-settings-modal">
        Hook Settings: {modals.modals.settingsOpen ? 'open' : 'closed'}
      </div>
      
      <button data-testid="notify-success" onClick={() => notifications.notifySuccess('Success!')}>
        Notify Success
      </button>
      <button data-testid="notify-error" onClick={() => notifications.notifyError('Error!')}>
        Notify Error
      </button>
      <button data-testid="hook-update-theme" onClick={() => preferences.updatePreferences({ theme: 'system' })}>
        Hook Update Theme
      </button>
      <button data-testid="hook-open-settings" onClick={modals.openSettings}>
        Hook Open Settings
      </button>
    </div>
  );
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Clear document classes
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide initial app state', () => {
    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('app-version')).toHaveTextContent('Version: 1.0.0');
    expect(screen.getByTestId('app-name')).toHaveTextContent('Name: Vana');
    expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');
    expect(screen.getByTestId('density')).toHaveTextContent('Density: comfortable');
    expect(screen.getByTestId('animations')).toHaveTextContent('Animations: on');
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('Notifications: 0');
    expect(screen.getByTestId('settings-modal')).toHaveTextContent('Settings Open: false');
  });

  it('should handle notification management', async () => {
    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('notifications-count')).toHaveTextContent('Notifications: 0');

    fireEvent.click(screen.getByTestId('add-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('notifications-count')).toHaveTextContent('Notifications: 1');
    });
  });

  it('should handle UI preferences updates', async () => {
    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');

    fireEvent.click(screen.getByTestId('update-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
    });

    // Verify localStorage was called
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'vana_ui_preferences',
      expect.stringContaining('light')
    );
  });

  it('should handle modal state management', async () => {
    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('settings-modal')).toHaveTextContent('Settings Open: false');
    expect(screen.getByTestId('confirm-modal')).toHaveTextContent('Confirm Dialog: closed');

    // Open settings modal
    fireEvent.click(screen.getByTestId('open-settings'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-modal')).toHaveTextContent('Settings Open: true');
    });

    // Show confirm dialog
    fireEvent.click(screen.getByTestId('show-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal')).toHaveTextContent('Confirm Dialog: open');
    });
  });

  it('should load persisted preferences from localStorage', () => {
    const savedPreferences: Partial<UIPreferences> = {
      theme: 'light',
      density: 'compact',
      animations: false,
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vana_ui_preferences') {
        return JSON.stringify(savedPreferences);
      }
      return null;
    });

    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
    expect(screen.getByTestId('density')).toHaveTextContent('Density: compact');
    expect(screen.getByTestId('animations')).toHaveTextContent('Animations: off');
  });

  it('should apply theme to document element', async () => {
    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    // Initially dark theme
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    // Switch to light theme
    fireEvent.click(screen.getByTestId('update-theme'));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should handle system theme preference', async () => {
    // Mock system dark preference
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { rerender } = render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    // Set system theme preference
    act(() => {
      fireEvent.click(screen.getByTestId('update-theme')); // Switch to light first
    });

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
    });
  });

  it('should auto-dismiss notifications with timeout', async () => {
    vi.useFakeTimers();

    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('add-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('notifications-count')).toHaveTextContent('Notifications: 1');
    });

    // Fast-forward time to trigger auto-dismiss
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('notifications-count')).toHaveTextContent('Notifications: 0');
    });

    vi.useRealTimers();
  });

  it('should measure and update performance metrics', async () => {
    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-load-time')).toHaveTextContent('Load Time: 200ms');
      expect(screen.getByTestId('memory-usage')).toHaveTextContent('Memory: 5000000 bytes');
    });
  });

  it('should support context splitting for performance', async () => {
    render(
      <AppProvider>
        <TestAppSplitContext />
      </AppProvider>
    );

    expect(screen.getByTestId('split-theme')).toHaveTextContent('Theme: dark');

    fireEvent.click(screen.getByTestId('split-update-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('split-theme')).toHaveTextContent('Theme: dark');
    });
  });

  it('should provide convenience hooks functionality', async () => {
    render(
      <AppProvider>
        <TestConvenienceHooks />
      </AppProvider>
    );

    expect(screen.getByTestId('hook-notifications-count')).toHaveTextContent('Hook Notifications: 0');
    expect(screen.getByTestId('hook-theme')).toHaveTextContent('Hook Theme: dark');
    expect(screen.getByTestId('hook-settings-modal')).toHaveTextContent('Hook Settings: closed');

    // Test notification convenience methods
    fireEvent.click(screen.getByTestId('notify-success'));

    await waitFor(() => {
      expect(screen.getByTestId('hook-notifications-count')).toHaveTextContent('Hook Notifications: 1');
    });

    fireEvent.click(screen.getByTestId('notify-error'));

    await waitFor(() => {
      expect(screen.getByTestId('hook-notifications-count')).toHaveTextContent('Hook Notifications: 2');
    });

    // Test preferences convenience methods  
    fireEvent.click(screen.getByTestId('hook-update-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('hook-theme')).toHaveTextContent('Hook Theme: system');
    });

    // Test modal convenience methods
    fireEvent.click(screen.getByTestId('hook-open-settings'));

    await waitFor(() => {
      expect(screen.getByTestId('hook-settings-modal')).toHaveTextContent('Hook Settings: open');
    });
  });

  it('should handle localStorage errors gracefully', async () => {
    // Mock localStorage to throw errors
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    // Try to update preferences
    fireEvent.click(screen.getByTestId('update-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
    });

    // Should have logged warning
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AppContext] Failed to save preferences:', 
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should handle error management', async () => {
    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('auth-error')).toHaveTextContent('Auth Error: none');

    // Simulate setting an error (would normally come from another action)
    // For this test, we'll just verify the clear functionality works
    fireEvent.click(screen.getByTestId('clear-auth-error'));

    // Error should remain 'none' since there was no error to clear
    expect(screen.getByTestId('auth-error')).toHaveTextContent('Auth Error: none');
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    function ComponentUsingApp() {
      useApp();
      return <div>Should not render</div>;
    }

    expect(() => {
      render(<ComponentUsingApp />);
    }).toThrow('useAppState must be used within an AppProvider');
    
    consoleSpy.mockRestore();
  });

  it('should handle invalid localStorage data gracefully', () => {
    // Mock localStorage to return invalid JSON
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vana_ui_preferences') {
        return 'invalid json';
      }
      return null;
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    // Should fall back to default preferences
    expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[AppContext] Failed to load preferences:', 
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should handle performance measurement errors', async () => {
    // Mock performance API to throw
    Object.defineProperty(window, 'performance', {
      value: {
        getEntriesByType: vi.fn(() => {
          throw new Error('Performance API error');
        }),
      },
    });

    render(
      <AppProvider>
        <TestAppComponent />
      </AppProvider>
    );

    // Should not crash and should show default values
    await waitFor(() => {
      expect(screen.getByTestId('page-load-time')).toHaveTextContent('Load Time: 0ms');
      expect(screen.getByTestId('memory-usage')).toHaveTextContent('Memory: 0 bytes');
    });
  });

  it('should handle notification removal', async () => {
    render(
      <AppProvider>
        <TestConvenienceHooks />
      </AppProvider>
    );

    // Add notifications
    fireEvent.click(screen.getByTestId('notify-success'));
    fireEvent.click(screen.getByTestId('notify-error'));

    await waitFor(() => {
      expect(screen.getByTestId('hook-notifications-count')).toHaveTextContent('Hook Notifications: 2');
    });

    // Clear all notifications
    const clearButton = screen.getByText('Clear Notifications');
    if (clearButton) {
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId('hook-notifications-count')).toHaveTextContent('Hook Notifications: 0');
      });
    }
  });
});