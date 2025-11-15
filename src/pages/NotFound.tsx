import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/PageLayout";
import { fadeInUp } from "@/utils/animationConstants";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageLayout className="flex min-h-screen items-center justify-center">
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
    </PageLayout>
  );
};

export default NotFound;
