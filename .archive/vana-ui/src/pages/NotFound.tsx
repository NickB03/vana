
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold gemini-gradient-text">404</h1>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Page Not Found</h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        </p>
        <div className="space-x-4">
          <Button asChild className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90">
            <Link to="/login">Return to Login</Link>
          </Button>
          <Button asChild variant="outline" className="border-[var(--border-primary)] text-[var(--text-primary)]">
            <Link to="/chat">Go to Chat</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
