export type ToolChoice = "auto" | "generate_artifact" | "generate_image";
export type ModeHint = "auto" | "artifact" | "image";

/**
 * Get tool choice for chat requests.
 *
 * IMPORTANT: We no longer force specific tools for carousel cards.
 * Instead, we use modeHint to "nudge" the model towards using specific tools.
 * This allows the model to autonomously decide while following the system prompt's
 * CRITICAL RULE #1 to always explain artifacts.
 *
 * Only force tool choice when editing existing artifacts (handled in ChatInterface).
 */
export function getToolChoice(imageMode: boolean, artifactMode: boolean): ToolChoice {
  // Never force tools - let the model decide autonomously
  // This ensures the continuation flow treats tool usage as a conversational choice
  // rather than a forced requirement, which improves explanation compliance
  return "auto";
}

/**
 * Get mode hint to nudge the model towards specific tool usage.
 *
 * Mode hints add bias to the system prompt without forcing tool selection.
 * The backend's buildModeHintPrompt() adds guidance like:
 * - artifact: "You SHOULD use the generate_artifact tool for this request"
 * - image: "You SHOULD use the generate_image tool for this request"
 *
 * This preserves the model's autonomous decision-making while guiding behavior.
 */
export function getModeHint(imageMode: boolean, artifactMode: boolean): ModeHint {
  if (imageMode) return "image";
  if (artifactMode) return "artifact";
  return "auto";
}
