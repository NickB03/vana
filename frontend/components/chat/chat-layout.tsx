"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, MessageSquare } from 'lucide-react';

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  chatTitle?: string;
}

function ChatLayoutHeader({ onToggleSidebar, isSidebarOpen, chatTitle = "Project roadmap discussion" }: ChatHeaderProps) {
  return (
    <div className="flex items-center h-14 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSidebar}
        className="mr-3 p-2"
        data-testid="sidebar-toggle"
      >
        {isSidebarOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Menu className="h-4 w-4" />
        )}
      </Button>
      
      {/* Chat Title Section */}
      <div className="flex items-center gap-2 flex-1">
        <MessageSquare className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {chatTitle}
        </span>
      </div>
    </div>
  );
}

function Sidebar({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) {
  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 z-40",
      isOpen ? "w-64" : "w-0 overflow-hidden"
    )}>
      <div className="p-4">
        <div className="text-lg font-semibold mb-4">zola.chat</div>
        {children}
      </div>
    </div>
  );
}

export function ChatLayout({ children, className }: ChatLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen}>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Chat history and navigation will go here
        </div>
      </Sidebar>
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-200",
        isSidebarOpen ? "ml-0 lg:ml-64" : "ml-0"
      )}>
        {/* Header */}
        <ChatLayoutHeader 
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        
        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ChatLayout;