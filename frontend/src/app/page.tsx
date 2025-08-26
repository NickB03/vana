/**
 * Homepage - Application Interface
 * PRD-compliant implementation with sidebar, greeting, and chat integration
 */

'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { MainLayout } from '@/components/layout/main-layout';
import { HeroSection } from '@/components/home/hero-section';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChatSession } from '@/types/session';

export default function HomePage() {
  const router = useRouter();
  const { createSession } = useSessionStore();

  const handleStartChat = (prompt?: string) => {
    // Create a new session
    const newSession = createSession();
    
    // Navigate to chat with optional prompt
    if (prompt) {
      router.push(`/chat?session=${newSession.id}&prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push(`/chat?session=${newSession.id}`);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    // Navigate to selected session
    router.push(`/chat?session=${sessionId}`);
  };

  return (
    <MainLayout 
      onSelectSession={handleSelectSession} 
      showSidebar={true}
    >
      <HeroSection onStartChat={handleStartChat} />
    </MainLayout>
  );
}