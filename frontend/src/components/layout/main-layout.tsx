'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  PanelLeft,
  PanelRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SessionHistory } from '@/components/home/session-history';
import { useAuth } from '@/hooks/use-auth';
import { useUIStore } from '@/store/ui-store';
import { ChatSession } from '@/types/session';

interface MainLayoutProps {
  children: React.ReactNode;
  onSelectSession?: (session: ChatSession) => void;
  showSidebar?: boolean;
}

export function MainLayout({ 
  children, 
  onSelectSession, 
  showSidebar = true 
}: MainLayoutProps) {
  const { user, logout } = useAuth();
  const { 
    theme, 
    toggleTheme, 
    sidebarOpen, 
    toggleSidebar, 
    sidebarWidth,
    setSidebarWidth 
  } = useUIStore();

  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = () => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    setSidebarWidth(Math.max(250, Math.min(600, newWidth)));
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {showSidebar && (
        <>
          <motion.div
            className="bg-card border-r border-border flex flex-col"
            style={{ width: sidebarOpen ? sidebarWidth : 0 }}
            animate={{ width: sidebarOpen ? sidebarWidth : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {sidebarOpen && (
              <>
                {/* Sidebar Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">V</span>
                      </div>
                      <span className="font-semibold">Vana</span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSidebar}
                    >
                      <PanelLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Session History */}
                <div className="flex-1">
                  {onSelectSession && (
                    <SessionHistory onSelectSession={onSelectSession} />
                  )}
                </div>

                {/* User Section */}
                {user && (
                  <div className="p-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.picture} alt={user.full_name} />
                          <AvatarFallback>
                            {getUserInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Resize Handle */}
          {sidebarOpen && (
            <div
              className="w-1 bg-border cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
              onMouseDown={handleMouseDown}
            />
          )}
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {showSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
              >
                {sidebarOpen ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <PanelRight className="w-4 h-4" />
                )}
              </Button>
            )}
            
            <h1 className="text-lg font-semibold">
              Virtual Autonomous Network Agent
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}