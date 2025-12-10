/**
 * Feature Flags
 *
 * Centralized configuration for enabling/disabling features.
 * Set values to `true` to enable features, `false` to disable.
 *
 * These can be controlled via environment variables for different environments.
 */

export const FEATURE_FLAGS = {

  /**
   * Context-Aware Input Placeholders
   * When enabled, the input placeholder text changes based on current mode:
   * - Normal: "Ask anything"
   * - Image mode: "Describe the image you want to generate..."
   * - Artifact mode: "Describe the component you want to create..."
   * - Editing: "Ask me to modify this artifact..."
   */
  CONTEXT_AWARE_PLACEHOLDERS: false,

  /**
   * Canvas Shadow Depth
   * When enabled, the chat card shadow changes based on canvas open/closed state
   * to provide visual depth cues.
   */
  CANVAS_SHADOW_DEPTH: false,
} as const;

/**
 * Type-safe helper to check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
