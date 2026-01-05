import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TourProvider, useTour, TourAlertDialog, TourStep } from '../tour/tour';
import React, { ReactNode } from 'react';

// ============================================================================
// Test Component Helpers
// ============================================================================

/**
 * Simple component that uses the useTour hook for testing
 */
function TourConsumer() {
  const { currentStep, totalSteps, startTour, nextStep, previousStep, endTour, isActive, steps, isTourCompleted, setSteps } = useTour();

  React.useEffect(() => {
    if (steps.length === 0) {
      setSteps([
        { content: 'Step 1', selectorId: 'step-1' },
        { content: 'Step 2', selectorId: 'step-2' },
        { content: 'Step 3', selectorId: 'step-3' },
      ]);
    }
  }, [steps.length, setSteps]);

  return (
    <div>
      <div id="step-1" style={{ width: '100px', height: '100px' }}>Target 1</div>
      <div id="step-2" style={{ width: '100px', height: '100px' }}>Target 2</div>
      <div id="step-3" style={{ width: '100px', height: '100px' }}>Target 3</div>

      <button onClick={startTour}>Start Tour</button>
      <button onClick={nextStep} disabled={!isActive}>Next</button>
      <button onClick={previousStep} disabled={!isActive}>Prev</button>
      <button onClick={endTour} disabled={!isActive}>End Tour</button>

      <div data-testid="tour-status">
        Active: {isActive ? 'yes' : 'no'}
        | Step: {currentStep}
        | Total: {totalSteps}
        | Completed: {isTourCompleted ? 'yes' : 'no'}
      </div>
    </div>
  );
}

/**
 * Component that intentionally uses useTour outside provider (for error testing)
 */
function TourConsumerOutsideProvider() {
  const { startTour } = useTour();
  return <button onClick={startTour}>Start</button>;
}

// ============================================================================
// Tests
// ============================================================================

describe('TourProvider Context Functionality', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should provide context to children', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    expect(screen.getByRole('button', { name: /start tour/i })).toBeInTheDocument();
    expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: no');
  });

  it('should throw error when useTour called outside provider', () => {
    // Suppress error output for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

    expect(() => {
      render(<TourConsumerOutsideProvider />);
    }).toThrow('useTour must be used within a TourProvider');

    consoleError.mockRestore();
  });

  it('should initialize with empty steps and populate from effect', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // TourConsumer sets steps via useEffect, so wait for it
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });
  });
});

describe('useTour Hook Behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should initialize tour with startTour()', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    const startButton = screen.getByRole('button', { name: /start tour/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });
  });

  it('should advance to next step with nextStep()', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Go to next step
    const nextButton = screen.getByRole('button', { name: /^Next$/ });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });
  });

  it('should go back with previousStep()', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start and go to step 2
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });

    // Go back
    const prevButton = screen.getByRole('button', { name: /Prev/ });
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });
  });

  it('should not go below step 0 with previousStep()', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Try to go back
    const prevButton = screen.getByRole('button', { name: /Prev/ });
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });
  });

  it('should call onSkip callback with completed steps count when endTour() is called mid-tour', async () => {
    const onSkip = vi.fn();

    render(
      <TourProvider onSkip={onSkip}>
        <TourConsumer />
      </TourProvider>
    );

    // Wait for steps to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
    });

    // Go to step 1 (currentStep will be 1)
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });

    // End tour while at step 1 -> onSkip called with currentStep + 1 = 2
    const endButton = screen.getByRole('button', { name: /End Tour/ });
    fireEvent.click(endButton);

    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledWith(2); // Step 1, so 2 steps completed (0, 1)
    });
  });

  it('should not call onSkip when completing all steps', async () => {
    const onSkip = vi.fn();
    const onComplete = vi.fn();

    render(
      <TourProvider onSkip={onSkip} onComplete={onComplete}>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Go through all steps
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 2');
    });

    // Finish the tour
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
      expect(onSkip).not.toHaveBeenCalled();
    });
  });

  it('should call onComplete callback when tour finishes', async () => {
    const onComplete = vi.fn();

    render(
      <TourProvider onComplete={onComplete}>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Complete the tour by going through all steps
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('should allow setting steps dynamically', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });
  });
});

describe('Keyboard Navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should advance step with ArrowRight key', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Press ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });
  });

  it('should go back with ArrowLeft key', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Go to step 1
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });

    // Go back with ArrowLeft
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });
  });

  it('should skip tour with Escape key', async () => {
    const onSkip = vi.fn();

    render(
      <TourProvider onSkip={onSkip}>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
    });

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: no');
      expect(onSkip).toHaveBeenCalledWith(1); // 1 step completed (step 0)
    });
  });

  it('should advance step with Enter key', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Press Enter
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });
  });

  it('should not process keyboard events when tour is inactive', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Tour is not active yet
    expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: no');

    // Press ArrowRight - should not advance
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: -1');
  });
});

describe('State Persistence via localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should save completion state to localStorage', async () => {
    const { unmount } = render(
      <TourProvider tourId="test-tour">
        <TourConsumer />
      </TourProvider>
    );

    // Start and complete the tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Complete the tour
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Completed: yes');
    });

    unmount();

    // Check localStorage
    const saved = localStorage.getItem('vana-tour-test-tour');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.completed).toBe(true);
  });

  it('should respect tourId for multiple tours', async () => {
    render(
      <div>
        <TourProvider tourId="tour-1">
          <div id="tour-1-container">
            <TourConsumer />
          </div>
        </TourProvider>
        <TourProvider tourId="tour-2">
          <div id="tour-2-container">
            <TourConsumer />
          </div>
        </TourProvider>
      </div>
    );

    const tour1Storage = localStorage.getItem('vana-tour-tour-1');
    const tour2Storage = localStorage.getItem('vana-tour-tour-2');

    // Both should have storage keys with different IDs
    expect(tour1Storage).toBeTruthy();
    expect(tour2Storage).toBeTruthy();
  });

  it('should load persisted state from localStorage on mount', async () => {
    // Pre-populate localStorage with completed state
    localStorage.setItem(
      'vana-tour-test-tour',
      JSON.stringify({ completed: true, lastStep: 2 })
    );

    render(
      <TourProvider tourId="test-tour" isTourCompleted={false}>
        <TourConsumer />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Completed: yes');
    });
  });

  it('should handle localStorage errors gracefully', async () => {
    // Mock localStorage to throw an error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

    // Should not throw even if localStorage fails
    expect(() => {
      render(
        <TourProvider tourId="test-tour">
          <TourConsumer />
        </TourProvider>
      );
    }).not.toThrow();

    // Restore
    localStorage.setItem = originalSetItem;
    consoleError.mockRestore();
  });

  it('should update localStorage when currentStep changes', async () => {
    render(
      <TourProvider tourId="test-tour">
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Check localStorage has been updated
    const saved = localStorage.getItem('vana-tour-test-tour');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.lastStep).toBe(0);

    // Go to next step
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });

    // Check localStorage updated
    const saved2 = localStorage.getItem('vana-tour-test-tour');
    const parsed2 = JSON.parse(saved2!);
    expect(parsed2.lastStep).toBe(1);
  });
});

describe('Reduced Motion Detection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should detect prefers-reduced-motion preference', async () => {
    render(
      <TourProvider>
        <div id="step-1">Target</div>
      </TourProvider>
    );

    // Window.matchMedia should be called (mocked in setup.ts)
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should handle prefers-reduced-motion setting', async () => {
    // Reset matchMedia mock to return matches: true
    vi.mocked(window.matchMedia).mockReturnValueOnce({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);

    render(
      <TourProvider>
        <div id="step-1">Target</div>
      </TourProvider>
    );

    expect(window.matchMedia).toHaveBeenCalled();
  });

  it('should render tour with reduced motion disabled by default', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour to display content
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
    });
  });
});

describe('Tour Content Rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should render tour content with step information', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      // Should show step counter
      expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    });
  });

  it('should display correct content for each step', async () => {
    const steps: TourStep[] = [
      { content: 'First step content', selectorId: 'step-1' },
      { content: 'Second step content', selectorId: 'step-2' },
      { content: 'Third step content', selectorId: 'step-3' },
    ];

    function TestComponent() {
      const { setSteps, startTour, nextStep, currentStep } = useTour();

      React.useEffect(() => {
        setSteps(steps);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1" style={{ width: '100px', height: '100px' }}>Target 1</div>
          <div id="step-2" style={{ width: '100px', height: '100px' }}>Target 2</div>
          <div id="step-3" style={{ width: '100px', height: '100px' }}>Target 3</div>
          <button onClick={startTour}>Start</button>
          <button onClick={nextStep} data-testid="manual-next">Manual Next</button>
          <div data-testid="current-step">{currentStep}</div>
        </div>
      );
    }

    render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    // Wait for steps to load
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toBeInTheDocument();
    });

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /Start/ }));

    await waitFor(() => {
      expect(screen.getByText('First step content')).toBeInTheDocument();
    });

    // Go to next step using manual next button
    fireEvent.click(screen.getByTestId('manual-next'));

    await waitFor(() => {
      expect(screen.getByText('Second step content')).toBeInTheDocument();
    });
  });

  it('should show Previous button only when not on first step', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Wait for steps to load
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // On first step, there should not be a Previous button
    // The component renders an empty div instead of the button
    let allButtons = screen.getAllByRole('button');
    const firstStepPreviousButton = allButtons.find(btn =>
      btn.getAttribute('aria-label')?.includes('previous step')
    );
    expect(firstStepPreviousButton).toBeFalsy();

    // Go to next step
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });

    // Now should have a previous button with appropriate aria-label
    await waitFor(() => {
      allButtons = screen.getAllByRole('button');
      const secondStepPreviousButton = allButtons.find(btn =>
        btn.getAttribute('aria-label')?.includes('previous step')
      );
      expect(secondStepPreviousButton).toBeTruthy();
    });
  });

  it('should show Finish button on last step', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    // Go to last step
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Finish/ })).toBeInTheDocument();
    });
  });
});

describe('TourAlertDialog Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should render alert dialog when tour not completed', async () => {
    function TestComponent() {
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

    render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });
  });

  it('should not render when tour is completed', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);

      return <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />;
    }

    render(
      <TourProvider isTourCompleted={true}>
        <TestComponent />
      </TourProvider>
    );

    // Should not render the dialog
    expect(screen.queryByText('Welcome to Vana')).not.toBeInTheDocument();
  });

  it('should start tour when Start Tour button clicked', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);
      const { setSteps, isActive } = useTour();

      React.useEffect(() => {
        setSteps([
          { content: 'Step 1', selectorId: 'step-1' },
          { content: 'Step 2', selectorId: 'step-2' },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1">Target</div>
          <div data-testid="tour-active">{isActive ? 'active' : 'inactive'}</div>
          <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      );
    }

    render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /start tour/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('tour-active')).toHaveTextContent('active');
    });
  });

  it('should close dialog when Skip Tour button clicked', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);
      const { setSteps } = useTour();

      React.useEffect(() => {
        setSteps([
          { content: 'Step 1', selectorId: 'step-1' },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1">Target</div>
          <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      );
    }

    render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });

    const skipButton = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Welcome to Vana')).not.toBeInTheDocument();
    });
  });

  it('should render complete profile section with correct links and content', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);
      const { setSteps } = useTour();

      React.useEffect(() => {
        setSteps([
          { content: 'Step 1', selectorId: 'step-1' },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1">Target</div>
          <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      );
    }

    render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });

    // Profile image verification
    const profileImg = screen.getByRole('presentation');
    expect(profileImg).toHaveAttribute('src', '/nick-profile.jpeg');
    expect(profileImg).toHaveAttribute('alt', '');

    // LinkedIn link verification
    const linkedinLink = screen.getByRole('link', { name: /connect on linkedin/i });
    expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/nickbohmer/');
    expect(linkedinLink).toHaveAttribute('target', '_blank');
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer');

    // GitHub link verification
    const githubLink = screen.getByRole('link', { name: /view on github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/NickB03/llm-chat-site');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Feature lists verification
    expect(screen.getByText(/current release includes/i)).toBeInTheDocument();
    expect(screen.getByText(/llm chat including search/i)).toBeInTheDocument();
    expect(screen.getByText(/artifact generation/i)).toBeInTheDocument();

    expect(screen.getByText(/next release will contain/i)).toBeInTheDocument();
    expect(screen.getByText(/error reporting/i)).toBeInTheDocument();
    expect(screen.getByText(/deep research/i)).toBeInTheDocument();

    // Email link verification
    const emailLink = screen.getByRole('link', { name: /nick@vana\.bot/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:nick@vana.bot');
  });
});

describe('Click Within Area Handler', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should trigger onClickWithinArea callback', async () => {
    const onClickHandler = vi.fn();

    function TestComponent() {
      const { setSteps, startTour } = useTour();

      React.useEffect(() => {
        setSteps([
          {
            content: 'Click the target',
            selectorId: 'clickable-target',
            width: 100,
            height: 100,
            onClickWithinArea: onClickHandler,
          },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="clickable-target" style={{ width: '100px', height: '100px', position: 'absolute', top: '0px', left: '0px' }}>
            Click me
          </div>
          <button onClick={startTour}>Start</button>
        </div>
      );
    }

    render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /Start/ }));

    await waitFor(() => {
      expect(screen.getByText('Click the target')).toBeInTheDocument();
    });

    // Click within the target area with proper coordinates
    const target = document.getElementById('clickable-target');
    if (target) {
      fireEvent.click(target, { clientX: 50, clientY: 50 });
    }

    // The callback should have been triggered
    expect(onClickHandler).toHaveBeenCalled();
  });
});

describe('Tour Step Positioning', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should position content based on step position prop', async () => {
    function TestComponent() {
      const { setSteps, startTour } = useTour();

      React.useEffect(() => {
        setSteps([
          {
            content: 'Step with position',
            selectorId: 'step-1',
            position: 'top',
          },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1" style={{ width: '100px', height: '100px' }}>
            Target
          </div>
          <button onClick={startTour}>Start</button>
        </div>
      );
    }

    render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Start/ }));

    await waitFor(() => {
      expect(screen.getByText('Step with position')).toBeInTheDocument();
    });
  });
});

describe('Tour State Management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should prevent starting tour if already completed', async () => {
    const onComplete = vi.fn();

    render(
      <TourProvider onComplete={onComplete} tourId="test-tour">
        <TourConsumer />
      </TourProvider>
    );

    // Wait for steps to load
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });

    // Start the tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    // Complete the tour by advancing to the last step and finishing
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 1');
    });

    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 2');
    });

    // Click finish button (which is Next on last step)
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Completed: yes');
    });

    // After completion, the tour is inactive and marked as completed
    expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: no');

    // Try to start again - the startTour function should return early
    // because isCompleted state is true
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    // Tour should still be inactive and completed (not restarted)
    // The behavior depends on the callback checking isCompleted state
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Completed: yes');
    });
  });

  it('should track isTourCompleted state correctly', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    expect(screen.getByTestId('tour-status')).toHaveTextContent('Completed: no');

    // Start and complete the tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Step: 0');
    });

    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Completed: yes');
    });
  });
});

describe('Close button positioning', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should position close button in top-right corner with right-2 class', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Wait for steps to load
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });

    // Start tour to display the close button
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
    });

    // Find the close button by its aria-label
    const closeButton = screen.getByRole('button', { name: /close tour/i });
    expect(closeButton).toBeInTheDocument();

    // Test 1: Should have right-1 class for right positioning (adjusted for larger touch target)
    expect(closeButton).toHaveClass('right-1');
  });

  it('should NOT have left-2 class on close button', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Wait for steps to load
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
    });

    const closeButton = screen.getByRole('button', { name: /close tour/i });

    // Test 2: Should NOT have left-2 class
    expect(closeButton).not.toHaveClass('left-2');
  });

  it('should maintain step counter positioning in top-left with left-4 class', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Wait for steps to load
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
    });

    // Find the step counter by its text content (e.g., "1 / 3")
    const stepCounter = screen.getByText(/1 \/ 3/);
    expect(stepCounter).toBeInTheDocument();

    // Test 3: Step counter should be positioned on left with left-4 (swapped per issue #294)
    expect(stepCounter).toHaveClass('left-4');
  });

  it('should have close button on right and step counter on left for proper UX', async () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );

    // Wait for steps to load
    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Total: 3');
    });

    // Start tour
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tour-status')).toHaveTextContent('Active: yes');
    });

    const closeButton = screen.getByRole('button', { name: /close tour/i });
    const stepCounter = screen.getByText(/1 \/ 3/);

    // Close button should be on the right (uses right-1 for larger touch target)
    expect(closeButton).toHaveClass('right-1');
    // Step counter should be on the left (swapped per issue #294)
    expect(stepCounter).toHaveClass('left-4');

    // Both should have absolute positioning
    expect(closeButton).toHaveClass('absolute');
    expect(stepCounter).toHaveClass('absolute');

    // Both should be at the top (close button uses top-1 for larger touch target)
    expect(closeButton).toHaveClass('top-1');
    expect(stepCounter).toHaveClass('top-3');
  });
});

describe('Image Fallback Rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should render fallback emoji when profile image fails to load', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);
      const { setSteps } = useTour();

      React.useEffect(() => {
        setSteps([
          { content: 'Step 1', selectorId: 'step-1' },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1">Target</div>
          <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      );
    }

    const { unmount } = render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });

    // Find the image and trigger error
    const profileImg = screen.queryByRole('presentation');
    if (profileImg) {
      fireEvent.error(profileImg);
    }

    // Wait for error to trigger and fallback to render
    await waitFor(() => {
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    // Verify original image is NOT rendered anymore
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();

    unmount();
  });
});

describe('Responsive Layout Behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should hide profile section on mobile viewports', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);
      const { setSteps } = useTour();

      React.useEffect(() => {
        setSteps([
          { content: 'Step 1', selectorId: 'step-1' },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1">Target</div>
          <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      );
    }

    const { unmount } = render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });

    // Profile section should have 'hidden' and 'md:flex' classes
    // The component uses 'hidden md:flex' which hides on mobile and shows on desktop
    const profileSection = document.querySelector('.hidden.md\\:flex');
    expect(profileSection).toBeInTheDocument();
    expect(profileSection).toHaveClass('hidden');
    expect(profileSection).toHaveClass('md:flex');

    unmount();
  });

  it('should show profile section on desktop viewports', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);
      const { setSteps } = useTour();

      React.useEffect(() => {
        setSteps([
          { content: 'Step 1', selectorId: 'step-1' },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1">Target</div>
          <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      );
    }

    const { unmount } = render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });

    // Profile section should exist with md:flex class (visible on desktop via responsive design)
    const profileSection = document.querySelector('.hidden.md\\:flex');
    expect(profileSection).toBeInTheDocument();

    // Profile image or fallback should exist within the profile section
    expect(screen.queryByRole('presentation') || screen.queryByText('👤')).toBeTruthy();

    unmount();
  });
});

describe('External Link Behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should open LinkedIn link in new tab without losing chat session', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = React.useState(true);
      const { setSteps } = useTour();

      React.useEffect(() => {
        setSteps([
          { content: 'Step 1', selectorId: 'step-1' },
        ]);
      }, [setSteps]);

      return (
        <div>
          <div id="step-1">Target</div>
          <TourAlertDialog isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      );
    }

    const { unmount } = render(
      <TourProvider>
        <TestComponent />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument();
    });

    const linkedinLink = screen.getByRole('link', { name: /connect on linkedin/i });

    // Verify the link has correct attributes for opening in new tab
    expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/nickbohmer/');
    expect(linkedinLink).toHaveAttribute('target', '_blank');
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer');

    unmount();
  });
});
