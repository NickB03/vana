"use client";

import { SquarePen, Bot, Search, Settings } from "lucide-react";
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
        {/* Vana Logo - left aligned */}
        <div className="flex items-center p-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-orange-400 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">V</span>
          </div>
        </div>

        {/* New Chat - ChatGPT style */}
        <div className="mb-4">
          <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("New Chat"); }}>
            <SquarePen size={24} className="flex-shrink-0" />
            <SidebarNavText>New Chat</SidebarNavText>
          </SidebarNavLink>
        </div>

        {/* Recent Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-2">
            <div className="px-2 mb-2">
              <SidebarNavText className="text-xs font-medium text-gray-500 tracking-wide">
                Recent
              </SidebarNavText>
            </div>
            <div className="space-y-1">
              {/* Recent Chat Items */}
              <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 1"); }}>
                <div className="flex-1 min-w-0">
                  <SidebarNavText>Building Collapsible ChatG...</SidebarNavText>
                </div>
              </SidebarNavLink>
              
              <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 2"); }}>
                <div className="flex-1 min-w-0">
                  <SidebarNavText>Model Performance Metrics ...</SidebarNavText>
                </div>
              </SidebarNavLink>
              
              <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 3"); }}>
                <div className="flex-1 min-w-0">
                  <SidebarNavText>Next.js AI Chatbot UI Templa...</SidebarNavText>
                </div>
              </SidebarNavLink>
              
              <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 4"); }}>
                <div className="flex-1 min-w-0">
                  <SidebarNavText>Modeling Disease Spread: T...</SidebarNavText>
                </div>
              </SidebarNavLink>
              
              <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 5"); }}>
                <div className="flex-1 min-w-0">
                  <SidebarNavText>Fortifying TypeScript Error P...</SidebarNavText>
                </div>
              </SidebarNavLink>
              
              <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Recent chat 6"); }}>
                <div className="flex-1 min-w-0">
                  <SidebarNavText>Enterprise Networking Expe...</SidebarNavText>
                </div>
              </SidebarNavLink>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <SidebarFooter>
          <SidebarNavItem title="Agent Builder">
            <SidebarNavLink href="/agent-builder">
              <Bot size={20} className="flex-shrink-0" />
              <SidebarNavText>Agent Builder</SidebarNavText>
            </SidebarNavLink>
          </SidebarNavItem>
          
          <SidebarNavItem title="Search chats">
            <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Search popup"); }}>
              <Search size={20} className="flex-shrink-0" />
              <SidebarNavText>Search chats</SidebarNavText>
            </SidebarNavLink>
          </SidebarNavItem>
          
          <SidebarNavItem title="Settings">
            <SidebarNavLink href="#" onClick={(e) => { e.preventDefault(); console.log("Settings popup"); }}>
              <Settings size={20} className="flex-shrink-0" />
              <SidebarNavText>Settings</SidebarNavText>
            </SidebarNavLink>
          </SidebarNavItem>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}