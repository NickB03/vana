/**
 * Shared color, glow, and gradient presets for sparkle background controls
 * Used in Home.tsx and SparklesDemo.tsx
 */

export const COLOR_PRESETS = [
  { name: "White", value: "#FFFFFF" },
  { name: "Purple", value: "#8350e8" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#22d3ee" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gold", value: "#fbbf24" },
] as const;

export const GLOW_PRESETS = [
  { name: "Purple", value: "#8350e8" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#22d3ee" },
  { name: "Pink", value: "#ec4899" },
  { name: "Green", value: "#22c55e" },
] as const;

export const GRADIENT_PRESETS = [
  { name: "Purple-Blue", colors: ["#8350e8", "#3b82f6"], preview: "linear-gradient(90deg, #8350e8, #3b82f6)" },
  { name: "Pink-Purple", colors: ["#ec4899", "#8b5cf6"], preview: "linear-gradient(90deg, #ec4899, #8b5cf6)" },
  { name: "Cyan-Blue", colors: ["#22d3ee", "#3b82f6"], preview: "linear-gradient(90deg, #22d3ee, #3b82f6)" },
  { name: "Orange-Pink", colors: ["#f97316", "#ec4899"], preview: "linear-gradient(90deg, #f97316, #ec4899)" },
  { name: "Green-Cyan", colors: ["#22c55e", "#22d3ee"], preview: "linear-gradient(90deg, #22c55e, #22d3ee)" },
  { name: "Gold-Orange", colors: ["#fbbf24", "#f97316"], preview: "linear-gradient(90deg, #fbbf24, #f97316)" },
  { name: "Aurora", colors: ["#22c55e", "#3b82f6", "#8b5cf6"], preview: "linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6)" },
  { name: "Sunset", colors: ["#fbbf24", "#f97316", "#ec4899", "#8b5cf6"], preview: "linear-gradient(90deg, #fbbf24, #f97316, #ec4899, #8b5cf6)" },
] as const;
