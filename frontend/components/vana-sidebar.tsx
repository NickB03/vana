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

export function VanaSidebar() {
  return (
    <Sidebar className="h-screen">
      <SidebarToggle />
      <SidebarContent>
        {/* Vana Logo - aligned with text */}
        <div className="flex items-center p-2 mb-4">
          <div className="ml-3 w-8 h-8 bg-gradient-to-r from-purple-500 to-orange-400 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">V</span>
          </div>
        </div>

        {/* New Chat - ChatGPT style */}
        <div className="mb-4">
          <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("New Chat"); }}>
            <Plus size={24} className="flex-shrink-0 ml-3" />
            <SidebarNavText>New Chat</SidebarNavText>
          </SidebarNavLink>
        </div>

        {/* Recent Section */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav>
            <SidebarNavItem title="Recent Chats">
              <div className="space-y-1">
                {/* Sample recent chat items */}
                <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 1"); }}>
                  <SidebarNavText className="truncate">Building a Frontend with Next.js</SidebarNavText>
                </SidebarNavLink>
                
                <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 2"); }}>
                  <SidebarNavText className="truncate">AI Research Assistant Setup</SidebarNavText>
                </SidebarNavLink>
                
                <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 3"); }}>
                  <SidebarNavText className="truncate">Streaming Chat Interface Design</SidebarNavText>
                </SidebarNavLink>
              </div>
            </SidebarNavItem>
          </SidebarNav>
        </div>

        {/* Footer Section */}
        <SidebarFooter>
          <SidebarNavItem title="Settings">
            <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Settings"); }}>
              <Settings size={20} className="flex-shrink-0" />
              <SidebarNavText>Settings</SidebarNavText>
            </SidebarNavLink>
          </SidebarNavItem>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}