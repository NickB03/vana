"use client"

import * as React from "react"
import { Search, MessageSquare, Plus } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

// Chat history data matching your reference design
const chatHistory = [
  {
    label: "Today",
    items: [
      "Project roadmap discussion",
      "API Documentation Review", 
      "Frontend Bug Analysis"
    ]
  },
  {
    label: "Yesterday", 
    items: [
      "Database Schema Design",
      "Performance Optimization"
    ]
  },
  {
    label: "Last 7 days",
    items: [
      "Authentication Flow",
      "Component Library",
      "UI/UX Feedback"
    ]
  },
  {
    label: "Last month",
    items: [
      "Initial Project Setup",
      "Requirements Gathering",
      "Tech Stack Selection",
      "Project Planning"
    ]
  }
]

export function VanaChatSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">V</span>
            </div>
            <span className="text-lg font-semibold">vana.chat</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="px-2 pb-2">
          <Button className="w-full justify-start gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {chatHistory.map((group) => (
          <SidebarGroup key={group.label}>
            <div className="px-3 py-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h4>
            </div>
            <SidebarMenu>
              {group.items.map((item, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton
                    isActive={item === "Project roadmap discussion"}
                    className="w-full justify-start text-left"
                  >
                    {item}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">N</span>
            </div>
            <span className="text-sm font-medium">User</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export function VanaChatHeader() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Project roadmap discussion</h1>
      </div>
    </header>
  )
}

interface VanaChatLayoutProps {
  children: React.ReactNode
}

export function VanaChatLayout({ children }: VanaChatLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <VanaChatSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <VanaChatHeader />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}