"use client";

import React from 'react';
import { ChatSessionProvider } from '@/src/contexts/ChatSessionContext';
import { ChatInterface } from "@/components/chat/chat-interface";
import { AuthGuard } from '@/src/components/auth/auth-guard';
import { setupDevAuth } from '@/src/lib/auth';
import { PageErrorBoundary } from '@/src/components/error-boundary';
import { ErrorHandler } from '@/src/lib/error-handler';

// Setup development auth on component mount
if (typeof window !== 'undefined') {
  setupDevAuth();
}

export default function Home() {
  const handlePageError = (error: Error) => {
    // Log page-level errors
    ErrorHandler.handle(error, {
      action: 'page_render',
      resource: 'home_page',
      url: window.location.href,
    });
  };

  return (
    <PageErrorBoundary 
      name="Home Page" 
      onError={handlePageError}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <AuthGuard requireAuth={false} showLoginForm={true}>
        <ChatSessionProvider autoConnect>
          <div className="flex h-screen w-full">
            <main className="flex-1 flex flex-col">
              <ChatInterface />
            </main>
          </div>
        </ChatSessionProvider>
      </AuthGuard>
    </PageErrorBoundary>
  );
}
