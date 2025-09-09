"use client";

import { VanaSidebar } from "@/components/vana-sidebar";

export default function AdminPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <VanaSidebar />
      <main className="flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-900">
        {children}
      </main>
    </div>
  );
}
