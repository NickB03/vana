"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { getDynamicTitle } from "@/lib/chat-data"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function UnifiedChatHeader() {
  const pathname = usePathname()
  const title = React.useMemo(() => {
    return getDynamicTitle(pathname, "Vana AI")
  }, [pathname])

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2">
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
    return getDynamicTitle(pathname, headerTitle || "Vana AI")
  }, [pathname, headerTitle])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{dynamicTitle}</h1>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}