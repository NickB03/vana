import { useState, useEffect } from "react";
import { MessageSquare, Search, Plus, MoreHorizontal } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/hooks/useChatSessions";
import { NebiusLogo } from "@/components/NebiusLogo";
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
    "Last month": [] as ChatSession[]
  };
  sessions.forEach(session => {
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
  isLoading
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const filteredSessions = sessions.filter(session => session.title.toLowerCase().includes(searchQuery.toLowerCase()) || session.first_message && session.first_message.toLowerCase().includes(searchQuery.toLowerCase()));
  const groupedSessions = groupChatsByPeriod(filteredSessions);
  return <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="px-2 hover:bg-transparent"
          onClick={onNewChat}
          aria-label="Return to home"
        >
          <NebiusLogo className="text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => setShowSearch(!showSearch)}>
          <Search className="size-4" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <div className="px-4 pb-4">
          <Button onClick={onNewChat} className="w-full bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {showSearch && <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>}

        {groupedSessions.map(([period, periodSessions]) => <SidebarGroup key={period}>
            <SidebarGroupLabel>{period}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {periodSessions.map(session => <SidebarMenuItem key={session.id}>
                    <div className="relative flex items-center w-full" onMouseEnter={() => setHoveredSessionId(session.id)} onMouseLeave={() => setHoveredSessionId(null)}>
                      <SidebarMenuButton onClick={() => onSessionSelect(session.id)} isActive={currentSessionId === session.id} className={cn("flex-1 justify-start hover:bg-accent/50 transition-colors", currentSessionId === session.id && "bg-accent")}>
                        <span className="truncate text-sm">{session.title}</span>
                      </SidebarMenuButton>
                      {hoveredSessionId === session.id && <Button variant="ghost" size="icon" className="h-8 w-8 absolute right-2 transition-all" onClick={e => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>}
                    </div>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>)}
      </SidebarContent>
    </Sidebar>;
}