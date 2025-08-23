'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Layout
  sidebarOpen: boolean;
  sidebarWidth: number;
  
  // Chat UI
  chatInputHeight: number;
  showTyping: boolean;
  
  // Modals and overlays
  activeModal: string | null;
  
  // Tool selection
  selectedTools: string[];
  
  // Preferences
  preferences: {
    fontSize: 'sm' | 'base' | 'lg';
    codeTheme: 'dark' | 'light';
    autoSave: boolean;
    notifications: boolean;
  };
}

interface UIStore extends UIState {
  // Theme actions
  setTheme: (theme: UIState['theme']) => void;
  toggleTheme: () => void;
  
  // Layout actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  
  // Chat actions
  setChatInputHeight: (height: number) => void;
  setShowTyping: (show: boolean) => void;
  
  // Modal actions
  openModal: (modalId: string) => void;
  closeModal: () => void;
  
  // Tool actions
  toggleTool: (toolId: string) => void;
  setSelectedTools: (tools: string[]) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<UIState['preferences']>) => void;
  
  // Reset
  reset: () => void;
}

const initialState: UIState = {
  theme: 'dark',
  sidebarOpen: true,
  sidebarWidth: 300,
  chatInputHeight: 100,
  showTyping: false,
  activeModal: null,
  selectedTools: [],
  preferences: {
    fontSize: 'base',
    codeTheme: 'dark',
    autoSave: true,
    notifications: true,
  },
};

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Theme actions
      setTheme: (theme: UIState['theme']) => {
        set({ theme });
        
        // Use SSR-safe utilities for DOM manipulation
        const { safeDOMClassList, safePrefersDark } = require('@/lib/ssr-utils');
        const rootClasses = safeDOMClassList('html');
        
        if (theme === 'dark') {
          rootClasses.add('dark');
        } else if (theme === 'light') {
          rootClasses.remove('dark');
        } else {
          // System theme - use SSR-safe dark mode detection
          const prefersDark = safePrefersDark();
          if (prefersDark) {
            rootClasses.add('dark');
          } else {
            rootClasses.remove('dark');
          }
        }
      },
      
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },
      
      // Layout actions
      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },
      
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },
      
      setSidebarWidth: (width: number) => {
        set({ sidebarWidth: Math.max(200, Math.min(600, width)) });
      },
      
      // Chat actions
      setChatInputHeight: (height: number) => {
        set({ chatInputHeight: Math.max(60, Math.min(300, height)) });
      },
      
      setShowTyping: (show: boolean) => {
        set({ showTyping: show });
      },
      
      // Modal actions
      openModal: (modalId: string) => {
        set({ activeModal: modalId });
      },
      
      closeModal: () => {
        set({ activeModal: null });
      },
      
      // Tool actions
      toggleTool: (toolId: string) => {
        set(state => {
          const isSelected = state.selectedTools.includes(toolId);
          const selectedTools = isSelected
            ? state.selectedTools.filter(id => id !== toolId)
            : [...state.selectedTools, toolId];
          
          return { selectedTools };
        });
      },
      
      setSelectedTools: (tools: string[]) => {
        set({ selectedTools: tools });
      },
      
      // Preferences
      updatePreferences: (preferences: Partial<UIState['preferences']>) => {
        set(state => ({
          preferences: { ...state.preferences, ...preferences }
        }));
      },
      
      // Reset
      reset: () => {
        set({ ...initialState });
      },
    }),
    {
      name: 'vana-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        preferences: state.preferences,
        selectedTools: state.selectedTools,
      }),
    }
  )
);

// Initialize theme on client side using SSR-safe approach
import { getSSREnvironment } from '@/lib/ssr-utils';

const initializeTheme = () => {
  const { isBrowser } = getSSREnvironment();
  
  if (isBrowser) {
    const store = useUIStore.getState();
    store.setTheme(store.theme);
  }
};

// Call initialization
initializeTheme();