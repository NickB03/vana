"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { VanaChat } from "@/components/chat/vana-chat";
import { ChatProvider } from "@/contexts/chat-context";

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatProvider>
        <div className="flex h-screen w-full">
          <main className="flex-1 flex flex-col">
            <VanaChat />
          </main>
        </div>
      </ChatProvider>
    </AuthGuard>
  );
}
