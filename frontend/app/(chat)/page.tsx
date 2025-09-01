import { cookies } from 'next/headers';

import { EnhancedChat } from '@/components/enhanced-chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    return (
      <>
        <EnhancedChat
          key={id}
          id={id}
          initialMessages={[]}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType="private"
          isReadonly={false}
          session={session}
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

  return (
    <>
      <EnhancedChat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={modelIdFromCookie.value}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
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
