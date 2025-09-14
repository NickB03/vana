"use client";

import { UnifiedChatLayout } from "@/components/layouts/unified-chat-layout";

export default function AdminPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <UnifiedChatLayout headerTitle="Admin Panel">
      {children}
    </UnifiedChatLayout>
  );
}
