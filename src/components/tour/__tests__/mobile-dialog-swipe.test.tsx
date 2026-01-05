import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TourProvider, useTour, TourAlertDialog } from '../tour';
import React from 'react';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Test component for TourAlertDialog with mobile viewport
 */
function MobileTourAlertDialogTestComponent() {
  const [isOpen, setIsOpen] = React.useState(true);
  const { setSteps } = useTour();

  React.useEffect(() => {
    setSteps([
      { content: 'Step 1', selectorId: 'step-1' },
      { content: 'Step 2', selectorId: 'step-2' },
    ]);
  }, [setSteps]);

  return (
    <div>
      <div id="step-1">Target</div>
      <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
}

/**
 * Mock the useIsMobile hook to simulate mobile viewport
 */
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

// ============================================================================
// Swipe Gesture Tests
// ============================================================================

describe('MobileTourDialog Swipe Gestures', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Mock mobile viewport
    originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375 // iPhone SE width
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();

    // Restore viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
  });

  describe('Swipe Threshold Validation', () => {
    it('should NOT transition when swipe is below 50px threshold', async () => {
      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      // Find the page container (the div with onTouchStart handler)
      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');
      expect(pageContainer).toBeInTheDocument();

      // Verify we're on page 1 (should see "Continue to page 2" or "Next" button, not "Back")
      const nextButton = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                        screen.queryByRole('button', { name: /next/i });
      expect(nextButton).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();

      // Simulate touchStart at x=100
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 100 }]
      });

      // Simulate touchMove to x=145 (45px delta - below 50px threshold)
      fireEvent.touchMove(document, {
        touches: [{ clientX: 145 }]
      });

      // Wait a bit for any potential state changes
      await waitFor(() => {
        // Should still be on page 1 (Next button still visible, no Back button)
        const stillNextButton = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                               screen.queryByRole('button', { name: /next/i });
        expect(stillNextButton).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
      }, { timeout: 100 });

      // Cleanup
      fireEvent.touchEnd(document, {
        changedTouches: [{ clientX: 145 }]
      });
    });

    it('should NOT transition when swiping right on page 1', async () => {
      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');

      // Verify we're on page 1
      const page1Next = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                       screen.queryByRole('button', { name: /next/i });
      expect(page1Next).toBeInTheDocument();

      // Simulate right swipe (positive diffX) on page 1
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 100 }]
      });

      fireEvent.touchMove(document, {
        touches: [{ clientX: 170 }] // 70px right swipe
      });

      await waitFor(() => {
        // Should still be on page 1 (right swipe should do nothing on first page)
        const stillNext = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                         screen.queryByRole('button', { name: /next/i });
        expect(stillNext).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
      }, { timeout: 100 });

      // Cleanup
      fireEvent.touchEnd(document, {
        changedTouches: [{ clientX: 170 }]
      });
    });
  });

  describe('Swipe Navigation - Page 1 to Page 2', () => {
    it('should transition from page 1 to 2 when swiping left >50px', async () => {
      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');

      // Verify we're on page 1
      const initialNext = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                         screen.queryByRole('button', { name: /next/i });
      expect(initialNext).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();

      // Simulate left swipe (negative diffX) - touchStart at x=200, move to x=140 (60px left)
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 200 }]
      });

      fireEvent.touchMove(document, {
        touches: [{ clientX: 140 }] // 60px left swipe
      });

      // Should transition to page 2
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /start tour/i })).toBeInTheDocument();
      });

      // Cleanup
      fireEvent.touchEnd(document, {
        changedTouches: [{ clientX: 140 }]
      });
    });
  });

  describe('Swipe Navigation - Page 2 to Page 1', () => {
    it('should transition from page 2 to 1 when swiping right >50px', async () => {
      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      // Navigate to page 2 first by clicking Next
      const nextButton = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                        screen.queryByRole('button', { name: /next/i });
      if (!nextButton) throw new Error('Next button not found');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      // Find page container on page 2
      const pageContainer = screen.getByText(/What's Coming Next/i).closest('[class*="overflow-hidden"]');

      // Simulate right swipe - touchStart at x=100, move to x=170 (70px right)
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 100 }]
      });

      fireEvent.touchMove(document, {
        touches: [{ clientX: 170 }] // 70px right swipe
      });

      // Should transition back to page 1
      await waitFor(() => {
        const backToNext = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                          screen.queryByRole('button', { name: /next/i });
        expect(backToNext).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
      });

      // Cleanup
      fireEvent.touchEnd(document, {
        changedTouches: [{ clientX: 170 }]
      });
    });

    it('should NOT trigger navigation when swiping left on page 2', async () => {
      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      // Navigate to page 2
      const nextBtn3 = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                      screen.queryByRole('button', { name: /next/i });
      if (!nextBtn3) throw new Error('Next button not found');
      fireEvent.click(nextBtn3);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /start tour/i })).toBeInTheDocument();
      });

      const pageContainer = screen.getByText(/What's Coming Next/i).closest('[class*="overflow-hidden"]');

      // Simulate left swipe on page 2 (should do nothing - we're at the last page)
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 200 }]
      });

      fireEvent.touchMove(document, {
        touches: [{ clientX: 140 }] // 60px left swipe
      });

      await waitFor(() => {
        // Should still be on page 2
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /start tour/i })).toBeInTheDocument();
      }, { timeout: 100 });

      // Cleanup
      fireEvent.touchEnd(document, {
        changedTouches: [{ clientX: 140 }]
      });
    });
  });

  describe('Touch Event Cleanup', () => {
    it('should cleanup touch event listeners on touchEnd', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');

      // Simulate touch sequence
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 100 }]
      });

      fireEvent.touchMove(document, {
        touches: [{ clientX: 140 }]
      });

      // Clear spy call count
      removeEventListenerSpy.mockClear();

      // Trigger touchEnd - should cleanup listeners
      fireEvent.touchEnd(document, {
        changedTouches: [{ clientX: 140 }]
      });

      // Should have called removeEventListener for touchmove and touchend
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('should cleanup touch event listeners on unmount', async () => {
      const { unmount } = render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');

      // Start a touch sequence
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 100 }]
      });

      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      // Unmount should trigger cleanup
      unmount();

      // Should cleanup listeners
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('should handle touch cancellation properly', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');

      // Start touch
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 100 }]
      });

      removeEventListenerSpy.mockClear();

      // Trigger touchCancel
      fireEvent.touchCancel(document);

      // Should cleanup listeners on cancel
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing touches array gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');

      // Simulate touch event with empty touches array
      fireEvent.touchStart(pageContainer!, {
        touches: [] // Empty array - should be handled gracefully
      });

      // Should not crash
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();

      // Should log error
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing touch in move event gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const pageContainer = screen.getByText('Welcome to Vana').closest('[class*="overflow-hidden"]');

      // Valid touchStart
      fireEvent.touchStart(pageContainer!, {
        touches: [{ clientX: 100 }]
      });

      // Invalid touchMove with empty touches
      fireEvent.touchMove(document, {
        touches: [] // Empty array
      });

      // Should not crash
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();

      // Should log error
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Page Indicators', () => {
    it('should show correct page indicators on page 1', async () => {
      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      // Find all page indicator dots
      const indicators = screen.getAllByRole('generic').filter(el =>
        el.className.includes('size-2') && el.className.includes('rounded-full')
      );

      // Should have 2 indicators
      expect(indicators).toHaveLength(2);

      // First should be active (bg-primary), second inactive (bg-muted)
      expect(indicators[0]).toHaveClass('bg-primary');
      expect(indicators[1]).toHaveClass('bg-muted');
    });

    it('should show correct page indicators on page 2', async () => {
      render(
        <TourProvider>
          <MobileTourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      // Navigate to page 2
      const nextBtn4 = screen.queryByRole('button', { name: /continue to page 2/i }) ||
                      screen.queryByRole('button', { name: /next/i });
      if (!nextBtn4) throw new Error('Next button not found');
      fireEvent.click(nextBtn4);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /start tour/i })).toBeInTheDocument();
      });

      // Find page indicators on page 2
      const indicators = screen.getAllByRole('generic').filter(el =>
        el.className.includes('size-2') && el.className.includes('rounded-full')
      );

      // First should be inactive (bg-muted), second active (bg-primary)
      expect(indicators[0]).toHaveClass('bg-muted');
      expect(indicators[1]).toHaveClass('bg-primary');
    });
  });
});
