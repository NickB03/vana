import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
// import './services/sse-client-debug.ts' // Debug SSE connection - commented out to prevent console hijacking

// Debug log to ensure main entry point is loading
console.log('[Main] Vana frontend starting...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
