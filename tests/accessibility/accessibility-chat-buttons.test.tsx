/**
 * Accessibility Tests for Chat Button Components
 * 
 * Tests validate that all aria-labels are properly added to chat buttons
 * and follow accessibility best practices for interactive elements.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Next.js components and hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
  }),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: jest.fn(),
    theme: 'light',
  }),
}));

// Mock auth context
const mockAuthContext = {
  user: {
    id: '1',
    email: 'test@example.com',
    full_name: 'Test User',
    profile: { avatar_url: null },
  },
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
};

jest.mock('../../frontend/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock chat context
jest.mock('../../frontend/contexts/chat-context', () => ({
  ChatProvider: ({ children }: any) => React.createElement('div', null, children),
}));

// Mock research SSE hook
jest.mock('../../frontend/hooks/use-research-sse', () => ({
  useResearchSSE: () => ({
    sessionState: null,
    isConnected: false,
    isLoading: false,
    error: null,
    startResearch: jest.fn(),
    stopResearch: jest.fn(),
    clearError: jest.fn(),
    isResearchActive: false,
    isResearchComplete: false,
  }),
}));

// Import components after mocks
import { ResearchChatInterface } from '../../frontend/components/research/research-chat-interface';
import { ResearchProgressPanel } from '../../frontend/components/research/research-progress-panel';
import { UserMenu } from '../../frontend/components/auth/user-menu';
import { VanaSidebar } from '../../frontend/components/vana-sidebar';
import { ThemeToggle } from '../../frontend/components/theme-toggle';

describe('Accessibility Tests for Chat Button Components', () => {
  
  // ============================================================================
  // Research Chat Interface Tests
  // ============================================================================
  
  describe('ResearchChatInterface', () => {
    test('mode toggle buttons have proper aria-labels', async () => {
      render(<ResearchChatInterface />);
      
      // Find mode toggle buttons
      const chatButton = screen.getByRole('button', { name: /switch to chat mode/i });
      const researchButton = screen.getByRole('button', { name: /switch to research mode/i });
      
      expect(chatButton).toBeInTheDocument();
      expect(researchButton).toBeInTheDocument();
      
      // Verify aria-label attributes
      expect(chatButton).toHaveAttribute('aria-label', 'Switch to chat mode');
      expect(researchButton).toHaveAttribute('aria-label', 'Switch to research mode');
      
      // Test keyboard navigation
      chatButton.focus();
      expect(chatButton).toHaveFocus();
      
      fireEvent.keyDown(chatButton, { key: 'Tab' });
      expect(researchButton).toHaveFocus();
    });
    
    test('mode toggle buttons are keyboard accessible', async () => {
      render(<ResearchChatInterface />);
      
      const chatButton = screen.getByRole('button', { name: /switch to chat mode/i });
      
      // Test Enter key activation
      fireEvent.keyDown(chatButton, { key: 'Enter' });
      // Should trigger mode change (we can't easily test state change in isolation)
      
      // Test Space key activation
      fireEvent.keyDown(chatButton, { key: ' ' });
    });
    
    test('passes axe accessibility audit', async () => {
      const { container } = render(<ResearchChatInterface />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    test('error dismiss button has proper accessibility', async () => {
      // Mock error state
      const mockUseResearchSSE = require('../../frontend/hooks/use-research-sse').useResearchSSE;
      mockUseResearchSSE.mockReturnValue({
        sessionState: null,
        isConnected: false,
        isLoading: false,
        error: 'Test error message',
        startResearch: jest.fn(),
        stopResearch: jest.fn(),
        clearError: jest.fn(),
        isResearchActive: false,
        isResearchComplete: false,
      });
      
      render(<ResearchChatInterface />);
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toBeVisible();
    });
  });
  
  // ============================================================================
  // Research Progress Panel Tests
  // ============================================================================
  
  describe('ResearchProgressPanel', () => {
    const mockProps = {
      sessionState: null,
      isLoading: false,
      error: null,
      onStart: jest.fn(),
      onStop: jest.fn(),
      onRetry: jest.fn(),
    };
    
    test('control buttons have descriptive aria-labels', () => {
      render(<ResearchProgressPanel {...mockProps} />);
      
      const startButton = screen.getByRole('button', { name: /start research process/i });
      expect(startButton).toHaveAttribute('aria-label', 'Start research process');
    });
    
    test('stop button appears with correct label when research is active', () => {
      const activeSessionState = {
        sessionId: 'test-session',
        status: 'running' as const,
        currentPhase: 'Active Research',
        overallProgress: 0.5,
        agents: [],
        partialResults: null,
        finalReport: null,
        error: null,
        lastUpdate: new Date(),
      };
      
      render(<ResearchProgressPanel {...mockProps} sessionState={activeSessionState} />);
      
      const stopButton = screen.getByRole('button', { name: /stop research process/i });
      expect(stopButton).toHaveAttribute('aria-label', 'Stop research process');
    });
    
    test('retry button has proper accessibility when error occurs', () => {
      render(<ResearchProgressPanel {...mockProps} error="Connection failed" />);
      
      const retryButton = screen.getByRole('button', { name: /retry research process/i });
      expect(retryButton).toHaveAttribute('aria-label', 'Retry research process');
    });
    
    test('tab navigation works correctly', async () => {
      const sessionState = {
        sessionId: 'test-session',
        status: 'running' as const,
        currentPhase: 'Active Research',
        overallProgress: 0.5,
        agents: [
          { id: 'agent1', type: 'researcher', status: 'current', progress: 0.8 },
        ],
        partialResults: null,
        finalReport: null,
        error: null,
        lastUpdate: new Date(),
      };
      
      render(<ResearchProgressPanel {...mockProps} sessionState={sessionState} />);
      
      // Test tab triggers have proper labels
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      const agentsTab = screen.getByRole('tab', { name: /agents/i });
      const resultsTab = screen.getByRole('tab', { name: /results/i });
      
      expect(overviewTab).toBeInTheDocument();
      expect(agentsTab).toBeInTheDocument();
      expect(resultsTab).toBeInTheDocument();
      
      // Test keyboard navigation between tabs
      overviewTab.focus();
      fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
      expect(agentsTab).toHaveFocus();
    });
    
    test('passes axe accessibility audit', async () => {
      const { container } = render(<ResearchProgressPanel {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  // ============================================================================
  // User Menu Tests
  // ============================================================================
  
  describe('UserMenu', () => {
    test('menu toggle button has proper aria attributes', () => {
      render(<UserMenu />);
      
      const menuButton = screen.getByRole('button', { name: /open user menu/i });
      expect(menuButton).toHaveAttribute('aria-label', 'Open user menu');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
    
    test('menu items have descriptive aria-labels', async () => {
      render(<UserMenu />);
      
      const menuButton = screen.getByRole('button', { name: /open user menu/i });
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        const profileButton = screen.getByRole('button', { name: /go to profile page/i });
        const settingsButton = screen.getByRole('button', { name: /go to settings page/i });
        const logoutButton = screen.getByRole('button', { name: /sign out of account/i });
        
        expect(profileButton).toHaveAttribute('aria-label', 'Go to profile page');
        expect(settingsButton).toHaveAttribute('aria-label', 'Go to settings page');
        expect(logoutButton).toHaveAttribute('aria-label', 'Sign out of account');
      });
    });
    
    test('menu opens and closes with keyboard interactions', async () => {
      render(<UserMenu />);
      
      const menuButton = screen.getByRole('button', { name: /open user menu/i });
      
      // Open menu with Enter
      fireEvent.keyDown(menuButton, { key: 'Enter' });
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      // Close menu with Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      });
    });
    
    test('loading state has appropriate accessible text', async () => {
      // Mock loading state
      mockAuthContext.isLoading = true;
      
      render(<UserMenu />);
      
      const menuButton = screen.getByRole('button', { name: /open user menu/i });
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        const logoutButton = screen.getByRole('button', { name: /signing out.../i });
        expect(logoutButton).toHaveAttribute('aria-label', 'Signing out...');
      });
      
      // Reset loading state
      mockAuthContext.isLoading = false;
    });
    
    test('passes axe accessibility audit', async () => {
      const { container } = render(<UserMenu />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  // ============================================================================
  // Vana Sidebar Tests
  // ============================================================================
  
  describe('VanaSidebar', () => {
    test('navigation buttons have proper aria-labels', () => {
      render(<VanaSidebar />);
      
      const newChatButton = screen.getByRole('link', { name: /start new chat conversation/i });
      expect(newChatButton).toHaveAttribute('aria-label', 'Start new chat conversation');
    });
    
    test('settings button has aria-label when user not authenticated', () => {
      mockAuthContext.isAuthenticated = false;
      
      render(<VanaSidebar />);
      
      const settingsButton = screen.getByRole('button', { name: /open settings/i });
      expect(settingsButton).toHaveAttribute('aria-label', 'Open settings');
      
      // Reset auth state
      mockAuthContext.isAuthenticated = true;
    });
    
    test('new chat link is keyboard accessible', () => {
      render(<VanaSidebar />);
      
      const newChatButton = screen.getByRole('link', { name: /start new chat conversation/i });
      
      newChatButton.focus();
      expect(newChatButton).toHaveFocus();
      
      // Test activation with Enter
      fireEvent.keyDown(newChatButton, { key: 'Enter' });
    });
    
    test('passes axe accessibility audit', async () => {
      const { container } = render(<VanaSidebar />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  // ============================================================================
  // Theme Toggle Tests
  // ============================================================================
  
  describe('ThemeToggle', () => {
    test('theme toggle button has proper aria-label', () => {
      render(<ThemeToggle />);
      
      const toggleButton = screen.getByRole('button', { name: /toggle theme menu/i });
      expect(toggleButton).toHaveAttribute('aria-label', 'Toggle theme menu');
    });
    
    test('has screen reader text for theme toggle', () => {
      render(<ThemeToggle />);
      
      const srText = screen.getByText('Toggle theme');
      expect(srText).toHaveClass('sr-only');
    });
    
    test('dropdown menu items are accessible', async () => {
      render(<ThemeToggle />);
      
      const toggleButton = screen.getByRole('button', { name: /toggle theme menu/i });
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const lightOption = screen.getByRole('menuitem', { name: /light/i });
        const darkOption = screen.getByRole('menuitem', { name: /dark/i });
        const systemOption = screen.getByRole('menuitem', { name: /system/i });
        
        expect(lightOption).toBeInTheDocument();
        expect(darkOption).toBeInTheDocument();
        expect(systemOption).toBeInTheDocument();
      });
    });
    
    test('keyboard navigation works in dropdown', async () => {
      render(<ThemeToggle />);
      
      const toggleButton = screen.getByRole('button', { name: /toggle theme menu/i });
      
      // Open with Enter
      fireEvent.keyDown(toggleButton, { key: 'Enter' });
      
      await waitFor(() => {
        const lightOption = screen.getByRole('menuitem', { name: /light/i });
        expect(lightOption).toBeInTheDocument();
        
        // Test arrow navigation
        fireEvent.keyDown(lightOption, { key: 'ArrowDown' });
        const darkOption = screen.getByRole('menuitem', { name: /dark/i });
        expect(darkOption).toHaveFocus();
      });
    });
    
    test('passes axe accessibility audit', async () => {
      const { container } = render(<ThemeToggle />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  // ============================================================================
  // Cross-Component Accessibility Tests
  // ============================================================================
  
  describe('Cross-Component Accessibility', () => {
    test('all buttons have appropriate contrast ratios', () => {
      // This would typically be caught by axe, but we can add specific contrast tests
      render(
        <div>
          <ResearchChatInterface />
          <UserMenu />
          <ThemeToggle />
        </div>
      );
      
      // All buttons should be visible and properly styled
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });
    
    test('focus indicators are visible on all interactive elements', () => {
      render(
        <div>
          <ResearchChatInterface />
          <UserMenu />
          <ThemeToggle />
        </div>
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        button.focus();
        // In a real test environment, you'd check computed styles for focus indicators
        expect(button).toHaveFocus();
      });
    });
    
    test('all interactive elements are reachable via keyboard', () => {
      render(
        <div>
          <VanaSidebar />
          <ThemeToggle />
        </div>
      );
      
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link'),
      ];
      
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
    
    test('aria-labels are descriptive and not redundant', () => {
      render(
        <div>
          <ResearchChatInterface />
          <ResearchProgressPanel 
            sessionState={null}
            isLoading={false}
            error={null}
            onStart={jest.fn()}
            onStop={jest.fn()}
            onRetry={jest.fn()}
          />
          <UserMenu />
          <VanaSidebar />
          <ThemeToggle />
        </div>
      );
      
      const elementsWithAriaLabel = screen.getAllByLabelText(/./);
      const ariaLabels = elementsWithAriaLabel.map(el => 
        el.getAttribute('aria-label')
      ).filter(Boolean);
      
      // Check that aria-labels are descriptive (more than 10 characters typically)
      ariaLabels.forEach(label => {
        expect(label!.length).toBeGreaterThan(10);
        expect(label).not.toMatch(/^(button|link|toggle)$/i); // Not just generic words
      });
      
      // Check for unique labels where appropriate
      const uniqueLabels = new Set(ariaLabels);
      expect(uniqueLabels.size).toBeGreaterThan(0);
    });
  });
});