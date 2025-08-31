import { cookies } from 'next/headers';
import { EnhancedChat } from '@/components/enhanced-chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

// Minimal auth session for Vana with proper type
const vanaSession = {
  user: {
    id: 'vana-user',
    email: 'user@vana.local',
    name: 'Vana User',
    type: 'regular' as const,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export default async function VanaPage() {
  const id = generateUUID();
  
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  return (
    <>
      <EnhancedChat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
        initialVisibilityType="private"
        isReadonly={false}
        session={vanaSession}
        autoResume={false}
        enableVanaIntegration={true}
        vanaOptions={{
          agents: ['research', 'analysis', 'synthesis'],
          model: 'gemini-pro',
          enableProgress: true,
        }}
      />
      <DataStreamHandler />
    </>
  );
}