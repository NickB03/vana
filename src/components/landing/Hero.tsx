import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { DemoPreview } from "./DemoPreview";

export const Hero = () => {
  const scrollToDemo = () => {
    const featuresSection = document.getElementById("features");
    featuresSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center px-4 py-20">
      <div className="container max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headline + CTAs */}
          <div className="space-y-6 text-center lg:text-left">
            <Badge variant="secondary" className="text-sm">
              Powered by Claude AI
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              Chat with AI, Build Anything
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl">
              Real-time AI conversations that generate interactive code, React
              components, diagrams, and more—all in one seamless interface.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-white hover:bg-gray-100 text-black" asChild>
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-gray-700 text-white hover:bg-gray-800" onClick={scrollToDemo}>
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-400 pt-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Free to start</span>
              </div>
            </div>
          </div>

          {/* Right: Animated Preview */}
          <div className="order-first lg:order-last">
            <DemoPreview />
          </div>
        </div>
      </div>
    </section>
  );
};
