"use client"

import * as React from "react"
import {
  BookOpen,
  MessageCircle,
  Plus,
  SquareTerminal,
  GalleryVerticalEnd,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
} from "lucide-react"

import { NavUser } from "@/components/sidebar/nav-user"
import Image from "next/image"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { getChatData, type NavItem, type UserData, type TeamData } from "@/lib/chat-data"


// Application data with proper TypeScript types
const data: {
  user: UserData;
  teams: TeamData[];
  navMain: NavItem[];
} = {
  user: {
    name: "Vana User",
    email: "user@vana.ai",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "Vana AI",
      logo: GalleryVerticalEnd,
      plan: "Research",
    },
  ],
  navMain: [
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "User Guide", url: "#" },
        { title: "API Reference", url: "#" },
      ],
    },
    {
      title: "Agent Builder",
      url: "/canvas",
      icon: SquareTerminal,
    },
  ],
}

// Navigation component
function UnifiedNavMain({
  items,
  className,
}: {
  items: NavItem[]
  className?: string
}) {
  return (
    <SidebarGroup className={cn("group-data-[collapsible=icon]:hidden mt-2", className)}>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={Boolean((item as any).isActive)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu className="ml-6 mt-1">
                    {item.items?.map((subItem) => (
                      <SidebarMenuItem key={subItem.title}>
                        <SidebarMenuButton asChild size="sm">
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// Enhanced chat history component
function UnifiedChatHistory() {
  const { isMobile } = useSidebar()
  const chatData = getChatData()

  return (
    <>
      {/* New Chat Button (Prompt Kit style) */}
      <div className="group-data-[collapsible=icon]:hidden px-2 pb-2">
        <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2 font-normal">
          <Link href="/chat">
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </Link>
        </Button>
      </div>

      {chatData.map((group) => (
        <SidebarGroup key={group.id} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  asChild
                  isActive={chat.isActive}
                  className={cn(
                    "w-full justify-start",
                    chat.isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                >
                  <Link href={chat.url}>
                    <span className="truncate flex-1">{chat.title}</span>
                  </Link>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem>
                      <Edit className="text-muted-foreground" />
                      <span>Rename Chat</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageCircle className="text-muted-foreground" />
                      <span>Open Chat</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="text-destructive" />
                      <span>Delete Chat</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}

      {/* Platform section moved below chat history */}
      <UnifiedNavMain items={data.navMain} className="group-data-[collapsible=icon]:hidden mt-2" />

    </>
  )
}

// Main unified sidebar component
export function VanaSidebarUnified({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAuthenticated, user } = useAuth()

  // Use authenticated user data if available, fallback to sample data
  const userData = React.useMemo(() => {
    if (isAuthenticated && user) {
      return {
        name: user.name || user.email || "Vana User",
        email: user.email || "user@vana.ai",
        avatar: user.avatar || "/avatars/user.jpg",
      }
    }
    return data.user
  }, [isAuthenticated, user])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        {/* Logo and Search */}
        <div className="flex items-center justify-between px-2 py-1">
          <Image src="/vana-logo.png" alt="Vana AI logo" width={32} height={32} className="h-8 w-auto rounded-md" priority />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 group-data-[collapsible=icon]:hidden"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </div>


      </SidebarHeader>

      <SidebarContent>
        <UnifiedChatHistory />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}