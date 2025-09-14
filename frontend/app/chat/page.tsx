"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ChatInterface } from "@/components/chat/chat-interface";
import { UnifiedChatLayout } from "@/components/layouts/unified-chat-layout";

export default function ChatPage() {
  return (
    <AuthGuard requireAuth={false}>
      <UnifiedChatLayout>
        <ChatInterface className="h-full" />
      </UnifiedChatLayout>
    </AuthGuard>
  );
}
