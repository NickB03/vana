"use client";

import { Plus, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarToggle,
  SidebarContent,
  SidebarNav,
  SidebarNavItem,
  SidebarNavLink,
  SidebarNavText,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";

export function VanaSidebar() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Sidebar className="h-screen">
      <SidebarToggle />
      <SidebarContent>
        {/* Header with Vana title */}
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">
            Vana AI
          </h1>
          <p className="text-xs text-muted-foreground">
            AI Research Assistant
          </p>
        </div>

        {/* New Chat - ChatGPT style */}
        <div className="mb-4">
          <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("New Chat"); }} aria-label="Start new chat conversation">
            <Plus size={24} className="flex-shrink-0 ml-3" />
            <SidebarNavText>New Chat</SidebarNavText>
          </SidebarNavLink>
        </div>

        {/* Navigation */}
        <SidebarNav>
          <SidebarNavItem title="Chat">
            <SidebarNavLink href="/">
              <SidebarNavText>Chat</SidebarNavText>
            </SidebarNavLink>
          </SidebarNavItem>
        </SidebarNav>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button variant="ghost" size="sm" className="h-8 px-2" aria-label="Open settings">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}