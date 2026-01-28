import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

export const CTASection = () => {
  const { signInWithGoogle, isGoogleLoading } = useGoogleAuth();

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
            onClick={signInWithGoogle}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? "Connecting..." : "Sign Up with Google"}
          </Button>
        </div>
        <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-white/70">
          <span>✓ Interactive code previews</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ Multi-model AI</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ Production-ready output</span>
        </div>
        <div className="pt-8 sm:pt-12 text-xs text-white/40">
          Designed and built by Nick Bohmer
        </div>
      </div>
    </section>
  );
};
