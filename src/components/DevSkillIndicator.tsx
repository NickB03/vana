/**
 * DevSkillIndicator - Developer-only skill activation indicator
 *
 * Shows a small badge in the corner when a skill is auto-detected and active during chat.
 * Only visible in development mode (import.meta.env.DEV).
 *
 * Displays:
 * - Skill name and content length
 * - Detection confidence (high/medium/low)
 * - Detection latency
 *
 * @module components/DevSkillIndicator
 */

import { StreamProgress } from '@/hooks/useChatMessages';

interface DevSkillIndicatorProps {
  progress: StreamProgress | null;
}

/**
 * Confidence indicator color mapping
 */
const CONFIDENCE_COLORS = {
  high: 'text-green-400',
  medium: 'text-yellow-400',
  low: 'text-red-400',
} as const;

/**
 * Developer-only indicator showing active skill information.
 * Renders nothing in production builds.
 */
export function DevSkillIndicator({ progress }: DevSkillIndicatorProps) {
  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const activeSkill = progress?.activeSkill;

  if (!activeSkill) {
    return null;
  }

  const confidenceColor = CONFIDENCE_COLORS[activeSkill.detectionConfidence] || 'text-gray-400';

  return (
    <div
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/90 px-3 py-2 text-xs font-mono text-amber-300 shadow-lg backdrop-blur-sm"
      title={`Skill ID: ${activeSkill.skillId}\nContent: ${activeSkill.contentLength} chars\nConfidence: ${activeSkill.detectionConfidence}\nDetection: ${activeSkill.detectionLatencyMs}ms\nTimestamp: ${new Date(activeSkill.timestamp).toISOString()}`}
    >
      <span className="flex h-2 w-2">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      <span className="font-semibold">AUTO:</span>
      <span>{activeSkill.displayName}</span>
      <span className={confidenceColor}>({activeSkill.detectionConfidence})</span>
      <span className="text-amber-500/50">{activeSkill.detectionLatencyMs}ms</span>
    </div>
  );
}

export default DevSkillIndicator;
