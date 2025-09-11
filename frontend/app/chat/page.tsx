"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen w-full">
        <main className="flex-1 flex flex-col">
          <ChatInterface />
        </main>
      </div>
    </AuthGuard>
  );
}
