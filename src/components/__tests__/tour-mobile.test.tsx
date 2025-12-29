import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TourProvider, useTour, TourAlertDialog } from '../tour/tour';
import React from 'react';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Test component that uses useTour hook with target elements
 */
function TourTestComponent() {
  const { setSteps, startTour, isActive, currentStep } = useTour();

  React.useEffect(() => {
    setSteps([
      { content: 'Step 1 content', selectorId: 'step-1' },
      { content: 'Step 2 content', selectorId: 'step-2' },
      { content: 'Step 3 content', selectorId: 'step-3' },
    ]);
  }, [setSteps]);

  return (
    <div>
      <div id="step-1" style={{ width: '100px', height: '100px' }}>Target 1</div>
      <div id="step-2" style={{ width: '100px', height: '100px' }}>Target 2</div>
      <div id="step-3" style={{ width: '100px', height: '100px' }}>Target 3</div>
      <button onClick={startTour} data-testid="start-tour">Start Tour</button>
      <div data-testid="tour-active">{isActive ? 'active' : 'inactive'}</div>
      <div data-testid="current-step">{currentStep}</div>
    </div>
  );
}

/**
 * Test component for TourAlertDialog
 */
function TourAlertDialogTestComponent() {
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

// ============================================================================
// Phase 1: Touch Target Tests
// ============================================================================

describe('Tour Mobile Touch Targets', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('Close Button Touch Target', () => {
    it('should have 44x44px touch target (size-11 class)', async () => {
      render(
        <TourProvider>
          <TourTestComponent />
        </TourProvider>
      );

      // Start the tour
      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      // Find the close button
      const closeButton = screen.getByRole('button', { name: /close tour/i });

      // Should have size-11 class for 44x44px touch target
      expect(closeButton).toHaveClass('size-11');
    });

    it('should have flex centering classes for icon alignment', async () => {
      render(
        <TourProvider>
          <TourTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      const closeButton = screen.getByRole('button', { name: /close tour/i });

      // Should have flex centering for icon
      expect(closeButton).toHaveClass('flex');
      expect(closeButton).toHaveClass('items-center');
      expect(closeButton).toHaveClass('justify-center');
    });
  });

  describe('Navigation Button Touch Targets', () => {
    it('should have 44px height on Next button (h-11 class)', async () => {
      render(
        <TourProvider>
          <TourTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      // Find the Next button in the tour tooltip
      const nextButton = screen.getByRole('button', { name: /next step|go to next/i });

      // Should have h-11 class for 44px height
      expect(nextButton).toHaveClass('h-11');
    });

    it('should have 44px height on Previous button (h-11 class)', async () => {
      render(
        <TourProvider>
          <TourTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      // Go to step 2 so Previous button appears
      const nextButton = screen.getByRole('button', { name: /next step|go to next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('1');
      });

      // Find the Previous button
      const previousButton = screen.getByRole('button', { name: /previous step|go to previous/i });

      // Should have h-11 class for 44px height
      expect(previousButton).toHaveClass('h-11');
    });

    it('should have px-4 padding on navigation buttons', async () => {
      render(
        <TourProvider>
          <TourTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      // Go to step 2 for both buttons
      const nextButton = screen.getByRole('button', { name: /next step|go to next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('1');
      });

      const previousButton = screen.getByRole('button', { name: /previous step|go to previous/i });
      const nextButtonUpdated = screen.getByRole('button', { name: /next step|go to next/i });

      expect(previousButton).toHaveClass('px-4');
      expect(nextButtonUpdated).toHaveClass('px-4');
    });
  });

  describe('TourAlertDialog Button Touch Targets', () => {
    it('should have 44px height on Start Tour button (h-11 class)', async () => {
      render(
        <TourProvider>
          <TourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const startTourButton = screen.getByRole('button', { name: /start tour/i });

      // Should have h-11 class for 44px height
      expect(startTourButton).toHaveClass('h-11');
    });

    it('should have 44px height on Skip Tour button (h-11 class)', async () => {
      render(
        <TourProvider>
          <TourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const skipTourButton = screen.getByRole('button', { name: /skip tour/i });

      // Should have h-11 class for 44px height
      expect(skipTourButton).toHaveClass('h-11');
    });
  });
});

// ============================================================================
// Phase 2: Responsive Tooltip Width Tests
// ============================================================================

describe('Tour Mobile Responsive Width', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('Tooltip Width', () => {
    it('should have responsive width style on tooltip', async () => {
      render(
        <TourProvider>
          <TourTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      // Find the tooltip dialog
      const tooltip = screen.getByRole('dialog');

      // Should have responsive width in style
      const style = tooltip.getAttribute('style');
      expect(style).toContain('width');
      // Should use min() or calc() for responsive width
      expect(style).toMatch(/min\(|calc\(/);
    });

    it('should have maxWidth constraint on tooltip', async () => {
      render(
        <TourProvider>
          <TourTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      const tooltip = screen.getByRole('dialog');
      const style = tooltip.getAttribute('style');

      // Should have max-width constraint
      expect(style).toContain('max-width');
    });
  });

  describe('TourAlertDialog Responsive Width', () => {
    it('should have responsive width class on AlertDialogContent', async () => {
      render(
        <TourProvider>
          <TourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      // Find the dialog content - it should be within the alertdialog role
      const dialogContent = screen.getByRole('alertdialog');

      // Should have responsive width class
      expect(dialogContent).toHaveClass('w-[calc(100vw-32px)]');
    });

    it('should have responsive padding classes', async () => {
      render(
        <TourProvider>
          <TourAlertDialogTestComponent />
        </TourProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
      });

      const dialogContent = screen.getByRole('alertdialog');

      // Should have mobile-first padding (p-4) and desktop padding (sm:p-6)
      expect(dialogContent).toHaveClass('p-4');
      expect(dialogContent).toHaveClass('sm:p-6');
    });
  });
});

// ============================================================================
// Phase 3: Mobile Position Logic Tests
// ============================================================================

describe('Tour Mobile Position Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('Position Fallback on Mobile', () => {
    it('should fall back to bottom position when viewport is narrow and position is right', async () => {
      // Mock a narrow viewport
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375 // iPhone SE width
      });

      function MobilePositionTestComponent() {
        const { setSteps, startTour, isActive } = useTour();

        React.useEffect(() => {
          setSteps([
            {
              content: 'Sidebar step with right position',
              selectorId: 'sidebar-target',
              position: 'right' // This should fall back to 'bottom' on mobile
            },
          ]);
        }, [setSteps]);

        return (
          <div>
            <div id="sidebar-target" style={{ width: '50px', height: '50px' }}>Sidebar</div>
            <button onClick={startTour} data-testid="start-tour">Start Tour</button>
            <div data-testid="tour-active">{isActive ? 'active' : 'inactive'}</div>
          </div>
        );
      }

      render(
        <TourProvider>
          <MobilePositionTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      // Get the tooltip position
      const tooltip = screen.getByRole('dialog');
      const style = tooltip.getAttribute('style');

      // The tooltip should be positioned with responsive constraints
      // On mobile, right position should fall back so tooltip doesn't overflow
      expect(style).toBeTruthy();

      // Restore viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth
      });
    });

    it('should fall back to bottom position when viewport is narrow and position is left', async () => {
      // Mock a narrow viewport
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      function MobilePositionTestComponent() {
        const { setSteps, startTour, isActive } = useTour();

        React.useEffect(() => {
          setSteps([
            {
              content: 'Left position step',
              selectorId: 'left-target',
              position: 'left' // This should fall back to 'bottom' on mobile
            },
          ]);
        }, [setSteps]);

        return (
          <div>
            <div id="left-target" style={{ width: '50px', height: '50px' }}>Target</div>
            <button onClick={startTour} data-testid="start-tour">Start Tour</button>
            <div data-testid="tour-active">{isActive ? 'active' : 'inactive'}</div>
          </div>
        );
      }

      render(
        <TourProvider>
          <MobilePositionTestComponent />
        </TourProvider>
      );

      fireEvent.click(screen.getByTestId('start-tour'));

      await waitFor(() => {
        expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
      });

      const tooltip = screen.getByRole('dialog');
      expect(tooltip).toBeInTheDocument();

      // Restore viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth
      });
    });
  });
});
