"use client"

import * as React from "react"
import { VanaSidebarUnified, getChatData } from "@/components/vana-sidebar-unified"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { MessageSquare } from "lucide-react"
import { usePathname } from "next/navigation"

export function UnifiedChatHeader() {
  const pathname = usePathname()
  const title = React.useMemo(() => {
    if (!pathname) return "Vana AI"
    if (pathname.startsWith("/chat")) {
      const chats = getChatData().flatMap((g: any) => g.chats)
      const match = chats.find((c: any) => c.url === pathname)
      if (match?.title) return match.title
      if (pathname === "/chat" || pathname === "/chat/new") return "New Chat"
      return "Vana AI"
    }
    if (pathname === "/login") return "Vana AI"
    return "Vana AI"
  }, [pathname])

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </header>
  )
}

interface UnifiedChatLayoutProps {
  children: React.ReactNode
  headerTitle?: string
}

export function UnifiedChatLayout({ children, headerTitle }: UnifiedChatLayoutProps) {
  const pathname = usePathname()
  const dynamicTitle = React.useMemo(() => {
    if (!pathname) return headerTitle || "Vana AI"
    if (pathname.startsWith("/chat")) {
      const chats = getChatData().flatMap((g: any) => g.chats)
      const match = chats.find((c: any) => c.url === pathname)
      if (match?.title) return match.title
      if (pathname === "/chat" || pathname === "/chat/new") return "New Chat"
      return headerTitle || "Vana AI"
    }
    if (pathname === "/login") return headerTitle || "Vana AI"
    return headerTitle || "Vana AI"
  }, [pathname, headerTitle])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <VanaSidebarUnified />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-lg font-semibold">{dynamicTitle}</h1>
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