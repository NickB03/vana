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
   * Rate Limit Warnings
   * When enabled, shows toast notifications and banners warning users about
   * approaching rate limits. Disable during testing to avoid visual noise.
   */
  RATE_LIMIT_WARNINGS: false,

  /**
   * Guest Banner Urgency Gradient
   * When enabled, the guest limit banner changes color based on remaining messages:
   * - info (blue): Many messages remaining
   * - warning (orange): 5 or fewer messages remaining
   * - error (red): No messages remaining
   *
   * When disabled, banner uses neutral "info" style regardless of message count.
   */
  GUEST_BANNER_URGENCY: false,

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
