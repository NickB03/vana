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

/**
 * Client-side homepage component that provides a PRD-aligned interface with a persistent layout and chat entry points.
 *
 * Renders the MainLayout (with the left sidebar shown) and a HeroSection. Exposes two callbacks:
 * - handleStartChat(prompt?): creates a new chat session via the session store and navigates to `/chat?session={id}`; if `prompt` is provided it is URL-encoded and appended as `&prompt=...`.
 * - handleSelectSession(sessionId): navigates to an existing session at `/chat?session={sessionId}`.
 *
 * Side effects: creates new chat sessions (via createSession) and performs client navigation using Next.js router.
 *
 * @returns The homepage JSX element.
 */
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