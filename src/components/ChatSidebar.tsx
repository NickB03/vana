import { useState, useEffect } from "react";
import { CirclePlus, MessageSquare, MoreHorizontal, PanelLeft } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/hooks/useChatSessions";
import { ViggleLogo } from "@/components/ViggleLogo";
import { SidebarItem } from "@/components/SidebarItem";
import { UserProfileButton } from "@/components/UserProfileButton";
import { TOUR_STEP_IDS } from "@/components/tour";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

  const groupedSessions = groupChatsByPeriod(sessions);

  // Tour ID only applied on desktop - on mobile it's on the MobileHeader button
  return <Sidebar id={isMobile ? undefined : TOUR_STEP_IDS.SIDEBAR} collapsible="icon">
      <SidebarHeader className={cn(
        "group flex flex-row items-center py-2 transition-all duration-200",
        collapsed ? "justify-center px-0" : "justify-between px-3 gap-2"
      )}>
        {collapsed ? (
          <button
            className="flex items-center justify-center h-10 w-10 hover:bg-transparent cursor-pointer transition-all duration-200"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            {isLogoHovered ? (
              <PanelLeft className="h-[20px] w-[20px] shrink-0 text-primary transition-all duration-200" strokeWidth={1.5} />
            ) : (
              <ViggleLogo className="h-6 w-6 shrink-0 transition-all duration-200" />
            )}
          </button>
        ) : (
          <>
            <button
              className="px-2 hover:bg-transparent h-auto cursor-pointer transition-all duration-200"
              onClick={onNewChat}
              aria-label="Return to home"
            >
              <ViggleLogo className="h-6 w-auto shrink-0 transition-all duration-200" />
            </button>

            <div className="flex items-center gap-1">
              <button
                className="flex items-center justify-center size-10 hover:bg-accent hover:text-accent-foreground rounded-md transition-all duration-200"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                data-testid="sidebar-toggle"
              >
                <PanelLeft className="h-[20px] w-[20px] shrink-0 transition-all duration-200" strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <div className={cn("pb-1 transition-all duration-200", collapsed ? "px-2" : "px-4")}>
          {collapsed ? (
            <Button
              onClick={onNewChat}
              variant="ghost"
              className="w-full h-10 hover:bg-accent rounded-md p-0 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group"
              data-testid="new-chat-button"
            >
              <CirclePlus className="h-6 w-6 shrink-0 group-hover:text-primary transition-colors duration-200" strokeWidth={2} />
            </Button>
          ) : (
            <Button
              onClick={onNewChat}
              variant="ghost"
              className="w-full justify-start hover:bg-accent h-10 px-3 py-2 transition-all duration-200 hover:scale-105 active:scale-95 group"
              data-testid="new-chat-button"
            >
              <CirclePlus className="h-6 w-6 mr-2 shrink-0 group-hover:text-primary transition-colors duration-200" strokeWidth={2} />
              <span className="text-base whitespace-nowrap">New chat</span>
            </Button>
          )}
        </div>

        {collapsed ? (
          <div className="px-2 pb-1 pt-1">
            <div className="px-2 pb-1 text-xs font-medium text-sidebar-foreground/70 h-8 flex items-center invisible">Today</div>
            <Button
              onClick={toggleSidebar}
              variant="ghost"
              className="w-full h-10 hover:bg-accent rounded-md p-0 flex items-center justify-center transition-all duration-200"
              aria-label="Expand sidebar to view chat history"
            >
              <MessageSquare className="h-6 w-6 shrink-0 transition-all duration-200" strokeWidth={1.5} />
            </Button>
          </div>
        ) : isLoading ? (
          // Loading skeleton with accessibility support
          <div
            role="status"
            aria-label="Loading conversations"
            className="px-4 pt-3 space-y-3"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" aria-hidden="true" />
              <Skeleton className="h-10 w-full rounded-md" aria-hidden="true" />
              <Skeleton className="h-10 w-full rounded-md" aria-hidden="true" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-20" aria-hidden="true" />
              <Skeleton className="h-10 w-full rounded-md" aria-hidden="true" />
            </div>
            <span className="sr-only">Loading conversations</span>
          </div>
        ) : sessions.length === 0 ? (
          // Empty state
          <div className={cn(
            "py-12 text-center transition-all duration-200",
            collapsed ? "px-2" : "px-4"
          )}>
            <MessageSquare className="h-10 w-10 shrink-0 mx-auto mb-3 text-muted-foreground/40 transition-all duration-200" strokeWidth={1.5} />
            {!collapsed && (
              <>
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start a new chat to begin</p>
              </>
            )}
          </div>
        ) : (
          // Populated sessions
          groupedSessions.map(([period, periodSessions]) => (
            <SidebarGroup key={period} className="pt-1 pb-2">
              <SidebarGroupLabel className="px-4 pb-1">{period}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {periodSessions.map(session => (
                    <SidebarMenuItem key={session.id} data-testid="session-item">
                      <div
                        className="relative flex items-center w-full group/item"
                        onMouseEnter={() => setHoveredSessionId(session.id)}
                        onMouseLeave={() => setHoveredSessionId(null)}
                      >
                        <SidebarMenuButton
                          onClick={() => onSessionSelect(session.id)}
                          isActive={currentSessionId === session.id}
                          className={cn(
                            "flex items-center hover:bg-accent/50 transition-all duration-150 ease-out overflow-hidden",
                            "justify-start px-3 group-hover/item:pr-12",
                          )}
                          style={currentSessionId === session.id ? {
                            backgroundColor: 'hsl(var(--sidebar-accent-active))',
                          } : undefined}
                        >
                          <span className="truncate text-base whitespace-nowrap">{session.title}</span>
                        </SidebarMenuButton>

                        {hoveredSessionId === session.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 absolute right-2 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200"
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            data-testid="delete-session"
                          >
                            <MoreHorizontal className="h-4 w-4 shrink-0" />
                          </Button>
                        )}
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/50 transition-all duration-200">
        <UserProfileButton collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>;
}
