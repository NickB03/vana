"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ChatInterface } from "@/components/chat/chat-interface";
import { notFound } from "next/navigation";

interface ChatPageProps {
  params: {
    id: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  // Basic validation for chat ID
  if (!params.id || params.id.length < 1) {
    notFound();
  }

  return (
    <AuthGuard requireAuth={false}>
      <ChatInterface className="h-full" />
    </AuthGuard>
  );
}