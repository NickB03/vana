import React from 'react';

// UI Component Imports
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";

// Page Imports
import LoginPage from "./pages/Login";
import ChatPage from "./pages/Chat";
import Dashboard from "./pages/Dashboard";

// API Context Provider
import { VanaAPIProvider } from "./services/VanaAPIProvider";

// Auth Context Provider
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// React Query v4+
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Routing + Error Handling
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Error Boundary Fallback Component
function ErrorFallback({ error }: { error?: string }) {
  return (
    <div className="page-error">
      <h1>Application Error</h1>
      <p>{error || "An unexpected error occurred."}</p>
      <button onClick={() => window.location.reload()}>
        Reload App
      </button>
    </div>
  );
}

// Main Application Layer
function AppWrapper() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <VanaAPIProvider>
        <Toaster />
        <AppWrapper />
      </VanaAPIProvider>
    </React.Suspense>
  );
}
