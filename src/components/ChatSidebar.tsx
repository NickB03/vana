import { useState, useEffect } from "react";
import { CirclePlus, MoreHorizontal, PanelLeft } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/hooks/useChatSessions";
import { ViggleLogo } from "@/components/ViggleLogo";
import { SidebarItem } from "@/components/SidebarItem";
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
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const groupedSessions = groupChatsByPeriod(sessions);

  return <Sidebar collapsible="icon">
      <SidebarHeader className={cn(
        "group flex flex-row items-center py-2",
        collapsed ? "justify-center px-0" : "justify-between px-3 gap-2"
      )}>
        {collapsed ? (
          <button
            className="flex items-center justify-center h-10 w-10 hover:bg-transparent cursor-pointer"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            {isLogoHovered ? (
              <PanelLeft className="h-[20px] w-[20px] text-primary" strokeWidth={1.5} />
            ) : (
              <ViggleLogo className="text-primary h-6 w-6" />
            )}
          </button>
        ) : (
          <>
            <button
              className="px-2 hover:bg-transparent h-auto cursor-pointer"
              onClick={onNewChat}
              aria-label="Return to home"
            >
              <ViggleLogo className="text-primary h-6 w-auto" />
            </button>

            <div className="flex items-center gap-1">
              <button
                className="flex items-center justify-center size-10 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
              >
                <PanelLeft className="h-[20px] w-[20px]" strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <div className={cn("pb-1", collapsed ? "px-2" : "px-4")}>
          {collapsed ? (
            <Button
              onClick={onNewChat}
              variant="ghost"
              className="w-full h-10 hover:bg-accent rounded-md p-0 flex items-center justify-center"
            >
              <CirclePlus className="h-6 w-6" strokeWidth={2} />
            </Button>
          ) : (
            <Button
              onClick={onNewChat}
              variant="ghost"
              className="w-full justify-start hover:bg-accent h-10 px-3 py-2"
            >
              <CirclePlus className="h-6 w-6 mr-2 shrink-0" strokeWidth={2} />
              <span className="text-base whitespace-nowrap">New chat</span>
            </Button>
          )}
        </div>

        {groupedSessions.map(([period, periodSessions]) => (
          <SidebarGroup key={period} className="pt-1 pb-2">
            {!collapsed && <SidebarGroupLabel className="px-4 pb-1">{period}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {periodSessions.map(session => (
                  <SidebarMenuItem key={session.id}>
                    <div
                      className="relative flex items-center w-full group/item"
                      onMouseEnter={() => setHoveredSessionId(session.id)}
                      onMouseLeave={() => setHoveredSessionId(null)}
                    >
                      <SidebarMenuButton
                        onClick={() => onSessionSelect(session.id)}
                        isActive={currentSessionId === session.id}
                        tooltip={collapsed ? session.title : undefined}
                        className={cn(
                          "flex items-center hover:bg-accent/50 transition-all duration-300 ease-in-out overflow-hidden",
                          collapsed ? "justify-center px-2" : "justify-start px-3",
                          currentSessionId === session.id && "bg-accent"
                        )}
                      >
                        {!collapsed && <span className="truncate text-base whitespace-nowrap">{session.title}</span>}
                      </SidebarMenuButton>

                      {!collapsed && hoveredSessionId === session.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 absolute right-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>;
}