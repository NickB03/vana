'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import { auth } from '@/app/(auth)/auth';
import {
  getChatById,
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = cookies();
  cookieStore.set('chat-model', model, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  // 1. Authenticate the user session
  const session = await auth();
  if (!session?.user) return;

  // 2. Fetch the message and handle missing case
  const [message] = await getMessageById({ id });
  if (!message) return;

  // 3. Ensure the authenticated user owns the chat
  const chat = await getChatById({ id: message.chatId });
  if (!chat || chat.userId !== session.user.id) return;

  // 4. Perform the delete only after all checks pass
  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  // 1. Authenticate the user session
  const session = await auth();
  if (!session?.user) return;

  // 2. Ensure the authenticated user owns the chat
  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) return;

  // 3. Perform the update only after all checks pass
  await updateChatVisiblityById({ chatId, visibility });
}
