import { Check } from "lucide-react";
import { motion } from "motion/react";
import { fadeInUp } from "@/utils/animationConstants";

export const BenefitsSection = () => {
  return (
    <section className="py-24 px-4 w-full">
      <div className="container max-w-6xl mx-auto w-full">
        <motion.div
          className="text-center space-y-4 mb-16"
          {...fadeInUp}
        >
          <h2 className="text-3xl md:text-5xl font-bold">
            What is Vana?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            An AI-powered development assistant that transforms natural language into interactive code, components, and diagrams in real-time.
          </p>
        </motion.div>

        <div className="space-y-20">
          {/* Benefit 1: Real-time Generation */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 items-center"
            {...fadeInUp}
          >
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">From idea to code in seconds</h3>
              <p className="text-lg text-muted-foreground">
                Vana uses Claude AI to generate production-ready code as you type. Watch your ideas materialize with streaming responses that render instantly in an interactive preview canvas.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Real-time streaming code generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Instant artifact rendering</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Live preview updates</span>
                </li>
              </ul>
            </div>
            <div className="order-first lg:order-last">
              <div className="aspect-video bg-gradient-to-br from-card via-muted/50 to-card rounded-lg border border-border/50" />
            </div>
          </motion.div>

          {/* Benefit 2: Interactive Artifacts */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 items-center"
            {...fadeInUp}
          >
            <div className="aspect-video bg-gradient-to-br from-card via-muted/50 to-card rounded-lg border border-border/50" />
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">More than just chat</h3>
              <p className="text-lg text-muted-foreground">
                Every conversation can generate interactive artifacts—fully functional React components, validated HTML pages, Mermaid diagrams, and SVG graphics—all rendered in a sandboxed environment alongside your chat.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>shadcn/ui component support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>External library integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Code validation & error detection</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Benefit 3: Secure & Private */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 items-center"
            {...fadeInUp}
          >
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Built with security in mind</h3>
              <p className="text-lg text-muted-foreground">
                Vana is built on Supabase with authentication, Row-Level Security policies, and sandboxed execution. Your conversations and artifacts remain private and secure.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Supabase Auth with RLS</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sandboxed iframe execution</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Library approval system</span>
                </li>
              </ul>
            </div>
            <div className="order-first lg:order-last">
              <div className="aspect-video bg-gradient-to-br from-card via-muted/50 to-card rounded-lg border border-border/50" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
