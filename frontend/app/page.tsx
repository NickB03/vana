"use client";

import React from 'react';
import { ChatSessionProvider } from '@/src/contexts/ChatSessionContext';
import { ChatInterface } from "@/components/chat/chat-interface";
import { setupDevAuth } from '@/src/lib/auth';

// Setup development auth on component mount
if (typeof window !== 'undefined') {
  setupDevAuth();
}

export default function Home() {
  return (
    <ChatSessionProvider autoConnect>
      <div className="flex h-screen w-full">
        <main className="flex-1 flex flex-col">
          <ChatInterface />
        </main>
      </div>
    </ChatSessionProvider>
  );
}
