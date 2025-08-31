/**
 * Gemini-Style Homepage with Integrated Sidebar
 * Dark theme with personalized greeting and suggestion cards
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { 
  Sparkles, 
  Send,
  Paperclip,
  Mic,
  Plus,
  History,
  BookOpen,
  Settings,
  MessageSquare,
  Trash2
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' }
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};


// Recent conversations for sidebar
const recentChats = [
  { id: '1', title: 'React component debugging', timestamp: '2 hours ago' },
  { id: '2', title: 'Database optimization query', timestamp: '1 day ago' },
  { id: '3', title: 'API design patterns', timestamp: '2 days ago' },
  { id: '4', title: 'TypeScript best practices', timestamp: '3 days ago' },
];

function GeminiSidebar() {
  return (
    <Sidebar side="left" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-sidebar-foreground">Vana</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full px-3 py-1.5 text-sm bg-sidebar-input border border-sidebar-border rounded-md text-sidebar-foreground placeholder:text-sidebar-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <div className="px-3 py-2">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 mb-4 bg-sidebar border-sidebar-border hover:bg-[rgba(59,130,246,0.1)]"
          >
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>

        <SidebarMenu className="px-3">
          <div className="text-xs font-medium text-sidebar-foreground/70 px-2 py-1 mb-2">Recent</div>
          {recentChats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton className="w-full justify-between group hover:bg-[rgba(59,130,246,0.1)]">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-4 h-4 shrink-0 text-sidebar-foreground/60" />
                  <span className="truncate text-sm text-sidebar-foreground">{chat.title}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <History className="w-4 h-4" />
              <span>History</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <BookOpen className="w-4 h-4" />
              <span>Help</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { createSession } = useSessionStore();
  const [inputValue, setInputValue] = useState('');

  const handleStartChat = () => {
    const newSession = createSession();
    
    if (inputValue.trim()) {
      router.push(`/chat?session=${newSession.id}&prompt=${encodeURIComponent(inputValue)}`);
    } else {
      router.push(`/chat?session=${newSession.id}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartChat();
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <GeminiSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background text-foreground">
          {/* Sidebar trigger button */}
          <div className="absolute top-4 left-4 z-50 md:hidden">
            <SidebarTrigger />
          </div>

          {/* Main content area - centered greeting */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <motion.div
              className="text-center max-w-2xl mx-auto"
              initial="initial"
              animate="animate"
              variants={staggerChildren}
            >
              <motion.div variants={fadeInUp}>
                <h1 className="text-5xl md:text-6xl font-normal mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Hello, Nick
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  How can I help you today?
                </p>
              </motion.div>

              {/* Suggestion Cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto mt-8"
                variants={fadeInUp}
              >
                <motion.button
                  onClick={() => setInputValue('Help me debug this code')}
                  className="p-4 text-left bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-border hover:bg-card/70 transition-all duration-200 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🐛</div>
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      Help me debug this code
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setInputValue('Analyze my data')}
                  className="p-4 text-left bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-border hover:bg-card/70 transition-all duration-200 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📊</div>
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      Analyze my data
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setInputValue('Plan my project')}
                  className="p-4 text-left bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-border hover:bg-card/70 transition-all duration-200 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📋</div>
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      Plan my project
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setInputValue('Automate this task')}
                  className="p-4 text-left bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-border hover:bg-card/70 transition-all duration-200 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⚡</div>
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      Automate this task
                    </span>
                  </div>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>

          {/* Bottom input bar */}
          <motion.div 
            className="p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="bg-card/50 backdrop-blur-sm rounded-full border border-border/50 focus-within:border-border transition-colors">
                  <div className="flex items-center gap-3 px-6 py-4">
                    <div className="flex-1">
                      <Textarea
                        value={inputValue}
                        onChange={(e) => {
                          setInputValue(e.target.value);
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask Vana..."
                        className="min-h-[24px] max-h-32 resize-none border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                        style={{ fontSize: '16px' }}
                        rows={1}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground p-2 h-auto"
                      >
                        <Paperclip className="w-5 h-5" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground p-2 h-auto"
                      >
                        <Mic className="w-5 h-5" />
                      </Button>
                      
                      <Button 
                        onClick={() => handleStartChat()}
                        disabled={!inputValue.trim()}
                        className={`rounded-full w-10 h-10 p-0 transition-all duration-200 ml-2 ${
                          inputValue.trim() 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Input hint */}
                <div className="text-xs text-muted-foreground text-center mt-3">
                  Vana can make mistakes. Check important info.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}