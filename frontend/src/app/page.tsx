'use client';

import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { HeroSection } from '@/components/home/hero-section';
import { useSessionStore } from '@/store/session-store';
import { ChatSession } from '@/types/session';

export default function Home() {
  const router = useRouter();
  const { createSession } = useSessionStore();

  const handleStartChat = (prompt?: string) => {
    createSession();
    
    if (prompt) {
      // If there's a prompt suggestion, we would add it as the first message
      // For now, we'll navigate to the chat page where it can be handled
      router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/chat');
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    router.push(`/chat/${session.id}`);
  };

  return (
    <AuthGuard requireAuth={true}>
      <MainLayout onSelectSession={handleSelectSession}>
        <HeroSection onStartChat={handleStartChat} />
      </MainLayout>
    </AuthGuard>
  );
}
