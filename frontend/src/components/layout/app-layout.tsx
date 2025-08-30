'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu,
  X,
  Settings,
  LogOut,
  User,
  Moon,
  Sun,
  PlusCircle,
  MessageSquare,
  Archive,
  Trash2,
  Search,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/store/ui-store';
import { ChatSession } from '@/types/session';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  sessions?: ChatSession[];
  currentSession?: ChatSession | null;
  onSelectSession?: (session: ChatSession) => void;
  onNewChat?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onArchiveSession?: (sessionId: string) => void;
  className?: string;
}

interface SidebarContentProps {
  sessions?: ChatSession[];
  currentSession?: ChatSession | null;
  onSelectSession?: (session: ChatSession) => void;
  onNewChat?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onArchiveSession?: (sessionId: string) => void;
  onClose?: () => void;
}

const SIDEBAR_WIDTH = 280;
const MOBILE_BREAKPOINT = 768;

/**
 * Sidebar content component - shared between desktop and mobile
 */
const SidebarContent: React.FC<SidebarContentProps> = ({
  sessions = [],
  currentSession,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onArchiveSession,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSessionSelect = useCallback((session: ChatSession) => {
    onSelectSession?.(session);
    onClose?.();
  }, [onSelectSession, onClose]);

  return (
    <div className="flex h-full flex-col bg-[#131314] text-white">
      {/* Sidebar Header */}
      <div className="flex flex-col gap-4 p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">V</span>
            </div>
            <span className="font-semibold text-white">Vana</span>
          </div>
        </div>

        {/* New Chat Button */}
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-3 bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
          variant="outline"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Chat Sessions */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  currentSession?.id === session.id
                    ? "bg-gray-700 text-white"
                    : "hover:bg-gray-800 text-gray-300"
                )}
                onClick={() => handleSessionSelect(session)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{session.title}</span>
                
                {/* Session Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0 hover:bg-gray-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveSession?.(session.id);
                        }}
                        className="text-gray-300 hover:bg-gray-800"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession?.(session.id);
                        }}
                        className="text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

/**
 * User Profile Dropdown Component
 */
const UserProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useUIStore();

  if (!user) return null;

  const getUserInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-800">
          <Avatar className="w-7 h-7">
            <AvatarImage src={user.picture} alt={user.full_name} />
            <AvatarFallback className="bg-gray-700 text-white text-xs">
              {getUserInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline-block text-sm text-gray-300 max-w-24 truncate">
            {user.full_name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-gray-900 border-gray-700 text-gray-300"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-gray-200">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuItem className="hover:bg-gray-800">
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem className="hover:bg-gray-800">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={toggleTheme}
          className="hover:bg-gray-800"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 mr-2" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2" />
              Dark Mode
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuItem 
          onClick={logout}
          className="text-red-400 hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Main App Layout Component
 * Provides a Gemini/Claude-inspired dark theme layout with collapsible sidebar
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sessions = [],
  currentSession,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onArchiveSession,
  className
}) => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detect mobile screen size
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className={cn("flex h-screen bg-[#131314] text-white overflow-hidden", className)}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="hidden md:flex flex-col border-r border-gray-800 bg-[#131314]"
              style={{ width: SIDEBAR_WIDTH }}
            >
              <SidebarContent
                sessions={sessions}
                currentSession={currentSession}
                onSelectSession={onSelectSession}
                onNewChat={onNewChat}
                onDeleteSession={onDeleteSession}
                onArchiveSession={onArchiveSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent 
            side="left" 
            className="w-[280px] p-0 bg-[#131314] border-r border-gray-800"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>
                Access your chat history and account settings
              </SheetDescription>
            </SheetHeader>
            
            <SidebarContent
              sessions={sessions}
              currentSession={currentSession}
              onSelectSession={onSelectSession}
              onNewChat={onNewChat}
              onDeleteSession={onDeleteSession}
              onArchiveSession={onArchiveSession}
              onClose={handleMobileMenuClose}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#131314]">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#131314]/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            {isMobile ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden hover:bg-gray-800"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            ) : (
              /* Desktop Sidebar Toggle */
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="hidden md:flex hover:bg-gray-800"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            )}

            {/* Title */}
            <h1 className="text-lg font-semibold text-white hidden sm:block">
              {currentSession?.title || 'Virtual Autonomous Network Agent'}
            </h1>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2">
            <UserProfileDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden bg-[#131314]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;