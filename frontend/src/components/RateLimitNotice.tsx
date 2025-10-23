/**
 * Rate Limit Notice Component
 *
 * Displays a subtle notice about API rate limiting for portfolio demo.
 * Informs users about free-tier constraints without disrupting UX.
 *
 * Phase 3.3: Free-tier portfolio optimization
 */

import { InfoIcon } from 'lucide-react';

export function RateLimitNotice() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 px-4 py-2 rounded-md bg-muted/30">
      <InfoIcon className="h-3 w-3 flex-shrink-0" />
      <span>
        <strong>Portfolio Demo:</strong> Using Gemini free-tier API with rate
        limiting (8 requests/minute, 1000/day). Responses may be queued during
        high usage.
      </span>
    </div>
  );
}

/**
 * Compact version for footer or sidebar
 */
export function RateLimitNoticeCompact() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <InfoIcon className="h-3 w-3" />
      <span>Portfolio demo • Free-tier API • Rate limited</span>
    </div>
  );
}
