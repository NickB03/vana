import { Search, Lightbulb, Target, Sparkles } from "lucide-react";

// Icon mapping for reasoning steps
const iconMap = {
  search: Search,
  lightbulb: Lightbulb,
  target: Target,
  sparkles: Sparkles,
} as const;

export function getIconComponent(icon?: string) {
  if (!icon || !(icon in iconMap)) return null;
  const IconComponent = iconMap[icon as keyof typeof iconMap];
  return <IconComponent className="h-4 w-4" />;
}
