export type ToolChoice = "auto" | "generate_artifact" | "generate_image";

export function getToolChoice(imageMode: boolean, artifactMode: boolean): ToolChoice {
  if (imageMode) return "generate_image";
  if (artifactMode) return "generate_artifact";
  return "auto";
}
