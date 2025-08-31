/**
 * Vana Chat Page
 * Modified to work with Vana's Google ADK backend
 */

import { Chat } from '@/components/chat-vana';
import { generateUUID } from '@/lib/utils';

export default async function Page() {
  // For now, we'll bypass auth and use a simple session
  // You can integrate your JWT auth here later
  const session = {
    user: {
      id: 'guest-user',
      email: 'guest@example.com',
      name: 'Guest User',
    }
  };

  const id = generateUUID();

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      session={session}
    />
  );
}