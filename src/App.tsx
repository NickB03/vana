import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { lazy, Suspense, useEffect } from "react";
import { logVersionInfo } from "@/version";
import { AnimatePresence } from "motion/react";
import { AnimatedRoute } from "@/components/AnimatedRoute";
import { AnimationErrorBoundary } from "@/components/AnimationErrorBoundary";
import { UpdateNotification } from "@/components/UpdateNotification";
import { storeVersionInfo, logCacheBustingInfo, isNewVersionAvailable, clearAllCaches } from "@/utils/cacheBusting";
import { usePreventOverscroll } from "@/hooks/usePreventOverscroll";
import { useIOSViewportHeight } from "@/hooks/useIOSViewportHeight";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
// const Landing = lazy(() => import("./pages/Landing")); // Commented out - will repurpose later
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DemoModeV2 = lazy(() => import("./pages/DemoModeV2"));
const DemoModeDashboard = lazy(() => import("./pages/DemoModeDashboard"));
const DemoModeImageGeneration = lazy(() => import("./pages/DemoModeImageGeneration"));
const UIShowcase = lazy(() => import("./pages/UIShowcase"));
const ShadcnTourDemo = lazy(() => import("./pages/ShadcnTourDemo"));
const DeepResearchComparison = lazy(() => import("./pages/DeepResearchComparison"));
const DeepResearchDemoA = lazy(() => import("./pages/DeepResearchDemoA"));
const DeepResearchDemoB = lazy(() => import("./pages/DeepResearchDemoB"));
const DeepResearchDemoB2 = lazy(() => import("./pages/DeepResearchDemoB2"));
const DeepResearchDemoC = lazy(() => import("./pages/DeepResearchDemoC"));
const CanvasDemo = lazy(() => import("./pages/CanvasDemo"));
const CanvasLiveDemo = lazy(() => import("./pages/CanvasLiveDemo"));
const LoadingStatesDemo = lazy(() => import("./pages/LoadingStatesDemo"));
const SparklesDemo = lazy(() => import("./pages/SparklesDemo"));

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
 * RootRoute: Renders Home which shows the main app interface
 * 
 * Landing page functionality has been disabled.
 * The app interface now renders directly with onboarding tour for new users.
 */
const RootRoute = () => {
  return <AnimatedRoute><Home /></AnimatedRoute>;
};

/**
 * AnimatedRoutes: Wraps all routes with motion animations and AnimatePresence
 * - Manages page transition animations with fade + vertical slide effects
 * - Uses "wait" mode so the exiting page fully unmounts before the entering page renders
 * - Wrapped in AnimationErrorBoundary to gracefully handle animation failures
 */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RootRoute />} />
        {/* Main chat interface routes */}
        <Route path="/main" element={<AnimatedRoute><Home /></AnimatedRoute>} />
        <Route path="/chat" element={<AnimatedRoute><Home /></AnimatedRoute>} />
        <Route path="/chat/:sessionId" element={<AnimatedRoute><Home /></AnimatedRoute>} />
        {/* Redirect old /app route to new home page */}
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/auth" element={<AnimatedRoute><Auth /></AnimatedRoute>} />
        <Route path="/signup" element={<AnimatedRoute><Signup /></AnimatedRoute>} />
        {/* Landing route removed - page will be repurposed later */}
        {/* <Route path="/landing" element={<AnimatedRoute><Landing /></AnimatedRoute>} /> */}
        <Route path="/admin" element={<AnimatedRoute><AdminDashboard /></AnimatedRoute>} />
        <Route path="/demo-frogger-v2" element={<DemoModeV2 />} />
        <Route path="/demo-dashboard" element={<DemoModeDashboard />} />
        <Route path="/demo-image-gen" element={<DemoModeImageGeneration />} />
        <Route path="/ui-showcase" element={<AnimatedRoute><UIShowcase /></AnimatedRoute>} />
        <Route path="/demo-shadcn-tour" element={<AnimatedRoute><ShadcnTourDemo /></AnimatedRoute>} />
        <Route path="/deep-research" element={<AnimatedRoute><DeepResearchComparison /></AnimatedRoute>} />
        <Route path="/deep-research-demo-a" element={<AnimatedRoute><DeepResearchDemoA /></AnimatedRoute>} />
        <Route path="/deep-research-demo-b" element={<AnimatedRoute><DeepResearchDemoB /></AnimatedRoute>} />
        <Route path="/deep-research-demo-b2" element={<AnimatedRoute><DeepResearchDemoB2 /></AnimatedRoute>} />
        <Route path="/deep-research-demo-c" element={<AnimatedRoute><DeepResearchDemoC /></AnimatedRoute>} />
        <Route path="/canvas-demo" element={<AnimatedRoute><CanvasDemo /></AnimatedRoute>} />
        <Route path="/canvas-live-demo" element={<AnimatedRoute><CanvasLiveDemo /></AnimatedRoute>} />
        <Route path="/loading-states-demo" element={<AnimatedRoute><LoadingStatesDemo /></AnimatedRoute>} />
        <Route path="/sparkles-demo" element={<AnimatedRoute><SparklesDemo /></AnimatedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<AnimatedRoute><NotFound /></AnimatedRoute>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  // Prevent iOS Safari rubber-banding/bounce/drag behavior
  usePreventOverscroll();
  useIOSViewportHeight();

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
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
