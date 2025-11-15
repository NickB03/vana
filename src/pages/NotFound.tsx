import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ShaderBackground } from "@/components/ui/shader-background";
import { fadeInUp } from "@/utils/animationConstants";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      {/* Phase 1: Background System */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
        <ShaderBackground className="opacity-30" />
      </div>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          background: 'radial-gradient(125% 125% at 50% 10%, #000000 40%, #1e293b 100%)'
        }}
      />

      {/* Phase 3 & 4: Page entrance animation with typography consistency */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.3 }}
        className="flex min-h-screen items-center justify-center"
      >
        <div className="text-center space-y-6">
          <motion.h1
            {...fadeInUp}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-6xl font-bold text-foreground"
          >
            404
          </motion.h1>
          <motion.p
            {...fadeInUp}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="text-xl text-muted-foreground"
          >
            Oops! Page not found
          </motion.p>
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Button asChild variant="default">
              <Link to="/">Return to Home</Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default NotFound;
