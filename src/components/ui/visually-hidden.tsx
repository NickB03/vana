import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * VisuallyHidden component for accessibility
 *
 * Hides content visually but keeps it accessible to screen readers.
 * Follows WAI-ARIA best practices for visually hidden content.
 *
 * @see https://www.a11yproject.com/posts/how-to-hide-content/
 */
const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
      "[clip:rect(0,0,0,0)]",
      className
    )}
    {...props}
  />
));
VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };
