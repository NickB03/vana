import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceMonitoring } from "./utils/performanceMonitoring";

// Initialize Sentry error monitoring (production only)
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance Monitoring - sample 10% of transactions
    tracesSampleRate: 0.1,

    // Only send errors in production
    enabled: import.meta.env.PROD,

    // Filter out expected errors to reduce noise
    beforeSend(event) {
      // Filter out network errors (handled by UI)
      if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
        return null;
      }
      // Filter out aborted requests (user cancelled)
      if (event.exception?.values?.[0]?.value?.includes('AbortError')) {
        return null;
      }
      return event;
    },

    // Attach user context when available
    initialScope: {
      tags: {
        app: 'vana',
        version: import.meta.env.VITE_APP_VERSION || 'unknown',
      },
    },
  });
}

// Initialize performance monitoring
initPerformanceMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
