import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { lazy, Suspense, useEffect } from "react";
import { logVersionInfo } from "@/version";
import { AnimatePresence } from "motion/react";
import { AnimatedRoute } from "@/components/AnimatedRoute";
import { AnimationErrorBoundary } from "@/components/AnimationErrorBoundary";
import { UpdateNotification } from "@/components/UpdateNotification";
import { storeVersionInfo, logCacheBustingInfo, isNewVersionAvailable, clearAllCaches } from "@/utils/cacheBusting";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const Landing = lazy(() => import("./pages/Landing"));
const GalleryDemo = lazy(() => import("./pages/GalleryDemo"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized React Query configuration for mobile
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      networkMode: "online",
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * AnimatedRoutes: Wraps all routes with motion animations and AnimatePresence
 * - Manages page transition animations with fade + vertical slide effects
 * - Uses "sync" mode to allow exit/entrance animations to overlap for better performance
 * - Wrapped in AnimationErrorBoundary to gracefully handle animation failures
 */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedRoute><Home /></AnimatedRoute>} />
        <Route path="/app" element={<AnimatedRoute><Index /></AnimatedRoute>} />
        <Route path="/auth" element={<AnimatedRoute><Auth /></AnimatedRoute>} />
        <Route path="/signup" element={<AnimatedRoute><Signup /></AnimatedRoute>} />
        <Route path="/landing" element={<AnimatedRoute><Landing /></AnimatedRoute>} />
        <Route path="/gallery-demo" element={<AnimatedRoute><GalleryDemo /></AnimatedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<AnimatedRoute><NotFound /></AnimatedRoute>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  // Initialize version tracking and cache busting on app startup
  useEffect(() => {
    const checkVersion = async () => {
      logVersionInfo();
      storeVersionInfo();
      logCacheBustingInfo();
      if (isNewVersionAvailable()) {
        console.log('A new version is available, clearing cache and reloading...');
        await clearAllCaches();
        window.location.reload();
      }
    };
    checkVersion();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultThemeMode="system" defaultColorTheme="default" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={
              <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <AnimationErrorBoundary>
                <AnimatedRoutes />
              </AnimationErrorBoundary>
            </Suspense>
          </BrowserRouter>
          {/* Update notification for service worker updates */}
          <UpdateNotification />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
