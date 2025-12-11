/**
 * Tour Step IDs
 *
 * These constants define the element IDs that the tour will highlight.
 * Add the corresponding id attribute to the elements you want to include in the tour.
 */
export const TOUR_STEP_IDS = {
  CHAT_INPUT: "tour-chat-input",
  IMAGE_MODE: "tour-image-mode",
  ARTIFACT_MODE: "tour-artifact-mode",
  SUGGESTIONS: "tour-suggestions",
  SIDEBAR: "tour-sidebar",
} as const;

export type TourStepId = (typeof TOUR_STEP_IDS)[keyof typeof TOUR_STEP_IDS];
