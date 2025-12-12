import { useEffect } from "react";
import { useTour, TourStep, TOUR_STEP_IDS } from "@/components/tour";

/**
 * Onboarding Tour Step Content Component
 * Provides consistent styling for tour step tooltips
 */
const StepContent = ({ title, description }: { title: string; description: string }) => (
  <div>
    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

/**
 * Tour step definitions for the Vana onboarding experience
 * Each step highlights a key UI element and explains its purpose
 */
const onboardingSteps: TourStep[] = [
  {
    selectorId: TOUR_STEP_IDS.CHAT_INPUT,
    position: "top",
    content: (
      <StepContent
        title="Start Chatting"
        description="Type anything here to chat with Vana. Ask questions, get help with code, or request creative content."
      />
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.IMAGE_MODE,
    position: "top",
    content: (
      <StepContent
        title="Generate Images"
        description="Enable Image Mode to create AI-generated images from your text descriptions."
      />
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.ARTIFACT_MODE,
    position: "top",
    content: (
      <StepContent
        title="Create Artifacts"
        description="Artifact Mode generates interactive React components, games, dashboards, and more."
      />
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.SUGGESTIONS,
    position: "top",
    content: (
      <StepContent
        title="Quick Ideas"
        description="Choose from pre-built suggestions to see what Vana can do instantly."
      />
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.SIDEBAR,
    position: "right",
    content: (
      <StepContent
        title="Chat History"
        description="Access your previous conversations here. All chats are saved automatically."
      />
    ),
  },
];

/**
 * OnboardingTour - Invisible component that configures tour steps
 *
 * This component should be rendered inside a TourProvider.
 * It sets up the tour steps on mount and renders nothing visible.
 *
 * @example
 * ```tsx
 * <TourProvider tourId="vana-app-onboarding">
 *   <OnboardingTour />
 *   <AppContent />
 * </TourProvider>
 * ```
 */
export function OnboardingTour() {
  const { setSteps } = useTour();

  useEffect(() => {
    setSteps(onboardingSteps);
  }, [setSteps]);

  return null; // Invisible component - just configures tour state
}

/**
 * Hook for phase-aware tour auto-start logic
 *
 * @param phase - Current Home.tsx phase ("landing" | "transitioning" | "app")
 * @param isNewUser - Whether the user is new (hasn't seen the tour)
 * @param delay - Delay in ms after phase becomes "app" (default: 1000)
 */
export function useTourAutoStart(
  phase: "landing" | "transitioning" | "app",
  isNewUser: boolean = false,
  delay: number = 1000
) {
  const { startTour, isTourCompleted, steps } = useTour();

  useEffect(() => {
    // Only auto-start when:
    // 1. Phase is stable "app" (not during transitions)
    // 2. User is new (hasn't completed tour before)
    // 3. Tour isn't already completed
    // 4. Steps are loaded
    if (phase === "app" && isNewUser && !isTourCompleted && steps.length > 0) {
      const timer = setTimeout(() => {
        startTour();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [phase, isNewUser, isTourCompleted, steps.length, startTour, delay]);
}
