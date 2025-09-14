"use client"

import * as React from "react"
import { VanaSidebarUnified } from "@/components/vana-sidebar-unified"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { MessageSquare } from "lucide-react"

export function UnifiedChatHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Project roadmap discussion</h1>
      </div>
    </header>
  )
}

interface UnifiedChatLayoutProps {
  children: React.ReactNode
  headerTitle?: string
}

export function UnifiedChatLayout({ children, headerTitle }: UnifiedChatLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <VanaSidebarUnified />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-lg font-semibold">
                {headerTitle || "Project roadmap discussion"}
              </h1>
            </div>
          </header>
          <main className="flex flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}