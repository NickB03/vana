import { useState, useEffect } from "react";
import {
  MessageSquare,
  Settings,
  Search,
  Plus,
  Moon,
  Sun,
  Monitor,
  Trash2,
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
import { ChatSession } from "@/hooks/useChatSessions";

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading: boolean;
}

const groupChatsByPeriod = (sessions: ChatSession[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);

  const groups = {
    Today: [] as ChatSession[],
    Yesterday: [] as ChatSession[],
    "Last 7 days": [] as ChatSession[],
    "Last month": [] as ChatSession[],
  };

  sessions.forEach((session) => {
    const sessionDate = new Date(session.updated_at);
    if (sessionDate >= today) {
      groups.Today.push(session);
    } else if (sessionDate >= yesterday) {
      groups.Yesterday.push(session);
    } else if (sessionDate >= lastWeek) {
      groups["Last 7 days"].push(session);
    } else if (sessionDate >= lastMonth) {
      groups["Last month"].push(session);
    }
  });

  return Object.entries(groups).filter(([_, items]) => items.length > 0);
};

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
  isLoading,
}: ChatSidebarProps) {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.first_message && session.first_message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedSessions = groupChatsByPeriod(filteredSessions);

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <div className="size-8 rounded-md bg-gradient-primary"></div>
          <div className="text-md font-base tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            AI Chat
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="size-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <Settings className="size-4" />
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
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <div className="px-4 pb-4">
          <Button
            onClick={onNewChat}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {showSearch && (
          <div className="px-4 pb-4">
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

        {groupedSessions.map(([period, periodSessions]) => (
          <SidebarGroup key={period}>
            <SidebarGroupLabel>{period}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {periodSessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <div className="group relative flex items-center">
                      <SidebarMenuButton
                        onClick={() => onSessionSelect(session.id)}
                        isActive={currentSessionId === session.id}
                        className={cn(
                          "flex-1",
                          currentSessionId === session.id &&
                            "bg-gradient-subtle border-l-2 border-primary"
                        )}
                      >
                        <span className="truncate">{session.title}</span>
                      </SidebarMenuButton>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
