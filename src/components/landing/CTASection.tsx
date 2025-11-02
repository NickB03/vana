import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-20 px-4 text-white relative">
      <div className="container max-w-4xl mx-auto text-center space-y-6 relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold">
          Ready to Build Something Amazing?
        </h2>
        <p className="text-xl text-white/90 max-w-2xl mx-auto">
          Join thousands of developers using AI to create faster. Start your
          first project in under 30 seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            size="lg"
            className="bg-white hover:bg-gray-100 text-black font-semibold"
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
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold"
            asChild
          >
            <Link to="/signup">Sign Up with Google</Link>
          </Button>
        </div>
        <div className="pt-4 flex items-center justify-center gap-6 text-sm text-white/70">
          <span>✓ No credit card required</span>
          <span>•</span>
          <span>✓ Free forever plan</span>
          <span>•</span>
          <span>✓ Cancel anytime</span>
        </div>
      </div>
    </section>
  );
};
