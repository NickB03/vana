'use client';

import { Chat } from '@/components/chat-vana';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { VanaDataStreamProvider } from '@/components/vana-data-stream-provider';
import { generateUUID } from '@/lib/utils';
import { useLocalStorage } from 'usehooks-ts';

export default function VanaChatPage() {
  // Simple session for Vana
  const session = {
    user: {
      id: 'vana-user',
      email: 'user@vana.ai',
      name: 'Vana User',
      type: 'regular' as const,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const id = generateUUID();
  const [isCollapsed] = useLocalStorage('sidebar:state', false);

  return (
    <VanaDataStreamProvider>
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={session.user} />
        <SidebarInset>
          <Chat
            key={id}
            id={id}
            initialMessages={[]}
            session={session}
          />
        </SidebarInset>
      </SidebarProvider>
    </VanaDataStreamProvider>
  );
}