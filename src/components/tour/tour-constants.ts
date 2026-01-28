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

/**
 * Tour Storage Keys
 *
 * Constants for localStorage keys used by the tour system.
 */
export const TOUR_STORAGE_KEYS = {
  /** Admin setting to force tour on every visit (overrides completion state) */
  FORCE_TOUR: 'vana-tour-force-mode',
  /** Prefix for tour completion state storage */
  TOUR_STATE_PREFIX: 'vana-tour-',
  /** Admin setting to enable/disable landing page on first visit */
  LANDING_PAGE_ENABLED: 'vana-landing-page-enabled',
} as const;
