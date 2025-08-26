'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useSessionStore } from '@/store/session-store';
import { ErrorBoundary } from '@/components/error-boundary';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const { currentSession, createSession } = useSessionStore();
  const initialPrompt = searchParams.get('prompt');
  
  useEffect(() => {
    // Create a session if none exists
    if (!currentSession) {
      createSession();
    }
  }, [currentSession, createSession]);

  return (
    <AuthGuard requireAuth={true}>
      <MainLayout>
        <div className="flex flex-col h-full">
          <ChatInterface 
            className="flex-1"
            {...(initialPrompt && { initialMessage: initialPrompt })}
          />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

export default function ChatPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      }>
        <ChatPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}