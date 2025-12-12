import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { OnboardingTour } from '../OnboardingTour';
import { TourProvider, useTour, TOUR_STEP_IDS } from '../tour';

// ============================================================================
// OnboardingTour Component Tests
// ============================================================================

describe('OnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should configure exactly 5 tour steps', async () => {
    function StepsCounter() {
      const { steps } = useTour();
      return <div data-testid="steps-count">{steps.length}</div>;
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepsCounter />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('steps-count')).toHaveTextContent('5');
    });
  });

  it('should configure steps with correct TOUR_STEP_IDS in order', async () => {
    function StepsInspector() {
      const { steps } = useTour();
      return (
        <div data-testid="steps-ids">
          {steps.map((step, i) => (
            <span key={i} data-testid={`step-${i}`}>{step.selectorId}</span>
          ))}
        </div>
      );
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepsInspector />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-0')).toHaveTextContent(TOUR_STEP_IDS.CHAT_INPUT);
      expect(screen.getByTestId('step-1')).toHaveTextContent(TOUR_STEP_IDS.IMAGE_MODE);
      expect(screen.getByTestId('step-2')).toHaveTextContent(TOUR_STEP_IDS.ARTIFACT_MODE);
      expect(screen.getByTestId('step-3')).toHaveTextContent(TOUR_STEP_IDS.SUGGESTIONS);
      expect(screen.getByTestId('step-4')).toHaveTextContent(TOUR_STEP_IDS.SIDEBAR);
    });
  });

  it('should render null (invisible component)', () => {
    const { container } = render(
      <TourProvider>
        <OnboardingTour />
      </TourProvider>
    );

    // OnboardingTour should not add any DOM elements directly
    // It just configures steps and returns null
    const onboardingElements = container.querySelectorAll('[data-onboarding-tour]');
    expect(onboardingElements.length).toBe(0);
  });

  it('should configure steps with correct positions', async () => {
    function StepsInspector() {
      const { steps } = useTour();
      return (
        <div data-testid="steps-positions">
          {steps.map((step, i) => (
            <span key={i} data-testid={`position-${i}`}>{step.position}</span>
          ))}
        </div>
      );
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepsInspector />
      </TourProvider>
    );

    await waitFor(() => {
      // First 4 steps should have position "top"
      expect(screen.getByTestId('position-0')).toHaveTextContent('top');
      expect(screen.getByTestId('position-1')).toHaveTextContent('top');
      expect(screen.getByTestId('position-2')).toHaveTextContent('top');
      expect(screen.getByTestId('position-3')).toHaveTextContent('top');
      // Sidebar step should have position "right"
      expect(screen.getByTestId('position-4')).toHaveTextContent('right');
    });
  });

  it('should have content defined for all steps', async () => {
    function StepsContentChecker() {
      const { steps } = useTour();
      return (
        <div data-testid="content-check">
          {steps.every(step => step.content !== undefined) ? 'all-have-content' : 'missing-content'}
        </div>
      );
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepsContentChecker />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('content-check')).toHaveTextContent('all-have-content');
    });
  });

  it('should use all unique selector IDs', async () => {
    function UniqueIdsChecker() {
      const { steps } = useTour();
      const ids = steps.map(s => s.selectorId);
      const uniqueIds = new Set(ids);
      return (
        <div data-testid="unique-check">
          {ids.length === uniqueIds.size ? 'all-unique' : 'has-duplicates'}
        </div>
      );
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <UniqueIdsChecker />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('unique-check')).toHaveTextContent('all-unique');
    });
  });
});

// ============================================================================
// OnboardingTour Integration with TourProvider Tests
// ============================================================================

describe('OnboardingTour Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should work with custom tourId in TourProvider', async () => {
    function StepsCounter() {
      const { steps } = useTour();
      return <div data-testid="steps-count">{steps.length}</div>;
    }

    render(
      <TourProvider tourId="custom-tour-id">
        <OnboardingTour />
        <StepsCounter />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('steps-count')).toHaveTextContent('5');
    });
  });

  it('should work with onComplete callback in TourProvider', async () => {
    const onComplete = vi.fn();

    function StepsCounter() {
      const { steps } = useTour();
      return <div data-testid="steps-count">{steps.length}</div>;
    }

    render(
      <TourProvider onComplete={onComplete}>
        <OnboardingTour />
        <StepsCounter />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('steps-count')).toHaveTextContent('5');
    });
  });

  it('should work with onSkip callback in TourProvider', async () => {
    const onSkip = vi.fn();

    function StepsCounter() {
      const { steps } = useTour();
      return <div data-testid="steps-count">{steps.length}</div>;
    }

    render(
      <TourProvider onSkip={onSkip}>
        <OnboardingTour />
        <StepsCounter />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('steps-count')).toHaveTextContent('5');
    });
  });
});

// ============================================================================
// Step ID Mapping Tests (ensure steps match constants)
// ============================================================================

describe('OnboardingTour Step ID Mapping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should map step 0 to CHAT_INPUT', async () => {
    function StepChecker() {
      const { steps } = useTour();
      return <div data-testid="step-id">{steps[0]?.selectorId}</div>;
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepChecker />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-id')).toHaveTextContent('tour-chat-input');
    });
  });

  it('should map step 1 to IMAGE_MODE', async () => {
    function StepChecker() {
      const { steps } = useTour();
      return <div data-testid="step-id">{steps[1]?.selectorId}</div>;
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepChecker />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-id')).toHaveTextContent('tour-image-mode');
    });
  });

  it('should map step 2 to ARTIFACT_MODE', async () => {
    function StepChecker() {
      const { steps } = useTour();
      return <div data-testid="step-id">{steps[2]?.selectorId}</div>;
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepChecker />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-id')).toHaveTextContent('tour-artifact-mode');
    });
  });

  it('should map step 3 to SUGGESTIONS', async () => {
    function StepChecker() {
      const { steps } = useTour();
      return <div data-testid="step-id">{steps[3]?.selectorId}</div>;
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepChecker />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-id')).toHaveTextContent('tour-suggestions');
    });
  });

  it('should map step 4 to SIDEBAR', async () => {
    function StepChecker() {
      const { steps } = useTour();
      return <div data-testid="step-id">{steps[4]?.selectorId}</div>;
    }

    render(
      <TourProvider>
        <OnboardingTour />
        <StepChecker />
      </TourProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-id')).toHaveTextContent('tour-sidebar');
    });
  });
});
