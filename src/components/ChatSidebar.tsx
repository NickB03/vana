import { useState } from "react";
import {
  MessageSquare,
  Settings,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  currentSessionId,
  onSessionSelect,
  onNewChat,
}: ChatSidebarProps) {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "Welcome Chat",
      preview: "How can I help you today?",
      timestamp: new Date(),
    },
  ]);

  const collapsed = state === "collapsed";

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <h2 className="bg-gradient-primary bg-clip-text text-xl font-bold text-transparent">
              AI Chat
            </h2>
          )}
          <Button
            onClick={onNewChat}
            size={collapsed ? "icon" : "default"}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span className="ml-2">New Chat</span>}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>
            {collapsed ? <MessageSquare className="h-4 w-4" /> : "Recent Chats"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredSessions.map((session) => (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    onClick={() => onSessionSelect(session.id)}
                    isActive={currentSessionId === session.id}
                    className={cn(
                      "w-full justify-start",
                      currentSessionId === session.id &&
                        "bg-gradient-subtle border-l-2 border-primary"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <div className="ml-2 flex-1 overflow-hidden">
                        <div className="truncate font-medium">
                          {session.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {session.preview}
                        </div>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto border-t border-border p-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                className="w-full justify-start"
              >
                <Settings className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Settings</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" side="right">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-medium">Theme</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="flex-1"
                    >
                      <Sun className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="flex-1"
                    >
                      <Moon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="flex-1"
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
