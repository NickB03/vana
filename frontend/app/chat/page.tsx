"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <AuthGuard requireAuth={false}>
      <ChatInterface className="h-full" />
    </AuthGuard>
  );
}
