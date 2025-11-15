import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";

export const CTASection = () => {
  return (
    <section className={combineSpacing("text-white relative w-full", SECTION_SPACING.full)}>
      <div className="container max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 relative z-10 w-full px-4 sm:px-0">
        <h2 className={cn(TYPOGRAPHY.HEADING.lg.full, "font-bold")}>
          Ready to Build Something Amazing?
        </h2>
        <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-white/90 max-w-2xl mx-auto")}>
          Join thousands of developers using AI to create faster. Start your
          first project in under 30 seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4">
          <Button
            size="lg"
            className="bg-white hover:bg-gray-100 text-black font-semibold transition-all hover:scale-105 active:scale-95"
            asChild
          >
            <Link to="/auth" className="flex items-center gap-2">
              Start Creating Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold transition-all hover:scale-105 active:scale-95"
            asChild
          >
            <Link to="/signup">Sign Up with Google</Link>
          </Button>
        </div>
        <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-white/70">
          <span>✓ No credit card required</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ Free forever plan</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ Cancel anytime</span>
        </div>
      </div>
    </section>
  );
};
